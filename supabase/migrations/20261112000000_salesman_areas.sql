-- Salesman areas (client, 2026-11-08), and telling apart shops with the same name.
--
-- A salesman's customers are tied to him one by one (clients.assigned_salesman_id), and that is
-- what decides who he can see. salesman_areas only says which areas he covers. So changing a
-- salesman's area has to move that area's customers too, in one transaction, or he would go on
-- seeing his old customers and none of the new ones.

-- Sets exactly which areas a salesman covers. With p_move_customers, the customers of any area
-- he newly takes on come to him. Returns how many customers moved.
create function public.admin_set_salesman_areas(p_salesman uuid, p_area_ids uuid[], p_move_customers boolean default true)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_areas uuid[] := coalesce(p_area_ids, '{}');
  v_new uuid[];
  v_moved integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change a salesman''s areas.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_salesman and role = 'salesman') then
    raise exception 'Areas can only be given to a salesman.' using errcode = '22023';
  end if;

  v_new := array(select a from unnest(v_areas) a
                 where not exists (select 1 from public.salesman_areas s where s.salesman_id = p_salesman and s.area_id = a));

  delete from public.salesman_areas where salesman_id = p_salesman and area_id <> all(v_areas);
  insert into public.salesman_areas (salesman_id, area_id)
    select p_salesman, a from unnest(v_new) a on conflict do nothing;

  if p_move_customers and cardinality(v_new) > 0 then
    update public.clients set assigned_salesman_id = p_salesman
    where area_id = any(v_new) and assigned_salesman_id is distinct from p_salesman;
    get diagnostics v_moved = row_count;
  end if;
  return v_moved;
end;
$$;

-- Two salesmen exchange areas and those areas' customers, in one go. An area they both cover,
-- and a customer of theirs outside their areas, stay as they are.
create function public.admin_swap_salesman_areas(p_a uuid, p_b uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_a uuid[];
  v_b uuid[];
  v_moved integer;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change a salesman''s areas.' using errcode = '42501';
  end if;
  if p_a is null or p_b is null or p_a = p_b then
    raise exception 'Choose two different salesmen.' using errcode = '22023';
  end if;
  if (select count(*) from public.profiles where id in (p_a, p_b) and role = 'salesman') <> 2 then
    raise exception 'Areas can only be swapped between salesmen.' using errcode = '22023';
  end if;

  v_a := array(select area_id from public.salesman_areas s where s.salesman_id = p_a
               and not exists (select 1 from public.salesman_areas o where o.salesman_id = p_b and o.area_id = s.area_id));
  v_b := array(select area_id from public.salesman_areas s where s.salesman_id = p_b
               and not exists (select 1 from public.salesman_areas o where o.salesman_id = p_a and o.area_id = s.area_id));

  delete from public.salesman_areas where (salesman_id = p_a and area_id = any(v_a)) or (salesman_id = p_b and area_id = any(v_b));
  insert into public.salesman_areas (salesman_id, area_id)
    select p_b, a from unnest(v_a) a
    union all
    select p_a, b from unnest(v_b) b;

  update public.clients
  set assigned_salesman_id = case when assigned_salesman_id = p_a then p_b else p_a end
  where (assigned_salesman_id = p_a and area_id = any(v_a)) or (assigned_salesman_id = p_b and area_id = any(v_b));
  get diagnostics v_moved = row_count;
  return v_moved;
end;
$$;

-- Is there already a shop of this name in this area that this one can't be told apart from?
-- Hundreds of shops share a name, so the same name is fine: it is the same name in the same area
-- with the same address, or with no address on one of them, that can't be told apart. Definer
-- rights, because a salesman can only see his own customers; it answers yes or no and no more.
create function public.client_name_clash(p_name text, p_area uuid, p_address text, p_except uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clients c
    where c.active
      and lower(trim(c.name)) = lower(trim(p_name))
      and c.area_id is not distinct from p_area
      and c.id is distinct from p_except
      and (coalesce(trim(c.address), '') = ''
           or coalesce(trim(p_address), '') = ''
           or lower(trim(c.address)) = lower(trim(p_address)))
  );
$$;

revoke all on function public.admin_set_salesman_areas(uuid, uuid[], boolean) from public;
revoke all on function public.admin_swap_salesman_areas(uuid, uuid) from public;
revoke all on function public.client_name_clash(text, uuid, text, uuid) from public;
grant execute on function public.admin_set_salesman_areas(uuid, uuid[], boolean) to authenticated;
grant execute on function public.admin_swap_salesman_areas(uuid, uuid) to authenticated;
grant execute on function public.client_name_clash(text, uuid, text, uuid) to authenticated;
