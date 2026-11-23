import { sampleTransactions } from './transactionData.js'
import { loadTransactions, saveTransactions } from './transactionStorage.js'
import { loadDemoFinancialAccounts } from './financialAccountData.js'
import { isDemoMode, isSupabaseConfigured, supabase } from './supabaseClient.js'

const receiptBucket = 'transaction-receipts'
const selectedColumns =
  'id,title,description,merchant,amount,original_amount,original_currency,type,category,date,posted_date,transaction_status,provider,provider_reference,source,reconciliation_status,account,account_id,transfer_account,transfer_account_id,payment_method,notes,receipt_path,receipt_name,receipt_type,imported_at'

function calculateDemoSummary(transactions) {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === 'income') summary.totalIncome += transaction.amount
      if (transaction.type === 'expense') summary.totalExpenses += transaction.amount
      summary.transactionCount += 1
      return summary
    },
    { totalIncome: 0, totalExpenses: 0, transactionCount: 0 },
  )
}

function matchesSearch(transaction, query) {
  if (!query) return true
  const search = query.toLocaleLowerCase()
  return [
    transaction.title,
    transaction.category,
    transaction.account,
    transaction.paymentMethod,
    transaction.notes,
  ]
    .filter(Boolean)
    .some((value) => value.toLocaleLowerCase().includes(search))
}

function filterDemoTransactions(transactions, { filters, search }) {
  const account = filters.account
    ? loadDemoFinancialAccounts().find((item) => item.id === filters.account)
    : null
  return transactions
    .filter(
      (transaction) =>
        matchesSearch(transaction, search.trim()) &&
        (!filters.type || transaction.type === filters.type) &&
        (!filters.category || transaction.category === filters.category) &&
        (!filters.provider || transaction.provider === filters.provider) &&
        (!filters.currency || (transaction.originalCurrency || 'KES') === filters.currency) &&
        (!filters.source || (transaction.source || 'manual') === filters.source) &&
        (!filters.account ||
          transaction.accountId === filters.account ||
          transaction.transferAccountId === filters.account ||
          (account && !transaction.accountId && transaction.account === account.name) ||
          (account &&
            !transaction.transferAccountId &&
            transaction.transferAccount === account.name) ||
          (!account &&
            (transaction.account === filters.account ||
              transaction.transferAccount === filters.account))) &&
        (!filters.from || transaction.date >= filters.from) &&
        (!filters.to || transaction.date <= filters.to),
    )
    .sort((left, right) => {
      if (filters.sort === 'oldest') return left.date.localeCompare(right.date)
      if (filters.sort === 'amount-high') return right.amount - left.amount
      if (filters.sort === 'amount-low') return left.amount - right.amount
      if (filters.sort === 'title') return left.title.localeCompare(right.title)
      return right.date.localeCompare(left.date)
    })
}

function mapTransaction(row) {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    type: row.type,
    category: row.category,
    date: row.date,
    account: row.account,
    accountId: row.account_id || '',
    transferAccount: row.transfer_account || '',
    transferAccountId: row.transfer_account_id || '',
    paymentMethod: row.payment_method,
    notes: row.notes,
    description: row.description || row.title,
    merchant: row.merchant || '',
    originalAmount: row.original_amount === null ? Number(row.amount) : Number(row.original_amount),
    originalCurrency: row.original_currency || 'KES',
    postedDate: row.posted_date || row.date,
    transactionStatus: row.transaction_status || 'posted',
    provider: row.provider || '',
    providerReference: row.provider_reference || '',
    source: row.source || 'manual',
    convertedAmount: row.converted_amount === null ? Number(row.amount) : Number(row.converted_amount),
    reportingCurrency: row.reporting_currency || 'KES',
    conversionRate: row.conversion_rate === null ? null : Number(row.conversion_rate),
    conversionDate: row.conversion_date || '',
    reconciliationStatus: row.reconciliation_status || 'manual',
    importedAt: row.imported_at || '',
    receipt: row.receipt_path
      ? {
          name: row.receipt_name,
          type: row.receipt_type,
          path: row.receipt_path,
        }
      : null,
  }
}

function requireSupabaseUser(userId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for this deployment.')
  }
  if (!userId) {
    throw new Error('Sign in before accessing transactions.')
  }
}

export async function getTransactionPage({
  userId,
  filters,
  search,
  page,
  pageSize,
  signal,
}) {
  if (isDemoMode) {
    const allTransactions = loadTransactions() ?? sampleTransactions
    const filtered = filterDemoTransactions(allTransactions, { filters, search })
    const offset = (page - 1) * pageSize
    return {
      transactions: filtered.slice(offset, offset + pageSize),
      totalCount: filtered.length,
      countIsApproximate: false,
      hasNext: offset + pageSize < filtered.length,
      summary: calculateDemoSummary(allTransactions),
    }
  }

  requireSupabaseUser(userId)
  let query = supabase
    .from('transactions')
    .select(selectedColumns, { count: 'planned' })

  if (filters.type) query = query.eq('type', filters.type)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.provider) query = query.eq('provider', filters.provider)
  if (filters.currency) query = query.eq('original_currency', filters.currency)
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.account) {
    query = query.or(
      `account_id.eq.${filters.account},transfer_account_id.eq.${filters.account}`,
    )
  }
  if (filters.from) query = query.gte('date', filters.from)
  if (filters.to) query = query.lte('date', filters.to)
  if (search.trim()) {
    query = query.textSearch('search_document', search.trim(), {
      config: 'simple',
      type: 'websearch',
    })
  }

  const sortBy =
    filters.sort === 'amount-high' || filters.sort === 'amount-low'
      ? 'amount'
      : filters.sort === 'title'
        ? 'title'
        : 'date'
  const ascending =
    filters.sort === 'oldest' || filters.sort === 'amount-low' || filters.sort === 'title'
  const start = (page - 1) * pageSize
  query = query
    .order(sortBy, { ascending })
    .order('id', { ascending })
    .range(start, start + pageSize)
  if (signal) query = query.abortSignal(signal)

  const { data, count, error } = await query
  if (error) throw error

  const { data: summaryRow, error: summaryError } = await supabase
    .from('transaction_summaries')
    .select('total_income,total_expenses,transaction_count')
    .eq('user_id', userId)
    .maybeSingle()
  if (summaryError) throw summaryError

  const hasNext = (data || []).length > pageSize
  const estimatedCount = Math.max(count ?? 0, start + (data || []).length)
  return {
    transactions: (data || []).slice(0, pageSize).map(mapTransaction),
    totalCount: estimatedCount,
    countIsApproximate: true,
    hasNext,
    summary: {
      totalIncome: Number(summaryRow?.total_income || 0),
      totalExpenses: Number(summaryRow?.total_expenses || 0),
      transactionCount: Number(summaryRow?.transaction_count || 0),
    },
  }
}

export async function getAccountTransactionPage({
  account,
  userId,
  page,
  pageSize,
  signal,
}) {
  if (isDemoMode) {
    const transactions = loadTransactions() ?? sampleTransactions
    const filtered = transactions
      .filter(
        (transaction) =>
          transaction.accountId === account.id ||
          transaction.transferAccountId === account.id ||
          (!transaction.accountId && transaction.account === account.name) ||
          (!transaction.transferAccountId &&
            transaction.transferAccount === account.name),
      )
      .sort((left, right) => right.date.localeCompare(left.date))
    const offset = (page - 1) * pageSize
    return {
      transactions: filtered.slice(offset, offset + pageSize),
      totalCount: filtered.length,
      hasNext: offset + pageSize < filtered.length,
      countIsApproximate: false,
    }
  }

  requireSupabaseUser(userId)
  let query = supabase
    .from('transactions')
    .select(selectedColumns, { count: 'planned' })
    .or(`account_id.eq.${account.id},transfer_account_id.eq.${account.id}`)
    .order('date', { ascending: false })
    .order('id', { ascending: false })
  const start = (page - 1) * pageSize
  query = query.range(start, start + pageSize)
  if (signal) query = query.abortSignal(signal)
  const { data, count, error } = await query
  if (error) throw error

  const hasNext = (data || []).length > pageSize
  return {
    transactions: (data || []).slice(0, pageSize).map(mapTransaction),
    totalCount: Math.max(count ?? 0, start + (data || []).length),
    hasNext,
    countIsApproximate: true,
  }
}

function mapTransactionToRow(transaction, userId, receipt) {
  return {
    id: transaction.id,
    user_id: userId,
    title: transaction.title,
    amount: transaction.amount,
    type: transaction.type,
    category: transaction.category,
    date: transaction.date,
    account: transaction.account,
    account_id: transaction.accountId || null,
    transfer_account: transaction.transferAccount || null,
    transfer_account_id: transaction.transferAccountId || null,
    payment_method: transaction.paymentMethod,
    notes: transaction.notes,
    original_amount: transaction.originalAmount || transaction.amount,
    original_currency: transaction.originalCurrency || 'KES',
    converted_amount: transaction.amount,
    reporting_currency: transaction.reportingCurrency || 'KES',
    conversion_rate: transaction.conversionRate || 1,
    conversion_date: transaction.conversionDate || transaction.date,
    receipt_path: receipt?.path || null,
    receipt_name: receipt?.name || null,
    receipt_type: receipt?.type || null,
  }
}

async function uploadReceipt(userId, transactionId, receipt) {
  const response = await fetch(receipt.dataUrl)
  if (!response.ok) throw new Error('The receipt could not be prepared for upload.')
  const file = await response.blob()
  const safeName = receipt.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'receipt'
  const path = `${userId}/${transactionId}/${globalThis.crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from(receiptBucket).upload(path, file, {
    contentType: receipt.type,
    upsert: false,
  })
  if (error) throw error
  return { name: receipt.name, type: receipt.type, path }
}

async function removeReceipt(path) {
  if (!path) return null
  const { error } = await supabase.storage.from(receiptBucket).remove([path])
  return error
}

export async function saveTransaction(transaction, userId, previousTransaction) {
  const isEditing = Boolean(previousTransaction)
  if (isDemoMode) {
    const transactions = loadTransactions() ?? sampleTransactions
    const savedTransaction = {
      ...transaction,
      id: previousTransaction?.id || transaction.id || globalThis.crypto.randomUUID(),
    }
    const nextTransactions = isEditing
      ? transactions.map((item) =>
          item.id === previousTransaction.id ? savedTransaction : item,
        )
      : [savedTransaction, ...transactions]
    saveTransactions(nextTransactions)
    return { warning: '' }
  }

  requireSupabaseUser(userId)
  const oldReceiptPath = previousTransaction?.receipt?.path || null
  let receipt = transaction.receipt
  let uploadedReceiptPath = null

  if (receipt?.dataUrl) {
    receipt = await uploadReceipt(userId, transaction.id, receipt)
    uploadedReceiptPath = receipt.path
  }

  const row = mapTransactionToRow(transaction, userId, receipt)
  const result = isEditing
    ? await supabase
        .from('transactions')
        .update(row)
        .eq('id', transaction.id)
        .select(selectedColumns)
        .single()
    : await supabase.from('transactions').insert(row).select(selectedColumns).single()

  if (result.error) {
    if (uploadedReceiptPath) {
      const cleanupError = await removeReceipt(uploadedReceiptPath)
      if (cleanupError) {
        console.error('Unable to remove a receipt uploaded for a failed transaction save.', cleanupError)
      }
    }
    throw result.error
  }

  let warning = ''
  if (oldReceiptPath && oldReceiptPath !== receipt?.path) {
    const cleanupError = await removeReceipt(oldReceiptPath)
    if (cleanupError) {
      console.error('Transaction saved, but the replaced receipt could not be removed.', cleanupError)
      warning = 'Transaction saved, but its previous receipt could not be removed.'
    }
  }

  return { transaction: mapTransaction(result.data), warning }
}

export async function deleteTransaction(transaction, userId) {
  if (isDemoMode) {
    const transactions = loadTransactions() ?? sampleTransactions
    saveTransactions(transactions.filter((item) => item.id !== transaction.id))
    return { warning: '' }
  }

  requireSupabaseUser(userId)
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transaction.id)
    .select('id,receipt_path')
    .single()
  if (error) throw error

  const cleanupError = await removeReceipt(data.receipt_path)
  if (cleanupError) {
    console.error('Transaction deleted, but its receipt could not be removed.', cleanupError)
    return { warning: 'Transaction deleted, but its receipt file could not be removed.' }
  }

  return { warning: '' }
}

export async function getTransactionReceiptUrl(receipt) {
  if (receipt?.dataUrl) return receipt.dataUrl
  if (!receipt?.path || !supabase) return null

  const { data, error } = await supabase.storage
    .from(receiptBucket)
    .createSignedUrl(receipt.path, 60 * 60)
  if (error) throw error
  return data.signedUrl
}
