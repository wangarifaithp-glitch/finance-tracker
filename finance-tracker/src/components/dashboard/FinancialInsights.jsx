import {
  ArrowDownRight,
  Lightbulb,
  PiggyBank,
  Utensils,
} from 'lucide-react'
import { financialInsights } from '../../data/dashboardData.js'
import { useCurrency } from '../../context/useCurrency.js'
import WidgetCard, { WidgetState } from './WidgetCard.jsx'

const insightIcons = {
  trend: ArrowDownRight,
  food: Utensils,
  savings: PiggyBank,
}

function FinancialInsights({ loading = false }) {
  const { formatAmount } = useCurrency()

  return (
    <WidgetCard
      className="insights-widget"
        icon={Lightbulb}
      title="Financial Insights"
    >
      {loading || financialInsights.length === 0 ? (
        <WidgetState
          emptyMessage="Helpful patterns will show up as you track your money."
          emptyTitle="Insights are on their way"
          loading={loading}
        />
      ) : (
        <ul className="insight-list">
          {financialInsights.map((insight) => {
            const Icon = insightIcons[insight.icon] || Lightbulb

            return (
              <li className="insight-item" key={insight.id}>
                <span className={`insight-icon insight-${insight.tone}`}>
                  <Icon aria-hidden="true" size={19} strokeWidth={2} />
                </span>
                <div>
                  <p>
                    {insight.amount
                      ? `${insight.title} ${formatAmount(insight.amount)}.`
                      : insight.title}
                  </p>
                  <span>{insight.detail}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </WidgetCard>
  )
}

export default FinancialInsights
