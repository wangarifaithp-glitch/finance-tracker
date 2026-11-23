import { isDemoMode, isSupabaseConfigured, supabase } from './supabaseClient.js'

function requireSupabaseUser(userId) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.')
  if (!userId) throw new Error('Sign in before accessing your profile.')
}

export async function getProfile(userId) {
  if (isDemoMode) {
    try {
      return JSON.parse(window.localStorage.getItem('finance-tracker.profile.v1') || 'null')
    } catch {
      return null
    }
  }
  requireSupabaseUser(userId)
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,avatar_url,currency,date_format,theme')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveProfile(userId, profile) {
  if (isDemoMode) {
    window.localStorage.setItem('finance-tracker.profile.v1', JSON.stringify(profile))
    return profile
  }
  requireSupabaseUser(userId)
  const row = {
    id: userId,
    full_name: profile.fullName,
    avatar_url: profile.avatarUrl || null,
    currency: profile.currency,
    date_format: profile.dateFormat,
    theme: profile.theme,
  }
  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select('id,full_name,avatar_url,currency,date_format,theme')
    .single()
  if (error) throw error
  return data
}
