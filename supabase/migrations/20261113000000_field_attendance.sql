-- Field staff attendance (client, 2026-11-08): the order app's side. The check-in itself is in
-- the ERP (erp.field_check_in), which keeps attendance.
--
-- Being in an area proves little: a salesman who lives there could mark from bed. So staff check
-- in at a shop, and that needs each shop's location. A salesman saves it while standing there;
-- it counts only once the office has confirmed it, or anyone could save their own home.

-- A login for staff placed in a shop, who only mark attendance.
alter type public.user_role add value if not exists 'assistant';

create table public.client_locations (
  client_id uuid primary key references public.clients (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m integer,
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  saved_by uuid default auth.uid() references public.profiles (id) on delete set null,
  saved_at timestamptz not null default now(),
  confirmed_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz
);

alter table public.client_locations enable row level security;
-- Written only through the functions below.
create policy client_locations_select on public.client_locations
  for select using (public.is_own_client(client_id) or public.is_admin());
grant select on public.client_locations to authenticated;

-- A salesman, standing at their own shop. Waits for the office; a confirmed location is locked.
create function public.save_client_location(p_client uuid, p_lat double precision, p_lng double precision, p_accuracy integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_own_client(p_client)) then
    raise exception 'That shop isn''t one of yours.' using errcode = '42501';
  end if;
  if p_accuracy is null or p_accuracy > 50 then
    raise exception 'The location isn''t exact enough (about % metres). Step outside and try again.', coalesce(p_accuracy::text, '?') using errcode = '22023';
  end if;
  if exists (select 1 from public.client_locations where client_id = p_client and status = 'confirmed') then
    raise exception 'This shop''s location is already confirmed. Ask the office if it has moved.' using errcode = '22023';
  end if;
  insert into public.client_locations (client_id, latitude, longitude, accuracy_m, status)
  values (p_client, p_lat, p_lng, p_accuracy, 'pending')
  on conflict (client_id) do update
    set latitude = excluded.latitude, longitude = excluded.longitude, accuracy_m = excluded.accuracy_m,
        saved_by = auth.uid(), saved_at = now();
end;
$$;

-- The office confirms a saved location, or throws it away so it can be saved again.
create function public.review_client_location(p_client uuid, p_confirm boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the office can confirm a shop''s location.' using errcode = '42501';
  end if;
  if p_confirm then
    update public.client_locations set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now() where client_id = p_client;
    if not found then
      raise exception 'That shop has no location saved.' using errcode = '22023';
    end if;
  else
    delete from public.client_locations where client_id = p_client;
  end if;
end;
$$;

-- The office sets a location itself (from a map), confirmed at once.
create function public.admin_set_client_location(p_client uuid, p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the office can set a shop''s location.' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null or p_lat not between 23 and 38 or p_lng not between 60 and 78 then
    raise exception 'Those don''t look like map coordinates in Pakistan. Copy them from the map, like 31.5204, 74.3587.' using errcode = '22023';
  end if;
  insert into public.client_locations (client_id, latitude, longitude, status, confirmed_by, confirmed_at)
  values (p_client, p_lat, p_lng, 'confirmed', auth.uid(), now())
  on conflict (client_id) do update
    set latitude = excluded.latitude, longitude = excluded.longitude, accuracy_m = null, status = 'confirmed',
        saved_by = auth.uid(), saved_at = now(), confirmed_by = auth.uid(), confirmed_at = now();
end;
$$;

-- The check-in photos: private. Each person writes only into their own folder.
insert into storage.buckets (id, name, public) values ('field-attendance', 'field-attendance', false)
on conflict (id) do nothing;

create policy field_attendance_own_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'field-attendance' and (storage.foldername(name))[1] = auth.uid()::text);
create policy field_attendance_own_update on storage.objects
  for update to authenticated
  using (bucket_id = 'field-attendance' and (storage.foldername(name))[1] = auth.uid()::text);
create policy field_attendance_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'field-attendance' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));

revoke all on function public.save_client_location(uuid, double precision, double precision, integer) from public;
revoke all on function public.review_client_location(uuid, boolean) from public;
revoke all on function public.admin_set_client_location(uuid, double precision, double precision) from public;
grant execute on function public.save_client_location(uuid, double precision, double precision, integer) to authenticated;
grant execute on function public.review_client_location(uuid, boolean) to authenticated;
grant execute on function public.admin_set_client_location(uuid, double precision, double precision) to authenticated;
