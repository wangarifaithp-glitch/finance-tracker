import { useState } from 'react'
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Menu,
  Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function getMonthOptions() {
  const today = new Date()

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1)

    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
      }).format(date),
    }
  })
}

const monthOptions = getMonthOptions()

function Topbar({ isMobileNavOpen, onMenuClick }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value)

  function handleSearch(event) {
    event.preventDefault()
    const search = query.trim()
    if (search) navigate(`/transactions?q=${encodeURIComponent(search)}`)
  }

  return (
    <header className="topbar">
      <button
        aria-controls="primary-navigation"
        aria-expanded={isMobileNavOpen}
        aria-label="Open navigation menu"
        className="mobile-menu-button"
        onClick={onMenuClick}
        type="button"
      >
        <Menu aria-hidden="true" size={21} />
      </button>

      <form className="search-form" onSubmit={handleSearch} role="search">
        <Search aria-hidden="true" className="search-icon" size={18} />
        <input
          aria-label="Search transactions"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search transactions..."
          type="search"
          value={query}
        />
        <button aria-label="Submit search" className="search-submit" type="submit">
          <span>Search</span>
        </button>
      </form>

      <div className="topbar-actions">
        <button
          aria-label="Open notifications"
          className="icon-button notification-button"
          onClick={() => navigate('/notifications')}
          type="button"
        >
          <Bell aria-hidden="true" size={20} />
          <span className="notification-dot" />
        </button>
        <label className="month-picker">
          <CalendarDays aria-hidden="true" size={17} />
          <select
            aria-label="Select month"
            onChange={(event) => setSelectedMonth(event.target.value)}
            value={selectedMonth}
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className="month-chevron" size={15} />
        </label>
      </div>
    </header>
  )
}

export default Topbar
