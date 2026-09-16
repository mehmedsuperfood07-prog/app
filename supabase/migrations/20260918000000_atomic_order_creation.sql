-- Fix a latent atomicity gap in order creation, surfaced by the offline
-- sync flow (roadmap step 7): createOrder previously inserted the order
-- row, then order_items, then order_status_history as three separate
-- requests. A concurrent reader (e.g. the salesman's own device pulling
-- fresh data right after queuing an order) could catch the order between
-- those steps — a real row with zero items, showing a Rs 0 total. This
-- was always possible in principle; the pull-based offline flow just
-- made it likely enough to actually observe.
--
-- security invoker (the default, stated explicitly): this runs as the
-- calling salesman, so orders_insert_own_client / order_items_insert_own
-- RLS still apply exactly as before. This function only adds atomicity,
-- not a privilege escalation.
create or replace function public.create_order_with_items(
  p_client_id uuid,
  p_salesman_id uuid,
  p_items jsonb,
  p_created_offline_at timestamptz default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  insert into public.orders (client_id, salesman_id, status, created_offline_at, synced_at)
  values (
    p_client_id,
    p_salesman_id,
    'placed',
    p_created_offline_at,
    case when p_created_offline_at is not null then now() else null end
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price_at_order_time)
  select
    v_order_id,
    (item ->> 'product_id')::uuid,
    (item ->> 'quantity')::numeric,
    (item ->> 'unit_price')::numeric
  from jsonb_array_elements(p_items) as item;

  insert into public.order_status_history (order_id, status, changed_by)
  values (v_order_id, 'placed', p_salesman_id);

  return v_order_id;
end;
$$;

grant execute on function public.create_order_with_items(uuid, uuid, jsonb, timestamptz)
  to authenticated;
