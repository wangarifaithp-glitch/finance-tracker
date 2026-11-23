create unique index if not exists budgets_user_uncategorized_period_idx
  on public.budgets (user_id, period_month)
  where category_id is null;

create or replace function public.validate_budget_category_ownership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_category_type text;
begin
  if new.category_id is null then
    return new;
  end if;

  select type
    into v_category_type
    from public.categories
    where id = new.category_id
      and user_id = new.user_id;

  if not found then
    raise exception 'The selected category does not belong to this user.';
  end if;
  if v_category_type <> 'expense' then
    raise exception 'Budgets can only use expense categories.';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_budget_category_ownership()
  from public, anon, authenticated;

drop trigger if exists budgets_validate_category_ownership on public.budgets;
create trigger budgets_validate_category_ownership
  before insert or update of user_id, category_id on public.budgets
  for each row execute function public.validate_budget_category_ownership();
