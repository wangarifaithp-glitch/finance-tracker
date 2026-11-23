import { AppError } from '../utils/errors.js'

function throwSupabaseError(error) {
  if (error) throw new AppError('Transaction records could not be processed.', 502, 'SUPABASE_ERROR')
}

export async function listTransactions(supabase, userId, filters) {
  let query = supabase
    .from('transactions')
    .select('id,title,description,merchant,amount,original_amount,original_currency,type,category,date,posted_date,transaction_status,provider,provider_reference,source,reconciliation_status,account,payment_method,notes,external_transaction_id,imported_at,created_at,updated_at')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .range(filters.offset, filters.offset + filters.pageSize - 1)
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.provider) query = query.eq('provider', filters.provider)
  if (filters.currency) query = query.eq('original_currency', filters.currency)
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.from) query = query.gte('date', filters.from)
  if (filters.to) query = query.lte('date', filters.to)
  const { data, error } = await query
  throwSupabaseError(error)
  return data || []
}

export async function createTransaction(supabase, userId, transaction) {
  const row = { ...transaction, user_id: userId }
  const { data, error } = await supabase
    .from('transactions')
    .insert(row)
    .select('id,title,amount,type,category,date,account,payment_method,notes,created_at,updated_at')
    .single()
  throwSupabaseError(error)
  return data
}

export async function updateTransaction(supabase, userId, transactionId, updates) {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select('id,title,amount,type,category,date,account,payment_method,notes,created_at,updated_at')
    .maybeSingle()
  throwSupabaseError(error)
  if (!data) throw new AppError('Transaction not found.', 404)
  return data
}

export async function deleteTransaction(supabase, userId, transactionId) {
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle()
  throwSupabaseError(error)
  if (!data) throw new AppError('Transaction not found.', 404)
  return { id: data.id }
}
