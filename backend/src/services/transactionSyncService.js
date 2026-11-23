import crypto from 'node:crypto'
import { z } from 'zod'
import { env } from '../config/env.js'
import { AppError } from '../utils/errors.js'

const providerAdapters = new Map()

export function registerProviderAdapter(provider, adapter) {
  if (!provider || typeof adapter?.fetchTransactions !== 'function') {
    throw new Error('A provider adapter must implement fetchTransactions.')
  }
  providerAdapters.set(provider, adapter)
}

export function getProviderAdapter(provider) {
  return providerAdapters.get(provider) || null
}

const normalizedTransactionSchema = z.object({
  externalId: z.string().trim().min(1).max(255).optional().nullable(),
  description: z.string().trim().min(1).max(255),
  merchant: z.string().trim().max(160).optional().nullable(),
  originalAmount: z.number().positive(),
  originalCurrency: z.string().regex(/^[A-Z]{3}$/),
  type: z.enum(['income', 'expense', 'transfer']),
  status: z.enum(['pending', 'posted', 'void', 'failed', 'reversed']).default('posted'),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  postedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  category: z.string().trim().min(1).max(80).optional().nullable(),
  providerReference: z.string().trim().max(255).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export function normalizeProviderTransaction(transaction) {
  const parsed = normalizedTransactionSchema.safeParse(transaction)
  if (!parsed.success) {
    throw new AppError('A provider transaction has an invalid data shape.', 422, 'INVALID_PROVIDER_TRANSACTION')
  }
  return parsed.data
}

export function createFallbackDuplicateHash({
  userId,
  connectionId,
  accountProviderId,
  originalAmount,
  originalCurrency,
  transactionDate,
  description,
  merchant,
  providerReference,
}) {
  const payload = [
    userId,
    connectionId,
    accountProviderId || '',
    originalCurrency,
    originalAmount.toFixed(2),
    transactionDate,
    providerReference || '',
    (merchant || '').trim().toLocaleLowerCase(),
    description.trim().toLocaleLowerCase(),
  ].join('|')
  return crypto.createHash('sha256').update(payload).digest('hex')
}

export function toInternalTransaction(normalized, context) {
  const accountName = context.accountName || context.connectionName || 'Connected account'
  const amount = Number(normalized.originalAmount)
  const category = normalized.category || 'Other'
  return {
    user_id: context.userId,
    account: accountName,
    account_id: context.accountId || null,
    provider_connection_id: context.connectionId,
    external_transaction_id: normalized.externalId || null,
    source: context.source,
    title: normalized.description.slice(0, 80),
    description: normalized.description,
    merchant: normalized.merchant || null,
    amount,
    original_amount: amount,
    original_currency: normalized.originalCurrency,
    type: normalized.type,
    category,
    payment_method: context.paymentMethod,
    date: normalized.transactionDate,
    posted_date: normalized.postedDate || normalized.transactionDate,
    transaction_status: normalized.status,
    provider: context.provider,
    provider_reference: normalized.providerReference || null,
    imported_at: new Date().toISOString(),
    reconciliation_status: normalized.externalId ? 'imported' : 'pending_review',
    fallback_duplicate_hash: context.fallbackDuplicateHash,
    provider_metadata: normalized.metadata,
  }
}

export async function findExistingTransaction(supabase, context, normalized, fallbackHash) {
  if (normalized.externalId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .eq('provider_connection_id', context.connectionId)
      .eq('external_transaction_id', normalized.externalId)
      .maybeSingle()
    if (error) throw error
    if (data) return data
  }

  if (fallbackHash) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', context.userId)
      .eq('fallback_duplicate_hash', fallbackHash)
      .maybeSingle()
    if (error) throw error
    if (data) return data
  }
  return null
}

export async function reconcileNormalizedTransactions({
  supabase,
  userId,
  connection,
  account,
  normalizedTransactions,
  runId,
}) {
  let imported = 0
  let updated = 0
  let duplicates = 0
  let matched = 0
  let failed = 0

  for (const raw of normalizedTransactions) {
    try {
      const normalized = normalizeProviderTransaction(raw)
      const fallbackHash = createFallbackDuplicateHash({
        userId,
        connectionId: connection.id,
        accountProviderId: account?.provider_account_id,
        originalAmount: normalized.originalAmount,
        originalCurrency: normalized.originalCurrency,
        transactionDate: normalized.transactionDate,
        description: normalized.description,
        merchant: normalized.merchant,
        providerReference: normalized.providerReference,
      })
      const context = {
        userId,
        connectionId: connection.id,
        accountId: account?.linked_account_id || null,
        accountName: account?.name,
        connectionName: connection.display_name,
        provider: connection.provider,
        source: connection.provider === 'paypal'
          ? 'paypal'
          : connection.provider === 'mpesa'
            ? 'mpesa'
            : ['visa', 'mastercard'].includes(connection.provider)
              ? 'card'
              : 'bank',
        paymentMethod: connection.provider === 'mpesa' ? 'M-Pesa' : connection.provider === 'paypal' ? 'Other' : 'Bank',
        fallbackDuplicateHash: fallbackHash,
      }
      const existing = await findExistingTransaction(supabase, context, normalized, fallbackHash)
      const internal = toInternalTransaction(normalized, context)

      if (existing) {
        const { error } = await supabase
          .from('transactions')
          .update(internal)
          .eq('id', existing.id)
          .eq('user_id', userId)
        if (error) throw error
        updated += 1
        await supabase.from('transaction_sync_items').insert({
          user_id: userId,
          run_id: runId,
          connection_id: connection.id,
          external_transaction_id: normalized.externalId,
          fallback_duplicate_hash: fallbackHash,
          transaction_id: existing.id,
          action: 'updated',
          provider_metadata: normalized.metadata,
        })
      } else {
        const { data, error } = await supabase
          .from('transactions')
          .insert(internal)
          .select('id')
          .single()
        if (error) {
          if (error.code === '23505') {
            duplicates += 1
            await supabase.from('transaction_sync_items').insert({
              user_id: userId,
              run_id: runId,
              connection_id: connection.id,
              external_transaction_id: normalized.externalId,
              fallback_duplicate_hash: fallbackHash,
              action: 'duplicate',
              provider_metadata: normalized.metadata,
            })
            continue
          }
          throw error
        }
        imported += 1
        await supabase.from('transaction_sync_items').insert({
          user_id: userId,
          run_id: runId,
          connection_id: connection.id,
          external_transaction_id: normalized.externalId,
          fallback_duplicate_hash: fallbackHash,
          transaction_id: data.id,
          action: normalized.externalId ? 'imported' : 'pending_review',
          provider_metadata: normalized.metadata,
        })
      }
    } catch (error) {
      failed += 1
      await supabase.from('transaction_sync_items').insert({
        user_id: userId,
        run_id: runId,
        connection_id: connection.id,
        action: 'failed',
        error_code: error.code || 'NORMALIZATION_ERROR',
        error_summary: 'A provider transaction could not be reconciled.',
        provider_metadata: {},
      })
    }
  }

  return { imported, updated, duplicates, matched, failed }
}

export async function runRetryPolicy(callback) {
  let lastError
  for (let attempt = 1; attempt <= env.syncMaxAttempts; attempt += 1) {
    try {
      return await callback(attempt)
    } catch (error) {
      lastError = error
      if (attempt < env.syncMaxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** (attempt - 1), 8000)))
      }
    }
  }
  throw lastError
}
