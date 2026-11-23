import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  parseISO,
  subDays,
} from 'date-fns'
import { getSavingsGoals } from './savingsGoalRepository.js'
import { sampleTransactions } from './transactionData.js'
import { loadTransactions } from './transactionStorage.js'
import { isDemoMode, isSupabaseConfigured, supabase } from './supabaseClient.js'

function requireSupabaseUser(userId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for this deployment.')
  }
  if (!userId) {
    throw new Error('Sign in before accessing financial reports.')
  }
}

function calculateTotals(transactions) {
  return transactions.reduce(
    (totals, transaction) => {
      if (transaction.type === 'income') totals.income += transaction.amount
      if (transaction.type === 'expense') totals.expenses += transaction.amount
      if (transaction.type === 'transfer') totals.transfers += transaction.amount
      totals.transactionCount += 1
      return totals
    },
    { income: 0, expenses: 0, transfers: 0, net: 0, transactionCount: 0 },
  )
}

function reportDateRange(from, to) {
  const start = parseISO(from)
  const end = parseISO(to)
  const days = differenceInCalendarDays(end, start) + 1
  const previousTo = subDays(start, 1)
  const previousFrom = subDays(previousTo, days - 1)
  return {
    previousFrom: format(previousFrom, 'yyyy-MM-dd'),
    previousTo: format(previousTo, 'yyyy-MM-dd'),
  }
}

function makeDemoSeries(transactions, from, to, groupBy) {
  const dates =
    groupBy === 'month'
      ? eachMonthOfInterval({ start: parseISO(from), end: parseISO(to) })
      : eachDayOfInterval({ start: parseISO(from), end: parseISO(to) })
  const keyFormat = groupBy === 'month' ? 'yyyy-MM-01' : 'yyyy-MM-dd'
  const grouped = new Map()

  for (const transaction of transactions) {
    const key = format(parseISO(transaction.date), keyFormat)
    const totals = grouped.get(key) || { income: 0, expenses: 0 }
    if (transaction.type === 'income') totals.income += transaction.amount
    if (transaction.type === 'expense') totals.expenses += transaction.amount
    grouped.set(key, totals)
  }

  let balance = 0
  return dates.map((date) => {
    const period = format(date, keyFormat)
    const totals = grouped.get(period) || { income: 0, expenses: 0 }
    const net = totals.income - totals.expenses
    balance += net
    return { period, ...totals, net, balance }
  })
}

function calculateDemoSavings(goals, from, to) {
  let contributedInPeriod = 0
  let withdrawnInPeriod = 0

  for (const goal of goals) {
    for (const entry of goal.history) {
      const date = format(parseISO(entry.createdAt), 'yyyy-MM-dd')
      if (date < from || date > to) continue
      if (entry.movement === 'contribution') contributedInPeriod += entry.amount
      if (entry.movement === 'withdrawal') withdrawnInPeriod += entry.amount
    }
  }

  return goals.reduce(
    (savings, goal) => {
      savings.totalSaved += goal.savedAmount
      savings.totalTarget += goal.targetAmount
      if (goal.savedAmount >= goal.targetAmount) savings.completedGoals += 1
      else savings.activeGoals += 1
      savings.contributedInPeriod = contributedInPeriod
      savings.withdrawnInPeriod = withdrawnInPeriod
      return savings
    },
    {
      totalSaved: 0,
      totalTarget: 0,
      activeGoals: 0,
      completedGoals: 0,
      contributedInPeriod: 0,
      withdrawnInPeriod: 0,
    },
  )
}

function calculateDemoReport(transactions, goals, from, to, groupBy) {
  const { previousFrom, previousTo } = reportDateRange(from, to)
  const inRange = transactions.filter(
    (transaction) => transaction.date >= from && transaction.date <= to,
  )
  const previousTransactions = transactions.filter(
    (transaction) =>
      transaction.date >= previousFrom && transaction.date <= previousTo,
  )
  const totals = calculateTotals(inRange)
  const previousTotals = calculateTotals(previousTransactions)
  totals.net = totals.income - totals.expenses
  previousTotals.net = previousTotals.income - previousTotals.expenses

  const categoryTotals = new Map()
  for (const transaction of inRange) {
    if (transaction.type !== 'expense') continue
    categoryTotals.set(
      transaction.category,
      (categoryTotals.get(transaction.category) || 0) + transaction.amount,
    )
  }
  const categories = Array.from(categoryTotals, ([category, amount]) => ({
    category,
    amount,
  })).sort((left, right) => right.amount - left.amount)

  return {
    totals,
    previousTotals,
    series: makeDemoSeries(inRange, from, to, groupBy),
    categories,
    largestExpenses: inRange
      .filter((transaction) => transaction.type === 'expense')
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 10)
      .map((transaction) => ({
        id: transaction.id,
        title: transaction.title,
        date: transaction.date,
        category: transaction.category,
        amount: transaction.amount,
        account: transaction.account,
      })),
    savings: calculateDemoSavings(goals, from, to),
    budgetsConfigured: false,
  }
}

export async function getFinancialReport({ userId, from, to, groupBy, signal }) {
  if (isDemoMode) {
    const transactions = loadTransactions() ?? sampleTransactions
    const goals = await getSavingsGoals(userId, signal)
    return calculateDemoReport(transactions, goals, from, to, groupBy)
  }

  requireSupabaseUser(userId)
  let query = supabase.rpc('get_financial_report', {
    p_from: from,
    p_to: to,
    p_group_by: groupBy,
  })
  if (signal) query = query.abortSignal(signal)

  const { data, error } = await query
  if (error) throw error
  if (!data) throw new Error('The financial report returned no data.')
  return data
}
