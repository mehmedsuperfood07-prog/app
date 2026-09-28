-- customer_type is legacy (superseded by client_category/client_subtype in
-- the previous migration) — the app no longer sets it on insert, so its
-- NOT NULL constraint would otherwise block every new client going forward.
alter table public.clients alter column customer_type drop not null;
