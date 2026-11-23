import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import DeleteTransactionModal from '../components/transactions/DeleteTransactionModal.jsx'
import TransactionDetailsModal from '../components/transactions/TransactionDetailsModal.jsx'
import TransactionFilters from '../components/transactions/TransactionFilters.jsx'
import TransactionFormModal from '../components/transactions/TransactionFormModal.jsx'
import TransactionSummary from '../components/transactions/TransactionSummary.jsx'
import TransactionsTable from '../components/transactions/TransactionsTable.jsx'
import {
  TODAY,
  transactionCategories,
} from '../data/transactionData.js'
import { getFinancialAccounts } from '../data/financialAccountRepository.js'
import {
  deleteTransaction,
  getTransactionPage,
  saveTransaction,
} from '../data/transactionRepository.js'
import { useAuth } from '../context/useAuth.js'
import { useCurrency } from '../context/useCurrency.js'
import './TransactionsPage.css'
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh.js'

const pageSize = 8
const transactionErrorMessage = 'The transaction could not be saved. Please try again.'
const initialFilters = {
  type: '',
  category: '',
  account: '',
  provider: '',
  currency: '',
  source: '',
  from: '',
  to: '',
  sort: 'newest',
}

function TransactionsPage() {
  const { convertFromBase, currency, fractionDigits } = useCurrency()
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    transactionCount: 0,
  })
  const [totalCount, setTotalCount] = useState(0)
  const [countIsApproximate, setCountIsApproximate] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [filters, setFilters] = useState(initialFilters)
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentPage, setCurrentPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [viewingTransaction, setViewingTransaction] = useState(null)
  const [deletingTransaction, setDeletingTransaction] = useState(null)
  const [notice, setNotice] = useState('')
  const search = searchParams.get('q') || ''
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useRealtimeRefresh(
    user?.id,
    ['transactions', 'financial_accounts'],
    () => setRefreshKey((key) => key + 1),
  )

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadAccounts() {
      setAccountsLoading(true)
      setAccountsError('')
      try {
        const result = await getFinancialAccounts(user?.id, controller.signal)
        if (active) setAccounts(result)
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load transaction accounts.', error)
        setAccountsError('Accounts could not be loaded. Please try again later.')
      } finally {
        if (active && !controller.signal.aborted) setAccountsLoading(false)
      }
    }

    loadAccounts()
    return () => {
      active = false
      controller.abort()
    }
  }, [user?.id])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 250)
    return () => window.clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadPage() {
      setIsLoading(true)
      setLoadError('')
      try {
        const result = await getTransactionPage({
          userId: user?.id,
          filters,
          search: debouncedSearch,
          page: currentPage,
          pageSize,
          signal: controller.signal,
        })
        if (!active) return
        setTransactions(result.transactions)
        setSummary(result.summary)
        setTotalCount(result.totalCount)
        setCountIsApproximate(result.countIsApproximate)
        setHasNextPage(result.hasNext)
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load Finance Tracker transactions.', error)
        setLoadError('Transactions could not be loaded. Please try again.')
      } finally {
        if (active && !controller.signal.aborted) setIsLoading(false)
      }
    }

    loadPage()
    return () => {
      active = false
      controller.abort()
    }
  }, [currentPage, debouncedSearch, filters, refreshKey, user?.id])

  const categories = useMemo(
    () =>
      Array.from(
        new Set([
          ...Object.values(transactionCategories).flat(),
          ...(filters.category ? [filters.category] : []),
          ...transactions.map((transaction) => transaction.category),
        ]),
      ).sort((left, right) => left.localeCompare(right)),
    [filters.category, transactions],
  )
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const visiblePage = currentPage
  const visibleTransactions = transactions
  const hasActiveFilters =
    Boolean(search.trim()) ||
    Object.entries(filters).some(([key, value]) => key !== 'sort' && Boolean(value)) ||
    filters.sort !== initialFilters.sort

  function handleSearchChange(value) {
    setCurrentPage(1)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value.trim()) next.set('q', value)
      else next.delete('q')
      return next
    })
  }

  function handleFilterChange(key, value) {
    setCurrentPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function resetFilters() {
    setFilters(initialFilters)
    setSearchParams(new URLSearchParams())
    setCurrentPage(1)
  }

  function openAddForm() {
    if (accountsLoading || accountsError || accounts.length === 0) return
    setEditingTransaction(null)
    setIsFormOpen(true)
    setNotice('')
  }

  function openEditForm(transaction) {
    setViewingTransaction(null)
    setEditingTransaction(transaction)
    setIsFormOpen(true)
    setNotice('')
  }

  async function handleSaveTransaction(transaction) {
    const isEditing = Boolean(transaction.id)
    const record = {
      ...transaction,
      id: transaction.id || globalThis.crypto.randomUUID(),
    }
    try {
      const result = await saveTransaction(record, user?.id, editingTransaction)
      setCurrentPage(1)
      setRefreshKey((key) => key + 1)
      setNotice(result.warning || (isEditing ? 'Transaction updated.' : 'Transaction added.'))
      return true
    } catch (error) {
      console.error('Unable to save Finance Tracker transaction.', error)
      return error?.message || transactionErrorMessage
    }
  }

  async function handleDeleteTransaction() {
    if (!deletingTransaction) return

    try {
      const result = await deleteTransaction(deletingTransaction, user?.id)
      setNotice(result.warning || 'Transaction deleted.')
      setDeletingTransaction(null)
      setCurrentPage(1)
      setRefreshKey((key) => key + 1)
      return true
    } catch (error) {
      console.error('Unable to delete Finance Tracker transaction.', error)
      setLoadError('The transaction could not be deleted. Please try again.')
      return error?.message || 'The transaction could not be deleted. Please try again.'
    }
  }

  function exportTransactions() {
    const headers = [
      'Title',
      `Amount (${currency})`,
      'Currency',
      'Type',
      'Category',
      'Date',
      'Account',
      'Payment method',
      'Notes',
      'Receipt',
    ]
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const convertedAmounts = transactions.map((transaction) =>
      convertFromBase(transaction.amount),
    )
    if (convertedAmounts.some((amount) => amount === null)) {
      setNotice('Export unavailable because exchange rates could not be loaded.')
      return
    }
    const rows = transactions.map((transaction, index) => [
      transaction.title,
      Number(convertedAmounts[index].toFixed(fractionDigits)),
      currency,
      transaction.type,
      transaction.category,
      transaction.date,
      transaction.account,
      transaction.paymentMethod,
      transaction.notes,
      transaction.receipt?.name || '',
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n')
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `finance-tracker-transactions-${format(TODAY, 'yyyy-MM-dd')}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    setNotice(
      `${rows.length} transaction${rows.length === 1 ? '' : 's'} from this page exported as CSV.`,
    )
  }

  return (
    <div className="transactions-page">
      <header className="transactions-page-heading">
        <div>
          <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
          <h1>Transactions</h1>
          <p>Everyday money, all in one thoughtful view.</p>
        </div>
        <button
          className="primary-button heading-add-button"
          disabled={accountsLoading || Boolean(accountsError) || accounts.length === 0}
          onClick={openAddForm}
          type="button"
        >
          <Plus aria-hidden="true" size={17} />
          Add Transaction
        </button>
      </header>

      {loadError && (
        <p className="transaction-alert" role="alert">
          {loadError}
        </p>
      )}
      {accountsError && (
        <p className="transaction-alert" role="alert">
          {accountsError}
        </p>
      )}
      {!accountsLoading && accounts.length === 0 && !accountsError && (
        <p className="transaction-notice" role="status">
          Add an account on the <Link to="/accounts">Accounts page</Link> before recording a transaction.
        </p>
      )}
      {notice && (
        <p aria-live="polite" className="transaction-notice" role="status">
          {notice}
        </p>
      )}

      <TransactionSummary summary={summary} />
      <TransactionFilters
        accounts={accounts}
        categories={categories}
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        countIsApproximate={countIsApproximate}
        isLoading={isLoading}
        onExport={exportTransactions}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
        onSearchChange={handleSearchChange}
        resultCount={transactions.length}
        search={search}
        totalCount={totalCount}
      />

      <section aria-label="Transaction records" className="transaction-records">
        {isLoading && visibleTransactions.length === 0 ? (
          <div className="transactions-empty-state">
            <p role="status">Loading transactions...</p>
          </div>
        ) : visibleTransactions.length > 0 ? (
          <TransactionsTable
            onDelete={setDeletingTransaction}
            onEdit={openEditForm}
            onView={setViewingTransaction}
            transactions={visibleTransactions}
          />
        ) : loadError ? (
          <div className="transactions-empty-state">
            <h2>Transactions are unavailable</h2>
            <p>Check your connection, then try loading the page again.</p>
            <button
              className="secondary-button"
              onClick={() => setRefreshKey((key) => key + 1)}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="transactions-empty-state">
            <span className="empty-state-mark">
              <span />
              <span />
              <span />
            </span>
            <h2>{hasActiveFilters ? 'No matching transactions' : 'No transactions yet'}</h2>
            <p>
              {hasActiveFilters
                ? 'Try adjusting your search or filters to find what you’re looking for.'
                : 'Add your first transaction to start understanding your money.'}
            </p>
            {hasActiveFilters ? (
              <button className="secondary-button" onClick={resetFilters} type="button">
                Clear filters
              </button>
            ) : (
              <button
                className="primary-button"
                disabled={accountsLoading || Boolean(accountsError) || accounts.length === 0}
                onClick={openAddForm}
                type="button"
              >
                <Plus aria-hidden="true" size={16} />
                Add transaction
              </button>
            )}
          </div>
        )}

        {(transactions.length > 0 || currentPage > 1) && (
          <footer className="transaction-pagination">
            <span>
              Page {visiblePage}
              {countIsApproximate
                ? ` of about ${totalPages}`
                : ` · ${(visiblePage - 1) * pageSize + 1}–${Math.min(
                    visiblePage * pageSize,
                    totalCount,
                  )} of ${totalCount}`}
            </span>
            <div className="pagination-controls">
              <button
                aria-label="Previous page"
                disabled={visiblePage <= 1 || isLoading}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={17} />
                Previous
              </button>
              <span>Page {visiblePage}</span>
              <button
                aria-label="Next page"
                disabled={!hasNextPage || isLoading}
                onClick={() => setCurrentPage((page) => page + 1)}
                type="button"
              >
                Next
                <ChevronRight aria-hidden="true" size={17} />
              </button>
            </div>
          </footer>
        )}
      </section>

      {isFormOpen && (
        <TransactionFormModal
          accounts={accounts}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveTransaction}
          transaction={editingTransaction}
        />
      )}
      {viewingTransaction && (
        <TransactionDetailsModal
          onClose={() => setViewingTransaction(null)}
          onEdit={() => openEditForm(viewingTransaction)}
          transaction={viewingTransaction}
        />
      )}
      {deletingTransaction && (
        <DeleteTransactionModal
          onClose={() => setDeletingTransaction(null)}
          onConfirm={handleDeleteTransaction}
          transaction={deletingTransaction}
        />
      )}
    </div>
  )
}

export default TransactionsPage
