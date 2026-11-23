create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  amount numeric(14, 2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense', 'transfer')),
  category text not null check (char_length(category) between 1 and 80),
  date date not null,
  account text not null check (char_length(account) between 1 and 80),
  payment_method text not null check (payment_method in ('M-Pesa', 'Cash', 'Bank', 'Debit card', 'Credit card', 'Other')),
  notes text not null default '' check (char_length(notes) <= 500),
  receipt_path text,
  receipt_name text,
  receipt_type text,
  search_document tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(category, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(account, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(payment_method, '')), 'C') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(notes, '')), 'D')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (receipt_path is null and receipt_name is null and receipt_type is null) or
    (receipt_path is not null and receipt_name is not null and receipt_type is not null)
  )
);

create table if not exists public.transaction_summaries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_income numeric(18, 2) not null default 0 check (total_income >= 0),
  total_expenses numeric(18, 2) not null default 0 check (total_expenses >= 0),
  transaction_count bigint not null default 0 check (transaction_count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc, id desc);
create index if not exists transactions_user_amount_idx
  on public.transactions (user_id, amount desc, id desc);
create index if not exists transactions_user_title_idx
  on public.transactions (user_id, title, id);
create index if not exists transactions_user_type_date_idx
  on public.transactions (user_id, type, date desc, id desc);
create index if not exists transactions_user_category_date_idx
  on public.transactions (user_id, category, date desc, id desc);
create index if not exists transactions_user_account_date_idx
  on public.transactions (user_id, account, date desc, id desc);
create index if not exists transactions_search_document_idx
  on public.transactions using gin (search_document);

alter table public.transactions enable row level security;
alter table public.transaction_summaries enable row level security;

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own on public.transactions
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists transaction_summaries_select_own on public.transaction_summaries;
create policy transaction_summaries_select_own on public.transaction_summaries
  for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.transactions to authenticated;
grant select on public.transaction_summaries to authenticated;

create or replace function public.apply_transaction_summary_delta(
  p_user_id uuid,
  p_income_delta numeric,
  p_expense_delta numeric,
  p_count_delta bigint
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.transaction_summaries (
    user_id,
    total_income,
    total_expenses,
    transaction_count,
    updated_at
  )
  values (
    p_user_id,
    greatest(0, p_income_delta),
    greatest(0, p_expense_delta),
    greatest(0, p_count_delta),
    now()
  )
  on conflict (user_id) do update
  set total_income = greatest(0, transaction_summaries.total_income + p_income_delta),
      total_expenses = greatest(0, transaction_summaries.total_expenses + p_expense_delta),
      transaction_count = greatest(0, transaction_summaries.transaction_count + p_count_delta),
      updated_at = now();
$$;

create or replace function public.update_transaction_summary()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_income numeric := 0;
  v_old_expense numeric := 0;
  v_new_income numeric := 0;
  v_new_expense numeric := 0;
begin
  if tg_op <> 'INSERT' then
    v_old_income := case when old.type = 'income' then old.amount else 0 end;
    v_old_expense := case when old.type = 'expense' then old.amount else 0 end;
    perform public.apply_transaction_summary_delta(
      old.user_id,
      -v_old_income,
      -v_old_expense,
      -1
    );
  end if;

  if tg_op <> 'DELETE' then
    v_new_income := case when new.type = 'income' then new.amount else 0 end;
    v_new_expense := case when new.type = 'expense' then new.amount else 0 end;
    perform public.apply_transaction_summary_delta(
      new.user_id,
      v_new_income,
      v_new_expense,
      1
    );
    return new;
  end if;

  return old;
end;
$$;

create or replace function public.set_transaction_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.apply_transaction_summary_delta(uuid, numeric, numeric, bigint) from public, anon, authenticated;
revoke all on function public.update_transaction_summary() from public, anon, authenticated;
revoke all on function public.set_transaction_updated_at() from public, anon, authenticated;

drop trigger if exists transactions_summary_delta on public.transactions;
create trigger transactions_summary_delta
  after insert or update or delete on public.transactions
  for each row execute function public.update_transaction_summary();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_transaction_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transaction-receipts',
  'transaction-receipts',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 1048576,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists transaction_receipts_select_own on storage.objects;
create policy transaction_receipts_select_own on storage.objects
  for select to authenticated using (
    bucket_id = 'transaction-receipts' and
    (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists transaction_receipts_insert_own on storage.objects;
create policy transaction_receipts_insert_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'transaction-receipts' and
    (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists transaction_receipts_delete_own on storage.objects;
create policy transaction_receipts_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'transaction-receipts' and
    (storage.foldername(name))[1] = (select auth.uid())::text
  );
