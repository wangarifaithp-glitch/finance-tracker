do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'financial_accounts'
  ) then
    alter publication supabase_realtime add table public.financial_accounts;
  end;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'financial_connected_accounts'
  ) then
    alter publication supabase_realtime add table public.financial_connected_accounts;
  end;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'financial_connections'
  ) then
    alter publication supabase_realtime add table public.financial_connections;
  end;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transaction_sync_runs'
  ) then
    alter publication supabase_realtime add table public.transaction_sync_runs;
  end;
end;
$$;

create index if not exists financial_webhook_events_provider_event_idx
  on public.financial_webhook_events (provider, provider_event_id);
create index if not exists financial_webhook_events_connection_created_idx
  on public.financial_webhook_events (connection_id, created_at desc);
