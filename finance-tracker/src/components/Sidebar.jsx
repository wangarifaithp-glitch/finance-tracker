import {
  ArrowLeftRight,
  BookOpenText,
  CalendarDays,
  ChartNoAxesCombined,
  CircleHelp,
  Flower2,
  House,
  Landmark,
  LogOut,
  Settings,
  Target,
  WalletCards,
  Bell,
  Cable,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/useAuth.js'

const navigation = [
  { label: 'Dashboard', to: '/', icon: House, end: true },
  { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
  { label: 'Budgets', to: '/budgets', icon: ChartNoAxesCombined },
  { label: 'Savings Goals', to: '/savings-goals', icon: Target },
  { label: 'Reports', to: '/reports', icon: WalletCards },
  { label: 'Money Journal', to: '/journal', icon: BookOpenText },
  { label: 'Calendar', to: '/calendar', icon: CalendarDays },
  { label: 'Accounts', to: '/accounts', icon: Landmark },
  { label: 'Connections', to: '/connections', icon: Cable },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Settings', to: '/settings', icon: Settings },
]

function Sidebar({ onNavigate }) {
  const navigate = useNavigate()
  const { isDemoMode, signOut, user } = useAuth()
  const [signOutError, setSignOutError] = useState('')

  async function handleSignOut(event) {
    event.preventDefault()
    onNavigate()
    setSignOutError('')
    try {
      const { error } = await signOut()
      if (error) throw error
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Unable to sign out of Finance Tracker.', error)
      setSignOutError('Sign out failed. Please try again.')
    }
  }

  return (
    <aside aria-label="Main sidebar" className="sidebar">
      <NavLink
        aria-label="Finance Tracker home"
        className="brand"
        onClick={onNavigate}
        to="/"
      >
        <span className="brand-mark">
          <Flower2 aria-hidden="true" size={29} strokeWidth={1.5} />
        </span>
        <span className="brand-name">Finance Tracker</span>
        <span className="brand-tagline">Plan <i /> Track <i /> Grow</span>
      </NavLink>

      <span className="sidebar-section-label">YOUR SPACE</span>
      <nav
        aria-label="Primary navigation"
        className="sidebar-nav"
        id="primary-navigation"
      >
        {navigation.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
            end={end}
            key={to}
            onClick={onNavigate}
            to={to}
          >
            <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="profile-card">
          <div aria-hidden="true" className="profile-avatar">
            {(user?.email?.[0] || 'D').toUpperCase()}
          </div>
          <div className="profile-copy">
            <span className="profile-name">{user?.email || 'Demo user'}</span>
            <span className="profile-plan">{isDemoMode ? 'Local demo' : 'Personal account'}</span>
          </div>
          <CircleHelp aria-hidden="true" className="profile-help" size={17} />
        </div>
        {user ? (
          <a className="sign-out-link" href="/login" onClick={handleSignOut}>
            <LogOut aria-hidden="true" size={17} />
            <span>Sign out</span>
          </a>
        ) : (
          <NavLink className="sign-out-link" onClick={onNavigate} to="/login">
            <LogOut aria-hidden="true" size={17} />
            <span>{isDemoMode ? 'Demo mode' : 'Sign in'}</span>
          </NavLink>
        )}
        {signOutError && (
          <p className="sidebar-auth-error" role="alert">
            {signOutError}
          </p>
        )}
        <p className="sidebar-footnote">A little more clarity, every day.</p>
      </div>
    </aside>
  )
}

export default Sidebar
