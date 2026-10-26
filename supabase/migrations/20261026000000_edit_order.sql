-- Edit an order's lines (products, quantities, rates) and delivery date.
--
-- Who and when:
--   * the salesman the order belongs to, while it is still 'placed' (no rider,
--     no invoice yet);
--   * an admin (or the service role, e.g. the ERP), until it is delivered.
--     If the order is already invoiced, that invoice is voided (kept, number
--     not reused) and its amount taken off the client's balance; the app then
--     raises a fresh invoice for the new lines, which charges the new amount.
--     An invoice with money recorded against it is never voided here.
-- Not the client: to move an order to another client, cancel it and place a
-- new one. Not once delivered: that needs a return or credit note.
--
-- A database function like cancel_order, so the ERP gets the same rules and
-- the lines, invoice, balance and logs change in one transaction. Every edit
-- logs 'order.edited' with the lines and totals before and after.

create or replace function public.edit_order(
  p_order_id uuid,
  p_items jsonb,
  p_expected_delivery_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := public.is_admin() or auth.role() = 'service_role';
  v_order record;
  v_delivery record;
  v_invoice record;
  v_before jsonb;
  v_after jsonb;
  v_before_total numeric(12, 2);
  v_after_total numeric(12, 2);
  v_voided jsonb := null;
begin
  select id, status, client_id, salesman_id, rider_id, expected_delivery_date into v_order
  from public.orders where id = p_order_id
  for update;
  if not found then
    raise exception 'Order not found.';
  end if;

  if not v_is_admin then
    if auth.uid() is null
       or v_order.salesman_id is distinct from auth.uid()
       or not exists (
         select 1 from public.profiles where id = auth.uid() and role = 'salesman' and active
       ) then
      raise exception 'You can only edit your own orders.' using errcode = '42501';
    end if;
    if v_order.status <> 'placed' then
      raise exception 'A rider has already been assigned, so only the office can change this order now.';
    end if;
  end if;

  if v_order.status = 'delivered' then
    raise exception 'A delivered order cannot be edited.';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'This order was cancelled.';
  end if;
  if v_order.status not in ('placed', 'out_for_delivery') then
    raise exception 'This order cannot be edited.';
  end if;
  if v_order.status = 'out_for_delivery' then
    select status into v_delivery
    from public.deliveries where order_id = p_order_id
    order by created_at desc
    limit 1
    for update;
    if found and v_delivery.status = 'delivered' then
      raise exception 'This order has already been delivered.';
    end if;
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
  if (select count(distinct item ->> 'product_id') from jsonb_array_elements(p_items) as item)
     <> jsonb_array_length(p_items) then
    raise exception 'Each product can only appear once.';
  end if;
  -- A product must be active, unless it is already on this order (a product
  -- switched off since the order was taken can stay on it).
  if exists (
    select 1 from jsonb_array_elements(p_items) as item
    where not exists (
      select 1 from public.products p
      where p.id = (item ->> 'product_id')::uuid
        and (p.active or exists (
          select 1 from public.order_items oi
          where oi.order_id = p_order_id and oi.product_id = p.id
        ))
    )
  ) then
    raise exception 'One of the selected products is no longer available.';
  end if;

  select
    coalesce(jsonb_agg(jsonb_build_object(
      'product_id', product_id,
      'quantity', quantity,
      'unit_price', unit_price_at_order_time
    ) order by product_id), '[]'::jsonb),
    coalesce(sum(quantity * unit_price_at_order_time), 0)
  into v_before, v_before_total
  from public.order_items where order_id = p_order_id;

  select
    jsonb_agg(jsonb_build_object(
      'product_id', (item ->> 'product_id')::uuid,
      'quantity', (item ->> 'quantity')::numeric,
      'unit_price', (item ->> 'unit_price')::numeric
    ) order by (item ->> 'product_id')::uuid),
    sum((item ->> 'quantity')::numeric * (item ->> 'unit_price')::numeric)
  into v_after, v_after_total
  from jsonb_array_elements(p_items) as item;

  if v_before = v_after
     and p_expected_delivery_date is not distinct from v_order.expected_delivery_date then
    raise exception 'Nothing was changed.';
  end if;

  -- The invoice no longer matches the order: void it and take its amount off
  -- the balance. Only when the lines changed; a new date alone keeps it.
  if v_before <> v_after then
    for v_invoice in
      select id, invoice_number, amount, paid_amount
      from public.invoices
      where order_id = p_order_id and voided_at is null
      for update
    loop
      if v_invoice.paid_amount > 0
         or exists (select 1 from public.payments where invoice_id = v_invoice.id) then
        raise exception 'Invoice % has a payment recorded against it, so this order cannot be edited here.',
          v_invoice.invoice_number;
      end if;

      update public.invoices
      set voided_at = now(), voided_by = auth.uid(), void_reason = 'Order edited'
      where id = v_invoice.id;

      update public.clients
      set current_balance = current_balance - v_invoice.amount
      where id = v_order.client_id;

      v_voided := jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.invoice_number,
        'amount', v_invoice.amount
      );

      insert into public.integration_events (entity_type, entity_id, event_type, payload)
      values (
        'invoice',
        v_invoice.id,
        'invoice.voided',
        jsonb_build_object(
          'order_id', p_order_id,
          'client_id', v_order.client_id,
          'invoice_number', v_invoice.invoice_number,
          'amount', v_invoice.amount,
          'reason', 'Order edited',
          'voided_by', auth.uid()
        )
      );
    end loop;

    delete from public.order_items where order_id = p_order_id;
    insert into public.order_items (order_id, product_id, quantity, unit_price_at_order_time)
    select
      p_order_id,
      (item ->> 'product_id')::uuid,
      (item ->> 'quantity')::numeric,
      (item ->> 'unit_price')::numeric
    from jsonb_array_elements(p_items) as item;
  end if;

  update public.orders
  set expected_delivery_date = p_expected_delivery_date
  where id = p_order_id;

  insert into public.integration_events (entity_type, entity_id, event_type, payload)
  values (
    'order',
    p_order_id,
    'order.edited',
    jsonb_build_object(
      'client_id', v_order.client_id,
      'order_status', v_order.status,
      'edited_by', auth.uid(),
      'before_items', v_before,
      'after_items', v_after,
      'before_total', v_before_total,
      'after_total', v_after_total,
      'before_delivery_date', v_order.expected_delivery_date,
      'after_delivery_date', p_expected_delivery_date,
      'voided_invoice', v_voided
    )
  );

  return jsonb_build_object(
    'status', v_order.status,
    'client_id', v_order.client_id,
    'salesman_id', v_order.salesman_id,
    'rider_id', v_order.rider_id,
    'before_total', v_before_total,
    'after_total', v_after_total,
    'lines_changed', v_before <> v_after,
    'voided_invoice', v_voided
  );
end;
$$;

-- The rider guard on orders (from 20260919000000_harden_rls_writes.sql) was
-- written for riders but refused every non-admin update, which would also
-- refuse a salesman's edit made through edit_order above. It now applies to
-- riders only. A salesman still cannot update an order directly: row-level
-- security only lets the order's rider or an admin update it.
create or replace function public.enforce_orders_rider_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'rider') then
    return new;
  end if;

  if new.client_id is distinct from old.client_id
     or new.salesman_id is distinct from old.salesman_id
     or new.rider_id is distinct from old.rider_id
     or new.created_offline_at is distinct from old.created_offline_at then
    raise exception 'A rider may only update order status.';
  end if;

  if not (old.status = 'out_for_delivery' and new.status = 'delivered') then
    raise exception 'Invalid order status transition.';
  end if;

  return new;
end;
$$;

revoke execute on function public.edit_order(uuid, jsonb, date) from public, anon;
grant execute on function public.edit_order(uuid, jsonb, date) to authenticated, service_role;

-- Make the API pick up the new function straight away.
notify pgrst, 'reload schema';
