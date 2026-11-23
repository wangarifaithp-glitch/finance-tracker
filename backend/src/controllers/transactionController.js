import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from '../services/transactionService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

function mapTransactionBody(body) {
  return {
    title: body.title,
    amount: body.amount,
    type: body.type,
    category: body.category,
    date: body.date,
    account: body.account,
    payment_method: body.paymentMethod,
    notes: body.notes,
    account_id: body.accountId || null,
    transfer_account_id: body.transferAccountId || null,
    transfer_account: body.transferAccount || null,
  }
}

export const transactionController = {
  list: asyncHandler(async (req, res) => {
    const query = req.validated.query
    const data = await listTransactions(req.supabase, req.auth.userId, {
      type: query.type,
      category: query.category,
      provider: query.provider,
      currency: query.currency,
      source: query.source,
      from: query.from,
      to: query.to,
      offset: (query.page - 1) * query.pageSize,
      pageSize: query.pageSize,
    })
    res.json({
      data,
      pagination: { page: query.page, pageSize: query.pageSize, count: data.length },
    })
  }),

  create: asyncHandler(async (req, res) => {
    const data = await createTransaction(
      req.supabase,
      req.auth.userId,
      mapTransactionBody(req.validated.body),
    )
    res.status(201).json({ data })
  }),

  update: asyncHandler(async (req, res) => {
    const body = req.validated.body
    const fieldMap = {
      title: 'title',
      amount: 'amount',
      type: 'type',
      category: 'category',
      date: 'date',
      account: 'account',
      paymentMethod: 'payment_method',
      notes: 'notes',
      accountId: 'account_id',
      transferAccountId: 'transfer_account_id',
      transferAccount: 'transfer_account',
    }
    const filteredUpdates = Object.fromEntries(
      Object.entries(fieldMap)
        .filter(([inputKey]) => body[inputKey] !== undefined)
        .map(([inputKey, column]) => [
          column,
          ['accountId', 'transferAccountId'].includes(inputKey)
            ? body[inputKey] || null
            : body[inputKey],
        ]),
    )
    const data = await updateTransaction(
      req.supabase,
      req.auth.userId,
      req.validated.params.id,
      filteredUpdates,
    )
    res.json({ data })
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await deleteTransaction(
      req.supabase,
      req.auth.userId,
      req.validated.params.id,
    )
    res.json({ data })
  }),
}
