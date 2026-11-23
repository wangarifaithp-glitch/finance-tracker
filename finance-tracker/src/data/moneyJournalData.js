import { format, subDays } from 'date-fns'
import { TODAY } from './transactionData.js'

export const journalPrompts = [
  'What was my biggest expense today?',
  "Was today's spending intentional?",
  'What financial decision am I proud of?',
  'What could I have done differently?',
  'Did I make progress toward my goals?',
  'What did I learn about my money today?',
]

function entryDate(daysAgo) {
  return format(subDays(TODAY, daysAgo), 'yyyy-MM-dd')
}

export const sampleMoneyJournalEntries = [
  {
    id: 'journal-intentional-spending',
    title: 'Choosing what matters',
    entryDate: entryDate(0),
    reflection:
      'I paused before making a few small purchases today. It felt good to spend on lunch with a friend and skip the things I did not really need.',
    financialWin: 'I stayed mindful and kept my plans in view.',
    lesson: 'A short pause helps me tell the difference between wanting and needing.',
    tags: ['intentional spending', 'mindfulness'],
    createdAt: subDays(TODAY, 0).toISOString(),
    updatedAt: subDays(TODAY, 0).toISOString(),
  },
  {
    id: 'journal-goal-progress',
    title: 'A steady step forward',
    entryDate: entryDate(2),
    reflection:
      'I checked in on my savings goals and noticed how the smaller, regular contributions are adding up.',
    financialWin: 'Added to my emergency fund.',
    lesson: 'Consistency matters more than making one perfect contribution.',
    tags: ['savings', 'progress'],
    createdAt: subDays(TODAY, 2).toISOString(),
    updatedAt: subDays(TODAY, 2).toISOString(),
  },
  {
    id: 'journal-weekly-plan',
    title: 'Making a calmer plan',
    entryDate: entryDate(5),
    reflection:
      'Planning the week made upcoming bills feel more manageable. I can make room for essentials before deciding what is left for extras.',
    financialWin: 'Set aside money for the electricity bill.',
    lesson: 'Writing down the next few expenses gives me more confidence.',
    tags: ['planning', 'bills'],
    createdAt: subDays(TODAY, 5).toISOString(),
    updatedAt: subDays(TODAY, 5).toISOString(),
  },
  {
    id: 'journal-small-win',
    title: 'A little win',
    entryDate: entryDate(9),
    reflection:
      'I brought lunch from home today. It was a small choice, but it felt aligned with the goals I am working toward.',
    financialWin: 'Spent less on lunch than I planned.',
    lesson: 'Small choices are easier to repeat when they fit my routine.',
    tags: ['small wins', 'food'],
    createdAt: subDays(TODAY, 9).toISOString(),
    updatedAt: subDays(TODAY, 9).toISOString(),
  },
  {
    id: 'journal-reflection',
    title: 'Learning from a surprise',
    entryDate: entryDate(13),
    reflection:
      'An unexpected expense came up. I covered it without using money set aside for rent, which reminded me why a buffer is useful.',
    financialWin: 'Handled an unplanned cost without losing track of priorities.',
    lesson: 'I want to keep building a little flexibility into my monthly plan.',
    tags: ['reflection', 'emergency fund'],
    createdAt: subDays(TODAY, 13).toISOString(),
    updatedAt: subDays(TODAY, 13).toISOString(),
  },
]
