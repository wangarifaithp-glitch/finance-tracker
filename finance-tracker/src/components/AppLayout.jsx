import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'
import { useCurrency } from '../context/useCurrency.js'

function AppLayout() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const { currency, exchangeRates, rateStatus } = useCurrency()

  useEffect(() => {
    if (!isMobileNavOpen) return undefined

    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsMobileNavOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isMobileNavOpen])

  return (
    <div className={`app-shell${isMobileNavOpen ? ' mobile-nav-open' : ''}`}>
      <Sidebar onNavigate={() => setIsMobileNavOpen(false)} />
      {isMobileNavOpen && (
        <button
          aria-label="Close navigation menu"
          className="sidebar-backdrop"
          onClick={() => setIsMobileNavOpen(false)}
          type="button"
        />
      )}
      <div className="workspace">
        <Topbar
          isMobileNavOpen={isMobileNavOpen}
          onMenuClick={() => setIsMobileNavOpen((open) => !open)}
        />
        <main className="main-content">
          {currency !== 'KES' &&
            (!Number.isFinite(exchangeRates?.rates?.[currency]) ||
              rateStatus === 'stale') && (
              <p
                className="currency-rate-notice"
                role={
                  !Number.isFinite(exchangeRates?.rates?.[currency]) &&
                  rateStatus === 'error'
                    ? 'alert'
                    : 'status'
                }
              >
                {!Number.isFinite(exchangeRates?.rates?.[currency])
                  ? rateStatus === 'error'
                    ? 'Exchange rates are unavailable; converted amounts are hidden.'
                    : 'Loading exchange rates; converted amounts are temporarily unavailable.'
                  : 'The latest exchange rates could not be refreshed. Using the saved rates.'}{' '}
                <Link to="/settings">Currency settings</Link>
              </p>
            )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
