import { useEffect, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabaseConfigError } from '../data/supabaseClient.js'
import { useAuth } from '../context/useAuth.js'
import './AuthPage.css'

function SecurityIllustration() {
  return (
    <svg
      aria-label="Secure financial account illustration"
      className="auth-illustration"
      role="img"
      viewBox="0 0 520 430"
    >
      <g opacity=".16" fill="none" stroke="#97c7ff" strokeWidth="2">
        <path d="M72 92c48-35 78 10 55 55-19 37 33 56 75 31 45-27 49-83 95-83 49 0 58 68 112 50" />
        <path d="M46 188c52-50 90-8 98 31 8 43 59 37 87 3" />
      </g>
      <g className="auth-gear" transform="translate(84 258)">
        <circle cx="0" cy="0" r="38" fill="none" stroke="#cfe8ff" strokeWidth="12" />
        <circle cx="0" cy="0" r="18" fill="#0d1d43" stroke="#cfe8ff" strokeWidth="5" />
      </g>
      <g className="auth-padlock" transform="translate(155 82)">
        <circle cx="42" cy="42" r="42" fill="#69aaf8" />
        <circle cx="42" cy="42" r="29" fill="none" stroke="#d8edff" strokeWidth="2" />
        <rect x="22" y="43" width="40" height="34" rx="6" fill="#f7fbff" />
        <path d="M28 43v-9c0-10 6-18 14-18s14 8 14 18v9" fill="none" stroke="#f7fbff" strokeWidth="7" />
        <circle cx="42" cy="58" r="5" fill="#0d1d43" />
        <path d="M42 62v8" stroke="#0d1d43" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g transform="translate(240 72)">
        <rect x="0" y="0" width="200" height="286" rx="20" fill="#dbeaff" stroke="#eef6ff" strokeWidth="8" />
        <rect x="18" y="18" width="164" height="248" rx="12" fill="#fdfefe" />
        <rect x="50" y="54" width="100" height="55" rx="5" fill="#17233f" />
        <g fill="#d3e1f3">
          <circle cx="64" cy="82" r="7" /><circle cx="84" cy="82" r="7" />
          <circle cx="104" cy="82" r="7" /><circle cx="124" cy="82" r="7" />
          <circle cx="144" cy="82" r="7" />
        </g>
        <g fill="#1e2e55">
          <rect x="38" y="128" width="38" height="38" rx="5" />
          <rect x="82" y="128" width="38" height="38" rx="5" />
          <rect x="126" y="128" width="38" height="38" rx="5" />
          <rect x="38" y="174" width="38" height="38" rx="5" />
          <rect x="82" y="174" width="38" height="38" rx="5" />
          <rect x="126" y="174" width="38" height="38" rx="5" />
          <rect x="38" y="220" width="38" height="38" rx="5" />
          <rect x="82" y="220" width="38" height="38" rx="5" />
        </g>
      </g>
      <g transform="translate(210 164)">
        <path d="M46 98c-25 12-40 33-43 66l-22 91h159l-30-91c-7-29-20-56-64-66z" fill="#69aaf8" stroke="#eaf5ff" strokeWidth="3" />
        <path d="M63 30c18 0 33 16 33 35v28H30V65c0-19 15-35 33-35z" fill="#eef6ff" stroke="#d9e9ff" strokeWidth="3" />
        <circle cx="63" cy="43" r="22" fill="#e8f2ff" stroke="#d9e9ff" strokeWidth="3" />
        <path d="M29 67c10 20 58 22 68 0" fill="none" stroke="#d9e9ff" strokeWidth="4" />
        <path d="M96 104c14 18 25 38 35 59l31-22" fill="none" stroke="#eef6ff" strokeWidth="22" strokeLinecap="round" />
        <path d="M163 140l-9-14 4-17 14 5 1 18z" fill="#eef6ff" stroke="#d9e9ff" strokeWidth="3" />
      </g>
      <g transform="translate(400 330)">
        <rect x="0" y="-36" width="66" height="86" rx="8" fill="#dfefff" stroke="#eff7ff" strokeWidth="3" />
        <rect x="11" y="-20" width="44" height="28" rx="5" fill="#17233f" />
        <rect x="24" y="18" width="18" height="18" rx="4" fill="#69aaf8" />
      </g>
    </svg>
  )
}

function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isDemoMode,
    isLoading,
    isSupabaseConfigured,
    sessionError,
    signIn,
    signUp,
    signInWithOAuth,
    resetPasswordForEmail,
    updatePassword,
    user,
  } = useAuth()
  const isResetRoute = location.pathname === '/reset-password'
  const [mode, setMode] = useState(isResetRoute ? 'reset-password' : 'sign-in')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(() => {
    try {
      return window.localStorage.getItem('finance-tracker.remembered-email') || ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(() => {
    try {
      return Boolean(window.localStorage.getItem('finance-tracker.remembered-email'))
    } catch {
      return false
    }
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [oauthProvider, setOauthProvider] = useState('')

  useEffect(() => {
    if (user && !isResetRoute) navigate('/', { replace: true })
  }, [isResetRoute, navigate, user])

  if (isLoading) {
    return <main className="auth-page"><p role="status">Restoring your secure session...</p></main>
  }
  if (user && !isResetRoute) return <Navigate to="/" replace />

  function changeMode(nextMode) {
    setMode(nextMode)
    setErrorMessage('')
    setSuccessMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      if (mode === 'sign-up' && !fullName.trim()) {
        setErrorMessage('Enter your full name.')
        return
      }
      if (mode === 'sign-up' && password !== confirmPassword) {
        setErrorMessage('Passwords do not match.')
        return
      }
      if (mode === 'reset-password' && password !== confirmPassword) {
        setErrorMessage('Passwords do not match.')
        return
      }

      let result
      if (mode === 'forgot-password') {
        result = await resetPasswordForEmail(email.trim())
      } else if (mode === 'reset-password') {
        result = await updatePassword(password)
      } else if (mode === 'sign-up') {
        result = await signUp(email.trim(), password, { full_name: fullName.trim() })
      } else {
        result = await signIn(email.trim(), password)
        if (!result.error) {
          try {
            if (remember) window.localStorage.setItem('finance-tracker.remembered-email', email.trim())
            else window.localStorage.removeItem('finance-tracker.remembered-email')
          } catch {
            // Signing in does not depend on browser storage.
          }
        }
      }

      if (result.error) setErrorMessage(result.error.message)
      else if (mode === 'forgot-password') setSuccessMessage('If an account exists for that email, a password reset link has been sent.')
      else if (mode === 'reset-password') {
        setSuccessMessage('Password updated successfully.')
        window.setTimeout(() => navigate('/', { replace: true }), 800)
      } else if (mode === 'sign-up' && !result.data.session) {
        const loginResult = await signIn(email.trim(), password)
        if (loginResult.error) {
          setErrorMessage('Account created. Please sign in to continue.')
        } else {
          navigate('/', { replace: true })
        }
      }
      else navigate('/', { replace: true })
    } catch (error) {
      console.error('Unable to complete Finance Tracker authentication.', error)
      setErrorMessage('Authentication failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleOAuth(provider) {
    setErrorMessage('')
    setSuccessMessage('')
    setOauthProvider(provider)
    if (isDemoMode) {
      setErrorMessage('Google and Apple sign-in require Supabase configuration.')
      setOauthProvider('')
      return
    }
    const { error } = await signInWithOAuth(provider)
    if (error) {
      setErrorMessage(error.message)
      setOauthProvider('')
    }
  }

  const heading =
    mode === 'sign-up'
      ? 'Create an account'
      : mode === 'forgot-password'
        ? 'Forgot password'
        : mode === 'reset-password'
          ? 'Set new password'
          : 'Hey, Welcome Back!'

  return (
    <main className="auth-page">
      <section className="auth-frame" aria-labelledby="auth-title">
        <header className="auth-topbar">
          <Link aria-label="Finance Tracker home" className="auth-logo" to="/">
            <ShieldCheck aria-hidden="true" size={18} />
            <span>Finance Tracker</span>
          </Link>
          <nav aria-label="Authentication actions">
            <button
              className={mode === 'sign-up' ? 'active' : ''}
              onClick={() => changeMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')}
              type="button"
            >
              {mode === 'sign-up' ? 'Sign in' : 'Sign Up'}
            </button>
            <button
              className="auth-start-button"
              onClick={() => changeMode('sign-up')}
              type="button"
            >
              Start free trial
            </button>
          </nav>
        </header>

        <div className="auth-content">
          <div className="auth-form-column">
            {isDemoMode ? (
              <div className="auth-demo-notice">
                <p>Supabase is not configured. Demo mode is available.</p>
                <Link className="auth-login-button" to="/">Continue in demo mode</Link>
              </div>
            ) : !isSupabaseConfigured ? (
              <p className="auth-error" role="alert">{supabaseConfigError}</p>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <header className="auth-heading">
                  <h1 id="auth-title">{heading} <span>{mode === 'sign-in' ? '👋' : ''}</span></h1>
                  <p>
                    {mode === 'sign-in'
                      ? 'Welcome back. Fill all the information to start tracking.'
                      : mode === 'sign-up'
                        ? 'Create your account to start planning and tracking.'
                        : 'Enter your account email to receive a secure reset link.'}
                  </p>
                </header>

                {mode === 'sign-up' && (
                  <label className="auth-field">
                    <span>Full name</span>
                    <div>
                      <input
                        autoComplete="name"
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Jane Doe"
                        required
                        value={fullName}
                      />
                    </div>
                  </label>
                )}

                {mode !== 'reset-password' && (
                  <label className="auth-field">
                    <span>Email Address</span>
                    <div>
                      <Mail aria-hidden="true" size={15} />
                      <input
                        autoComplete="email"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="jane.doe@email.com"
                        required
                        type="email"
                        value={email}
                      />
                    </div>
                  </label>
                )}

                {mode !== 'forgot-password' && (
                  <label className="auth-field">
                    <span>{mode === 'reset-password' ? 'New Password' : 'Password'}</span>
                    <div>
                      <LockKeyhole aria-hidden="true" size={15} />
                      <input
                        autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                        minLength={8}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                      />
                      <button
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="auth-password-button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        type="button"
                      >
                        {showPassword ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                      </button>
                    </div>
                  </label>
                )}

                {mode === 'sign-up' && (
                  <label className="auth-field">
                    <span>Confirm Password</span>
                    <div>
                      <LockKeyhole aria-hidden="true" size={15} />
                      <input
                        autoComplete="new-password"
                        minLength={8}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="••••••••"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                      />
                    </div>
                  </label>
                )}

                {mode === 'reset-password' && (
                  <label className="auth-field">
                    <span>Confirm Password</span>
                    <div>
                      <LockKeyhole aria-hidden="true" size={15} />
                      <input
                        autoComplete="new-password"
                        minLength={8}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="••••••••"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                      />
                    </div>
                  </label>
                )}

                {mode === 'sign-in' && (
                  <div className="auth-options">
                    <button onClick={() => changeMode('forgot-password')} type="button">Forgot Password</button>
                    <label>
                      <input
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                        type="checkbox"
                      />
                      <span>Remember password</span>
                    </label>
                  </div>
                )}

                {(errorMessage || sessionError) && <p className="auth-error" role="alert">{errorMessage || sessionError}</p>}
                {successMessage && <p className="auth-success" role="status">{successMessage}</p>}

                <button className="auth-login-button" disabled={isSubmitting} type="submit">
                  {isSubmitting
                    ? 'Please wait...'
                    : mode === 'sign-in'
                      ? 'Login'
                      : mode === 'sign-up'
                        ? 'Sign Up'
                        : mode === 'forgot-password'
                          ? 'Send reset link'
                          : 'Update password'}
                </button>

                {mode === 'sign-in' && (
                  <>
                    <div className="auth-divider"><span>Or</span></div>
                    <button className="auth-social-button" disabled={Boolean(oauthProvider)} onClick={() => handleOAuth('google')} type="button">
                      <span className="google-mark">G</span>
                      {oauthProvider === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
                    </button>
                    <button className="auth-social-button" disabled={Boolean(oauthProvider)} onClick={() => handleOAuth('apple')} type="button">
                      <svg aria-hidden="true" className="apple-mark" viewBox="0 0 24 24">
                        <path d="M16.7 12.9c0-3 2.5-4.4 2.6-4.5-1.4-2.1-3.6-2.4-4.4-2.4-1.9-.2-3.7 1.1-4.7 1.1-1 0-2.5-1.1-4.1-1.1-2.1 0-4.1 1.2-5.2 3.2-2.2 3.8-.6 9.5 1.6 12.6 1.1 1.5 2.3 3.2 4 3.1 1.6-.1 2.2-1 4.2-1s2.5 1 4.2 1c1.7 0 2.8-1.5 3.8-3.1 1.2-1.7 1.7-3.4 1.7-3.5-.1-.1-3.7-1.4-3.7-5.4zM13.6 3.9c.9-1.1 1.5-2.6 1.3-4.1-1.3.1-2.8.9-3.7 1.9-.8.9-1.5 2.5-1.3 3.9 1.4.1 2.8-.7 3.7-1.7z" fill="currentColor" />
                      </svg>
                      {oauthProvider === 'apple' ? 'Connecting to Apple...' : 'Continue with Apple'}
                    </button>
                  </>
                )}

                {mode !== 'sign-in' && mode !== 'reset-password' && (
                  <button className="auth-back-link" onClick={() => changeMode('sign-in')} type="button">
                    Back to Login
                  </button>
                )}
              </form>
            )}
          </div>

          <div className="auth-art-column">
            <SecurityIllustration />
          </div>
        </div>

        <footer className="auth-footer">
          <p>{mode === 'sign-in' ? "Don't have an account yet?" : 'Already have an account?'} <button onClick={() => changeMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')} type="button">{mode === 'sign-up' ? 'Sign in' : 'Create an account'}</button></p>
          <p>Get questions? <a href="tel:+15554637759">+1 555 463 7759</a></p>
        </footer>
      </section>
    </main>
  )
}

export default AuthPage
