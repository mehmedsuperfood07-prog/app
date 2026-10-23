-- Cancel an order that has not been delivered yet, voiding its invoice.
--
-- Like change_order_rider, this is a database function so the planned ERP
-- (same database) follows the same rules, and every step happens in one
-- transaction: the order, its invoice, the client's balance and the logs.
--
-- Nothing is deleted. The order keeps its rider, items and history and becomes
-- 'cancelled' with who, when and why. The invoice keeps its number and amount
-- and is marked void with who, when and why; the number is never reused. The
-- client's balance goes back down by the voided amount. Accounting software
-- reads the integration_events rows ('invoice.voided', 'order.cancelled') to
-- post the matching reversal.

-- 1. Where the cancellation and the void are recorded.
alter table public.orders
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles (id),
  add column if not exists cancel_reason text;

alter table public.invoices
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles (id),
  add column if not exists void_reason text;

-- 2. At most one live (not void) invoice per order, enforced by the database
-- so neither this app nor the ERP can ever bill an order twice. Stops with a
-- clear message, before changing anything, if that is already not true.
do $$
begin
  if exists (
    select 1 from public.invoices where voided_at is null
    group by order_id having count(*) > 1
  ) then
    raise exception 'Stopped: some orders already have more than one invoice. Nothing was changed. Send this message to the developer.';
  end if;
end
$$;

create unique index if not exists invoices_one_live_per_order
  on public.invoices (order_id) where voided_at is null;

-- 3. A cancelled order can never be invoiced. This also closes the gap where
-- one admin cancels an order while another is assigning it and the invoice is
-- still being generated: the invoice insert waits for the cancellation to
-- finish and is then refused.
create or replace function public.enforce_invoice_order_not_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.orders
  where id = new.order_id and status <> 'cancelled'
  for share;
  if not found then
    raise exception 'This order was cancelled, so it cannot be invoiced.';
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_block_cancelled_order on public.invoices;
create trigger invoices_block_cancelled_order
  before insert on public.invoices
  for each row execute function public.enforce_invoice_order_not_cancelled();

-- 4. A rider can only move a delivery forward while its order is still out for
-- delivery, so a rider tapping "Delivered" at the moment the order is
-- cancelled is refused instead of delivering a cancelled order. Otherwise
-- unchanged from 20260919000000_harden_rls_writes.sql.
create or replace function public.enforce_delivery_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next public.delivery_status;
begin
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;

  if new.order_id is distinct from old.order_id
     or new.rider_id is distinct from old.rider_id then
    raise exception 'A rider may only update delivery status.';
  end if;

  if not exists (
    select 1 from public.orders where id = new.order_id and status = 'out_for_delivery'
  ) then
    raise exception 'This order is no longer out for delivery.';
  end if;

  v_next := case old.status
    when 'assigned' then 'picked_up'
    when 'picked_up' then 'on_the_way'
    when 'on_the_way' then 'delivered'
    else null
  end;

  if v_next is null or new.status is distinct from v_next then
    raise exception 'Invalid delivery status transition.';
  end if;

  if new.status = 'delivered' and new.delivered_at is null then
    raise exception 'delivered_at must be set when marking a delivery delivered.';
  end if;

  return new;
end;
$$;

-- 5. The cancellation itself.
create or replace function public.cancel_order(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_order record;
  v_delivery record;
  v_invoice record;
  v_reversed numeric(12, 2) := 0;
  v_voided jsonb := '[]'::jsonb;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Only an admin can cancel an order.' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'Give a reason for cancelling.';
  end if;

  select id, status, client_id, rider_id into v_order
  from public.orders where id = p_order_id
  for update;
  if not found then
    raise exception 'Order not found.';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'This order is already cancelled.';
  end if;
  if v_order.status = 'delivered' then
    raise exception 'A delivered order cannot be cancelled.';
  end if;
  if v_order.status not in ('placed', 'out_for_delivery') then
    raise exception 'This order cannot be cancelled.';
  end if;

  select status into v_delivery
  from public.deliveries where order_id = p_order_id
  order by created_at desc
  limit 1
  for update;
  if found and v_delivery.status = 'delivered' then
    raise exception 'This order has already been delivered.';
  end if;

  for v_invoice in
    select id, invoice_number, amount, paid_amount
    from public.invoices
    where order_id = p_order_id and voided_at is null
    for update
  loop
    -- Money already received against the invoice needs a refund or credit
    -- note, which is not something a cancel button should decide.
    if v_invoice.paid_amount > 0
       or exists (select 1 from public.payments where invoice_id = v_invoice.id) then
      raise exception 'Invoice % has a payment recorded against it, so this order cannot be cancelled here.',
        v_invoice.invoice_number;
    end if;

    update public.invoices
    set voided_at = now(), voided_by = auth.uid(), void_reason = v_reason
    where id = v_invoice.id;

    v_reversed := v_reversed + v_invoice.amount;
    v_voided := v_voided || jsonb_build_object(
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
        'reason', v_reason,
        'voided_by', auth.uid()
      )
    );
  end loop;

  if v_reversed <> 0 then
    update public.clients
    set current_balance = current_balance - v_reversed
    where id = v_order.client_id;
  end if;

  update public.orders
  set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = v_reason
  where id = p_order_id;

  insert into public.order_status_history (order_id, status, changed_by)
  values (p_order_id, 'cancelled', auth.uid());

  insert into public.integration_events (entity_type, entity_id, event_type, payload)
  values (
    'order',
    p_order_id,
    'order.cancelled',
    jsonb_build_object(
      'previous_status', v_order.status,
      'client_id', v_order.client_id,
      'rider_id', v_order.rider_id,
      'reason', v_reason,
      'cancelled_by', auth.uid(),
      'voided_invoices', v_voided,
      'balance_reversed', v_reversed
    )
  );

  return jsonb_build_object(
    'previous_status', v_order.status,
    'rider_id', v_order.rider_id,
    'voided_invoices', v_voided,
    'balance_reversed', v_reversed
  );
end;
$$;

revoke execute on function public.cancel_order(uuid, text) from public, anon;
grant execute on function public.cancel_order(uuid, text) to authenticated, service_role;

-- Make the API pick up the new columns and function straight away.
notify pgrst, 'reload schema';
