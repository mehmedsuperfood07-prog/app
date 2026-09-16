-- Web Push subscriptions — one row per browser/device a user has
-- enabled notifications on. Sending happens server-side with the
-- service-role client (lib/push.ts), which needs to read across users
-- (e.g. "notify every admin"), so RLS here only needs to cover what a
-- user manages for themselves: their own subscriptions.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_own on public.push_subscriptions
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
