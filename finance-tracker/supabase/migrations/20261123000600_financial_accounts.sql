create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  account_type text not null check (account_type in ('cash', 'mpesa', 'bank', 'savings', 'other')),
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  opening_balance numeric(14, 2) not null default 0 check (opening_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.transactions
  add column if not exists account_id uuid references public.financial_accounts (id) on delete set null,
  add column if not exists transfer_account_id uuid references public.financial_accounts (id) on delete set null,
  add column if not exists transfer_account text;

insert into public.financial_accounts (user_id, name, account_type)
select distinct
  transaction_rows.user_id,
  account_names.name,
  case
    when lower(account_names.name) like '%m-pesa%' or lower(account_names.name) like '%mpesa%' then 'mpesa'
    when lower(account_names.name) like '%cash%' then 'cash'
    when lower(account_names.name) like '%saving%' then 'savings'
    when lower(account_names.name) like '%bank%' or lower(account_names.name) like '%kcb%' then 'bank'
    else 'other'
  end
from public.transactions as transaction_rows
cross join lateral (
  values (transaction_rows.account), (transaction_rows.transfer_account)
) as account_names(name)
where account_names.name is not null and char_length(account_names.name) between 1 and 80
on conflict (user_id, name) do nothing;

update public.transactions as transaction_rows
set account_id = financial_accounts.id
from public.financial_accounts
where transaction_rows.user_id = financial_accounts.user_id
  and transaction_rows.account = financial_accounts.name
  and transaction_rows.account_id is null;

update public.transactions as transaction_rows
set transfer_account_id = financial_accounts.id
from public.financial_accounts
where transaction_rows.user_id = financial_accounts.user_id
  and transaction_rows.transfer_account = financial_accounts.name
  and transaction_rows.transfer_account_id is null;

alter table public.transactions
  drop constraint if exists transactions_transfer_destination_type_check;
alter table public.transactions
  add constraint transactions_transfer_destination_type_check
  check (
    type = 'transfer' or
    (transfer_account_id is null and transfer_account is null)
  );

create index if not exists transactions_user_account_date_idx
  on public.transactions (user_id, account_id, date desc, id desc);
create index if not exists transactions_user_transfer_account_date_idx
  on public.transactions (user_id, transfer_account_id, date desc, id desc);

alter table public.financial_accounts enable row level security;

drop policy if exists financial_accounts_select_own on public.financial_accounts;
create policy financial_accounts_select_own on public.financial_accounts
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists financial_accounts_insert_own on public.financial_accounts;
create policy financial_accounts_insert_own on public.financial_accounts
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists financial_accounts_update_own on public.financial_accounts;
create policy financial_accounts_update_own on public.financial_accounts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists financial_accounts_delete_own on public.financial_accounts;
create policy financial_accounts_delete_own on public.financial_accounts
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.financial_accounts to authenticated;

create or replace function public.validate_transaction_account_ownership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_name text;
  v_transfer_account_name text;
begin
  if new.account_id is not null then
    select name into v_account_name
    from public.financial_accounts
    where id = new.account_id and user_id = new.user_id;
    if not found then
      raise exception 'The selected account does not belong to this user.';
    end if;
    new.account := v_account_name;
  end if;

  if new.transfer_account_id is not null then
    select name into v_transfer_account_name
    from public.financial_accounts
    where id = new.transfer_account_id and user_id = new.user_id;
    if not found then
      raise exception 'The selected destination account does not belong to this user.';
    end if;
    new.transfer_account := v_transfer_account_name;
  end if;

  if new.transfer_account_id is not null and new.transfer_account_id = new.account_id then
    raise exception 'A transfer destination must differ from its source account.';
  end if;

  return new;
end;
$$;

create or replace function public.sync_financial_account_name()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update public.transactions
  set account = new.name
  where user_id = new.user_id and account_id = new.id and account <> new.name;

  update public.transactions
  set transfer_account = new.name
  where user_id = new.user_id
    and transfer_account_id = new.id
    and transfer_account is distinct from new.name;

  return new;
end;
$$;

create or replace function public.get_financial_accounts()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', account.id,
        'name', account.name,
        'account_type', account.account_type,
        'currency', account.currency,
        'opening_balance', account.opening_balance,
        'balance', account.opening_balance + coalesce(movements.balance_delta, 0),
        'transaction_count', coalesce(movements.transaction_count, 0)
      )
      order by account.name
    ),
    '[]'::jsonb
  )
  from public.financial_accounts as account
  left join lateral (
    select sum(movement.amount_delta) as balance_delta, count(*) as transaction_count
    from (
      select
        case
          when tx.type = 'income' then tx.amount
          else -tx.amount
        end as amount_delta
      from public.transactions as tx
      where tx.user_id = account.user_id
        and tx.account_id = account.id
      union all
      select tx.amount as amount_delta
      from public.transactions as tx
      where tx.user_id = account.user_id
        and tx.transfer_account_id = account.id
        and tx.type = 'transfer'
    ) as movement
  ) as movements on true
  where account.user_id = (select auth.uid());
$$;

drop trigger if exists transactions_validate_account_ownership on public.transactions;
create trigger transactions_validate_account_ownership
  before insert or update of user_id, account_id, transfer_account_id on public.transactions
  for each row execute function public.validate_transaction_account_ownership();

drop trigger if exists financial_accounts_sync_name on public.financial_accounts;
create trigger financial_accounts_sync_name
  after update of name on public.financial_accounts
  for each row when (old.name is distinct from new.name)
  execute function public.sync_financial_account_name();

drop trigger if exists financial_accounts_set_updated_at on public.financial_accounts;
create trigger financial_accounts_set_updated_at
  before update on public.financial_accounts
  for each row execute function public.set_transaction_updated_at();

revoke all on function public.validate_transaction_account_ownership() from public, anon, authenticated;
revoke all on function public.sync_financial_account_name() from public, anon, authenticated;
revoke all on function public.get_financial_accounts() from public, anon;
grant execute on function public.get_financial_accounts() to authenticated;
