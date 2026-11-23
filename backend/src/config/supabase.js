import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

export function createUserSupabaseClient(accessToken) {
  if (!env.isConfigured) {
    throw new Error('Supabase is not configured.')
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  })
}

export function createBackendSupabaseClient() {
  if (!env.isConfigured || !env.supabaseServiceRoleKey) {
    throw new Error('Backend service configuration is not available.')
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
