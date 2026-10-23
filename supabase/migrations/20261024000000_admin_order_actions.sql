-- Let the office do what salesmen and riders do: take an order on a salesman's
-- behalf, and move a delivery forward (or deliver an order directly, with no
-- rider, e.g. when the client collects it from the office).
--
-- Database functions, like change_order_rider and cancel_order, so the planned
-- ERP (same database) gets exactly the same rules and every step happens in
-- one transaction. Both are admin or service role only and log to
-- integration_events.

-- Who actually entered the order. Null means the salesman did, as every order
-- placed from the salesman app (and every order before this) has it.
alter table public.orders
  add column if not exists placed_by uuid references public.profiles (id);

-- 1. Take an order for a client, credited to a salesman.
create or replace function public.admin_create_order(
  p_client_id uuid,
  p_salesman_id uuid,
  p_items jsonb,
  p_expected_delivery_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total numeric(12, 2);
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Only an admin can take an order this way.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.clients where id = p_client_id and active) then
    raise exception 'Choose an active client.';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_salesman_id and role = 'salesman' and active
  ) then
    raise exception 'Choose an active salesman to credit this order to.';
  end if;
  if p_expected_delivery_date is null then
    raise exception 'Choose a delivery date.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product with a quantity.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as item
    where coalesce((item ->> 'quantity')::numeric, 0) <= 0
       or coalesce((item ->> 'unit_price')::numeric, -1) < 0
  ) then
    raise exception 'Every product needs a quantity above zero and a rate of zero or more.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as item
    left join public.products p on p.id = (item ->> 'product_id')::uuid and p.active
    where p.id is null
  ) then
    raise exception 'One of the selected products is no longer available.';
  end if;

  insert into public.orders (client_id, salesman_id, status, expected_delivery_date, placed_by)
  values (p_client_id, p_salesman_id, 'placed', p_expected_delivery_date, auth.uid())
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price_at_order_time)
  select
    v_order_id,
    (item ->> 'product_id')::uuid,
    (item ->> 'quantity')::numeric,
    (item ->> 'unit_price')::numeric
  from jsonb_array_elements(p_items) as item;

  insert into public.order_status_history (order_id, status, changed_by)
  values (v_order_id, 'placed', coalesce(auth.uid(), p_salesman_id));

  select coalesce(sum(quantity * unit_price_at_order_time), 0) into v_total
  from public.order_items where order_id = v_order_id;

  insert into public.integration_events (entity_type, entity_id, event_type, payload)
  values (
    'order',
    v_order_id,
    'order.created_by_admin',
    jsonb_build_object(
      'client_id', p_client_id,
      'salesman_id', p_salesman_id,
      'placed_by', auth.uid(),
      'expected_delivery_date', p_expected_delivery_date,
      'total', v_total
    )
  );

  return v_order_id;
end;
$$;

revoke execute on function public.admin_create_order(uuid, uuid, jsonb, date) from public, anon;
grant execute on function public.admin_create_order(uuid, uuid, jsonb, date) to authenticated, service_role;

-- 2. Move a delivery forward on the rider's behalf, to any later step.
--    Out for delivery: assigned -> picked_up -> on_the_way -> delivered, and
--    skipping ahead is allowed (the office may only hear "it's delivered").
--    Placed (no rider): only straight to delivered, for office pickup or the
--    office delivering it itself; a delivery row with no rider records it.
--    Delivered needs the order's invoice to exist first: the app raises it
--    just before calling this, so a delivered order always has one.
create or replace function public.admin_update_delivery(
  p_order_id uuid,
  p_status public.delivery_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_delivery record;
  v_from public.delivery_status;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Only an admin can update a delivery this way.' using errcode = '42501';
  end if;
  if p_status is null or p_status = 'assigned' then
    raise exception 'Choose Picked up, On the way or Delivered.';
  end if;

  select id, status, rider_id into v_order
  from public.orders where id = p_order_id
  for update;
  if not found then
    raise exception 'Order not found.';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'This order was cancelled.';
  end if;
  if v_order.status = 'delivered' then
    raise exception 'This order is already delivered.';
  end if;
  if v_order.status not in ('placed', 'out_for_delivery') then
    raise exception 'This order cannot be delivered yet.';
  end if;

  if p_status = 'delivered' and not exists (
    select 1 from public.invoices where order_id = p_order_id and voided_at is null
  ) then
    raise exception 'This order has no invoice yet, so it cannot be marked delivered.';
  end if;

  if v_order.status = 'placed' then
    if p_status <> 'delivered' then
      raise exception 'Assign a rider first, or mark the order delivered directly.';
    end if;
    v_from := null;
    insert into public.deliveries (order_id, rider_id, status, delivered_at)
    values (p_order_id, null, 'delivered', now());
  else
    select id, status into v_delivery
    from public.deliveries where order_id = p_order_id
    order by created_at desc
    limit 1
    for update;
    if not found then
      raise exception 'This order has no delivery record.';
    end if;
    if p_status <= v_delivery.status then
      raise exception 'This delivery is already at that step or further.';
    end if;
    v_from := v_delivery.status;
    update public.deliveries
    set status = p_status,
        delivered_at = case when p_status = 'delivered' then now() else delivered_at end
    where id = v_delivery.id;
  end if;

  if p_status = 'delivered' then
    update public.orders set status = 'delivered' where id = p_order_id;
    insert into public.order_status_history (order_id, status, changed_by)
    values (p_order_id, 'delivered', auth.uid());
  end if;

  insert into public.integration_events (entity_type, entity_id, event_type, payload)
  values (
    'order',
    p_order_id,
    'order.delivery_updated_by_admin',
    jsonb_build_object(
      'from_status', v_from,
      'to_status', p_status,
      'order_status_before', v_order.status,
      'rider_id', v_order.rider_id,
      'changed_by', auth.uid()
    )
  );

  return jsonb_build_object(
    'from_status', v_from,
    'to_status', p_status,
    'rider_id', v_order.rider_id
  );
end;
$$;

revoke execute on function public.admin_update_delivery(uuid, public.delivery_status) from public, anon;
grant execute on function public.admin_update_delivery(uuid, public.delivery_status) to authenticated, service_role;

-- Make the API pick up the new column and functions straight away.
notify pgrst, 'reload schema';
