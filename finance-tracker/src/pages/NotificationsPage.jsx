import { useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  CircleDollarSign,
  PiggyBank,
  ReceiptText,
  Trash2,
} from 'lucide-react'
import './NotificationsPage.css'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh.js'
import { useAuth } from '../context/useAuth.js'
import {
  deleteNotificationById,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../data/notificationRepository.js'
import { loadNotifications } from '../data/notificationStorage.js'

function iconFor(type) {
  if (type === 'savings') return PiggyBank
  if (type === 'bill') return ReceiptText
  if (type === 'reminder') return CalendarClock
  if (type === 'summary') return CircleDollarSign
  if (type === 'exceeded') return CircleAlert
  return BellRing
}

function NotificationsPage() {
  const { isDemoMode, user } = useAuth()
  const [notifications, setNotifications] = useState(loadNotifications)
  const [filter, setFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(!isDemoMode)
  const [loadError, setLoadError] = useState('')
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0)

  useRealtimeRefresh(
    user?.id,
    ['notifications'],
    () => setNotificationRefreshKey((key) => key + 1),
  )

  useEffect(() => {
    if (isDemoMode) return undefined
    const controller = new AbortController()
    let active = true
    async function load() {
      setIsLoading(true)
      setLoadError('')
      try {
        const items = await getNotifications(user?.id, controller.signal)
        if (active) setNotifications(items)
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load notifications.', error)
        setLoadError('Notifications could not be loaded. Please try again.')
      } finally {
        if (active && !controller.signal.aborted) setIsLoading(false)
      }
    }
    load()
    return () => {
      active = false
      controller.abort()
    }
  }, [isDemoMode, notificationRefreshKey, user?.id])

  useEffect(() => {
    if (isDemoMode) {
      try {
        window.localStorage.setItem('finance-tracker.notifications.v1', JSON.stringify(notifications))
      } catch (error) {
        console.error('Unable to save notifications.', error)
      }
    }
  }, [isDemoMode, notifications])

  const unreadCount = notifications.filter((item) => !item.read).length
  const filtered = useMemo(
    () =>
      filter === 'unread'
        ? notifications.filter((item) => !item.read)
        : notifications,
    [filter, notifications],
  )

  async function markRead(id) {
    try {
      await markNotificationRead(id, user?.id)
    } catch (error) {
      console.error('Unable to mark notification read.', error)
      setLoadError('The notification could not be updated.')
      return
    }
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead(user?.id)
    } catch (error) {
      console.error('Unable to mark notifications read.', error)
      setLoadError('Notifications could not be updated.')
      return
    }
    setNotifications((items) => items.map((item) => ({ ...item, read: true })))
  }

  async function deleteNotification(id) {
    try {
      await deleteNotificationById(id, user?.id)
    } catch (error) {
      console.error('Unable to delete notification.', error)
      setLoadError('The notification could not be deleted.')
      return
    }
    setNotifications((items) => items.filter((item) => item.id !== id))
  }

  return (
    <section aria-labelledby="notifications-title" className="notifications-page">
      <header className="notifications-heading">
        <div>
          <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
          <h1 id="notifications-title">Notifications</h1>
          <p className="section-description">
            {unreadCount
              ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
              : 'You are all caught up'}
          </p>
        </div>
        <button
          className="mark-all-button"
          disabled={!unreadCount}
          onClick={markAllRead}
          type="button"
        >
          <CheckCheck aria-hidden="true" size={16} />
          Mark all as read
        </button>
      </header>

      {loadError && <p className="notification-page-alert" role="alert">{loadError}</p>}
      {isLoading && <p className="notification-page-status" role="status">Loading notifications...</p>}

      <div className="notification-toolbar" aria-label="Notification filters">
        <button
          aria-pressed={filter === 'all'}
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
          type="button"
        >
          All
          <span>{notifications.length}</span>
        </button>
        <button
          aria-pressed={filter === 'unread'}
          className={filter === 'unread' ? 'active' : ''}
          onClick={() => setFilter('unread')}
          type="button"
        >
          Unread
          <span>{unreadCount}</span>
        </button>
      </div>

      <div className="notification-list" aria-live="polite">
        {filtered.length ? (
          filtered.map((item) => {
            const Icon = iconFor(item.icon)
            return (
              <article
                className={`notification-card${item.read ? '' : ' unread'}`}
                key={item.id}
              >
                <span className={`notification-icon icon-${item.icon}`} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <div className="notification-copy">
                  <div className="notification-meta">
                    <span>{item.type}</span>
                    <time>{item.time}</time>
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.message}</p>
                </div>
                <div className="notification-actions">
                  {!item.read && (
                    <button
                      aria-label={`Mark ${item.title} as read`}
                      className="notification-read-button"
                      onClick={() => markRead(item.id)}
                      type="button"
                    >
                      <CheckCheck aria-hidden="true" size={15} />
                      Mark read
                    </button>
                  )}
                  <button
                    aria-label={`Delete ${item.title}`}
                    className="notification-delete-button"
                    onClick={() => deleteNotification(item.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
              </article>
            )
          })
        ) : (
          <div className="notifications-empty">
            <CheckCheck aria-hidden="true" size={28} />
            <h2>No unread notifications</h2>
            <p>New financial updates will appear here.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default NotificationsPage
