import { z } from 'zod'
import { isIsoDate } from '../utils/date.js'

const isoDate = z.string().refine(isIsoDate, 'Date must use YYYY-MM-DD format.')
const month = z.string().regex(/^\d{4}-\d{2}$/, 'Month must use YYYY-MM format.')

export const dateRangeSchema = z.object({
  query: z.object({
    from: isoDate.optional(),
    to: isoDate.optional(),
  }).refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    'The from date must be before or equal to the to date.',
  ),
  body: z.any().optional(),
  params: z.any().optional(),
})

export const budgetSchema = z.object({
  query: z.object({ month }),
  body: z.any().optional(),
  params: z.any().optional(),
})

export const transactionListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    type: z.enum(['income', 'expense', 'transfer']).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    provider: z.enum(['mpesa','equity','kcb','cooperative','visa','mastercard','paypal']).optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    source: z.enum(['manual','imported','mpesa','bank','paypal','card']).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  }).refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    'The from date must be before or equal to the to date.',
  ),
  body: z.any().optional(),
  params: z.any().optional(),
})

const transactionFields = z.object({
  title: z.string().trim().min(1).max(80),
  amount: z.coerce.number().positive().finite(),
  type: z.enum(['income', 'expense', 'transfer']),
  category: z.string().trim().min(1).max(80),
  date: isoDate,
  account: z.string().trim().min(1).max(80),
  paymentMethod: z.enum(['M-Pesa', 'Cash', 'Bank', 'Debit card', 'Credit card', 'Other']),
  notes: z.string().max(500).default(''),
  accountId: z.string().uuid().optional().nullable(),
  transferAccountId: z.string().uuid().optional().nullable(),
  transferAccount: z.string().trim().max(80).optional().nullable(),
})

export const createTransactionSchema = z.object({
  body: transactionFields,
  query: z.any().optional(),
  params: z.any().optional(),
})

export const updateTransactionSchema = z.object({
  body: transactionFields.partial().refine(
    (body) => Object.keys(body).length > 0,
    'Provide at least one field to update.',
  ),
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid() }),
})

export const transactionIdSchema = z.object({
  body: z.any().optional(),
  query: z.any().optional(),
  params: z.object({ id: z.string().uuid() }),
})
