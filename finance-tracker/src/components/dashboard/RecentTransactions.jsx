import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bus,
  ShoppingBasket,
  Utensils,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { transactions as defaultTransactions } from '../../data/dashboardData.js'
import { useCurrency } from '../../context/useCurrency.js'
import WidgetCard, { WidgetState } from './WidgetCard.jsx'

const transactionIcons = {
  income: Wallet,
  food: ShoppingBasket,
  transport: Bus,
  dining: Utensils,
}

function RecentTransactions({ loading = false, transactions = defaultTransactions }) {
  const { formatAmount } = useCurrency()

  return (
    <WidgetCard
      action={
        <Link aria-label="View all transactions" className="widget-view-link" to="/transactions">
          View all <ArrowRight aria-hidden="true" size={15} />
        </Link>
      }
      className="transactions-widget"
      icon={ArrowLeftRight}
      title="Recent Transactions"
    >
      {loading || transactions.length === 0 ? (
        <WidgetState
          emptyMessage="New income and expenses will appear here."
          emptyTitle="No transactions yet"
          loading={loading}
        />
      ) : (
        <ul className="transaction-list">
          {transactions.map((transaction) => {
            const Icon = transactionIcons[transaction.icon] || Wallet
            const isIncome = transaction.type === 'income'

            return (
              <li className="transaction-row" key={transaction.id}>
                <span className={`transaction-icon transaction-${transaction.icon}`}>
                  <Icon aria-hidden="true" size={17} strokeWidth={2} />
                </span>
                <div className="transaction-details">
                  <strong>{transaction.name}</strong>
                  <span>
                    {transaction.category} <i /> {transaction.date} <i />{' '}
                    {transaction.paymentMethod}
                  </span>
                </div>
                <span className={`transaction-amount ${isIncome ? 'income' : 'expense'}`}>
                  {isIncome ? '+' : '−'}
                  {formatAmount(Math.abs(transaction.amount))}
                  {isIncome ? (
                    <ArrowDownLeft aria-hidden="true" size={13} />
                  ) : (
                    <ArrowUpRight aria-hidden="true" size={13} />
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </WidgetCard>
  )
}

export default RecentTransactions
