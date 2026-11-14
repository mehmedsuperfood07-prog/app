-- The owner's requests of 14 Nov 2026:
--
-- 1. The TP rate is locked. It changes only in Products (or as a client's special price) by
--    the office. On an order, a product's rate may be its TP rate or lower (a discount, as a
--    lower rate or a percentage), never higher. Checked here for every way a line is saved
--    (create_order_with_items, admin_create_order, edit_order), so the forms can't be
--    bypassed. An order taken on a phone without internet is a fact: if the TP rate came
--    down before it reached the server, its rate is brought down to the TP rate instead of
--    the order being refused.
--
-- 2. With the ERP connected, an order edited while still "placed" that already has an ERP
--    delivery challan gets the challan remade, as an order out for delivery already did
--    (erp.redo_challan_for_link, ERP migration 20261121000000). Before, a salesman's change
--    of rate on such an order never reached the challan or the invoice.

-- ============================================================
-- 1. The TP rate lock
-- ============================================================

create or replace function public.order_items_tp_rate_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_tp numeric(12, 2);
  v_name text;
begin
  select client_id, created_offline_at into v_order from public.orders where id = new.order_id;
  select coalesce(po.special_price, p.default_price), p.name || coalesce(' — ' || p.variant, '')
  into v_tp, v_name
  from public.products p
  left join public.price_overrides po on po.product_id = p.id and po.client_id = v_order.client_id
  where p.id = new.product_id;

  if v_tp is not null and new.unit_price_at_order_time > v_tp then
    if v_order.created_offline_at is not null then
      new.unit_price_at_order_time := v_tp;
    else
      raise exception 'The rate for % can''t be above its TP rate of Rs %. Give a discount instead, or ask the office to change the TP rate in Products.',
        v_name, to_char(v_tp, 'FM999,999,990.00') using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.order_items_tp_rate_lock() from public, anon, authenticated;

drop trigger if exists order_items_tp_rate_lock on public.order_items;
create trigger order_items_tp_rate_lock
  before insert or update of unit_price_at_order_time, product_id on public.order_items
  for each row execute function public.order_items_tp_rate_lock();

-- ============================================================
-- 2. Edits the ERP follows: placed orders too
-- ============================================================

-- As in 20261030000000_erp_link.sql, for an order placed or out for delivery. The ERP
-- does nothing for an order with no live challan.
create or replace function public.order_edits_erp_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_type = 'order.edited'
     and new.payload ->> 'order_status' in ('placed', 'out_for_delivery')
     and (new.payload -> 'before_items') is distinct from (new.payload -> 'after_items')
     and public.erp_linked() then
    execute 'select erp.redo_challan_for_link($1)' using new.entity_id;
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
