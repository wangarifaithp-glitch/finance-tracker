import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react'
import { useCurrency } from '../../context/useCurrency.js'

function TransactionSummary({ summary }) {
  const { formatAmount } = useCurrency()

  const summaries = [
    {
      label: 'Total income',
      amount: formatAmount(summary.totalIncome),
      icon: ArrowDownLeft,
      tone: 'income',
    },
    {
      label: 'Total expenses',
      amount: formatAmount(summary.totalExpenses),
      icon: ArrowUpRight,
      tone: 'expense',
    },
    {
      label: 'Transactions',
      amount: summary.transactionCount.toLocaleString('en-KE'),
      icon: ArrowLeftRight,
      tone: 'count',
    },
  ]

  return (
    <section aria-label="Transaction summary" className="transaction-summary">
      {summaries.map(({ label, amount, icon: Icon, tone }) => (
        <article className={`transaction-summary-card summary-${tone}`} key={label}>
          <span className="transaction-summary-icon">
            <Icon aria-hidden="true" size={18} />
          </span>
          <div>
            <p>{label}</p>
            <strong>{amount}</strong>
          </div>
        </article>
      ))}
    </section>
  )
}

export default TransactionSummary
