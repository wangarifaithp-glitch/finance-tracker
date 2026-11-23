create table if not exists public.financial_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  event_type text not null check (
    event_type in (
      'bill',
      'rent',
      'payday',
      'subscription',
      'loan_payment',
      'savings_contribution',
      'recurring_expense',
      'reminder'
    )
  ),
  event_date date not null,
  amount numeric(14, 2) check (amount is null or amount >= 0),
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  repeat_until date,
  remind_before_days smallint
    check (remind_before_days is null or remind_before_days in (0, 1, 3, 7)),
  notes text not null default '' check (char_length(notes) <= 2000),
  completed_dates date[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_calendar_repeat_until_valid check (
    (repeat_until is null or repeat_until >= event_date) and
    (recurrence <> 'none' or repeat_until is null)
  )
);

create index if not exists financial_calendar_events_user_date_idx
  on public.financial_calendar_events (user_id, event_date desc, id desc);

alter table public.financial_calendar_events enable row level security;

drop policy if exists financial_calendar_events_select_own on public.financial_calendar_events;
create policy financial_calendar_events_select_own on public.financial_calendar_events
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists financial_calendar_events_insert_own on public.financial_calendar_events;
create policy financial_calendar_events_insert_own on public.financial_calendar_events
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists financial_calendar_events_update_own on public.financial_calendar_events;
create policy financial_calendar_events_update_own on public.financial_calendar_events
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists financial_calendar_events_delete_own on public.financial_calendar_events;
create policy financial_calendar_events_delete_own on public.financial_calendar_events
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.financial_calendar_events from anon, authenticated;
grant select, delete on public.financial_calendar_events to authenticated;
grant insert (
  user_id, title, event_type, event_date, amount, recurrence,
  repeat_until, remind_before_days, notes
) on public.financial_calendar_events to authenticated;
grant update (
  title, event_type, event_date, amount, recurrence,
  repeat_until, remind_before_days, notes
) on public.financial_calendar_events to authenticated;

create or replace function public.set_financial_calendar_event_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_financial_calendar_event_updated_at()
  from public, anon, authenticated;

drop trigger if exists financial_calendar_events_set_updated_at on public.financial_calendar_events;
create trigger financial_calendar_events_set_updated_at
  before update on public.financial_calendar_events
  for each row execute function public.set_financial_calendar_event_updated_at();

create or replace function public.list_financial_calendar_events(
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_events jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Choose a valid calendar date range.';
  end if;
  if p_to - p_from > 366 then
    raise exception 'Calendar queries cannot exceed one year.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'event_type', event_type,
        'event_date', event_date,
        'amount', amount,
        'recurrence', recurrence,
        'repeat_until', repeat_until,
        'remind_before_days', remind_before_days,
        'notes', notes,
        'completed_dates', completed_dates,
        'created_at', created_at,
        'updated_at', updated_at
      )
      order by event_date, id
    ),
    '[]'::jsonb
  )
  into v_events
  from public.financial_calendar_events
  where event_date <= p_to
    and (recurrence <> 'none' or event_date >= p_from)
    and (repeat_until is null or repeat_until >= p_from);

  return v_events;
end;
$$;

revoke all on function public.list_financial_calendar_events(date, date)
  from public, anon, authenticated;
grant execute on function public.list_financial_calendar_events(date, date)
  to authenticated;

create or replace function public.set_financial_calendar_occurrence_paid(
  p_event_id uuid,
  p_occurrence_date date,
  p_is_paid boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.financial_calendar_events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  if p_occurrence_date is null or p_is_paid is null then
    raise exception 'Choose a valid occurrence and status.';
  end if;

  select *
    into v_event
    from public.financial_calendar_events
    where id = p_event_id
      and user_id = (select auth.uid())
    for update;
  if not found then
    raise exception 'Calendar event not found.';
  end if;
  if v_event.event_type not in (
    'bill',
    'rent',
    'subscription',
    'loan_payment',
    'savings_contribution',
    'recurring_expense'
  ) then
    raise exception 'This event type cannot be marked as paid.';
  end if;
  if p_occurrence_date < v_event.event_date
    or (v_event.repeat_until is not null and p_occurrence_date > v_event.repeat_until)
    or (v_event.recurrence = 'none' and p_occurrence_date <> v_event.event_date)
  then
    raise exception 'The selected date is not a valid event occurrence.';
  end if;

  update public.financial_calendar_events
    set completed_dates = case
      when p_is_paid and array_position(completed_dates, p_occurrence_date) is null
        then array_append(completed_dates, p_occurrence_date)
      when not p_is_paid
        then array_remove(completed_dates, p_occurrence_date)
      else completed_dates
    end
    where id = p_event_id
      and user_id = (select auth.uid());
end;
$$;

revoke all on function public.set_financial_calendar_occurrence_paid(uuid, date, boolean)
  from public, anon, authenticated;
grant execute on function public.set_financial_calendar_occurrence_paid(uuid, date, boolean)
  to authenticated;
