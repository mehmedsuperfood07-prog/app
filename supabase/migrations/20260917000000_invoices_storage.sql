-- Invoice PDFs (roadmap step 6): storage bucket + a sequence for
-- human-readable invoice numbers.
--
-- The bucket is private — invoices carry client/pricing data that only
-- admin may see (CLAUDE.md section 2), matching the invoices table's
-- admin-only RLS in the initial migration. Server code reads/writes
-- objects here via the service-role client (see lib/invoices.ts) and
-- hands out short-lived signed URLs for download instead of a public URL.

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

create policy invoices_bucket_admin_all on storage.objects
  for all using (bucket_id = 'invoices' and public.is_admin())
  with check (bucket_id = 'invoices' and public.is_admin());

create sequence public.invoice_number_seq start 1;

create or replace function public.next_invoice_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'INV-' || to_char(now(), 'YYYYMM') || '-'
    || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
$$;

grant execute on function public.next_invoice_number() to authenticated, service_role;

-- Atomic so concurrent invoices for the same client can't clobber each
-- other's balance update the way a read-then-write from application code
-- could.
create or replace function public.increment_client_balance(p_client_id uuid, p_amount numeric)
returns void
language sql
security definer
set search_path = public
as $$
  update public.clients set current_balance = current_balance + p_amount
  where id = p_client_id;
$$;

grant execute on function public.increment_client_balance(uuid, numeric) to authenticated, service_role;
