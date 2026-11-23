const STORAGE_KEY = 'finance-tracker.accounts.v1'

export const sampleFinancialAccounts = [
  {
    id: 'demo-account-mpesa',
    name: 'M-Pesa Wallet',
    accountType: 'mpesa',
    currency: 'KES',
    openingBalance: 15000,
  },
  {
    id: 'demo-account-cooperative',
    name: 'Co-operative Bank',
    accountType: 'bank',
    currency: 'KES',
    openingBalance: 75000,
  },
  {
    id: 'demo-account-kcb',
    name: 'KCB Current',
    accountType: 'bank',
    currency: 'KES',
    openingBalance: 45000,
  },
  {
    id: 'demo-account-cash',
    name: 'Cash Wallet',
    accountType: 'cash',
    currency: 'KES',
    openingBalance: 7000,
  },
  {
    id: 'demo-account-equity',
    name: 'Equity Bank',
    accountType: 'bank',
    currency: 'KES',
    openingBalance: 28000,
  },
  {
    id: 'demo-account-savings',
    name: 'Savings Account',
    accountType: 'savings',
    currency: 'KES',
    openingBalance: 0,
  },
]

export function loadDemoFinancialAccounts() {
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === null) return sampleFinancialAccounts

  const parsed = JSON.parse(saved)
  if (
    !Array.isArray(parsed) ||
    parsed.some(
      (account) =>
        !account ||
        typeof account.id !== 'string' ||
        typeof account.name !== 'string' ||
        !['cash', 'mpesa', 'bank', 'savings', 'other'].includes(account.accountType),
    )
  ) {
    throw new Error('Saved accounts have an unsupported format.')
  }

  return parsed
}

export function saveDemoFinancialAccounts(accounts) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}
