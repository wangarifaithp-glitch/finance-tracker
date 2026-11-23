import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  PiggyBank,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { summaryCards as defaultSummaryCards } from '../../data/dashboardData.js'
import { useCurrency } from '../../context/useCurrency.js'

const icons = {
  balance: Wallet,
  income: ArrowUpRight,
  expenses: ArrowDownRight,
  savings: PiggyBank,
}

function SummaryCards({ cards = defaultSummaryCards }) {
  const { formatAmount } = useCurrency()

  return (
    <section aria-label="Financial summary" className="summary-grid">
      {cards.map((card) => {
        const Icon = icons[card.icon] || CircleDollarSign
        const isExpense = card.icon === 'expenses'
        const TrendIcon = isExpense ? TrendingDown : ArrowUpRight
        const trendPoints = card.trend
          .map((value, index) => {
            const x = (index / (card.trend.length - 1)) * 100
            const y = 31 - (value / Math.max(...card.trend)) * 26
            return `${x},${y}`
          })
          .join(' ')

        return (
          <article className={`summary-card summary-${card.color}`} key={card.label}>
            <div className="summary-card-top">
              <span className="summary-icon">
                <Icon aria-hidden="true" size={19} strokeWidth={2.1} />
              </span>
              <span className="summary-label">{card.label}</span>
            </div>
            <p className="summary-amount">{formatAmount(card.amount)}</p>
            <div className="summary-card-bottom">
              <span className={`summary-change${isExpense ? ' positive' : ''}`}>
                <TrendIcon aria-hidden="true" size={14} />
                {card.change}
              </span>
              <span className="summary-comparison">{card.comparison}</span>
              <svg
                aria-hidden="true"
                className="summary-sparkline"
                preserveAspectRatio="none"
                viewBox="0 0 100 35"
              >
                <polyline
                  fill="none"
                  points={trendPoints}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default SummaryCards
