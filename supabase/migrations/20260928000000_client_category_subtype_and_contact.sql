-- Replaces the flat customer_type classification with a two-level one
-- (category -> subtype) per the client's own taxonomy, and adds a named
-- contact person to each client — a specific individual's name,
-- designation, and mobile number, separate from the store's own phone.
--
-- customer_type is left in place, untouched, rather than dropped: it's
-- a live production table and this way nothing is destroyed if the new
-- columns need adjusting later. The app stops reading/writing it after
-- this migration ships.

create type public.client_category as enum ('retailer', 'horeca', 'corporate');

create type public.client_subtype as enum (
  -- retailer
  'imt', 'lmt', 'modern_trade', 'large_grocery', 'convenience_shop', 'karyana_store',
  -- horeca
  'restaurant', 'catering', 'pakwan_centre', 'cafe', 'marquee',
  -- corporate
  'hospital', 'university', 'college', 'industry', 'manufacturer'
);

alter table public.clients
  add column client_category public.client_category,
  add column client_subtype public.client_subtype,
  add column contact_person_name text,
  add column contact_person_designation text,
  add column contact_person_phone text;

-- Best-effort backfill from the old single-level type, so nothing is
-- left unclassified. These are judgment calls, not exact equivalents —
-- review them (and correct where wrong) from the client edit screen:
--   general_store     -> Retailer / Karyana Store  (closest existing analog)
--   departmental_store -> Retailer / Modern Trade
--   bakery            -> HORECA / Cafe
--   factory_canteen   -> Corporate / Industry
--   distributor       -> Retailer / Modern Trade
update public.clients set client_category = 'retailer', client_subtype = 'karyana_store' where customer_type = 'general_store';
update public.clients set client_category = 'retailer', client_subtype = 'modern_trade' where customer_type = 'departmental_store';
update public.clients set client_category = 'horeca', client_subtype = 'cafe' where customer_type = 'bakery';
update public.clients set client_category = 'corporate', client_subtype = 'industry' where customer_type = 'factory_canteen';
update public.clients set client_category = 'retailer', client_subtype = 'modern_trade' where customer_type = 'distributor';

-- Guards against a subtype from the wrong category ever being saved,
-- regardless of which path writes the row (app, RPC, or a direct
-- REST/SQL call) — RLS only checks row ownership, never column values.
alter table public.clients add constraint clients_subtype_matches_category check (
  (client_category is null and client_subtype is null)
  or (client_category = 'retailer' and client_subtype in ('imt', 'lmt', 'modern_trade', 'large_grocery', 'convenience_shop', 'karyana_store'))
  or (client_category = 'horeca' and client_subtype in ('restaurant', 'catering', 'pakwan_centre', 'cafe', 'marquee'))
  or (client_category = 'corporate' and client_subtype in ('hospital', 'university', 'college', 'industry', 'manufacturer'))
);
