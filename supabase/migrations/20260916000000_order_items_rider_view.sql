-- Close a pricing leak in the rider role.
--
-- order_items_select_scope (initial migration) granted riders row-level
-- access to order_items for their assigned orders, but RLS is row-level
-- only — it can't hide the unit_price_at_order_time column. A rider
-- could read it directly via the anon-key client (bypassing the app,
-- which simply chooses not to select that column), violating the
-- "rider cannot see pricing" rule in CLAUDE.md section 2.
--
-- Fix: drop rider access to the base table and add order_items_rider_view,
-- following the same column-restricted-view pattern already used for
-- clients_rider_view / products_rider_view in the initial migration.

drop policy if exists order_items_select_scope on public.order_items;

create policy order_items_select_scope on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (public.is_own_client(o.client_id) or public.is_admin())
    )
  );

create view public.order_items_rider_view as
  select oi.id, oi.order_id, oi.product_id, oi.quantity
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.rider_id = auth.uid();

grant select on public.order_items_rider_view to authenticated;
