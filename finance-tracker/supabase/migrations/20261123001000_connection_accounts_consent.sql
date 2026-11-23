alter table public.financial_connections
  add column if not exists consent_status text not null default 'not_requested'
    check (consent_status in ('not_requested', 'pending', 'granted', 'revoked', 'expired')),
  add column if not exists consented_at timestamptz,
  add column if not exists consent_expires_at timestamptz,
  add column if not exists consent_scopes text[] not null default '{}',
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.financial_connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null references public.financial_connections (id) on delete cascade,
  provider_account_id text not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  account_type text not null check (
    account_type in ('mobile_money', 'checking', 'savings', 'credit', 'card', 'wallet', 'loan', 'other')
  ),
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  balance numeric(18, 2),
  available_balance numeric(18, 2),
  masked_identifier text check (masked_identifier is null or char_length(masked_identifier) <= 40),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'requires_action', 'closed')),
  provider_metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, provider_account_id)
);

create table if not exists public.financial_connection_consent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null references public.financial_connections (id) on delete cascade,
  consent_text_version text not null check (char_length(consent_text_version) <= 40),
  scopes text[] not null default '{}',
  granted_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  provider_consent_id text,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint financial_consent_active_dates
    check (revoked_at is null or granted_at is null or revoked_at >= granted_at)
);

create table if not exists public.financial_connection_secrets (
  connection_id uuid primary key references public.financial_connections (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ciphertext bytea not null,
  nonce bytea not null,
  key_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.financial_connection_secrets enable row level security;
revoke all on public.financial_connection_secrets from anon, authenticated;

create index if not exists financial_connected_accounts_user_connection_idx
  on public.financial_connected_accounts (user_id, connection_id, name);
create index if not exists financial_connection_consent_user_connection_idx
  on public.financial_connection_consent (user_id, connection_id, created_at desc);

alter table public.financial_connected_accounts enable row level security;
alter table public.financial_connection_consent enable row level security;

drop policy if exists financial_connected_accounts_select_own on public.financial_connected_accounts;
create policy financial_connected_accounts_select_own on public.financial_connected_accounts
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists financial_connected_accounts_insert_own on public.financial_connected_accounts;
create policy financial_connected_accounts_insert_own on public.financial_connected_accounts
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists financial_connected_accounts_update_own on public.financial_connected_accounts;
create policy financial_connected_accounts_update_own on public.financial_connected_accounts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists financial_connected_accounts_delete_own on public.financial_connected_accounts;
create policy financial_connected_accounts_delete_own on public.financial_connected_accounts
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists financial_connection_consent_select_own on public.financial_connection_consent;
create policy financial_connection_consent_select_own on public.financial_connection_consent
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists financial_connection_consent_insert_own on public.financial_connection_consent;
create policy financial_connection_consent_insert_own on public.financial_connection_consent
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists financial_connection_consent_update_own on public.financial_connection_consent;
create policy financial_connection_consent_update_own on public.financial_connection_consent
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.financial_connected_accounts, public.financial_connection_consent
  from anon, authenticated;
grant select, insert, update, delete on public.financial_connected_accounts to authenticated;
grant select, insert, update on public.financial_connection_consent to authenticated;

drop trigger if exists financial_connected_accounts_set_updated_at on public.financial_connected_accounts;
create trigger financial_connected_accounts_set_updated_at
  before update on public.financial_connected_accounts
  for each row execute function public.set_updated_at();
