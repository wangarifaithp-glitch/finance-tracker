import { isDemoMode, isSupabaseConfigured, supabase } from './supabaseClient.js'
import { loadNotifications as loadDemoNotifications } from './notificationStorage.js'

function requireSupabaseUser(userId) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.')
  if (!userId) throw new Error('Sign in before accessing notifications.')
}

export async function getNotifications(userId, signal) {
  if (isDemoMode) return loadDemoNotifications()
  requireSupabaseUser(userId)
  let query = supabase
    .from('notifications')
    .select('id,type,title,message,icon,is_read,created_at')
    .order('created_at', { ascending: false })
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    icon: row.icon,
    read: row.is_read,
    time: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date(row.created_at)),
  }))
}

export async function markNotificationRead(notificationId, userId) {
  if (isDemoMode) return
  requireSupabaseUser(userId)
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  if (error) throw error
}

export async function markAllNotificationsRead(userId) {
  if (isDemoMode) return
  requireSupabaseUser(userId)
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)
  if (error) throw error
}

export async function deleteNotificationById(notificationId, userId) {
  if (isDemoMode) return
  requireSupabaseUser(userId)
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
  if (error) throw error
}
