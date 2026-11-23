create table if not exists public.money_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  entry_date date not null default current_date,
  reflection text not null default '' check (char_length(reflection) <= 12000),
  financial_win text not null default '' check (char_length(financial_win) <= 2000),
  lesson text not null default '' check (char_length(lesson) <= 2000),
  tags text[] not null default '{}'
    check (cardinality(tags) <= 10),
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(reflection, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(financial_win, '') || ' ' || coalesce(lesson, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'D')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint money_journal_entry_has_content check (
    char_length(btrim(reflection)) +
    char_length(btrim(financial_win)) +
    char_length(btrim(lesson)) > 0
  )
);

create index if not exists money_journal_entries_user_date_idx
  on public.money_journal_entries (user_id, entry_date desc, id desc);
create index if not exists money_journal_entries_search_idx
  on public.money_journal_entries using gin (search_document);

alter table public.money_journal_entries enable row level security;

drop policy if exists money_journal_entries_select_own on public.money_journal_entries;
create policy money_journal_entries_select_own on public.money_journal_entries
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists money_journal_entries_insert_own on public.money_journal_entries;
create policy money_journal_entries_insert_own on public.money_journal_entries
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists money_journal_entries_update_own on public.money_journal_entries;
create policy money_journal_entries_update_own on public.money_journal_entries
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists money_journal_entries_delete_own on public.money_journal_entries;
create policy money_journal_entries_delete_own on public.money_journal_entries
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.money_journal_entries from anon, authenticated;
grant select, delete on public.money_journal_entries to authenticated;
grant insert (user_id, title, entry_date, reflection, financial_win, lesson, tags)
  on public.money_journal_entries to authenticated;
grant update (title, entry_date, reflection, financial_win, lesson, tags)
  on public.money_journal_entries to authenticated;

create or replace function public.set_money_journal_entry_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_money_journal_entry_updated_at()
  from public, anon, authenticated;

drop trigger if exists money_journal_entries_set_updated_at on public.money_journal_entries;
create trigger money_journal_entries_set_updated_at
  before update on public.money_journal_entries
  for each row execute function public.set_money_journal_entry_updated_at();

create or replace function public.search_money_journal_entries(
  p_search text default '',
  p_from date default null,
  p_to date default null,
  p_page_size integer default 10,
  p_page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_query tsquery;
  v_search text := left(btrim(coalesce(p_search, '')), 200);
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'The start date must be on or before the end date.';
  end if;
  if p_page_size is null or p_page_size < 1 or p_page_size > 50 then
    raise exception 'Journal page size must be between 1 and 50.';
  end if;
  if p_page_offset is null or p_page_offset < 0 then
    raise exception 'Choose a valid journal page.';
  end if;

  if v_search <> '' then
    v_query := plainto_tsquery('simple', v_search);
  end if;

  with filtered as not materialized (
    select id, title, entry_date, reflection, financial_win, lesson, tags, created_at, updated_at
    from public.money_journal_entries
    where (p_from is null or entry_date >= p_from)
      and (p_to is null or entry_date <= p_to)
      and (v_query is null or search_document @@ v_query)
  ),
  page as (
    select id, title, entry_date, reflection, financial_win, lesson, tags, created_at, updated_at
    from filtered
    order by entry_date desc, id desc
    limit p_page_size
    offset p_page_offset
  )
  select jsonb_build_object(
    'entries',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(entry_page)
          order by entry_page.entry_date desc, entry_page.id desc
        )
        from page as entry_page
      ),
      '[]'::jsonb
    ),
    'totalCount',
    (select count(*) from filtered)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.search_money_journal_entries(text, date, date, integer, integer)
  from public, anon, authenticated;
grant execute on function public.search_money_journal_entries(text, date, date, integer, integer)
  to authenticated;
