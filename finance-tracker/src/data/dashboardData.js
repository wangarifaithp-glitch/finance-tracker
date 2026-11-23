import { addDays, addMonths, format } from 'date-fns'
import { sampleTransactions, TODAY } from './transactionData.js'

export { TODAY }

function dateAfter(days) {
  return addDays(TODAY, days)
}

export const summaryCards = [
  {
    label: 'Total Balance',
    amount: 52800,
    change: '+12%',
    comparison: 'vs. last month',
    icon: 'balance',
    color: 'purple',
    trend: [34, 39, 36, 45, 43, 51, 49, 61],
  },
  {
    label: 'Total Income',
    amount: 48000,
    change: '+8%',
    comparison: 'vs. last month',
    icon: 'income',
    color: 'green',
    trend: [30, 34, 32, 38, 40, 37, 49, 54],
  },
  {
    label: 'Total Expenses',
    amount: 35200,
    change: '−8%',
    comparison: 'vs. last month',
    icon: 'expenses',
    color: 'pink',
    trend: [55, 53, 58, 47, 49, 42, 44, 37],
  },
  {
    label: 'Total Savings',
    amount: 12600,
    change: '+15%',
    comparison: 'vs. last month',
    icon: 'savings',
    color: 'gold',
    trend: [24, 27, 25, 34, 37, 36, 44, 52],
  },
]

export const spendingByRange = {
  week: {
    total: 8270,
    categories: [
      { name: 'Food & Drinks', amount: 2800, color: '#f27c9d' },
      { name: 'Transport', amount: 1985, color: '#8b5cf6' },
      { name: 'Shopping', amount: 1654, color: '#eea934' },
      { name: 'Bills', amount: 992, color: '#35c79a' },
      { name: 'Other', amount: 839, color: '#55a9ed' },
    ],
  },
  month: {
    total: 35200,
    categories: [
      { name: 'Food & Drinks', amount: 11968, color: '#f27c9d' },
      { name: 'Transport', amount: 8448, color: '#8b5cf6' },
      { name: 'Shopping', amount: 7040, color: '#eea934' },
      { name: 'Bills', amount: 4224, color: '#35c79a' },
      { name: 'Other', amount: 3520, color: '#55a9ed' },
    ],
  },
  year: {
    total: 424500,
    categories: [
      { name: 'Food & Drinks', amount: 144330, color: '#f27c9d' },
      { name: 'Transport', amount: 101880, color: '#8b5cf6' },
      { name: 'Shopping', amount: 84900, color: '#eea934' },
      { name: 'Bills', amount: 50940, color: '#35c79a' },
      { name: 'Other', amount: 42450, color: '#55a9ed' },
    ],
  },
}

export const savingsGoals = [
  {
    name: 'New laptop',
    target: 80000,
    saved: 54400,
    deadline: format(addMonths(TODAY, 2), 'MMM yyyy'),
    icon: 'laptop',
    color: 'lavender',
  },
  {
    name: 'A little getaway',
    target: 50000,
    saved: 15000,
    deadline: format(addMonths(TODAY, 8), 'MMM yyyy'),
    icon: 'travel',
    color: 'peach',
  },
]

export const monthlyBudget = {
  total: 35000,
  spent: 24500,
  warningAt: 85,
}

export const transactions = sampleTransactions.slice(0, 4).map((transaction) => ({
  id: transaction.id,
  name: transaction.title,
  category: transaction.category,
  date: format(new Date(`${transaction.date}T12:00:00`), 'MMM d, yyyy'),
  paymentMethod: transaction.paymentMethod,
  amount: transaction.type === 'expense' ? -transaction.amount : transaction.amount,
  type: transaction.type,
  icon:
    transaction.type === 'income'
      ? 'income'
      : transaction.category === 'Transport'
        ? 'transport'
        : 'food',
}))

export const financialInsights = [
  {
    id: 'spending',
    icon: 'trend',
    tone: 'green',
    title: 'Your expenses are 8% lower than last month.',
    detail: 'A lovely sign that your plan is working.',
  },
  {
    id: 'food',
    icon: 'food',
    tone: 'purple',
    title: 'Food & Drinks is your top category at 34%.',
    detail: 'A little meal planning could stretch your budget.',
  },
  {
    id: 'surplus',
    icon: 'savings',
    tone: 'gold',
    title: 'Your income is ahead of expenses by',
    amount: 12800,
    detail: 'You also saved 15% more than last month. Keep it up.',
  },
]

export const calendarEvents = [
  {
    id: 'rent',
    title: 'Rent payment',
    detail: 'Due in 3 days',
    date: dateAfter(3),
    kind: 'bill',
  },
  {
    id: 'payday',
    title: 'Payday',
    detail: 'Salary expected',
    date: dateAfter(7),
    kind: 'income',
  },
  {
    id: 'savings',
    title: 'Savings contribution',
    detail: 'Laptop goal',
    date: dateAfter(10),
    kind: 'savings',
  },
  {
    id: 'utilities',
    title: 'Utilities reminder',
    detail: 'Electricity & internet',
    date: dateAfter(14),
    kind: 'reminder',
  },
]
