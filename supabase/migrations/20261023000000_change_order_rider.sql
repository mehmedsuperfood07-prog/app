-- Change the rider on an order that is out for delivery but not yet delivered.
--
-- A database function rather than application code on purpose: the planned
-- ERP shares this database, so business rules live here where both apps obey
-- the same ones, and the order and delivery rows change in one transaction.
--
-- The invoice and the client's balance are untouched: it is the same order for
-- the same amount, only the person carrying it changes. The delivery goes back
-- to 'assigned' so the new rider starts from "Pick up", whatever step the old
-- rider had reached.
--
-- Every call writes an integration_events row ('order.rider_changed'), the log
-- the ERP reads to follow what happened in this app.

create or replace function public.change_order_rider(p_order_id uuid, p_rider_id uuid)
returns uuid  -- the previous rider, so the caller can notify them
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_delivery record;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Only an admin can change the rider.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles where id = p_rider_id and role = 'rider' and active
  ) then
    raise exception 'Choose an active rider.';
  end if;

  -- Row locks: a rider tapping "Picked up" / "Delivered" at the same moment
  -- waits for this to finish, then finds the delivery is no longer theirs.
  select id, status, rider_id into v_order
  from public.orders where id = p_order_id
  for update;
  if not found then
    raise exception 'Order not found.';
  end if;
  if v_order.status <> 'out_for_delivery' then
    raise exception 'Only an order that is out for delivery can change rider.';
  end if;
  if v_order.rider_id = p_rider_id then
    raise exception 'That rider already has this order.';
  end if;

  select id, status into v_delivery
  from public.deliveries where order_id = p_order_id
  order by created_at desc
  limit 1
  for update;
  if not found then
    raise exception 'This order has no delivery record.';
  end if;
  if v_delivery.status = 'delivered' then
    raise exception 'This order has already been delivered.';
  end if;

  update public.deliveries
  set rider_id = p_rider_id, status = 'assigned'
  where id = v_delivery.id;

  update public.orders
  set rider_id = p_rider_id
  where id = p_order_id;

  insert into public.integration_events (entity_type, entity_id, event_type, payload)
  values (
    'order',
    p_order_id,
    'order.rider_changed',
    jsonb_build_object(
      'from_rider_id', v_order.rider_id,
      'to_rider_id', p_rider_id,
      'delivery_status_before', v_delivery.status,
      'changed_by', auth.uid()
    )
  );

  return v_order.rider_id;
end;
$$;

revoke execute on function public.change_order_rider(uuid, uuid) from public, anon;
grant execute on function public.change_order_rider(uuid, uuid) to authenticated, service_role;

-- The ERP will read integration_events as "everything since the last time I
-- looked", so give that query an index.
create index if not exists integration_events_created_at_idx
  on public.integration_events (created_at);

-- Make the API pick up the new function straight away.
notify pgrst, 'reload schema';
