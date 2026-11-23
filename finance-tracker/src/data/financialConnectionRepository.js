import { isDemoMode, isSupabaseConfigured, supabase } from './supabaseClient.js'

export const providerCatalog = [
  { id: 'mpesa', name: 'M-Pesa', category: 'Mobile Money', type: 'Mobile money', status: 'not_configured', currency: 'KES' },
  { id: 'equity', name: 'Equity Bank', category: 'Banks', type: 'Bank', status: 'not_configured', currency: 'KES' },
  { id: 'kcb', name: 'KCB Bank', category: 'Banks', type: 'Bank', status: 'not_configured', currency: 'KES' },
  { id: 'cooperative', name: 'Co-operative Bank', category: 'Banks', type: 'Bank', status: 'not_configured', currency: 'KES' },
  { id: 'visa', name: 'Visa', category: 'Cards', type: 'Card network', status: 'not_configured', currency: 'KES' },
  { id: 'mastercard', name: 'Mastercard', category: 'Cards', type: 'Card network', status: 'not_configured', currency: 'KES' },
  { id: 'paypal', name: 'PayPal', category: 'Digital Wallets', type: 'Digital wallet', status: 'not_configured', currency: 'USD' },
  { id: 'other', name: 'International provider', category: 'International', type: 'Financial provider', status: 'not_configured', currency: 'KES' },
]

function requireSupabaseUser(userId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for this deployment.')
  }
  if (!userId) throw new Error('Sign in before accessing financial connections.')
}

export async function getFinancialConnections(userId, signal) {
  if (isDemoMode) return []

  requireSupabaseUser(userId)
  let query = supabase
    .from('financial_connections')
    .select('id,provider,provider_connection_id,display_name,institution_name,currency,status,last_synced_at,last_error,created_at,updated_at')
    .order('created_at', { ascending: false })
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((row) => ({
    id: row.id,
    provider: row.provider,
    providerConnectionId: row.provider_connection_id,
    displayName: row.display_name,
    institutionName: row.institution_name,
    currency: row.currency,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function getFinancialSyncEvents(userId, signal) {
  if (isDemoMode) return []

  requireSupabaseUser(userId)
  let query = supabase
    .from('financial_sync_events')
    .select('id,connection_id,event_type,status,records_received,records_imported,records_reconciled,error_code,started_at,completed_at,created_at')
    .order('created_at', { ascending: false })
    .limit(20)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getConnectedAccounts(userId, signal) {
  if (isDemoMode) return []

  requireSupabaseUser(userId)
  let query = supabase
    .from('financial_connected_accounts')
    .select('id,connection_id,name,account_type,currency,balance,available_balance,masked_identifier,status,last_synced_at,provider_account_id')
    .order('name')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((row) => ({
    id: row.id,
    connectionId: row.connection_id,
    providerAccountId: row.provider_account_id,
    name: row.name,
    accountType: row.account_type,
    currency: row.currency,
    balance: row.balance === null ? null : Number(row.balance),
    availableBalance: row.available_balance === null ? null : Number(row.available_balance),
    maskedIdentifier: row.masked_identifier,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
  }))
}

export async function disconnectFinancialConnection(connectionId, userId) {
  if (isDemoMode) throw new Error('Demo mode cannot disconnect a live provider.')
  requireSupabaseUser(userId)
  const { error } = await supabase
    .from('financial_connections')
    .delete()
    .eq('id', connectionId)
  if (error) throw error
}

export async function synchronizeFinancialConnection(connectionId) {
  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (!apiUrl) throw new Error('The backend sync service is not configured.')
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !data?.session?.access_token) {
    throw new Error('Please sign in again before synchronizing.')
  }
  const response = await fetch(`${apiUrl}/api/v1/connections/${connectionId}/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
    },
  })
  if (!response.ok) {
    throw new Error(
      response.status === 501
        ? 'Live synchronization is not available for this provider yet.'
        : 'The connection could not be synchronized.',
    )
  }
  return response.json()
}
