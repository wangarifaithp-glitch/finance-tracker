import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
const hasPartialSupabaseConfig = Boolean(supabaseUrl || supabaseAnonKey)
export const isDemoMode = import.meta.env.DEV && !hasPartialSupabaseConfig
export const supabaseConfigError =
  !supabaseUrl && !supabaseAnonKey
    ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect the application to Supabase.'
    : 'Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured.'

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null
