alter table public.transactions
  add column if not exists description text,
  add column if not exists merchant text,
  add column if not exists original_amount numeric(18, 2),
  add column if not exists original_currency text check (
    original_currency is null or original_currency ~ '^[A-Z]{3}$'
  ),
  add column if not exists transaction_status text not null default 'posted'
    check (transaction_status in ('pending', 'posted', 'void', 'failed', 'reversed')),
  add column if not exists posted_date date,
  add column if not exists provider text,
  add column if not exists provider_reference text,
  add column if not exists imported_at timestamptz,
  add column if not exists reconciliation_status text not null default 'manual'
    check (reconciliation_status in ('manual', 'matched', 'imported', 'pending_review', 'ignored')),
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb,
  add column if not exists fallback_duplicate_hash text;

create table if not exists public.transaction_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null references public.financial_connections (id) on delete cascade,
  sync_mode text not null check (sync_mode in ('initial', 'incremental', 'retry', 'manual')),
  status text not null check (status in ('queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled')),
  cursor text,
  next_cursor text,
  attempt integer not null default 1 check (attempt between 1 and 10),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  records_received integer not null default 0 check (records_received >= 0),
  records_imported integer not null default 0 check (records_imported >= 0),
  records_updated integer not null default 0 check (records_updated >= 0),
  records_matched integer not null default 0 check (records_matched >= 0),
  duplicates_skipped integer not null default 0 check (duplicates_skipped >= 0),
  failed_records integer not null default 0 check (failed_records >= 0),
  error_code text check (char_length(error_code) <= 80),
  error_summary text check (char_length(error_summary) <= 500),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint transaction_sync_run_completed_after_start
    check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table if not exists public.transaction_sync_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  run_id uuid not null references public.transaction_sync_runs (id) on delete cascade,
  connection_id uuid not null references public.financial_connections (id) on delete cascade,
  external_transaction_id text,
  fallback_duplicate_hash text,
  transaction_id uuid references public.transactions (id) on delete set null,
  action text not null check (action in ('imported', 'updated', 'matched', 'duplicate', 'failed', 'pending_review')),
  error_code text check (char_length(error_code) <= 80),
  error_summary text check (char_length(error_summary) <= 500),
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists transactions_external_import_idx
  on public.transactions (provider_connection_id, external_transaction_id);
create index if not exists transactions_fallback_hash_idx
  on public.transactions (user_id, fallback_duplicate_hash)
  where fallback_duplicate_hash is not null;
create index if not exists transactions_source_provider_idx
  on public.transactions (user_id, source, provider, date desc);
create index if not exists transaction_sync_runs_connection_created_idx
  on public.transaction_sync_runs (connection_id, created_at desc);
create index if not exists transaction_sync_items_run_created_idx
  on public.transaction_sync_items (run_id, created_at desc);

alter table public.transaction_sync_runs enable row level security;
alter table public.transaction_sync_items enable row level security;

drop policy if exists transaction_sync_runs_select_own on public.transaction_sync_runs;
create policy transaction_sync_runs_select_own on public.transaction_sync_runs
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists transaction_sync_runs_insert_own on public.transaction_sync_runs;
create policy transaction_sync_runs_insert_own on public.transaction_sync_runs
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists transaction_sync_runs_update_own on public.transaction_sync_runs;
create policy transaction_sync_runs_update_own on public.transaction_sync_runs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists transaction_sync_items_select_own on public.transaction_sync_items;
create policy transaction_sync_items_select_own on public.transaction_sync_items
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists transaction_sync_items_insert_own on public.transaction_sync_items;
create policy transaction_sync_items_insert_own on public.transaction_sync_items
  for insert to authenticated with check (user_id = (select auth.uid()));

revoke all on public.transaction_sync_runs, public.transaction_sync_items
  from anon, authenticated;
grant select, insert, update on public.transaction_sync_runs to authenticated;
grant select, insert on public.transaction_sync_items to authenticated;
