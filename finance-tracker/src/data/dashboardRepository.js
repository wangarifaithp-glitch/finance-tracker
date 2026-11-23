import { isDemoMode, supabase } from './supabaseClient.js'
import {
  monthlyBudget,
  savingsGoals,
  spendingByRange,
  summaryCards,
  transactions,
} from './dashboardData.js'
import { getSavingsGoals } from './savingsGoalRepository.js'
import { getBudgets } from './budgetRepository.js'

function requireUser(userId) {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!userId) throw new Error('Sign in before accessing dashboard data.')
}

function monthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export async function getDashboardData(userId, signal) {
  if (isDemoMode) {
    return {
      summaryCards,
      spendingByRange,
      monthlyBudget,
      savingsGoals,
      transactions,
    }
  }
  requireUser(userId)

  const period = monthStart()
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`

  let summaryQuery = supabase
    .from('transaction_summaries')
    .select('total_income,total_expenses,transaction_count')
    .eq('user_id', userId)
    .maybeSingle()
  if (signal) summaryQuery = summaryQuery.abortSignal(signal)
  const [{ data: summaryRow, error: summaryError }, recentResult] = await Promise.all([
    summaryQuery,
    supabase
      .from('transactions')
      .select('id,title,amount,type,category,date,payment_method')
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .limit(4),
  ])
  if (summaryError) throw summaryError
  if (recentResult.error) throw recentResult.error

  let monthQuery = supabase
    .from('transactions')
    .select('amount,type,category,date')
    .gte('date', period)
    .lt('date', nextMonth)
  if (signal) monthQuery = monthQuery.abortSignal(signal)
  const { data: monthTransactions, error: monthError } = await monthQuery
  if (monthError) throw monthError

  const income = monthTransactions?.filter((row) => row.type === 'income')
    .reduce((total, row) => total + Number(row.amount), 0) || 0
  const expenses = monthTransactions?.filter((row) => row.type === 'expense')
    .reduce((total, row) => total + Number(row.amount), 0) || 0

  const palette = ['#f27c9d', '#8b5cf6', '#eea934', '#35c79a', '#55a9ed']
  const categoryTotals = new Map()
  for (const row of monthTransactions || []) {
    if (row.type === 'expense') {
      categoryTotals.set(row.category, (categoryTotals.get(row.category) || 0) + Number(row.amount))
    }
  }
  const monthCategories = [...categoryTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, amount], index) => ({
      name,
      amount,
      color: palette[index % palette.length],
    }))

  const goals = await getSavingsGoals(userId, signal)
  const goalRows = goals.map((goal) => ({
    name: goal.title,
    target: goal.targetAmount,
    saved: goal.savedAmount,
    deadline: goal.deadline
      ? new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' })
          .format(new Date(`${goal.deadline}T12:00:00`))
      : 'No deadline',
    icon: goal.icon === 'laptop' ? 'laptop' : goal.icon === 'travel' ? 'travel' : 'target',
    color: goal.color,
  }))

  const budgets = await getBudgets(userId, period, signal)
  const totalBudget = budgets.reduce((total, budget) => total + budget.amount, 0)
  const spentBudget = budgets.reduce((total, budget) => total + budget.spent, 0)

  const recentTransactions = (recentResult.data || []).map((row) => ({
    id: row.id,
    name: row.title,
    category: row.category,
    date: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(`${row.date}T12:00:00`)),
    paymentMethod: row.payment_method,
    amount: row.type === 'expense' ? -Number(row.amount) : Number(row.amount),
    type: row.type,
    icon: row.type === 'income'
      ? 'income'
      : row.category === 'Transport'
        ? 'transport'
        : 'food',
  }))

  return {
    summaryCards: [
      { label: 'Total Balance', amount: Number(summaryRow?.total_income || 0) - Number(summaryRow?.total_expenses || 0), change: 'This period', comparison: 'income minus expenses', icon: 'balance', color: 'purple', trend: [34, 39, 36, 45, 43, 51, 49, 61] },
      { label: 'Monthly Income', amount: income, change: 'Current month', comparison: 'tracked income', icon: 'income', color: 'green', trend: [30, 34, 32, 38, 40, 37, 49, 54] },
      { label: 'Monthly Expenses', amount: expenses, change: 'Current month', comparison: 'tracked expenses', icon: 'expenses', color: 'pink', trend: [55, 53, 58, 47, 49, 42, 44, 37] },
      { label: 'Total Savings', amount: goals.reduce((total, goal) => total + goal.savedAmount, 0), change: 'Across goals', comparison: 'saved so far', icon: 'savings', color: 'gold', trend: [24, 27, 25, 34, 37, 36, 44, 52] },
    ],
    spendingByRange: {
      week: { total: monthCategories.reduce((total, category) => total + category.amount, 0), categories: monthCategories },
      month: { total: monthCategories.reduce((total, category) => total + category.amount, 0), categories: monthCategories },
      year: { total: monthCategories.reduce((total, category) => total + category.amount, 0), categories: monthCategories },
    },
    monthlyBudget: { total: totalBudget, spent: spentBudget, warningAt: 85 },
    savingsGoals: goalRows,
    transactions: recentTransactions,
  }
}
