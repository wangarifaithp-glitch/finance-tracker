import { AppError } from '../utils/errors.js'
import { env } from '../config/env.js'

export const providerCatalog = [
  { id: 'mpesa', name: 'M-Pesa', category: 'Mobile Money', type: 'Mobile money', currency: 'KES' },
  { id: 'equity', name: 'Equity Bank', category: 'Banks', type: 'Bank', currency: 'KES' },
  { id: 'kcb', name: 'KCB Bank', category: 'Banks', type: 'Bank', currency: 'KES' },
  { id: 'cooperative', name: 'Co-operative Bank', category: 'Banks', type: 'Bank', currency: 'KES' },
  { id: 'visa', name: 'Visa', category: 'Cards', type: 'Card network', currency: 'KES' },
  { id: 'mastercard', name: 'Mastercard', category: 'Cards', type: 'Card network', currency: 'KES' },
  { id: 'paypal', name: 'PayPal', category: 'Digital Wallets', type: 'Digital wallet', currency: 'USD' },
].map((provider) => ({
  ...provider,
  status: env.enabledProviders[provider.id] ? 'adapter_available' : 'not_configured',
}))

export function getProviderAvailability(providerId) {
  return providerCatalog.find((provider) => provider.id === providerId && provider.status === 'adapter_available')
}

export async function listConnections(supabase, userId) {
  const { data, error } = await supabase
    .from('financial_connections')
    .select('id,provider,provider_connection_id,display_name,institution_name,currency,status,last_synced_at,last_error,created_at,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new AppError('Financial connections could not be retrieved.', 502, 'SUPABASE_ERROR')
  return data || []
}

export async function listSyncEvents(supabase, userId) {
  const { data, error } = await supabase
    .from('financial_sync_events')
    .select('id,connection_id,event_type,status,records_received,records_imported,records_reconciled,error_code,started_at,completed_at,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw new AppError('Synchronization history could not be retrieved.', 502, 'SUPABASE_ERROR')
  return data || []
}

export async function listConnectedAccounts(supabase, userId, connectionId) {
  let query = supabase
    .from('financial_connected_accounts')
    .select('id,connection_id,name,account_type,currency,balance,available_balance,masked_identifier,status,last_synced_at,provider_account_id')
    .eq('user_id', userId)
    .order('name')
  if (connectionId) query = query.eq('connection_id', connectionId)
  const { data, error } = await query
  if (error) throw new AppError('Connected accounts could not be retrieved.', 502, 'SUPABASE_ERROR')
  return data || []
}

export async function disconnectConnection(supabase, userId, connectionId) {
  const { data, error } = await supabase
    .from('financial_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle()
  if (error) throw new AppError('The connection could not be disconnected.', 502, 'SUPABASE_ERROR')
  if (!data) throw new AppError('Financial connection not found.', 404)
  return { id: data.id }
}

export async function getConnection(supabase, userId, connectionId) {
  const { data, error } = await supabase
    .from('financial_connections')
    .select('id,provider,status,display_name')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new AppError('The connection could not be verified.', 502, 'SUPABASE_ERROR')
  if (!data) throw new AppError('Financial connection not found.', 404)
  return data
}

export async function createSyncRun(supabase, userId, connectionId, mode = 'manual') {
  const { data, error } = await supabase
    .from('transaction_sync_runs')
    .insert({
      user_id: userId,
      connection_id: connectionId,
      sync_mode: mode,
      status: 'queued',
      attempt: 1,
      max_attempts: env.syncMaxAttempts,
    })
    .select('id,status,attempt,max_attempts,created_at')
    .single()
  if (error) throw new AppError('A synchronization run could not be created.', 502, 'SUPABASE_ERROR')
  return data
}

export async function failSyncRun(supabase, runId, userId, errorCode, errorSummary) {
  await supabase
    .from('transaction_sync_runs')
    .update({
      status: 'failed',
      error_code: errorCode,
      error_summary: errorSummary,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('user_id', userId)
}

export async function listSyncRuns(supabase, userId, connectionId) {
  let query = supabase
    .from('transaction_sync_runs')
    .select('id,connection_id,sync_mode,status,cursor,next_cursor,attempt,max_attempts,records_received,records_imported,records_updated,records_matched,duplicates_skipped,failed_records,error_code,error_summary,started_at,completed_at,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (connectionId) query = query.eq('connection_id', connectionId)
  const { data, error } = await query
  if (error) throw new AppError('Synchronization history could not be retrieved.', 502, 'SUPABASE_ERROR')
  return data || []
}
