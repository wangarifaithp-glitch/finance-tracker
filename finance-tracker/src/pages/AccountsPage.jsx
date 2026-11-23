import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Building2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  PiggyBank,
  Plus,
  Smartphone,
  Trash2,
  Wallet,
} from 'lucide-react'
import AccountDeleteModal from '../components/accounts/AccountDeleteModal.jsx'
import AccountFormModal from '../components/accounts/AccountFormModal.jsx'
import { useAuth } from '../context/useAuth.js'
import { useCurrency } from '../context/useCurrency.js'
import { formatCurrencyValue } from '../data/currencyData.js'
import {
  deleteFinancialAccount,
  getFinancialAccounts,
  saveFinancialAccount,
} from '../data/financialAccountRepository.js'
import { getAccountTransactionPage } from '../data/transactionRepository.js'
import './AccountsPage.css'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh.js'

const historyPageSize = 8
const accountTypeLabels = {
  cash: 'Cash wallet',
  mpesa: 'M-Pesa',
  bank: 'Bank account',
  savings: 'Savings account',
  other: 'Other',
}
const accountTypeIcons = {
  cash: Wallet,
  mpesa: Smartphone,
  bank: Building2,
  savings: PiggyBank,
  other: Banknote,
}

function AccountsPage() {
  const { user } = useAuth()
  const { convertCurrency, currency, formatAmount } = useCurrency()
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [transactions, setTransactions] = useState([])
  const [accountPage, setAccountPage] = useState(1)
  const [historyCount, setHistoryCount] = useState(0)
  const [historyCountIsApproximate, setHistoryCountIsApproximate] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [deletingAccount, setDeletingAccount] = useState(null)

  useRealtimeRefresh(
    user?.id,
    ['financial_accounts', 'financial_connected_accounts', 'transactions'],
    () => setRefreshKey((key) => key + 1),
  )

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadAccounts() {
      setIsLoading(true)
      setLoadError('')
      try {
        const result = await getFinancialAccounts(user?.id, controller.signal)
        if (!active) return
        setAccounts(result)
        setSelectedAccountId((current) =>
          result.some((account) => account.id === current)
            ? current
            : result[0]?.id || '',
        )
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load Finance Tracker accounts.', error)
        setLoadError('Accounts could not be loaded. Please try again.')
      } finally {
        if (active && !controller.signal.aborted) setIsLoading(false)
      }
    }

    loadAccounts()
    return () => {
      active = false
      controller.abort()
    }
  }, [refreshKey, user?.id])

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) || null,
    [accounts, selectedAccountId],
  )

  useEffect(() => {
    if (!selectedAccount) return undefined

    const controller = new AbortController()
    let active = true

    async function loadHistory() {
      setHistoryLoading(true)
      setHistoryError('')
      try {
        const result = await getAccountTransactionPage({
          account: selectedAccount,
          userId: user?.id,
          page: accountPage,
          pageSize: historyPageSize,
          signal: controller.signal,
        })
        if (!active) return
        setTransactions(result.transactions)
        setHistoryCount(result.totalCount)
        setHistoryCountIsApproximate(result.countIsApproximate)
        setHasNextPage(result.hasNext)
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load account transaction history.', error)
        setHistoryError('This account’s transaction history could not be loaded.')
      } finally {
        if (active && !controller.signal.aborted) setHistoryLoading(false)
      }
    }

    loadHistory()
    return () => {
      active = false
      controller.abort()
    }
  }, [accountPage, selectedAccount, user?.id])

  const convertedBalances = accounts.map((account) =>
    convertCurrency(account.balance, account.currency || 'KES', currency),
  )
  const totalBalance =
    convertedBalances.every((balance) => balance !== null)
      ? convertedBalances.reduce((sum, balance) => sum + balance, 0)
      : null
  const totalActivity = accounts.reduce(
    (sum, account) => sum + account.transactionCount,
    0,
  )

  function openCreateForm() {
    setEditingAccount(null)
    setIsFormOpen(true)
    setNotice('')
  }

  function openEditForm(account) {
    setEditingAccount(account)
    setIsFormOpen(true)
    setNotice('')
  }

  function clearHistory() {
    setTransactions([])
    setHistoryCount(0)
    setHistoryCountIsApproximate(false)
    setHasNextPage(false)
    setHistoryError('')
  }

  async function handleSaveAccount(values) {
    try {
      const saved = await saveFinancialAccount(values, user?.id, editingAccount)
      clearHistory()
      setSelectedAccountId(saved.id)
      setAccountPage(1)
      setRefreshKey((key) => key + 1)
      setNotice(editingAccount ? 'Account updated.' : 'Account added.')
      return true
    } catch (error) {
      console.error('Unable to save Finance Tracker account.', error)
      return error?.message || 'The account could not be saved. Please try again.'
    }
  }

  async function handleDeleteAccount() {
    if (!deletingAccount) return

    setIsDeleting(true)
    setLoadError('')
    try {
      await deleteFinancialAccount(deletingAccount, user?.id)
      if (selectedAccountId === deletingAccount.id) {
        clearHistory()
        setSelectedAccountId('')
      }
      setDeletingAccount(null)
      setAccountPage(1)
      setRefreshKey((key) => key + 1)
      setNotice('Account deleted. Its transactions remain in your transaction history.')
    } catch (error) {
      console.error('Unable to delete Finance Tracker account.', error)
      setLoadError(error?.message || 'The account could not be deleted. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  function transactionDirection(transaction) {
    const isDestination =
      transaction.transferAccountId === selectedAccount?.id ||
      (!transaction.transferAccountId &&
        transaction.transferAccount === selectedAccount?.name)
    if (transaction.type === 'income' || isDestination) return 'in'
    return 'out'
  }

  function transactionAmount(transaction) {
    const direction = transactionDirection(transaction)
    const Icon =
      transaction.type === 'transfer'
        ? ArrowLeftRight
        : direction === 'in'
          ? ArrowDownLeft
          : ArrowUpRight
    return { direction, Icon }
  }

  return (
    <div className="accounts-page">
      <header className="accounts-page-heading">
        <div>
          <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
          <h1>Accounts</h1>
          <p>Keep your wallets and accounts organized in one place.</p>
        </div>
        <button className="primary-button accounts-add-button" onClick={openCreateForm} type="button">
          <Plus aria-hidden="true" size={17} />
          Add account
        </button>
      </header>

      {loadError && <p className="accounts-alert" role="alert">{loadError}</p>}
      {notice && <p className="accounts-notice" role="status">{notice}</p>}

      <section aria-label="Account summary" className="accounts-summary">
        <article className="accounts-summary-card summary-balance">
          <span>Total across accounts</span>
          <strong>{totalBalance === null ? 'Unavailable' : formatAmount(totalBalance)}</strong>
          <small>{totalBalance === null ? 'Missing exchange rate' : `Displayed in ${currency}`}</small>
        </article>
        <article className="accounts-summary-card">
          <span>Accounts</span>
          <strong>{accounts.length}</strong>
          <small>Manually managed</small>
        </article>
        <article className="accounts-summary-card">
          <span>Account activity</span>
          <strong>{totalActivity}</strong>
          <small>Linked transactions</small>
        </article>
      </section>

      <section aria-label="Your accounts" className="accounts-section">
        <div className="accounts-section-heading">
          <div>
            <h2>Your accounts</h2>
            <p>Balances update from your opening balance and recorded transactions.</p>
          </div>
          <span>{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</span>
        </div>

        {isLoading ? (
          <div className="accounts-empty-state" role="status">Loading accounts...</div>
        ) : accounts.length > 0 ? (
          <div className="accounts-grid">
            {accounts.map((account) => {
              const Icon = accountTypeIcons[account.accountType] || Banknote
              const isSelected = account.id === selectedAccountId
              return (
                <article
                  aria-label={`${account.name}, ${accountTypeLabels[account.accountType] || accountTypeLabels.other}, ${formatCurrencyValue(account.balance, account.currency || 'KES')}`}
                  className={`account-card${isSelected ? ' account-card-selected' : ''}`}
                  key={account.id}
                >
                  <button
                    aria-pressed={isSelected}
                    className="account-card-main"
                    onClick={() => {
                      clearHistory()
                      setAccountPage(1)
                      setSelectedAccountId(account.id)
                    }}
                    type="button"
                  >
                    <span className={`account-card-icon account-icon-${account.accountType}`}>
                      <Icon aria-hidden="true" size={21} />
                    </span>
                    <span className="account-card-name">{account.name}</span>
                    <span className="account-card-type">
                      {accountTypeLabels[account.accountType] || accountTypeLabels.other}
                    </span>
                    <strong className="account-card-balance">{formatCurrencyValue(account.balance, account.currency || 'KES')}</strong>
                    <span className="account-card-currency">{account.currency || 'KES'} · {account.transactionCount} transactions</span>
                  </button>
                  <div className="account-card-actions">
                    <button
                      aria-label={`Edit ${account.name}`}
                      className="account-action-button"
                      onClick={() => openEditForm(account)}
                      type="button"
                    >
                      <Pencil aria-hidden="true" size={15} />
                      Edit
                    </button>
                    <button
                      aria-label={`Delete ${account.name}`}
                      className="account-action-button account-delete-action"
                      onClick={() => setDeletingAccount(account)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={15} />
                      Delete
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="accounts-empty-state accounts-no-accounts">
            <span className="accounts-empty-icon"><Wallet aria-hidden="true" size={22} /></span>
            <h3>No accounts yet</h3>
            <p>Add your cash wallet, M-Pesa, bank, or savings account to get started.</p>
            <button className="primary-button" onClick={openCreateForm} type="button">
              <Plus aria-hidden="true" size={16} />
              Add your first account
            </button>
          </div>
        )}
      </section>

      {selectedAccount && (
        <section aria-label={`${selectedAccount.name} transaction history`} className="account-history">
          <div className="accounts-section-heading account-history-heading">
            <div>
              <p className="eyebrow">ACCOUNT HISTORY</p>
              <h2>{selectedAccount.name}</h2>
              <p>Recent income, expenses, and transfers assigned to this account.</p>
            </div>
            <span>
              {historyCountIsApproximate ? `About ${historyCount}` : historyCount}{' '}
              {historyCount === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>

          {historyError && <p className="accounts-alert" role="alert">{historyError}</p>}
          {historyLoading && transactions.length === 0 ? (
            <div className="accounts-history-empty" role="status">Loading account activity...</div>
          ) : transactions.length > 0 ? (
            <div className="account-activity-list">
              {transactions.map((transaction) => {
                const { direction, Icon } = transactionAmount(transaction)
                return (
                  <article className="account-activity-row" key={transaction.id}>
                    <span className={`account-activity-icon activity-${direction}`}>
                      <Icon aria-hidden="true" size={17} />
                    </span>
                    <div className="account-activity-description">
                      <strong>{transaction.title}</strong>
                      <span>
                        {transaction.category} · {transaction.date}
                        {transaction.type === 'transfer' && transaction.transferAccount
                          ? ` · ${transaction.account} → ${transaction.transferAccount}`
                          : ''}
                      </span>
                    </div>
                    <strong className={`account-activity-amount activity-amount-${direction}`}>
                      {direction === 'in' ? '+' : '−'}{formatAmount(transaction.amount)}
                    </strong>
                  </article>
                )
              })}
            </div>
          ) : !historyError ? (
            <div className="accounts-history-empty">
              <p>{historyLoading ? 'Loading account activity...' : 'No transactions are linked to this account yet.'}</p>
            </div>
          ) : null}

          {(hasNextPage || accountPage > 1) && (
            <footer className="account-history-pagination">
              <span>
                Page {accountPage} · {historyCountIsApproximate ? 'about ' : ''}
                {historyCount} total
              </span>
              <div>
                <button
                  disabled={accountPage <= 1 || historyLoading}
                  onClick={() => setAccountPage((page) => Math.max(1, page - 1))}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" size={16} />
                  Previous
                </button>
                <button
                  disabled={!hasNextPage || historyLoading}
                  onClick={() => setAccountPage((page) => page + 1)}
                  type="button"
                >
                  Next
                  <ChevronRight aria-hidden="true" size={16} />
                </button>
              </div>
            </footer>
          )}
        </section>
      )}

      {isFormOpen && (
        <AccountFormModal
          account={editingAccount}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveAccount}
        />
      )}
      {deletingAccount && (
        <AccountDeleteModal
          account={deletingAccount}
          isDeleting={isDeleting}
          onClose={() => setDeletingAccount(null)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  )
}

export default AccountsPage
