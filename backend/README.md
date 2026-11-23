# Finance Tracker Backend API

## Setup

1. Copy `.env.example` to `.env`.
2. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. Do not set or expose a Supabase service-role key.
4. Install and start:

   npm install
   npm run dev

The API defaults to `http://localhost:4000`.

## Authentication

Protected endpoints require:

`Authorization: Bearer <Supabase access token>`

The backend verifies the token with Supabase Auth. The authenticated user ID is used for every query. Frontend-supplied user IDs are never accepted.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Public health check |
| GET | `/api/v1/financial/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | Income, expenses, transfers, net, and count |
| GET | `/api/v1/financial/spending?from=YYYY-MM-DD&to=YYYY-MM-DD` | Expense totals by category |
| GET | `/api/v1/financial/budgets?month=YYYY-MM` | Budget spent, remaining, warning, and exceeded analysis |
| GET | `/api/v1/financial/savings` | Savings goal totals and progress |
| GET | `/api/v1/financial/insights` | Authenticated financial insights |
| GET | `/api/v1/transactions?page=1&pageSize=20&type=expense&category=...&from=YYYY-MM-DD&to=YYYY-MM-DD` | Paginated transactions |
| POST | `/api/v1/transactions` | Create a transaction |
| PATCH | `/api/v1/transactions/:id` | Update an owned transaction |
| DELETE | `/api/v1/transactions/:id` | Delete an owned transaction |
| GET | `/api/v1/connections/providers` | List supported provider adapters and configuration status |
| GET | `/api/v1/connections` | List the authenticated user's provider connections |
| GET | `/api/v1/connections/sync-events` | List recent synchronization attempts |
| POST | `/api/v1/connections/:id/sync` | Returns `501` until a live provider adapter is configured |

## Transaction body

```json
{
  "title": "Groceries",
  "amount": 3800,
  "type": "expense",
  "category": "Food & Drinks",
  "date": "2026-11-23",
  "account": "Cash Wallet",
  "paymentMethod": "Cash",
  "notes": "",
  "accountId": null,
  "transferAccountId": null,
  "transferAccount": null
}
```

Validation and database RLS protect required fields, amounts, dates, and user ownership.

## Secure provider secrets

Live adapters must keep provider authorization tokens in the backend only. The optional
`SUPABASE_SERVICE_ROLE_KEY` and `CONNECTION_TOKEN_ENCRYPTION_KEY` values enable server-side
encrypted secret storage. Never place either value in `VITE_*` variables or browser code.
