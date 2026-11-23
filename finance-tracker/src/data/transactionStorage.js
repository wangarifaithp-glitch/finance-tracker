const STORAGE_KEY = 'finance-tracker.transactions.v1'

function isTransactionList(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (transaction) =>
        transaction &&
        typeof transaction.id === 'string' &&
        typeof transaction.title === 'string' &&
        typeof transaction.amount === 'number' &&
        typeof transaction.date === 'string' &&
        ['income', 'expense', 'transfer'].includes(transaction.type),
    )
  )
}

export function loadTransactions() {
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === null) return null

  const parsed = JSON.parse(saved)
  if (!isTransactionList(parsed)) {
    throw new Error('Saved transactions have an unsupported format.')
  }

  return parsed
}

export function saveTransactions(transactions) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
}
