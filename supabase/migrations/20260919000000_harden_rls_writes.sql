-- Security hardening: RLS enforces row ownership but not column- or
-- value-level integrity. Three gaps found in review, each closed with a
-- trigger so the database — not just the app — is the backstop, per
-- CLAUDE.md section 3 ("Row-level security enforces the role table above
-- at the database level, not just in the UI").
--
-- All three triggers let admin (public.is_admin()) and the service-role
-- client (auth.role() = 'service_role', used by increment_client_balance,
-- createInvoiceForOrder, etc.) through unconditionally — they only
-- constrain what a signed-in salesman/rider can do to a row RLS already
-- lets them reach.

-- ============================================================
-- 1. clients: a salesman may still set credit_limit when creating their
--    OWN new client (CLAUDE.md section 5 — this is intentional and stays
--    an INSERT-time choice), but from here on may never change
--    credit_limit / current_balance / active / assigned_salesman_id on an
--    existing row via UPDATE — those are admin-only fields.
-- ============================================================

create or replace function public.enforce_client_update_restrictions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;

  if new.credit_limit is distinct from old.credit_limit
     or new.current_balance is distinct from old.current_balance
     or new.active is distinct from old.active
     or new.assigned_salesman_id is distinct from old.assigned_salesman_id then
    raise exception 'Only an admin can change credit_limit, current_balance, active, or the assigned salesman.';
  end if;

  return new;
end;
$$;

create trigger clients_restrict_privileged_fields
  before update on public.clients
  for each row execute function public.enforce_client_update_restrictions();

-- ============================================================
-- 2. order_items: unit_price_at_order_time must always be the price the
--    catalog/price_overrides actually say for that client+product at
--    insert time — never whatever value the request happened to carry.
--    This mirrors exactly what create_order_with_items already does; the
--    trigger just makes it impossible to bypass via a direct insert.
-- ============================================================

create or replace function public.enforce_order_item_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_price numeric(12, 2);
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  select client_id into v_client_id from public.orders where id = new.order_id;
  if v_client_id is null then
    raise exception 'Order not found.';
  end if;

  select coalesce(
    (select special_price from public.price_overrides
       where client_id = v_client_id and product_id = new.product_id),
    (select default_price from public.products where id = new.product_id)
  ) into v_price;

  if v_price is null then
    raise exception 'Unknown or inactive product for this order.';
  end if;

  new.unit_price_at_order_time := v_price;
  return new;
end;
$$;

create trigger order_items_enforce_price
  before insert on public.order_items
  for each row execute function public.enforce_order_item_price();

-- ============================================================
-- 3. orders / deliveries: a rider may only ever perform the exact
--    transitions the app's own delivery flow performs (advanceDelivery in
--    lib/deliveries.ts) — never skip a step, never touch any other
--    column. This backstops the state machine that today lives only in
--    application code.
-- ============================================================

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

create trigger orders_restrict_rider_update
  before update on public.orders
  for each row execute function public.enforce_orders_rider_update();

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

create trigger deliveries_restrict_status_transition
  before update on public.deliveries
  for each row execute function public.enforce_delivery_status_transition();
