import { useCallback, useEffect, useMemo, useState } from 'react'
import { isDemoMode, isSupabaseConfigured, supabase } from '../data/supabaseClient.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession)
        setIsLoading(false)
        setSessionError('')
      }
    })

    supabase.auth
      .getSession()
      .then(({ data: sessionData, error }) => {
        if (!active) return
        if (error) {
          console.error('Unable to restore the Supabase session.', error)
          setSessionError('Your session could not be restored. Please sign in again.')
        } else {
          setSession(sessionData.session)
        }
        setIsLoading(false)
      })
      .catch((error) => {
        if (!active) return
        console.error('Unable to restore the Supabase session.', error)
        setSessionError('Your session could not be restored. Please sign in again.')
        setIsLoading(false)
      })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }, [])

  const signUp = useCallback(async (email, password, metadata = {}) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })
    return { data, error }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    return supabase.auth.signOut()
  }, [])

  const signInWithOAuth = useCallback(async (provider) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
  }, [])

  const resetPasswordForEmail = useCallback(async (email) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  }, [])

  const updateProfile = useCallback(async ({ fullName, email, avatarUrl }) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    const metadata = {}
    if (fullName !== undefined) metadata.full_name = fullName
    if (avatarUrl !== undefined) metadata.avatar_url = avatarUrl
    return supabase.auth.updateUser({
      ...(email ? { email } : {}),
      data: metadata,
    })
  }, [])

  const updatePassword = useCallback(async (password) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    return supabase.auth.updateUser({ password })
  }, [])

  const value = useMemo(
    () => ({
      isDemoMode,
      isLoading,
      isSupabaseConfigured,
      session,
      sessionError,
      signIn,
      signInWithOAuth,
      signOut,
      signUp,
      resetPasswordForEmail,
      updatePassword,
      updateProfile,
      user: session?.user || null,
    }),
    [
      isLoading,
      session,
      sessionError,
      signIn,
      signInWithOAuth,
      signOut,
      signUp,
      resetPasswordForEmail,
      updatePassword,
      updateProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
