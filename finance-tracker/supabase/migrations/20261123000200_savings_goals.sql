create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  category text not null check (char_length(category) between 1 and 40),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  saved_amount numeric(14, 2) not null default 0 check (saved_amount >= 0),
  deadline date,
  icon text not null default 'target',
  color text not null default 'lavender',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.savings_goals (id) on delete cascade,
  movement text not null check (movement in ('contribution', 'withdrawal')),
  amount numeric(14, 2) not null check (amount > 0),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists savings_goals_user_created_idx
  on public.savings_goals (user_id, created_at desc, id desc);
create index if not exists savings_goal_contributions_user_goal_created_idx
  on public.savings_goal_contributions (user_id, goal_id, created_at desc, id desc);

alter table public.savings_goals enable row level security;
alter table public.savings_goal_contributions enable row level security;

drop policy if exists savings_goals_select_own on public.savings_goals;
create policy savings_goals_select_own on public.savings_goals
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists savings_goals_insert_own on public.savings_goals;
create policy savings_goals_insert_own on public.savings_goals
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists savings_goals_update_own on public.savings_goals;
create policy savings_goals_update_own on public.savings_goals
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists savings_goals_delete_own on public.savings_goals;
create policy savings_goals_delete_own on public.savings_goals
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists savings_goal_contributions_select_own on public.savings_goal_contributions;
create policy savings_goal_contributions_select_own on public.savings_goal_contributions
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.savings_goals from anon, authenticated;
grant select, delete on public.savings_goals to authenticated;
grant insert (user_id, title, category, target_amount, deadline, icon, color)
  on public.savings_goals to authenticated;
grant update (title, category, target_amount, deadline, icon, color)
  on public.savings_goals to authenticated;

revoke all on public.savings_goal_contributions from anon, authenticated;
grant select on public.savings_goal_contributions to authenticated;

create or replace function public.set_savings_goal_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.record_savings_goal_movement(
  p_goal_id uuid,
  p_movement text,
  p_amount numeric,
  p_note text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_saved_amount numeric(14, 2);
  v_target_amount numeric(14, 2);
  v_next_saved_amount numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;
  if p_movement is null or p_movement not in ('contribution', 'withdrawal') then
    raise exception 'Unsupported savings goal movement.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'The amount must be greater than zero.';
  end if;

  select saved_amount, target_amount
    into v_saved_amount, v_target_amount
    from public.savings_goals
    where id = p_goal_id and user_id = v_user_id
    for update;
  if not found then
    raise exception 'Savings goal not found.';
  end if;
  if p_movement = 'withdrawal' and p_amount > v_saved_amount then
    raise exception 'The withdrawal exceeds the saved amount.';
  end if;
  v_next_saved_amount := v_saved_amount + case
    when p_movement = 'contribution' then p_amount
    else -p_amount
  end;

  insert into public.savings_goal_contributions (
    user_id,
    goal_id,
    movement,
    amount,
    note
  )
  values (v_user_id, p_goal_id, p_movement, p_amount, coalesce(p_note, ''));

  update public.savings_goals
    set saved_amount = v_next_saved_amount
    where id = p_goal_id and user_id = v_user_id;

  return p_movement = 'contribution'
    and v_saved_amount < v_target_amount
    and v_next_saved_amount >= v_target_amount;
end;
$$;

revoke all on function public.record_savings_goal_movement(uuid, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.record_savings_goal_movement(uuid, text, numeric, text)
  to authenticated;
revoke all on function public.set_savings_goal_updated_at() from public, anon, authenticated;

drop trigger if exists savings_goals_set_updated_at on public.savings_goals;
create trigger savings_goals_set_updated_at
  before update on public.savings_goals
  for each row execute function public.set_savings_goal_updated_at();
