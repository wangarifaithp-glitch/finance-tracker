import { addMonths, format, subDays } from 'date-fns'
import { TODAY } from './transactionData.js'

function deadlineAfter(months) {
  return format(addMonths(TODAY, months), 'yyyy-MM-dd')
}

function historyEntry(id, movement, amount, daysAgo, note) {
  return {
    id,
    movement,
    amount,
    note,
    createdAt: subDays(TODAY, daysAgo).toISOString(),
  }
}

export const savingsGoalCategories = [
  'Emergency fund',
  'Travel',
  'Education',
  'Business',
  'Technology',
  'Home',
  'Transport',
  'Personal',
  'Other',
]

export const savingsGoalIcons = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'shield', label: 'Emergency fund' },
  { value: 'plane', label: 'Travel' },
  { value: 'graduation', label: 'Education' },
  { value: 'briefcase', label: 'Business' },
  { value: 'phone', label: 'Phone' },
  { value: 'house', label: 'Home' },
  { value: 'target', label: 'Personal goal' },
]

export const savingsGoalColors = ['lavender', 'peach', 'mint', 'gold', 'blue']

export const sampleSavingsGoals = [
  {
    id: 'goal-laptop',
    title: 'A new laptop',
    category: 'Technology',
    targetAmount: 80000,
    savedAmount: 54400,
    deadline: deadlineAfter(2),
    icon: 'laptop',
    color: 'lavender',
    history: [
      historyEntry('laptop-1', 'contribution', 20000, 25, 'First deposit'),
      historyEntry('laptop-2', 'contribution', 34400, 8, 'Monthly savings'),
    ],
  },
  {
    id: 'goal-emergency',
    title: 'Peace of mind fund',
    category: 'Emergency fund',
    targetAmount: 150000,
    savedAmount: 61000,
    deadline: deadlineAfter(9),
    icon: 'shield',
    color: 'mint',
    history: [
      historyEntry('emergency-1', 'contribution', 35000, 42, 'Getting started'),
      historyEntry('emergency-2', 'contribution', 26000, 4, 'Payday contribution'),
    ],
  },
  {
    id: 'goal-travel',
    title: 'Coast getaway',
    category: 'Travel',
    targetAmount: 50000,
    savedAmount: 15000,
    deadline: deadlineAfter(6),
    icon: 'plane',
    color: 'peach',
    history: [historyEntry('travel-1', 'contribution', 15000, 14, 'Trip fund started')],
  },
  {
    id: 'goal-education',
    title: 'Professional course',
    category: 'Education',
    targetAmount: 35000,
    savedAmount: 35000,
    deadline: deadlineAfter(-1),
    icon: 'graduation',
    color: 'gold',
    history: [
      historyEntry('education-1', 'contribution', 15000, 75, 'Course savings'),
      historyEntry('education-2', 'contribution', 20000, 18, 'Final contribution'),
    ],
  },
]


