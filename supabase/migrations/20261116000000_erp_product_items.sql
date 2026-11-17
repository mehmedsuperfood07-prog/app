-- A product added here is set up in the ERP by itself (user, 2026-11-17): the ERP gives it its
-- item (SKU, no tax, the accounts of its line, cost 0) through erp.setup_item_for_product (ERP
-- migration 20261122000000_auto_product_items.sql). Before this, a product added after go-live
-- had no ERP item, and its orders showed "Set up first" in the ERP until Accounts set it up by
-- hand.
--
-- The call goes through dynamic SQL, so this migration also runs where there is no ERP. If the
-- ERP can't set it up, the product is still saved and Accounts sets it up on Products and items.

create or replace function public.products_erp_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regprocedure('erp.setup_item_for_product(uuid)') is not null then
    begin
      execute 'select erp.setup_item_for_product($1)' using new.id;
    exception when others then
      raise warning 'The ERP could not set up product %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

revoke execute on function public.products_erp_item() from public, anon, authenticated;

drop trigger if exists products_erp_item on public.products;
create trigger products_erp_item
  after insert on public.products
  for each row execute function public.products_erp_item();
