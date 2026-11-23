create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  avatar_url text,
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  date_format text not null default 'MMM d, yyyy'
    check (date_format in ('MMM d, yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy')),
  theme text not null default 'light'
    check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  type text not null check (type in ('income', 'expense')),
  color text not null default '#8b5cf6',
  icon text not null default 'wallet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type, name)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  amount numeric(14, 2) not null check (amount > 0),
  period_month date not null,
  warning_percentage smallint not null default 85
    check (warning_percentage between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, period_month),
  constraint budgets_period_month_is_first_day
    check (period_month = date_trunc('month', period_month)::date)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (
    type in (
      'budget_warning',
      'budget_exceeded',
      'upcoming_bill',
      'savings_milestone',
      'financial_reminder',
      'monthly_summary'
    )
  ),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  icon text not null default 'reminder',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists budgets_user_period_idx
  on public.budgets (user_id, period_month desc, id desc);
create index if not exists categories_user_type_idx
  on public.categories (user_id, type, name);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc, id desc);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists categories_select_own on public.categories;
create policy categories_select_own on public.categories
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists categories_insert_own on public.categories;
create policy categories_insert_own on public.categories
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists categories_update_own on public.categories;
create policy categories_update_own on public.categories
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists categories_delete_own on public.categories;
create policy categories_delete_own on public.categories
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists budgets_select_own on public.budgets;
create policy budgets_select_own on public.budgets
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists budgets_insert_own on public.budgets;
create policy budgets_insert_own on public.budgets
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists budgets_update_own on public.budgets;
create policy budgets_update_own on public.budgets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists budgets_delete_own on public.budgets;
create policy budgets_delete_own on public.budgets
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists notifications_insert_own on public.notifications;
create policy notifications_insert_own on public.notifications
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.profiles, public.categories, public.budgets, public.notifications
  from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.budgets, public.notifications
  to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();
drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, type, color, icon)
  values
    (new.id, 'Salary', 'income', '#35c79a', 'wallet'),
    (new.id, 'Freelance', 'income', '#55a9ed', 'briefcase'),
    (new.id, 'Food & Drinks', 'expense', '#f27c9d', 'utensils'),
    (new.id, 'Transport', 'expense', '#8b5cf6', 'bus'),
    (new.id, 'Shopping', 'expense', '#eea934', 'shopping-bag'),
    (new.id, 'Bills', 'expense', '#35c79a', 'receipt'),
    (new.id, 'Other', 'expense', '#55a9ed', 'wallet')
  on conflict (user_id, type, name) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
