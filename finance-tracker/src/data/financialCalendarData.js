import { addDays, format } from 'date-fns'
import { TODAY } from './transactionData.js'

export const financialEventTypes = [
  { value: 'bill', label: 'Bill' },
  { value: 'rent', label: 'Rent' },
  { value: 'payday', label: 'Payday' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'loan_payment', label: 'Loan payment' },
  { value: 'savings_contribution', label: 'Savings contribution' },
  { value: 'recurring_expense', label: 'Recurring expense' },
  { value: 'reminder', label: 'Financial reminder' },
]

export const recurrenceOptions = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
]

export const reminderOptions = [
  { value: '', label: 'No reminder' },
  { value: '0', label: 'On the day' },
  { value: '1', label: '1 day before' },
  { value: '3', label: '3 days before' },
  { value: '7', label: '1 week before' },
]

export const payableEventTypes = [
  'bill',
  'rent',
  'subscription',
  'loan_payment',
  'savings_contribution',
  'recurring_expense',
]

function dateOffset(days) {
  return format(addDays(TODAY, days), 'yyyy-MM-dd')
}

export const sampleFinancialCalendarEvents = [
  {
    id: 'calendar-electricity',
    title: 'Electricity bill',
    eventType: 'bill',
    eventDate: dateOffset(2),
    amount: 3800,
    recurrence: 'monthly',
    repeatUntil: '',
    remindBeforeDays: 1,
    notes: 'Pay before the end of the month.',
    completedDates: [],
  },
  {
    id: 'calendar-payday',
    title: 'Payday',
    eventType: 'payday',
    eventDate: dateOffset(5),
    amount: 65000,
    recurrence: 'monthly',
    repeatUntil: '',
    remindBeforeDays: 0,
    notes: 'Monthly salary',
    completedDates: [],
  },
  {
    id: 'calendar-internet',
    title: 'Home internet',
    eventType: 'subscription',
    eventDate: dateOffset(7),
    amount: 2500,
    recurrence: 'monthly',
    repeatUntil: '',
    remindBeforeDays: 1,
    notes: '',
    completedDates: [],
  },
  {
    id: 'calendar-loan',
    title: 'Loan installment',
    eventType: 'loan_payment',
    eventDate: dateOffset(9),
    amount: 7500,
    recurrence: 'monthly',
    repeatUntil: '',
    remindBeforeDays: 3,
    notes: 'Monthly repayment',
    completedDates: [],
  },
  {
    id: 'calendar-savings',
    title: 'Savings contribution',
    eventType: 'savings_contribution',
    eventDate: dateOffset(10),
    amount: 5000,
    recurrence: 'monthly',
    repeatUntil: '',
    remindBeforeDays: 0,
    notes: 'Add to the emergency fund.',
    completedDates: [],
  },
  {
    id: 'calendar-rent',
    title: 'Rent',
    eventType: 'rent',
    eventDate: dateOffset(12),
    amount: 18000,
    recurrence: 'monthly',
    repeatUntil: '',
    remindBeforeDays: 3,
    notes: '',
    completedDates: [],
  },
  {
    id: 'calendar-check-in',
    title: 'Review my spending',
    eventType: 'reminder',
    eventDate: dateOffset(0),
    amount: null,
    recurrence: 'none',
    repeatUntil: '',
    remindBeforeDays: null,
    notes: 'Take a few minutes to reflect on this week.',
    completedDates: [],
  },
  {
    id: 'calendar-groceries',
    title: 'Weekly groceries',
    eventType: 'recurring_expense',
    eventDate: dateOffset(-2),
    amount: 3500,
    recurrence: 'weekly',
    repeatUntil: '',
    remindBeforeDays: 0,
    notes: '',
    completedDates: [],
  },
  {
    id: 'calendar-water',
    title: 'Water bill',
    eventType: 'bill',
    eventDate: dateOffset(-4),
    amount: 950,
    recurrence: 'none',
    repeatUntil: '',
    remindBeforeDays: null,
    notes: '',
    completedDates: [dateOffset(-4)],
  },
]
