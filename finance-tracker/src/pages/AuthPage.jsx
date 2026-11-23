import { useEffect, useState } from 'react'
import { ArrowLeft, Flower2 } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabaseConfigError } from '../data/supabaseClient.js'
import { useAuth } from '../context/useAuth.js'
import './AuthPage.css'

function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isDemoMode, isLoading, isSupabaseConfigured, sessionError, signIn, signUp,
    resetPasswordForEmail, updatePassword, user } =
    useAuth()
  const isResetRoute = location.pathname === '/reset-password'
  const [mode, setMode] = useState(isResetRoute ? 'reset-password' : 'sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user && !isResetRoute) navigate('/', { replace: true })
  }, [isResetRoute, navigate, user])

  if (isLoading) {
    return (
      <main className="auth-page">
        <p role="status">Restoring your secure session...</p>
      </main>
    )
  }
  if (user && !isResetRoute) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      if (mode === 'reset-password' && password !== confirmPassword) {
        setErrorMessage('Passwords do not match.')
        setIsSubmitting(false)
        return
      }
      let result
      if (mode === 'forgot-password') {
        result = await resetPasswordForEmail(email.trim())
      } else if (mode === 'reset-password') {
        result = await updatePassword(password)
      } else {
        result =
          mode === 'sign-in'
            ? await signIn(email.trim(), password)
            : await signUp(email.trim(), password)
      }
      if (result.error) {
        setErrorMessage(result.error.message)
      } else if (mode === 'forgot-password') {
        setSuccessMessage('If an account exists for that email, a password reset link has been sent.')
      } else if (mode === 'reset-password') {
        setSuccessMessage('Password updated successfully.')
        window.setTimeout(() => navigate('/', { replace: true }), 800)
      } else if (mode === 'sign-up' && !result.data.session) {
        setSuccessMessage('Check your email to confirm your account, then sign in.')
      } else {
        navigate('/', { replace: true })
      }
    } catch (error) {
      console.error('Unable to complete Supabase authentication.', error)
      setErrorMessage('Authentication failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section aria-labelledby="auth-title" className="auth-card">
        <Link aria-label="Back to dashboard" className="auth-brand" to="/">
          <Flower2 aria-hidden="true" size={30} />
          <span>Finance Tracker</span>
        </Link>
        <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
        <h1 id="auth-title">
          {mode === 'forgot-password'
            ? 'Reset your password'
            : mode === 'reset-password'
              ? 'Choose a new password'
              : mode === 'sign-in'
                ? 'Welcome back'
                : 'Create your account'}
        </h1>
        <p className="auth-description">
          {mode === 'sign-in'
            ? 'Sign in to securely access your personal financial data.'
            : mode === 'forgot-password'
              ? 'Enter your email and we will send you a secure reset link.'
              : mode === 'reset-password'
                ? 'Enter and confirm a new password for your account.'
                : 'Create a secure account to keep your data private and in sync.'}
        </p>

        {isDemoMode ? (
          <div className="auth-demo-notice">
            <p>
              Supabase is not configured. Demo mode stores sample transactions only in this
              browser.
            </p>
            <Link className="primary-button" to="/">
              <ArrowLeft aria-hidden="true" size={15} />
              Continue in demo mode
            </Link>
          </div>
        ) : !isSupabaseConfigured ? (
          <p className="auth-error" role="alert">{supabaseConfigError}</p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode !== 'reset-password' && (
              <label>
                <span>Email address</span>
                <input
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
            )}
            {mode !== 'forgot-password' && (
              <label>
                <span>{mode === 'reset-password' ? 'New password' : 'Password'}</span>
                <input
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
            )}
            {mode === 'reset-password' && (
              <label>
                <span>Confirm new password</span>
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
              </label>
            )}
            {(errorMessage || sessionError) && (
              <p className="auth-error" role="alert">{errorMessage || sessionError}</p>
            )}
            {successMessage && (
              <p className="auth-success" role="status">{successMessage}</p>
            )}
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting
                ? 'Please wait...'
                : mode === 'sign-in'
                  ? 'Sign in'
                  : mode === 'forgot-password'
                    ? 'Send reset link'
                    : mode === 'reset-password'
                      ? 'Update password'
                      : 'Create account'}
            </button>
            {mode === 'sign-in' && (
              <>
                <button
                  className="auth-mode-toggle"
                  onClick={() => {
                    setMode('forgot-password')
                    setErrorMessage('')
                    setSuccessMessage('')
                  }}
                  type="button"
                >
                  Forgot password?
                </button>
                <button
                  className="auth-mode-toggle"
                  onClick={() => {
                    setMode('sign-up')
                    setErrorMessage('')
                    setSuccessMessage('')
                  }}
                  type="button"
                >
                  New to Finance Tracker? Create an account
                </button>
              </>
            )}
            {mode !== 'sign-in' && mode !== 'reset-password' && (
              <button
                className="auth-mode-toggle"
                onClick={() => {
                  setMode('sign-in')
                  setErrorMessage('')
                  setSuccessMessage('')
                }}
                type="button"
              >
                Back to sign in
              </button>
            )}
          </form>
        )}
      </section>
    </main>
  )
}

export default AuthPage
