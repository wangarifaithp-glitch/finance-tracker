alter table public.financial_accounts
  add column if not exists opening_balance_original numeric(18, 2),
  add column if not exists opening_balance_currency text;

update public.financial_accounts
set
  opening_balance_original = coalesce(opening_balance_original, opening_balance),
  opening_balance_currency = coalesce(opening_balance_currency, currency)
where opening_balance_original is null or opening_balance_currency is null;

alter table public.financial_accounts
  alter column opening_balance_original set not null,
  alter column opening_balance_currency set not null;

alter table public.financial_accounts
  add constraint financial_accounts_opening_balance_currency_valid
  check (opening_balance_currency ~ '^[A-Z]{3}$');

alter table public.transactions
  add column if not exists converted_amount numeric(18, 2),
  add column if not exists reporting_currency text check (
    reporting_currency is null or reporting_currency ~ '^[A-Z]{3}$'
  ),
  add column if not exists conversion_rate numeric(18, 10),
  add column if not exists conversion_date date,
  add constraint transactions_conversion_rate_valid
  check (conversion_rate is null or conversion_rate > 0);

update public.transactions
set
  original_amount = coalesce(original_amount, amount),
  original_currency = coalesce(original_currency, 'KES'),
  converted_amount = coalesce(converted_amount, amount),
  reporting_currency = coalesce(reporting_currency, 'KES'),
  conversion_rate = coalesce(conversion_rate, 1),
  conversion_date = coalesce(conversion_date, date)
where original_amount is null
   or original_currency is null
   or converted_amount is null
   or reporting_currency is null
   or conversion_rate is null
   or conversion_date is null;
