-- Every client is either paid in cash at delivery or extended credit up
-- to a limit — this is the "credit limit enforcement" question CLAUDE.md
-- section 9 flagged as unconfirmed, now answered by the client directly.
--
-- Existing rows are backfilled from whether they already carry a
-- credit_limit: a limit greater than zero could only mean the business
-- already treats that client as a credit account.
create type public.payment_term as enum ('cash', 'credit');

alter table public.clients add column payment_term public.payment_term not null default 'cash';

update public.clients set payment_term = 'credit' where credit_limit > 0;
