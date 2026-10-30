-- The ERP link (the ERP's Phase 1 step 7; its CLAUDE.md section 6). Nothing here changes
-- what the app does until the ERP's switch (erp.company_settings.order_app_linked) is on.
-- Once on:
-- - assigning a rider makes the ERP delivery challan, with the ERP's credit control;
-- - an order becoming delivered posts the ERP invoice (the app stops making its own);
--   if the ERP can't take it, the order stays delivered and the office sees the problem;
-- - the ERP confirming a delivery marks the order delivered here (mark_delivered_from_erp);
-- - cancelling an order, or changing one that is out for delivery, cancels or remakes its
--   challan;
-- - clients.current_balance is kept equal to the ERP's ledger by the ERP.
-- The calls go to erp.* through dynamic SQL, so this migration also runs on a database
-- without the ERP, where the switch simply reads as off.
-- Also: a new login type, office, for staff who only use the ERP.

-- ============================================================
-- Office logins
-- ============================================================

alter type public.user_role add value if not exists 'office';

-- ============================================================
-- The switch, as the app sees it
-- ============================================================

create or replace function public.erp_linked()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_linked boolean;
begin
  if to_regprocedure('erp.order_app_linked()') is null then
    return false;
  end if;
  execute 'select erp.order_app_linked()' into v_linked;
  return coalesce(v_linked, false);
end;
$$;

revoke execute on function public.erp_linked() from public, anon;
grant execute on function public.erp_linked() to authenticated, service_role;

-- ============================================================
-- Order changes the ERP follows
-- ============================================================

create or replace function public.orders_erp_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status or not public.erp_linked() then
    return new;
  end if;

  if new.status = 'out_for_delivery' then
    -- Refusals (credit control, a product not set up in the ERP) stop the assignment.
    execute 'select erp.dispatch_order_for_link($1)' using new.id;
  elsif new.status = 'delivered' then
    -- A delivery already happened: never stop the rider. A refusal goes to the ERP's
    -- Offline problems list for the office.
    begin
      execute 'select erp.deliver_order_for_link($1)' using new.id;
    exception when others then
      execute 'select erp.report_link_problem($1, $2)' using new.id, sqlerrm;
    end;
  elsif new.status = 'cancelled' then
    execute 'select erp.cancel_challan_for_link($1, $2)' using new.id, new.cancel_reason;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_erp_link on public.orders;
create trigger orders_erp_link
  after update of status on public.orders
  for each row execute function public.orders_erp_link();

-- An order out for delivery whose products, quantities or prices changed (edit_order logs
-- order.edited): its challan is remade.
create or replace function public.order_edits_erp_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_type = 'order.edited'
     and new.payload ->> 'order_status' = 'out_for_delivery'
     and (new.payload -> 'before_items') is distinct from (new.payload -> 'after_items')
     and public.erp_linked() then
    execute 'select erp.redo_challan_for_link($1)' using new.entity_id;
  end if;
  return new;
end;
$$;

drop trigger if exists integration_events_erp_link on public.integration_events;
create trigger integration_events_erp_link
  after insert on public.integration_events
  for each row execute function public.order_edits_erp_link();

-- ============================================================
-- The ERP confirming a delivery
-- ============================================================

-- Called by the ERP (with the service role's authority) when the office confirms a
-- delivery there. Does nothing for an order already delivered or cancelled.
create or replace function public.mark_delivered_from_erp(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_delivery uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Only the ERP marks orders delivered this way.' using errcode = '42501';
  end if;
  select id, status, rider_id into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status in ('delivered', 'cancelled') then
    return;
  end if;

  select id into v_delivery from public.deliveries where order_id = p_order_id order by created_at desc limit 1;
  if v_delivery is null then
    insert into public.deliveries (order_id, rider_id, status, delivered_at)
    values (p_order_id, v_order.rider_id, 'delivered', now());
  else
    update public.deliveries
    set status = 'delivered', delivered_at = coalesce(delivered_at, now())
    where id = v_delivery and status <> 'delivered';
  end if;

  update public.orders set status = 'delivered' where id = p_order_id;
  insert into public.order_status_history (order_id, status, changed_by) values (p_order_id, 'delivered', null);
  insert into public.integration_events (entity_type, entity_id, event_type, payload)
  values ('order', p_order_id, 'order.delivered_in_erp',
          jsonb_build_object('order_status_before', v_order.status, 'rider_id', v_order.rider_id));
end;
$$;

revoke execute on function public.mark_delivered_from_erp(uuid) from public, anon, authenticated;
grant execute on function public.mark_delivered_from_erp(uuid) to service_role;

-- ============================================================
-- admin_update_delivery: once linked, the invoice is the ERP's and comes with delivery
-- ============================================================
-- As in 20261024000000_admin_order_actions.sql, except that the "needs a live invoice"
-- check applies only while the ERP link is off.

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

  if p_status = 'delivered' and not public.erp_linked() and not exists (
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

-- Make the API pick up the new functions straight away.
notify pgrst, 'reload schema';
