import { useEffect, useState } from 'react'
import {
  Building2,
  Cable,
  CreditCard,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from 'lucide-react'
import { useAuth } from '../context/useAuth.js'
import {
  getFinancialConnections,
  getFinancialSyncEvents,
  getConnectedAccounts,
  disconnectFinancialConnection,
  synchronizeFinancialConnection,
  providerCatalog,
} from '../data/financialConnectionRepository.js'
import './FinancialConnectionsPage.css'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh.js'

const providerIcons = {
  mpesa: Smartphone,
  equity: Landmark,
  kcb: Building2,
  cooperative: Building2,
  visa: CreditCard,
  mastercard: CreditCard,
  paypal: WalletCards,
}

function formatTimestamp(value) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function FinancialConnectionsPage() {
  const { user } = useAuth()
  const [connections, setConnections] = useState([])
  const [syncEvents, setSyncEvents] = useState([])
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [category, setCategory] = useState('All')
  const [actionMessage, setActionMessage] = useState('')
  const [lastUpdated, setLastUpdated] = useState(() => new Date())
  const [syncingConnectionId, setSyncingConnectionId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [connectionRefreshKey, setConnectionRefreshKey] = useState(0)

  useRealtimeRefresh(
    user?.id,
    ['financial_connections', 'financial_connected_accounts', 'transaction_sync_runs'],
    () => setConnectionRefreshKey((key) => key + 1),
  )

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadConnections() {
      setIsLoading(true)
      setLoadError('')
      try {
        const [connectionRows, eventRows, connectionAccounts] = await Promise.all([
          getFinancialConnections(user?.id, controller.signal),
          getFinancialSyncEvents(user?.id, controller.signal),
          getConnectedAccounts(user?.id, controller.signal),
        ])
        if (!active) return
        setConnections(connectionRows)
        setSyncEvents(eventRows)
        setConnectedAccounts(connectionAccounts)
        const timestamps = [
          ...connectionRows.map((connection) => connection.updatedAt),
          ...connectionRows.map((connection) => connection.lastSyncedAt),
        ].filter(Boolean)
        if (timestamps.length) {
          setLastUpdated(
            new Date(
              timestamps
                .map((value) => new Date(value).valueOf())
                .sort((left, right) => right - left)[0],
            ),
          )
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load financial connections.', error)
        setLoadError('Financial connections could not be loaded. Please try again.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadConnections()
    return () => {
      active = false
      controller.abort()
    }
  }, [connectionRefreshKey, user?.id])

  const categories = ['All', 'Mobile Money', 'Banks', 'Cards', 'Digital Wallets', 'International']
  const visibleProviders = providerCatalog.filter(
    (provider) => category === 'All' || provider.category === category,
  )

  async function handleDisconnect(connection) {
    setActionMessage('')
    try {
      await disconnectFinancialConnection(connection.id, user?.id)
      setConnections((items) => items.filter((item) => item.id !== connection.id))
      setConnectedAccounts((items) => items.filter((item) => item.connectionId !== connection.id))
      setActionMessage(`${connection.displayName || connection.institutionName || 'Connection'} disconnected.`)
    } catch (error) {
      console.error('Unable to disconnect financial connection.', error)
      setActionMessage('The connection could not be disconnected.')
    }
  }

  async function handleSync(connection) {
    setActionMessage('')
    setSyncingConnectionId(connection.id)
    try {
      await synchronizeFinancialConnection(connection.id)
      setActionMessage('Synchronization request sent.')
    } catch (error) {
      console.error('Unable to synchronize financial connection.', error)
      setActionMessage(error.message || 'The connection could not be synchronized.')
    } finally {
      setSyncingConnectionId('')
      setLastUpdated(new Date())
    }
  }

  return (
    <section aria-labelledby="connections-title" className="connections-page">
      <header className="connections-heading">
        <div>
          <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
          <h1 id="connections-title">Financial Connections</h1>
          <p className="section-description">
            Connect supported financial providers and keep imported records separate from manual entries.
          </p>
        </div>
        <span className="connections-secure-badge">
          <ShieldCheck aria-hidden="true" size={16} />
          Secure foundation
        </span>
      </header>

      {loadError && <p className="connections-alert" role="alert">{loadError}</p>}
      {actionMessage && <p className="connections-action-status" role="status">{actionMessage}</p>}
      <p className="connections-last-updated" role="status">
        Last updated: {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </p>

      <div className="connections-category-tabs" aria-label="Provider categories">
        {categories.map((item) => (
          <button
            aria-pressed={category === item}
            className={category === item ? 'active' : ''}
            key={item}
            onClick={() => setCategory(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="connections-provider-grid" aria-label="Available financial providers">
        {visibleProviders.map((provider) => {
          const Icon = providerIcons[provider.id] || Cable
          const connection = connections.find((item) => item.provider === provider.id)
          return (
            <article className="connections-provider-card" key={provider.id}>
              <span className="connections-provider-icon"><Icon aria-hidden="true" size={21} /></span>
              <div className="connections-provider-copy">
                <h2>{provider.name}</h2>
                <p>{provider.type} · {provider.currency}</p>
              </div>
              <span className={`connections-status status-${connection?.status || 'not_configured'}`}>
                {connection?.status === 'connected'
                  ? 'Connected'
                  : connection?.status === 'requires_action'
                    ? 'Action required'
                    : connection?.status === 'error'
                      ? 'Connection error'
                      : 'Not configured'}
              </span>
              {connection && (
                <div className="connections-provider-meta">
                  <span>{connection.displayName}</span>
                  <small>Last sync: {formatTimestamp(connection.lastSyncedAt)}</small>
                </div>
              )}
              <div className="connections-provider-actions">
                {connection ? (
                  <>
                    <button
                      className="connections-sync-button"
                      onClick={() => handleSync(connection)}
                      disabled={syncingConnectionId === connection.id}
                      type="button"
                    >
                      <RefreshCw aria-hidden="true" size={14} />
                      {syncingConnectionId === connection.id ? 'Synchronizing...' : 'Synchronize'}
                    </button>
                    <button
                      className="connections-disconnect-button"
                      onClick={() => handleDisconnect(connection)}
                      type="button"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button className="connections-connect-button" disabled type="button">
                    Coming soon
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <article className="connections-accounts-card" aria-labelledby="connected-accounts-title">
        <header>
          <span className="connections-provider-icon"><Landmark aria-hidden="true" size={19} /></span>
          <div>
            <h2 id="connected-accounts-title">Connected accounts</h2>
            <p>Accounts discovered from authorized providers appear alongside manual accounts.</p>
          </div>
        </header>
        {isLoading ? (
          <p className="connections-status-text" role="status">Loading connected accounts...</p>
        ) : connectedAccounts.length ? (
          <div className="connections-account-list">
            {connectedAccounts.map((account) => (
              <div className="connections-account-row" key={account.id}>
                <div>
                  <strong>{account.name}</strong>
                  <span>{account.accountType.replaceAll('_', ' ')} · {account.maskedIdentifier || 'Identifier unavailable'}</span>
                </div>
                <div>
                  <strong>{account.balance === null ? 'Balance unavailable' : `${account.currency} ${account.balance.toLocaleString()}`}</strong>
                  <span>Last sync: {formatTimestamp(account.lastSyncedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="connections-empty">
            <WalletCards aria-hidden="true" size={26} />
            <h3>No connected accounts</h3>
            <p>Authorized provider accounts will be shown here. Manual accounts remain in Accounts.</p>
          </div>
        )}
      </article>

      <article className="connections-sync-card" aria-labelledby="sync-history-title">
        <header>
          <span className="connections-provider-icon"><RefreshCw aria-hidden="true" size={19} /></span>
          <div>
            <h2 id="sync-history-title">Synchronization history</h2>
            <p>Imported records are reconciled with existing transactions without overwriting manual entries.</p>
          </div>
        </header>

        {isLoading ? (
          <p className="connections-status-text" role="status">Loading connection history...</p>
        ) : syncEvents.length ? (
          <div className="connections-sync-list">
            {syncEvents.map((event) => (
              <div className="connections-sync-row" key={event.id}>
                <span className={`sync-dot sync-${event.status}`} aria-hidden="true" />
                <div>
                  <strong>{event.event_type.replaceAll('_', ' ')}</strong>
                  <small>{formatTimestamp(event.created_at)}</small>
                </div>
                <span>{event.records_imported} imported</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="connections-empty">
            <Cable aria-hidden="true" size={26} />
            <h3>No active connections</h3>
            <p>Live providers will appear here after their official integration is configured and authorized.</p>
          </div>
        )}
      </article>
    </section>
  )
}

export default FinancialConnectionsPage
