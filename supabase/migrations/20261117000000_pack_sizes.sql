-- Pack sizes the office keeps itself (owner, 2026-11-21). The product form offered only 1, 2
-- and 5 kg, written into the code; the business also packs 25 and 50 kg, and new sizes come
-- along. Now the sizes are a list in the database that the admin adds to from the product form.
--
-- Products keep their pack size as before (the number, with the unit beside it), so orders,
-- invoices and the ERP don't change. The list only decides what the product form offers.

create table public.pack_sizes (
  id uuid primary key default gen_random_uuid(),
  unit public.product_unit not null,
  size text not null check (length(btrim(size)) between 1 and 20),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (unit, size)
);

alter table public.pack_sizes enable row level security;
create policy pack_sizes_select_staff on public.pack_sizes
  for select using (public.current_user_role() in ('admin', 'salesman'));
-- Changes go through the functions below (admin only).

insert into public.pack_sizes (unit, size)
select 'kg'::public.product_unit, s from unnest(array['1', '2', '5', '10', '25', '50']) s
on conflict do nothing;

-- Every size a product already uses stays offered.
insert into public.pack_sizes (unit, size)
select distinct unit, btrim(pack_size) from public.products where btrim(pack_size) <> ''
on conflict do nothing;

-- "25", "25 kg" and " 25KG " for kg are all 25: the unit is shown beside the size anyway.
create function public.clean_pack_size(p_unit public.product_unit, p_size text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(btrim(coalesce(p_size, '')), '\s*' || p_unit::text || '$', '', 'i'));
$$;

-- Adds a size, or brings back a hidden one. Returns the size as stored.
create function public.add_pack_size(p_unit public.product_unit, p_size text)
returns public.pack_sizes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_size text := public.clean_pack_size(p_unit, p_size);
  v_row public.pack_sizes;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can add pack sizes.' using errcode = '42501';
  end if;
  if v_size = '' then
    raise exception 'Write the pack size, for example 25.' using errcode = '22023';
  end if;
  if length(v_size) > 20 then
    raise exception 'That pack size is too long.' using errcode = '22023';
  end if;
  select * into v_row from public.pack_sizes where unit = p_unit and lower(size) = lower(v_size);
  if found then
    update public.pack_sizes set active = true where id = v_row.id returning * into v_row;
    return v_row;
  end if;
  insert into public.pack_sizes (unit, size) values (p_unit, v_size) returning * into v_row;
  return v_row;
end;
$$;

-- Hides a size from the product form, or shows it again. Products that use it keep it.
create function public.set_pack_size_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change pack sizes.' using errcode = '42501';
  end if;
  update public.pack_sizes set active = p_active where id = p_id;
end;
$$;

-- Removes a size added by mistake. One that a product uses can only be hidden.
create function public.remove_pack_size(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.pack_sizes;
  v_used integer;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change pack sizes.' using errcode = '42501';
  end if;
  select * into v_row from public.pack_sizes where id = p_id;
  if not found then
    return;
  end if;
  select count(*) into v_used from public.products where unit = v_row.unit and lower(btrim(pack_size)) = lower(v_row.size);
  if v_used > 0 then
    raise exception '% % is used by % product(s), so it can only be hidden.', v_row.size, v_row.unit, v_used using errcode = '22023';
  end if;
  delete from public.pack_sizes where id = p_id;
end;
$$;

revoke all on function public.clean_pack_size(public.product_unit, text), public.add_pack_size(public.product_unit, text),
  public.set_pack_size_active(uuid, boolean), public.remove_pack_size(uuid) from public;
grant execute on function public.add_pack_size(public.product_unit, text), public.set_pack_size_active(uuid, boolean),
  public.remove_pack_size(uuid) to authenticated;
