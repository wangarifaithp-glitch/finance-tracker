import { AppError } from '../utils/errors.js'
import { monthRange } from '../utils/date.js'

function throwSupabaseError(error) {
  if (error) throw new AppError('Financial records could not be retrieved.', 502, 'SUPABASE_ERROR')
}

export async function getSummary(supabase, userId, from, to) {
  let query = supabase
    .from('transactions')
    .select('amount,type')
    .eq('user_id', userId)
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  const { data, error } = await query
  throwSupabaseError(error)

  const summary = (data || []).reduce(
    (result, row) => {
      const amount = Number(row.amount)
      if (row.type === 'income') result.income += amount
      if (row.type === 'expense') result.expenses += amount
      if (row.type === 'transfer') result.transfers += amount
      result.transactionCount += 1
      return result
    },
    { income: 0, expenses: 0, transfers: 0, net: 0, transactionCount: 0 },
  )
  summary.net = summary.income - summary.expenses
  return summary
}

export async function getSpending(supabase, userId, from, to) {
  let query = supabase
    .from('transactions')
    .select('amount,category,date')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .order('date', { ascending: false })
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  const { data, error } = await query
  throwSupabaseError(error)

  const totals = new Map()
  for (const row of data || []) {
    totals.set(row.category, (totals.get(row.category) || 0) + Number(row.amount))
  }
  const categories = [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((left, right) => right.amount - left.amount)
  const total = categories.reduce((sum, category) => sum + category.amount, 0)
  return { total, categories }
}

export async function getBudgetAnalysis(supabase, userId, month) {
  const range = monthRange(month)
  if (!range) throw new AppError('Month must use YYYY-MM format.', 400)

  const { data: budgets, error: budgetError } = await supabase
    .from('budgets')
    .select('id,name,amount,period_month,warning_percentage,category_id,categories(name)')
    .eq('user_id', userId)
    .eq('period_month', range.start)
  throwSupabaseError(budgetError)

  const { data: transactions, error: transactionError } = await supabase
    .from('transactions')
    .select('amount,category')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', range.start)
    .lt('date', range.endExclusive)
  throwSupabaseError(transactionError)

  const analysis = (budgets || []).map((budget) => {
    const categoryName = budget.categories?.name
    const spent = (transactions || [])
      .filter((row) => !categoryName || row.category === categoryName)
      .reduce((sum, row) => sum + Number(row.amount), 0)
    const amount = Number(budget.amount)
    const percentage = amount > 0 ? Math.round((spent / amount) * 100) : 0
    return {
      id: budget.id,
      name: budget.name,
      amount,
      spent,
      remaining: Math.max(amount - spent, 0),
      percentage,
      exceeded: spent > amount,
      warning: ! (spent > amount) && percentage >= budget.warning_percentage,
    }
  })

  return {
    month,
    budgets: analysis,
    totalAmount: analysis.reduce((sum, item) => sum + item.amount, 0),
    totalSpent: analysis.reduce((sum, item) => sum + item.spent, 0),
  }
}

export async function getSavingsAnalysis(supabase, userId) {
  const { data: goals, error: goalError } = await supabase
    .from('savings_goals')
    .select('id,title,target_amount,saved_amount,deadline,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  throwSupabaseError(goalError)

  const items = (goals || []).map((goal) => {
    const target = Number(goal.target_amount)
    const saved = Number(goal.saved_amount)
    const percentage = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0
    return {
      id: goal.id,
      title: goal.title,
      target,
      saved,
      remaining: Math.max(target - saved, 0),
      percentage,
      completed: saved >= target,
      deadline: goal.deadline,
    }
  })

  return {
    goals: items,
    totalTarget: items.reduce((sum, item) => sum + item.target, 0),
    totalSaved: items.reduce((sum, item) => sum + item.saved, 0),
    activeGoals: items.filter((item) => !item.completed).length,
    completedGoals: items.filter((item) => item.completed).length,
  }
}

export async function getInsights(supabase, userId) {
  const now = new Date()
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const range = monthRange(month)
  const [summary, spending, budgets, savings] = await Promise.all([
    getSummary(supabase, userId, range.start, range.endExclusive),
    getSpending(supabase, userId, range.start, range.endExclusive),
    getBudgetAnalysis(supabase, userId, month),
    getSavingsAnalysis(supabase, userId),
  ])

  const insights = []
  if (spending.categories.length) {
    insights.push({
      type: 'top_category',
      title: 'Top spending category',
      detail: `${spending.categories[0].category} is your largest expense category this month.`,
      amount: spending.categories[0].amount,
    })
  }
  if (summary.net >= 0) {
    insights.push({
      type: 'cash_flow',
      title: 'Positive cash flow',
      detail: 'Income is ahead of expenses this month.',
      amount: summary.net,
    })
  } else {
    insights.push({
      type: 'cash_flow',
      title: 'Negative cash flow',
      detail: 'Expenses are ahead of income this month.',
      amount: Math.abs(summary.net),
    })
  }
  const exceeded = budgets.budgets.filter((budget) => budget.exceeded)
  if (exceeded.length) {
    insights.push({
      type: 'budget',
      title: 'Budgets exceeded',
      detail: `${exceeded.length} budget${exceeded.length === 1 ? '' : 's'} are above their limits.`,
    })
  }
  if (savings.completedGoals) {
    insights.push({
      type: 'savings',
      title: 'Savings milestones',
      detail: `${savings.completedGoals} savings goal${savings.completedGoals === 1 ? '' : 's'} are complete.`,
    })
  }

  return insights
}
