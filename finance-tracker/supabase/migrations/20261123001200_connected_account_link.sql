alter table public.financial_connected_accounts
  add column if not exists linked_financial_account_id uuid
    references public.financial_accounts (id) on delete set null;

create or replace function public.validate_connected_account_ownership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_connection_owner uuid;
  v_account_owner uuid;
begin
  select user_id into v_connection_owner
  from public.financial_connections
  where id = new.connection_id;
  if not found or v_connection_owner <> new.user_id then
    raise exception 'The selected financial connection does not belong to this user.';
  end if;

  if new.linked_financial_account_id is not null then
    select user_id into v_account_owner
    from public.financial_accounts
    where id = new.linked_financial_account_id;
    if not found or v_account_owner <> new.user_id then
      raise exception 'The selected financial account does not belong to this user.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_connected_account_ownership()
  from public, anon, authenticated;

drop trigger if exists financial_connected_accounts_validate_ownership on public.financial_connected_accounts;
create trigger financial_connected_accounts_validate_ownership
  before insert or update of user_id, connection_id, linked_financial_account_id
  on public.financial_connected_accounts
  for each row execute function public.validate_connected_account_ownership();
