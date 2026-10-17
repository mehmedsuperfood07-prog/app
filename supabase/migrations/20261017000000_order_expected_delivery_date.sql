-- Expected delivery date: the date a salesman promises the client while taking
-- the order. Nullable because every order placed before this existed has none,
-- and because an order queued on a phone before it updated arrives without one;
-- the order form itself will not submit without a date.
alter table public.orders
  add column if not exists expected_delivery_date date;

-- create_order_with_items takes the date as an optional fifth argument. The old
-- four-argument version is dropped first: leaving both in place would make a
-- call without the new argument ambiguous. With the default, callers that still
-- send four arguments keep working.
--
-- Everything else is unchanged from 20260918000000_atomic_order_creation.sql:
-- security invoker (the calling salesman's RLS still applies) and one atomic
-- insert of the order, its items and its first status-history row.
drop function if exists public.create_order_with_items(uuid, uuid, jsonb, timestamptz);

create or replace function public.create_order_with_items(
  p_client_id uuid,
  p_salesman_id uuid,
  p_items jsonb,
  p_created_offline_at timestamptz default null,
  p_expected_delivery_date date default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  insert into public.orders (
    client_id, salesman_id, status, created_offline_at, synced_at, expected_delivery_date
  )
  values (
    p_client_id,
    p_salesman_id,
    'placed',
    p_created_offline_at,
    case when p_created_offline_at is not null then now() else null end,
    p_expected_delivery_date
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

grant execute on function public.create_order_with_items(uuid, uuid, jsonb, timestamptz, date)
  to authenticated;

-- Make the API pick up the new column and function signature straight away.
notify pgrst, 'reload schema';
