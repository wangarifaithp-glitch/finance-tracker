# Finance Tracker

Finance Tracker is a responsive React/Vite finance dashboard with transaction management, manually managed financial accounts, savings goal tracking, a personal money journal, a financial calendar, and a configurable display currency.

## Run locally

```sh
npm install
npm run dev
```

In PowerShell installations that block `npm.ps1`, run the Windows command shim:

```powershell
npm.cmd run dev
```

The Vite project is in this `finance-tracker` directory. Run the command from here.

## Supabase setup

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project URL and public anon/publishable key. Never put a service-role key in the browser or commit credentials.
3. Apply all six migrations in `supabase/migrations/` to the project (for example, with the Supabase CLI), in filename order.
4. Configure the project's authentication email/redirect settings for the deployed app.

Without credentials, local development uses sample transactions, accounts, savings goals, journal entries, calendar events, and reports with browser storage. A production build without Supabase credentials intentionally requires setup rather than silently using demo data. Supabase mode uses authenticated, row-level-secured transactions, accounts, savings goals, journal entries, and financial calendar events. Account balances are derived from opening balances and linked transactions; transfers record both source and destination accounts. Journal search and date filtering are paginated server-side; calendar queries are bounded by the displayed date range, and payment status is tracked per recurring occurrence. Calendar reminders are saved and shown in the app; push delivery needs a notification service. Savings-goal contributions and withdrawals are recorded atomically with a history entry. Reports aggregate transaction and savings data through a bounded Supabase report function. Budget performance is intentionally unavailable until real budget data is connected; other dashboard widgets remain prototype/sample data.

## Scale readiness

The Supabase schema and paged queries avoid downloading a user's entire transaction history, but this code and schema are not a certification or guarantee of 1,000,000 concurrent users. Capacity depends on the selected Supabase plan, database and connection-pool sizing, region, hosting, workload, and traffic patterns. Before launch at that scale, provision the infrastructure, run authenticated load tests against representative data, inspect query plans and database saturation, and tune limits, caching, and deployment architecture based on measured results.

## Currency preferences

Choose a preferred currency from **Settings**. Monetary records remain stored in Kenyan shillings (KES); displayed amounts and new transaction entries are converted using KES-based daily exchange rates. The preference and rate cache are saved in browser storage, and the app continues using cached rates if the exchange-rate service is temporarily unavailable.

Rates are provided by the [Exchange API](https://github.com/fawazahmed0/exchange-api), update daily, and are attributed in the currency settings. Currency codes without a current rate are listed but cannot be selected for conversion.
