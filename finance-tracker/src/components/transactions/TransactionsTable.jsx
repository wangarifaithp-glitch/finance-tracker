import { format } from 'date-fns'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bus,
  Eye,
  HeartPulse,
  House,
  Pencil,
  ReceiptText,
  ShoppingBag,
  ShoppingBasket,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useCurrency } from '../../context/useCurrency.js'

const categoryIcons = {
  Salary: Wallet,
  Freelance: Wallet,
  'Food & Drinks': ShoppingBasket,
  Transport: Bus,
  Housing: House,
  Bills: ReceiptText,
  Shopping: ShoppingBag,
  Health: HeartPulse,
  'Account transfer': ArrowLeftRight,
  'Savings contribution': ArrowLeftRight,
}

function formatTransactionDate(date) {
  return format(new Date(`${date}T12:00:00`), 'MMM d, yyyy')
}

function TransactionIcon({ transaction }) {
  const Icon =
    transaction.type === 'income'
      ? ArrowDownLeft
      : transaction.type === 'transfer'
        ? ArrowLeftRight
        : categoryIcons[transaction.category] || ArrowUpRight

  return (
    <span className={`transaction-list-icon list-icon-${transaction.type}`}>
      <Icon aria-hidden="true" size={17} />
    </span>
  )
}

function TransactionActions({ onDelete, onEdit, onView, transaction }) {
  return (
    <div className="transaction-row-actions">
      <button
        aria-label={`View ${transaction.title}`}
        className="row-action-button"
        onClick={() => onView(transaction)}
        type="button"
      >
        <Eye aria-hidden="true" size={16} />
      </button>
      <button
        aria-label={`Edit ${transaction.title}`}
        className="row-action-button"
        onClick={() => onEdit(transaction)}
        type="button"
      >
        <Pencil aria-hidden="true" size={15} />
      </button>
      <button
        aria-label={`Delete ${transaction.title}`}
        className="row-action-button row-delete-button"
        onClick={() => onDelete(transaction)}
        type="button"
      >
        <Trash2 aria-hidden="true" size={16} />
      </button>
    </div>
  )
}

function TransactionsTable({ onDelete, onEdit, onView, transactions }) {
  const { formatAmount } = useCurrency()

  return (
    <div className="transactions-table-container">
      <table className="transactions-table">
        <caption className="visually-hidden">Your transactions</caption>
        <thead>
          <tr>
            <th scope="col">Transaction</th>
            <th scope="col">Category</th>
            <th scope="col">Account &amp; method</th>
            <th scope="col">Date</th>
            <th scope="col">Type</th>
            <th className="amount-heading" scope="col">Amount</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>
                <div className="transaction-table-title">
                  <TransactionIcon transaction={transaction} />
                  <div>
                    <strong>{transaction.title}</strong>
                    <span>{formatTransactionDate(transaction.date)}</span>
                    {transaction.source !== 'manual' && (
                      <span className="transaction-source-badge">
                        Imported · {transaction.provider || transaction.source}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td>
                <span className="transaction-category">{transaction.category}</span>
              </td>
              <td>
                <span className="transaction-account">{transaction.account}</span>
                <span className="transaction-payment-method">
                  {transaction.paymentMethod}
                </span>
              </td>
              <td className="transaction-date-cell">
                {formatTransactionDate(transaction.date)}
              </td>
              <td>
                <span className={`transaction-type-badge type-${transaction.type}`}>
                  {transaction.type}
                </span>
              </td>
              <td className={`transaction-table-amount amount-${transaction.type}`}>
                {transaction.type === 'expense'
                  ? '−'
                  : transaction.type === 'income'
                    ? '+'
                    : ''}
                {formatAmount(transaction.amount)}
              </td>
              <td>
                <TransactionActions
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onView={onView}
                  transaction={transaction}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="transaction-mobile-list">
        {transactions.map((transaction) => (
          <article className="transaction-mobile-card" key={transaction.id}>
            <div className="mobile-transaction-heading">
              <TransactionIcon transaction={transaction} />
              <div>
                <strong>{transaction.title}</strong>
                <span>{formatTransactionDate(transaction.date)}</span>
              </div>
              <span className={`transaction-table-amount amount-${transaction.type}`}>
                {transaction.type === 'expense'
                  ? '−'
                  : transaction.type === 'income'
                    ? '+'
                    : ''}
                {formatAmount(transaction.amount)}
              </span>
            </div>
            <div className="mobile-transaction-meta">
              <span className={`transaction-type-badge type-${transaction.type}`}>
                {transaction.type}
              </span>
              <span>{transaction.category}</span>
              <span>{transaction.account}</span>
              <span>{transaction.paymentMethod}</span>
            </div>
            <TransactionActions
              onDelete={onDelete}
              onEdit={onEdit}
              onView={onView}
              transaction={transaction}
            />
          </article>
        ))}
      </div>
    </div>
  )
}

export default TransactionsTable
