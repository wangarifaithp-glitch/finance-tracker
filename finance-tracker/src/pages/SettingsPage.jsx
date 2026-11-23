import { useEffect, useMemo, useState } from 'react'
import {
  Download,
  Globe2,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useCurrency } from '../context/useCurrency.js'
import { supabase } from '../data/supabaseClient.js'
import { loadTransactions } from '../data/transactionStorage.js'
import { getProfile, saveProfile } from '../data/profileRepository.js'
import './SettingsPage.css'

const DATE_KEY = 'finance-tracker.date-format.v1'
const THEME_KEY = 'finance-tracker.theme.v1'
const PHOTO_KEY = 'finance-tracker.profile-photo.v1'

function readLocal(key, fallback) {
  try {
    return window.localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function formatUpdatedAt(timestamp) {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(timestamp * 1000))
}

function SettingsPage() {
  const navigate = useNavigate()
  const { isDemoMode, signOut, updatePassword, updateProfile, user } = useAuth()
  const [search, setSearch] = useState('')
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [photoPreview, setPhotoPreview] = useState(
    readLocal(PHOTO_KEY, user?.user_metadata?.avatar_url || ''),
  )
  const [photoFileName, setPhotoFileName] = useState('')
  const [profileStatus, setProfileStatus] = useState('')
  const [profileError, setProfileError] = useState('')
  const [password, setPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [securityMessage, setSecurityMessage] = useState('')
  const [dateFormat, setDateFormat] = useState(readLocal(DATE_KEY, 'MMM d, yyyy'))
  const [theme, setTheme] = useState(readLocal(THEME_KEY, 'light'))
  const [dataStatus, setDataStatus] = useState('')

  const {
    currency,
    currencyOptions,
    exchangeRates,
    formatAmount,
    preferenceError,
    rateError,
    rateStatus,
    refreshRates,
    setCurrency,
  } = useCurrency()

  useEffect(() => {
    const resolvedTheme =
      theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme
    document.documentElement.dataset.theme = resolvedTheme

    if (theme !== 'system') return undefined
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemTheme = (event) => {
      document.documentElement.dataset.theme = event.matches ? 'dark' : 'light'
    }
    mediaQuery.addEventListener('change', handleSystemTheme)
    return () => mediaQuery.removeEventListener('change', handleSystemTheme)
  }, [theme])

  useEffect(() => {
    if (isDemoMode) return undefined
    let active = true
    async function loadProfile() {
      try {
        const profile = await getProfile(user?.id)
        if (!active || !profile) return
        setFullName(profile.full_name || user?.email?.split('@')[0] || '')
        setPhotoPreview(profile.avatar_url || '')
        setDateFormat(profile.date_format || 'MMM d, yyyy')
        setTheme(profile.theme || 'light')
        if (profile.currency) setCurrency(profile.currency)
      } catch (error) {
        console.error('Unable to load account preferences.', error)
        setProfileError('Your saved profile could not be loaded.')
      }
    }
    loadProfile()
    return () => { active = false }
  }, [isDemoMode, setCurrency, user?.email, user?.id])

  const filteredCurrencies = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const matching = currencyOptions.filter(
      ({ code, name }) =>
        !query ||
        code.toLocaleLowerCase().includes(query) ||
        name.toLocaleLowerCase().includes(query),
    )
    const selected = currencyOptions.find((option) => option.code === currency)
    if (selected && !matching.some((option) => option.code === currency)) {
      return [selected, ...matching]
    }
    return matching
  }, [currency, currencyOptions, search])

  const availableCount = currencyOptions.filter((option) => option.available).length
  const isRefreshing = rateStatus === 'loading' || rateStatus === 'refreshing'

  function savePreference(key, value) {
    try {
      window.localStorage.setItem(key, value)
      if (!isDemoMode && user) {
        saveProfile(user.id, {
          fullName: fullName.trim(),
          avatarUrl: photoPreview.startsWith('data:') ? '' : photoPreview,
          currency,
          dateFormat: key === DATE_KEY ? value : dateFormat,
          theme: key === THEME_KEY ? value : theme,
        }).catch((error) => {
          console.error('Unable to save profile preferences.', error)
          setProfileError('Preferences changed for this visit, but could not be saved to your account.')
        })
      }
      return true
    } catch (error) {
      console.error('Unable to save preference.', error)
      return false
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setProfileStatus('')
    setProfileError('')

    if (!isDemoMode && !user) {
      setProfileError('Sign in to update your account profile.')
      return
    }
    if (isDemoMode) {
      try {
        window.localStorage.setItem('finance-tracker.profile.v1', JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
        }))
        setProfileStatus('Profile details saved for this browser.')
      } catch (error) {
        console.error('Unable to save demo profile.', error)
        setProfileError('The profile could not be saved.')
      }
      return
    }

    try {
      const result = await updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
      })
      if (result.error) throw result.error
      await saveProfile(user.id, {
        fullName: fullName.trim(),
        avatarUrl: photoPreview.startsWith('data:') ? '' : photoPreview,
        currency,
        dateFormat,
        theme,
      })
      setProfileStatus(
        email.trim() !== user?.email
          ? 'Profile updated. Confirm the email change from your new inbox.'
          : 'Profile updated successfully.',
      )
    } catch (error) {
      console.error('Unable to update profile.', error)
      setProfileError(error.message || 'The profile could not be updated.')
    }
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setProfileError('Choose an image smaller than 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result || '')
      setPhotoPreview(value)
      setPhotoFileName(file.name)
      try {
        window.localStorage.setItem(PHOTO_KEY, value)
        setProfileStatus('Photo preview saved in this browser. Cloud photo storage is not configured.')
      } catch (error) {
        console.error('Unable to save local photo preview.', error)
        setProfileError('The photo preview could not be saved.')
      }
    }
    reader.readAsDataURL(file)
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setPasswordStatus('')
    setPasswordError('')
    if (isDemoMode) {
      setPasswordError('Password changes require a configured Supabase account.')
      return
    }
    if (!user) {
      setPasswordError('Sign in before changing your password.')
      return
    }
    try {
      const result = await updatePassword(password)
      if (result.error) throw result.error
      setPassword('')
      setPasswordStatus('Password updated successfully.')
    } catch (error) {
      console.error('Unable to update password.', error)
      setPasswordError(error.message || 'Password could not be changed.')
    }
  }

  async function handleLogout() {
    setSecurityMessage('')
    if (isDemoMode) {
      navigate('/login', { replace: true })
      return
    }
    const { error } = await signOut()
    if (error) {
      setSecurityMessage('Logout failed. Please try again.')
      return
    }
    navigate('/login', { replace: true })
  }

  async function exportTransactions() {
    setDataStatus('')
    let rows
    try {
      if (isDemoMode) {
        rows = loadTransactions() || []
      } else {
        const { data, error } = await supabase
          .from('transactions')
          .select('title,amount,type,category,date,account,payment_method,notes')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
        if (error) throw error
        rows = data || []
      }
    } catch (error) {
      console.error('Unable to export financial records.', error)
      setDataStatus(error.message || 'Records could not be exported.')
      return
    }
    if (!rows.length) {
      setDataStatus('No financial records are available to export.')
      return
    }
    const headers = ['Title', 'Amount', 'Type', 'Category', 'Date', 'Account', 'Payment method', 'Notes']
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csvRows = rows.map((row) => [
      row.title,
      row.amount,
      row.type,
      row.category,
      row.date,
      row.account,
      row.payment_method || row.paymentMethod,
      row.notes,
    ])
    const csv = [headers, ...csvRows].map((row) => row.map(escapeCsv).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `finance-tracker-financial-records-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setDataStatus(`${rows.length} record${rows.length === 1 ? '' : 's'} exported as CSV.`)
  }

  return (
    <section aria-labelledby="settings-title" className="settings-page">
      <header className="settings-heading">
        <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
        <h1 id="settings-title">Settings</h1>
        <p className="section-description">Manage your account and personal preferences.</p>
      </header>

      <div className="settings-layout">
        <article aria-labelledby="profile-settings-title" className="settings-card">
          <header className="settings-card-heading">
            <span className="settings-card-icon"><UserRound aria-hidden="true" size={20} /></span>
            <div><h2 id="profile-settings-title">Profile</h2><p>Update your personal account details.</p></div>
          </header>
          <form className="settings-form" onSubmit={handleProfileSubmit}>
            <div className="photo-field">
              <span className="profile-photo" aria-label="Profile photo preview">
                {photoPreview ? <img alt="" src={photoPreview} /> : (fullName.trim()[0] || email[0] || 'W').toUpperCase()}
              </span>
              <label className="photo-upload">
                <Upload aria-hidden="true" size={15} />
                <span>{photoFileName || 'Choose profile photo'}</span>
                <input accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} type="file" />
              </label>
            </div>
            <label className="settings-field">
              <span>Full name</span>
              <input autoComplete="name" onChange={(event) => setFullName(event.target.value)} value={fullName} />
            </label>
            <label className="settings-field">
              <span>Email</span>
              <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            {profileStatus && <p className="settings-status" role="status">{profileStatus}</p>}
            {profileError && <p className="settings-error" role="alert">{profileError}</p>}
            <button className="primary-settings-button" type="submit">Update profile</button>
          </form>
        </article>

        <article aria-labelledby="preferences-settings-title" className="settings-card">
          <header className="settings-card-heading">
            <span className="settings-card-icon"><Globe2 aria-hidden="true" size={20} /></span>
            <div><h2 id="preferences-settings-title">Preferences</h2><p>Personalize currency and display settings.</p></div>
          </header>

          <div className="settings-form">
            <label className="settings-field">
              <span>Find a currency</span>
              <input onChange={(event) => setSearch(event.target.value)} placeholder="Search by code or name" type="search" value={search} />
            </label>
            <label className="settings-field">
              <span>Currency</span>
              <select onChange={(event) => {
                const nextCurrency = event.target.value
                setCurrency(nextCurrency)
                if (!isDemoMode && user) {
                  saveProfile(user.id, {
                    fullName: fullName.trim(),
                    avatarUrl: photoPreview.startsWith('data:') ? '' : photoPreview,
                    currency: nextCurrency,
                    dateFormat,
                    theme,
                  }).catch((error) => {
                    console.error('Unable to save preferred currency.', error)
                    setProfileError('Currency changed for this visit, but could not be saved to your account.')
                  })
                }
              }} value={currency}>
                {filteredCurrencies.map(({ code, name, available }) =>
                  <option disabled={!available} key={code} value={code}>{code} - {name}{!available ? ' (rate unavailable)' : ''}</option>
                )}
              </select>
            </label>
            <div className="currency-preview"><span>Preview</span><strong>{formatAmount(12500)}</strong></div>
            <p className="settings-help">KES is the storage and default display currency. Other currencies use indicative exchange rates.</p>

            <label className="settings-field">
              <span>Date format</span>
              <select onChange={(event) => {
                setDateFormat(event.target.value)
                savePreference(DATE_KEY, event.target.value)
              }} value={dateFormat}>
                <option value="MMM d, yyyy">Nov 23, 2026</option>
                <option value="dd/MM/yyyy">23/11/2026</option>
                <option value="MM/dd/yyyy">11/23/2026</option>
              </select>
            </label>
            <fieldset className="theme-field">
              <legend>Theme</legend>
              <div>
                {['light', 'dark', 'system'].map((option) => (
                  <label key={option}>
                    <input checked={theme === option} name="theme" onChange={() => {
                      setTheme(option)
                      savePreference(THEME_KEY, option)
                    }} type="radio" value={option} />
                    <span>{option[0].toUpperCase() + option.slice(1)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={`currency-rate-status rate-status-${rateStatus}`} role={rateStatus === 'error' ? 'alert' : 'status'}>
              <p>{rateError || (exchangeRates?.time_last_update_unix
                ? `Rates ${rateStatus === 'stale' ? 'saved' : 'updated'} ${formatUpdatedAt(exchangeRates.time_last_update_unix)} UTC.`
                : `${availableCount} currencies available.`)}</p>
              {preferenceError && <p className="settings-error">{preferenceError}</p>}
              <button className="currency-refresh-button" disabled={isRefreshing} onClick={() => refreshRates(true)} type="button">
                <RefreshCw aria-hidden="true" size={14} />Refresh
              </button>
            </div>
          </div>
        </article>

        <article aria-labelledby="security-settings-title" className="settings-card">
          <header className="settings-card-heading">
            <span className="settings-card-icon"><LockKeyhole aria-hidden="true" size={20} /></span>
            <div><h2 id="security-settings-title">Security</h2><p>Manage authentication and account access.</p></div>
          </header>
          <form className="settings-form" onSubmit={handlePasswordSubmit}>
            <label className="settings-field">
              <span>New password</span>
              <input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" type="password" value={password} />
            </label>
            {passwordStatus && <p className="settings-status" role="status">{passwordStatus}</p>}
            {passwordError && <p className="settings-error" role="alert">{passwordError}</p>}
            <button className="secondary-settings-button" disabled={isDemoMode || !password} type="submit">Change password</button>
          </form>
          <div className="security-info">
            <ShieldCheck aria-hidden="true" size={18} />
            <div><strong>Account security</strong><p>{isDemoMode ? 'Demo mode is not connected to authentication.' : 'Your password and session are managed securely by Supabase.'}</p></div>
          </div>
          {securityMessage && <p className="settings-error" role="alert">{securityMessage}</p>}
          <button className="logout-button" onClick={handleLogout} type="button"><LogOut aria-hidden="true" size={15} />Logout</button>
        </article>

        <article aria-labelledby="data-settings-title" className="settings-card">
          <header className="settings-card-heading">
            <span className="settings-card-icon"><Download aria-hidden="true" size={20} /></span>
            <div><h2 id="data-settings-title">Data</h2><p>Export records and review privacy information.</p></div>
          </header>
          <div className="data-actions">
            <button className="secondary-settings-button" onClick={exportTransactions} type="button"><Download aria-hidden="true" size={15} />Export financial records</button>
            {dataStatus && <p className="settings-status" role="status">{dataStatus}</p>}
            <div className="privacy-info">
              <strong>Privacy</strong>
              <p>{isDemoMode
                ? 'Demo records stay in this browser. No account profile or financial data is sent to an external service.'
                : 'Financial records are protected by account-based access. Password and account authentication are handled by Supabase.'}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}

export default SettingsPage
