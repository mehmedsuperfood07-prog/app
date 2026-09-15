-- Mehmed Order Manager — initial schema + RLS
-- Data model and RLS rules per CLAUDE.md section 4.

-- ============================================================
-- Enums
-- ============================================================

create type public.user_role as enum ('admin', 'salesman', 'rider');

create type public.customer_type as enum (
  'general_store', 'departmental_store', 'bakery', 'factory_canteen', 'distributor'
);

create type public.product_unit as enum ('kg', 'bag', 'bottle');

create type public.order_status as enum (
  'draft', 'pending_sync', 'placed', 'out_for_delivery', 'delivered', 'cancelled'
);

-- Separate from order_status: tracks the rider's own Picked Up -> On the Way ->
-- Delivered progression on the `deliveries` row, distinct from the order lifecycle.
create type public.delivery_status as enum (
  'assigned', 'picked_up', 'on_the_way', 'delivered'
);

-- ============================================================
-- Tables
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  role public.user_role not null default 'salesman',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.salesman_areas (
  salesman_id uuid not null references public.profiles (id) on delete cascade,
  area_id uuid not null references public.areas (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (salesman_id, area_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer_type public.customer_type not null,
  address text,
  area_id uuid references public.areas (id) on delete set null,
  phone text,
  credit_limit numeric(12, 2) not null default 0,
  current_balance numeric(12, 2) not null default 0,
  assigned_salesman_id uuid references public.profiles (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_area_id_idx on public.clients (area_id);
create index clients_assigned_salesman_id_idx on public.clients (assigned_salesman_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  variant text,
  unit public.product_unit not null,
  pack_size text not null,
  default_price numeric(12, 2) not null,
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.price_overrides (
  client_id uuid not null references public.clients (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  special_price numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  primary key (client_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  salesman_id uuid not null references public.profiles (id),
  status public.order_status not null default 'draft',
  created_offline_at timestamptz,
  synced_at timestamptz,
  rider_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_client_id_idx on public.orders (client_id);
create index orders_salesman_id_idx on public.orders (salesman_id);
create index orders_rider_id_idx on public.orders (rider_id);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity numeric(12, 2) not null,
  -- Snapshot of the price actually charged. Never recompute historical
  -- orders off today's product/price_overrides rows (see CLAUDE.md section 8).
  unit_price_at_order_time numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now()
);

create index order_status_history_order_id_idx on public.order_status_history (order_id);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  rider_id uuid references public.profiles (id),
  status public.delivery_status not null default 'assigned',
  proof_of_delivery_photo_url text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index deliveries_order_id_idx on public.deliveries (order_id);
create index deliveries_rider_id_idx on public.deliveries (rider_id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  invoice_number text not null unique,
  pdf_url text,
  amount numeric(12, 2) not null,
  paid_amount numeric(12, 2) not null default 0,
  due_date date,
  created_at timestamptz not null default now()
);

create index invoices_order_id_idx on public.invoices (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  invoice_id uuid references public.invoices (id),
  amount numeric(12, 2) not null,
  method text,
  recorded_by uuid references public.profiles (id),
  recorded_at timestamptz not null default now()
);

create index payments_client_id_idx on public.payments (client_id);
create index payments_invoice_id_idx on public.payments (invoice_id);

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index integration_events_entity_idx on public.integration_events (entity_type, entity_id);

-- ============================================================
-- updated_at maintenance
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- Auth -> profiles provisioning
-- Admin creates every account via supabase.auth.admin.createUser(),
-- passing full_name/phone/role in user_metadata. This trigger mirrors
-- that into public.profiles so the app never inserts profiles directly.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'salesman')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS helper functions
-- SECURITY DEFINER + fixed search_path so these can be called from
-- policies on other tables without recursing back through RLS.
-- ============================================================

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_own_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clients
    where id = p_client_id and assigned_salesman_id = auth.uid()
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.salesman_areas enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.price_overrides enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.deliveries enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.integration_events enable row level security;

-- profiles: everyone can read their own row; admin reads/writes all.
-- No public sign-up — inserts only happen via the handle_new_user trigger.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_admin_write on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- areas: readable by any signed-in staff, writable by admin only.
create policy areas_select_all on public.areas
  for select using (auth.uid() is not null);

create policy areas_admin_write on public.areas
  for all using (public.is_admin()) with check (public.is_admin());

-- salesman_areas: a salesman sees their own assignments; admin sees/manages all.
create policy salesman_areas_select_own on public.salesman_areas
  for select using (salesman_id = auth.uid() or public.is_admin());

create policy salesman_areas_admin_write on public.salesman_areas
  for all using (public.is_admin()) with check (public.is_admin());

-- clients: a salesman can select/insert/update only their own clients
-- (new clients are created already assigned to them). Admin: full access.
create policy clients_select_own on public.clients
  for select using (assigned_salesman_id = auth.uid() or public.is_admin());

create policy clients_insert_own on public.clients
  for insert with check (assigned_salesman_id = auth.uid() or public.is_admin());

create policy clients_update_own on public.clients
  for update using (assigned_salesman_id = auth.uid() or public.is_admin())
  with check (assigned_salesman_id = auth.uid() or public.is_admin());

create policy clients_admin_delete on public.clients
  for delete using (public.is_admin());

-- products: salesman + admin can read the full catalog (incl. price) to
-- build orders; only admin manages the catalog. Riders read via
-- products_rider_view below (no price column) instead of this table.
create policy products_select_staff on public.products
  for select using (public.current_user_role() in ('admin', 'salesman'));

create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- price_overrides: salesman can read overrides for their own clients only.
create policy price_overrides_select_own on public.price_overrides
  for select using (public.is_own_client(client_id) or public.is_admin());

create policy price_overrides_admin_write on public.price_overrides
  for all using (public.is_admin()) with check (public.is_admin());

-- orders: salesman select/insert scoped to their own clients; rider
-- select/update scoped to rider_id = auth.uid(); admin full access.
create policy orders_select_scope on public.orders
  for select using (
    public.is_own_client(client_id)
    or rider_id = auth.uid()
    or public.is_admin()
  );

create policy orders_insert_own_client on public.orders
  for insert with check (public.is_own_client(client_id) or public.is_admin());

create policy orders_rider_update on public.orders
  for update using (rider_id = auth.uid() or public.is_admin())
  with check (rider_id = auth.uid() or public.is_admin());

create policy orders_admin_delete on public.orders
  for delete using (public.is_admin());

-- order_items: visibility/insert follows the parent order's scope.
create policy order_items_select_scope on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (public.is_own_client(o.client_id) or o.rider_id = auth.uid() or public.is_admin())
    )
  );

create policy order_items_insert_own on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (public.is_own_client(o.client_id) or public.is_admin())
    )
  );

create policy order_items_admin_write on public.order_items
  for update using (public.is_admin()) with check (public.is_admin());

create policy order_items_admin_delete on public.order_items
  for delete using (public.is_admin());

-- order_status_history: readable/insertable by whoever can see the parent
-- order; this is the audit trail, so no update/delete policy for anyone
-- but admin.
create policy order_status_history_select_scope on public.order_status_history
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and (public.is_own_client(o.client_id) or o.rider_id = auth.uid() or public.is_admin())
    )
  );

create policy order_status_history_insert_scope on public.order_status_history
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and (public.is_own_client(o.client_id) or o.rider_id = auth.uid() or public.is_admin())
    )
  );

create policy order_status_history_admin_write on public.order_status_history
  for update using (public.is_admin()) with check (public.is_admin());

create policy order_status_history_admin_delete on public.order_status_history
  for delete using (public.is_admin());

-- deliveries: rider select/update scoped to rider_id = auth.uid(); admin all.
create policy deliveries_rider_scope on public.deliveries
  for select using (rider_id = auth.uid() or public.is_admin());

create policy deliveries_rider_update on public.deliveries
  for update using (rider_id = auth.uid() or public.is_admin())
  with check (rider_id = auth.uid() or public.is_admin());

create policy deliveries_admin_write on public.deliveries
  for insert with check (public.is_admin());

create policy deliveries_admin_delete on public.deliveries
  for delete using (public.is_admin());

-- invoices, payments: ledger detail — admin/office only. Salesmen see a
-- client's current_balance via the clients row itself, not this history.
create policy invoices_admin_only on public.invoices
  for all using (public.is_admin()) with check (public.is_admin());

create policy payments_admin_only on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- integration_events: internal log, admin-readable; writes happen from
-- trusted server contexts (service role bypasses RLS entirely).
create policy integration_events_admin_only on public.integration_events
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Column-restricted views for riders
-- Riders must see client address and order item names to run a delivery,
-- but never pricing or ledger data (ledger = clients.credit_limit /
-- current_balance, invoices, payments). Row policies can't hide columns,
-- so these views project a safe subset of columns and are defined with
-- the default (non-invoker) security, meaning they run with the view
-- owner's privileges against the base tables and enforce their own
-- rider_id = auth.uid() scoping below — they intentionally do not rely
-- on the base-table RLS above.
-- ============================================================

create view public.products_rider_view as
  select id, name, variant, unit, pack_size, category, active
  from public.products
  where active = true;

grant select on public.products_rider_view to authenticated;

create view public.clients_rider_view as
  select c.id, c.name, c.address, c.area_id, c.phone, c.customer_type
  from public.clients c
  where exists (
    select 1 from public.orders o
    where o.client_id = c.id and o.rider_id = auth.uid()
  );

grant select on public.clients_rider_view to authenticated;

-- ============================================================
-- Seed data — areas (CLAUDE.md section 1)
-- ============================================================

insert into public.areas (name) values
  ('Gulberg'),
  ('Model Town'),
  ('Johar Town'),
  ('DHA'),
  ('Township'),
  ('Shahdera'),
  ('Allama Iqbal Town'),
  ('Faisal Town');
