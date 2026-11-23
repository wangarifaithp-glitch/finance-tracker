import { isDemoMode, isSupabaseConfigured, supabase } from './supabaseClient.js'

const STORAGE_KEY = 'finance-tracker.budgets.v1'

const demoBudgets = [
  { id: 'demo-groceries', name: 'Groceries', amount: 15000, spent: 12300, warningPercentage: 85, periodMonth: '2026-11-01', categoryId: null },
  { id: 'demo-transport', name: 'Transport', amount: 8000, spent: 4800, warningPercentage: 85, periodMonth: '2026-11-01', categoryId: null },
]

function requireSupabaseUser(userId) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.')
  if (!userId) throw new Error('Sign in before accessing budgets.')
}

export async function getBudgets(userId, periodMonth, signal) {
  if (isDemoMode) {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') || demoBudgets
    } catch {
      return demoBudgets
    }
  }
  requireSupabaseUser(userId)
  let query = supabase
    .from('budgets')
    .select('id,name,amount,period_month,warning_percentage,category_id,categories(name)')
    .eq('period_month', periodMonth)
    .order('name')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error

  const monthEnd = new Date(`${periodMonth}T00:00:00`)
  monthEnd.setMonth(monthEnd.getMonth() + 1)
  const nextMonth = monthEnd.toISOString().slice(0, 10)
  let transactionQuery = supabase
    .from('transactions')
    .select('amount,category')
    .eq('type', 'expense')
    .gte('date', periodMonth)
    .lt('date', nextMonth)
  if (signal) transactionQuery = transactionQuery.abortSignal(signal)
  const { data: transactions, error: transactionError } = await transactionQuery
  if (transactionError) throw transactionError

  return (data || []).map((row) => {
    const categoryName = row.categories?.name
    const spent = (transactions || [])
      .filter((transaction) => !categoryName || transaction.category === categoryName)
      .reduce((total, transaction) => total + Number(transaction.amount), 0)
    return {
      id: row.id,
      name: row.name,
      amount: Number(row.amount),
      spent,
      warningPercentage: row.warning_percentage,
      periodMonth: row.period_month,
      categoryId: row.category_id,
    }
  })
}

export async function getCategories(userId, signal) {
  if (isDemoMode) {
    return [
      { id: 'groceries', name: 'Food & Drinks', type: 'expense' },
      { id: 'transport', name: 'Transport', type: 'expense' },
      { id: 'bills', name: 'Bills', type: 'expense' },
      { id: 'shopping', name: 'Shopping', type: 'expense' },
    ]
  }
  requireSupabaseUser(userId)
  let query = supabase
    .from('categories')
    .select('id,name,type')
    .eq('type', 'expense')
    .order('name')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function saveBudget(budget, userId, previousBudget) {
  if (isDemoMode) {
    const budgets = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') || demoBudgets
    const saved = {
      ...budget,
      id: previousBudget?.id || globalThis.crypto.randomUUID(),
    }
    const next = previousBudget
      ? budgets.map((item) => (item.id === previousBudget.id ? saved : item))
      : [saved, ...budgets]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return saved
  }
  requireSupabaseUser(userId)
  const row = {
    user_id: userId,
    name: budget.name,
    amount: budget.amount,
    period_month: budget.periodMonth,
    warning_percentage: budget.warningPercentage,
    category_id: budget.categoryId || null,
  }
  if (previousBudget) delete row.user_id
  const result = previousBudget
    ? await supabase.from('budgets').update(row).eq('id', previousBudget.id).select().single()
    : await supabase.from('budgets').insert(row).select().single()
  if (result.error) throw result.error
  return { ...budget, id: result.data.id }
}

export async function deleteBudget(budget, userId) {
  if (isDemoMode) {
    const budgets = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') || demoBudgets
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets.filter((item) => item.id !== budget.id)))
    return
  }
  requireSupabaseUser(userId)
  const { error } = await supabase.from('budgets').delete().eq('id', budget.id)
  if (error) throw error
}
