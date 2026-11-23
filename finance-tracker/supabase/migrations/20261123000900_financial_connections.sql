create table if not exists public.financial_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (
    provider in (
      'mpesa',
      'equity',
      'kcb',
      'cooperative',
      'visa',
      'mastercard',
      'paypal',
      'bank',
      'other'
    )
  ),
  provider_connection_id text,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  institution_name text not null default '' check (char_length(institution_name) <= 120),
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'not_configured'
    check (status in ('not_configured', 'pending', 'connected', 'requires_action', 'disconnected', 'error')),
  last_synced_at timestamptz,
  last_error text check (char_length(last_error) <= 500),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_connection_id)
);

create table if not exists public.financial_sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid references public.financial_connections (id) on delete cascade,
  event_type text not null check (char_length(btrim(event_type)) between 1 and 80),
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'ignored')),
  records_received integer not null default 0 check (records_received >= 0),
  records_imported integer not null default 0 check (records_imported >= 0),
  records_reconciled integer not null default 0 check (records_reconciled >= 0),
  error_code text check (char_length(error_code) <= 80),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint financial_sync_event_completed_after_start
    check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table if not exists public.financial_webhook_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  connection_id uuid references public.financial_connections (id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_hash text not null check (char_length(payload_hash) = 64),
  processed_at timestamptz,
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'failed')),
  error_code text check (char_length(error_code) <= 80),
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

alter table public.transactions
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'imported', 'mpesa', 'bank', 'paypal', 'card')),
  add column if not exists provider_connection_id uuid
    references public.financial_connections (id) on delete set null,
  add column if not exists external_transaction_id text;

create unique index if not exists transactions_provider_external_unique_idx
  on public.transactions (provider_connection_id, external_transaction_id)
  where provider_connection_id is not null and external_transaction_id is not null;

create index if not exists financial_connections_user_provider_idx
  on public.financial_connections (user_id, provider, created_at desc);
create index if not exists financial_sync_events_connection_created_idx
  on public.financial_sync_events (connection_id, created_at desc);
create index if not exists financial_webhook_events_provider_created_idx
  on public.financial_webhook_events (provider, created_at desc);

alter table public.financial_connections enable row level security;
alter table public.financial_sync_events enable row level security;
alter table public.financial_webhook_events enable row level security;

drop policy if exists financial_connections_select_own on public.financial_connections;
create policy financial_connections_select_own on public.financial_connections
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists financial_connections_insert_own on public.financial_connections;
create policy financial_connections_insert_own on public.financial_connections
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists financial_connections_update_own on public.financial_connections;
create policy financial_connections_update_own on public.financial_connections
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists financial_connections_delete_own on public.financial_connections;
create policy financial_connections_delete_own on public.financial_connections
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists financial_sync_events_select_own on public.financial_sync_events;
create policy financial_sync_events_select_own on public.financial_sync_events
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists financial_sync_events_insert_own on public.financial_sync_events;
create policy financial_sync_events_insert_own on public.financial_sync_events
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists financial_sync_events_update_own on public.financial_sync_events;
create policy financial_sync_events_update_own on public.financial_sync_events
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists financial_webhook_events_select_own on public.financial_webhook_events;
create policy financial_webhook_events_select_own on public.financial_webhook_events
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.financial_connections, public.financial_sync_events, public.financial_webhook_events
  from anon, authenticated;
grant select, insert, update, delete on public.financial_connections to authenticated;
grant select, insert, update on public.financial_sync_events to authenticated;
grant select on public.financial_webhook_events to authenticated;

drop trigger if exists financial_connections_set_updated_at on public.financial_connections;
create trigger financial_connections_set_updated_at
  before update on public.financial_connections
  for each row execute function public.set_updated_at();
