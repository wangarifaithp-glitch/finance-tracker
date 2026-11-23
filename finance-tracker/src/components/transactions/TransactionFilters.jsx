import { Download, FilterX, Search } from 'lucide-react'

function TransactionFilters({
  accounts,
  categories,
  filters,
  hasActiveFilters,
  countIsApproximate,
  isLoading,
  onExport,
  onFilterChange,
  onReset,
  onSearchChange,
  resultCount,
  search,
  totalCount,
}) {
  return (
    <section aria-label="Search and filter transactions" className="transaction-controls">
      <div className="transaction-controls-top">
        <label className="transaction-search">
          <Search aria-hidden="true" size={17} />
          <span className="visually-hidden">Search transactions</span>
          <input
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search transactions..."
            type="search"
            value={search}
          />
        </label>
        <div className="transaction-control-actions">
          <button
            className="secondary-button export-button"
            disabled={resultCount === 0 || isLoading}
            onClick={onExport}
            type="button"
          >
            <Download aria-hidden="true" size={16} />
            Export page CSV
          </button>
        </div>
      </div>

      <div className="transaction-filter-row">
        <label className="filter-field">
          <span>Type</span>
          <select
            onChange={(event) => onFilterChange('type', event.target.value)}
            value={filters.type}
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Category</span>
          <select
            onChange={(event) => onFilterChange('category', event.target.value)}
            value={filters.category}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Account</span>
          <select
            onChange={(event) => onFilterChange('account', event.target.value)}
            value={filters.account}
          >
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Source</span>
          <select
            onChange={(event) => onFilterChange('source', event.target.value)}
            value={filters.source}
          >
            <option value="">All sources</option>
            <option value="manual">Manual</option>
            <option value="imported">Imported</option>
            <option value="mpesa">M-Pesa</option>
            <option value="bank">Bank</option>
            <option value="paypal">PayPal</option>
            <option value="card">Card</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Provider</span>
          <select
            onChange={(event) => onFilterChange('provider', event.target.value)}
            value={filters.provider}
          >
            <option value="">All providers</option>
            <option value="mpesa">M-Pesa</option>
            <option value="equity">Equity Bank</option>
            <option value="kcb">KCB</option>
            <option value="cooperative">Co-operative Bank</option>
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
            <option value="paypal">PayPal</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Currency</span>
          <select
            onChange={(event) => onFilterChange('currency', event.target.value)}
            value={filters.currency}
          >
            <option value="">All currencies</option>
            <option value="KES">KES</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </label>
        <label className="filter-field date-filter">
          <span>From</span>
          <input
            aria-label="From date"
            onChange={(event) => onFilterChange('from', event.target.value)}
            type="date"
            value={filters.from}
          />
        </label>
        <label className="filter-field date-filter">
          <span>To</span>
          <input
            aria-label="To date"
            onChange={(event) => onFilterChange('to', event.target.value)}
            type="date"
            value={filters.to}
          />
        </label>
        <label className="filter-field sort-filter">
          <span>Sort by</span>
          <select
            onChange={(event) => onFilterChange('sort', event.target.value)}
            value={filters.sort}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount-high">Amount: high to low</option>
            <option value="amount-low">Amount: low to high</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
        <div className="transaction-filter-footer">
          <span>
            {isLoading
              ? 'Updating results...'
              : countIsApproximate
                ? `${resultCount} on this page · about ${totalCount} total`
                : `${resultCount} on this page · ${totalCount} total`}
          </span>
          {hasActiveFilters && (
            <button className="reset-filters-button" onClick={onReset} type="button">
              <FilterX aria-hidden="true" size={14} />
              Clear filters
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default TransactionFilters
