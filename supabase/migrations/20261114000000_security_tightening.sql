-- Security tightening (2026-11-13), from the security audit after go-live. The guards below
-- apply only to writes a signed-in user makes straight through the API (current_user is
-- 'authenticated' or 'anon'). The app's server (service role) and the database's own
-- security-definer functions, the ERP's included, run as trusted roles and pass as before.

-- 1. New logins take their role only from app_metadata, which only the server (service role)
--    can set when the office creates a staff account (lib/staff.ts). Before this, the role came
--    from user_metadata, which anyone signing up can fill in, so a stranger could make
--    themselves an admin. Anyone else becomes 'office': no order-app data, and no ERP role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := 'office';
  v_given text := new.raw_app_meta_data ->> 'role';
begin
  if v_given is not null and v_given = any (enum_range(null::public.user_role)::text[]) then
    v_role := v_given::public.user_role;
  end if;
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'phone',
    v_role
  );
  return new;
end;
$$;

alter table public.profiles alter column role set default 'office';

-- 2. A salesman may edit his own stores' details, but not their money terms or ownership:
--    the credit limit and payment term drive the ERP's credit control, and the balance comes
--    from the ERP's books.
create or replace function public.guard_client_update()
returns trigger
language plpgsql
set search_path = public   -- not security definer: current_user must be the caller
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if new.credit_limit is distinct from old.credit_limit
     or new.payment_term is distinct from old.payment_term
     or new.current_balance is distinct from old.current_balance
     or new.assigned_salesman_id is distinct from old.assigned_salesman_id
     or new.active is distinct from old.active then
    raise exception 'Only the office can change a shop''s credit limit, payment term, balance, salesman or whether it is active.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists clients_guard_update on public.clients;
create trigger clients_guard_update before update on public.clients
  for each row execute function public.guard_client_update();

-- 3. A rider may only mark his own order delivered once it is out for delivery; nothing else
--    on the order changes (not its shop, salesman or rider). Delivering it makes the ERP's
--    invoice, so the rest must stay as the office set it.
create or replace function public.guard_order_update()
returns trigger
language plpgsql
set search_path = public   -- not security definer: current_user must be the caller
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if not (old.status = 'out_for_delivery' and new.status = 'delivered')
     or (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'A rider can only mark his own order delivered once it is out for delivery.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_guard_update on public.orders;
create trigger orders_guard_update before update on public.orders
  for each row execute function public.guard_order_update();

-- 4. A salesman places orders only in his own name; order lines need a quantity above zero and
--    a price of zero or more (free goods are 0). New rows only: existing ones aren't rechecked.
drop policy if exists orders_insert_own_client on public.orders;
create policy orders_insert_own_client on public.orders
  for insert with check ((public.is_own_client(client_id) and salesman_id = auth.uid()) or public.is_admin());

alter table public.order_items
  add constraint order_items_quantity_positive check (quantity > 0) not valid,
  add constraint order_items_price_not_negative check (unit_price_at_order_time >= 0) not valid;

-- 5. Functions only the app's server uses (with the service role) are no longer callable by
--    anyone else. increment_client_balance had no check at all; next_invoice_number would let
--    anyone use up invoice numbers.
revoke execute on function public.increment_client_balance(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.next_invoice_number() from public, anon, authenticated;

-- 6. Nothing is readable without signing in: the shop-name check and the riders' views
--    (products_rider_view showed product names to anyone with the public key).
revoke execute on function public.client_name_clash(text, uuid, text, uuid) from anon;
revoke select on public.products_rider_view, public.clients_rider_view, public.order_items_rider_view from anon;
revoke execute on function public.create_order_with_items(uuid, uuid, jsonb, timestamptz, date) from anon;

-- 7. Attendance photos: small JPEGs from the phone's camera (lib/attendance.ts), so at most
--    2 MB and images only.
update storage.buckets set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'field-attendance';
