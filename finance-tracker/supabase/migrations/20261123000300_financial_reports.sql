create or replace function public.get_financial_report(
  p_from date,
  p_to date,
  p_group_by text default 'day'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_previous_from date;
  v_previous_to date;
  v_step interval;
  v_income numeric(18, 2);
  v_expenses numeric(18, 2);
  v_transfers numeric(18, 2);
  v_transaction_count bigint;
  v_previous_income numeric(18, 2);
  v_previous_expenses numeric(18, 2);
  v_previous_transfers numeric(18, 2);
  v_previous_count bigint;
  v_total_saved numeric(18, 2);
  v_total_target numeric(18, 2);
  v_active_goals bigint;
  v_completed_goals bigint;
  v_contributed numeric(18, 2);
  v_withdrawn numeric(18, 2);
  v_series jsonb;
  v_categories jsonb;
  v_largest_expenses jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Choose a valid report date range.';
  end if;
  if p_to - p_from > 3650 then
    raise exception 'Report ranges cannot exceed ten years.';
  end if;
  if p_group_by not in ('day', 'month') then
    raise exception 'Unsupported report grouping.';
  end if;
  if p_group_by = 'day' and p_to - p_from > 400 then
    raise exception 'Use monthly grouping for report ranges longer than 400 days.';
  end if;

  v_previous_to := p_from - 1;
  v_previous_from := v_previous_to - (p_to - p_from);
  v_step := case when p_group_by = 'month' then interval '1 month' else interval '1 day' end;

  select
    coalesce(sum(amount) filter (where type = 'income'), 0),
    coalesce(sum(amount) filter (where type = 'expense'), 0),
    coalesce(sum(amount) filter (where type = 'transfer'), 0),
    count(*)
  into v_income, v_expenses, v_transfers, v_transaction_count
  from public.transactions
  where date between p_from and p_to;

  select
    coalesce(sum(amount) filter (where type = 'income'), 0),
    coalesce(sum(amount) filter (where type = 'expense'), 0),
    coalesce(sum(amount) filter (where type = 'transfer'), 0),
    count(*)
  into v_previous_income, v_previous_expenses, v_previous_transfers, v_previous_count
  from public.transactions
  where date between v_previous_from and v_previous_to;

  with buckets as (
    select series.bucket::date as period
    from generate_series(
      date_trunc(p_group_by, p_from::timestamp),
      date_trunc(p_group_by, p_to::timestamp),
      v_step
    ) as series(bucket)
  ),
  grouped as (
    select
      date_trunc(p_group_by, date::timestamp)::date as period,
      coalesce(sum(amount) filter (where type = 'income'), 0) as income,
      coalesce(sum(amount) filter (where type = 'expense'), 0) as expenses
    from public.transactions
    where date between p_from and p_to
    group by 1
  ),
  joined as (
    select
      buckets.period,
      coalesce(grouped.income, 0) as income,
      coalesce(grouped.expenses, 0) as expenses
    from buckets
    left join grouped using (period)
  ),
  running as (
    select
      period,
      income,
      expenses,
      income - expenses as net,
      sum(income - expenses) over (order by period) as balance
    from joined
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'period', period,
        'income', income,
        'expenses', expenses,
        'net', net,
        'balance', balance
      )
      order by period
    ),
    '[]'::jsonb
  )
  into v_series
  from running;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('category', category, 'amount', amount)
      order by amount desc, category
    ),
    '[]'::jsonb
  )
  into v_categories
  from (
    select category, sum(amount) as amount
    from public.transactions
    where type = 'expense' and date between p_from and p_to
    group by category
  ) as category_totals;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'date', date,
        'category', category,
        'amount', amount,
        'account', account
      )
      order by amount desc, date desc, id desc
    ),
    '[]'::jsonb
  )
  into v_largest_expenses
  from (
    select id, title, date, category, amount, account
    from public.transactions
    where type = 'expense' and date between p_from and p_to
    order by amount desc, date desc, id desc
    limit 10
  ) as largest_expenses;

  select
    coalesce(sum(saved_amount), 0),
    coalesce(sum(target_amount), 0),
    count(*) filter (where saved_amount < target_amount),
    count(*) filter (where saved_amount >= target_amount)
  into v_total_saved, v_total_target, v_active_goals, v_completed_goals
  from public.savings_goals;

  select
    coalesce(sum(amount) filter (where movement = 'contribution'), 0),
    coalesce(sum(amount) filter (where movement = 'withdrawal'), 0)
  into v_contributed, v_withdrawn
  from public.savings_goal_contributions
  where created_at::date between p_from and p_to;

  return jsonb_build_object(
    'totals', jsonb_build_object(
      'income', v_income,
      'expenses', v_expenses,
      'transfers', v_transfers,
      'net', v_income - v_expenses,
      'transactionCount', v_transaction_count
    ),
    'previousTotals', jsonb_build_object(
      'income', v_previous_income,
      'expenses', v_previous_expenses,
      'transfers', v_previous_transfers,
      'net', v_previous_income - v_previous_expenses,
      'transactionCount', v_previous_count
    ),
    'series', v_series,
    'categories', v_categories,
    'largestExpenses', v_largest_expenses,
    'savings', jsonb_build_object(
      'totalSaved', v_total_saved,
      'totalTarget', v_total_target,
      'activeGoals', v_active_goals,
      'completedGoals', v_completed_goals,
      'contributedInPeriod', v_contributed,
      'withdrawnInPeriod', v_withdrawn
    ),
    'budgetsConfigured', false
  );
end;
$$;

revoke all on function public.get_financial_report(date, date, text)
  from public, anon, authenticated;
grant execute on function public.get_financial_report(date, date, text)
  to authenticated;
