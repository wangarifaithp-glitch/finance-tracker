import { AlertTriangle, Calculator, CheckCircle2 } from 'lucide-react'
import { monthlyBudget as defaultMonthlyBudget } from '../../data/dashboardData.js'
import { useCurrency } from '../../context/useCurrency.js'
import WidgetCard from './WidgetCard.jsx'

function MonthlyBudget({ budget = defaultMonthlyBudget }) {
  const { formatAmount } = useCurrency()
  const monthlyBudget = budget
  const percentage = Math.round(
    (monthlyBudget.spent / monthlyBudget.total) * 100,
  )
  const remaining = monthlyBudget.total - monthlyBudget.spent
  const isNearLimit = percentage >= monthlyBudget.warningAt

  return (
    <WidgetCard
      className="budget-widget"
      icon={Calculator}
      title="Monthly Budget"
    >
      <div className="budget-content">
        <div
          aria-label={`${percentage}% of monthly budget used`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percentage}
          className={`budget-ring${isNearLimit ? ' budget-ring-warning' : ''}`}
          role="meter"
          style={{ '--budget-progress': `${percentage}%` }}
        >
          <div className="budget-ring-center">
            <strong>{percentage}%</strong>
            <span>used</span>
          </div>
        </div>
        <p className="budget-spent">
          {formatAmount(monthlyBudget.spent)} <span>of {formatAmount(monthlyBudget.total)}</span>
        </p>
        <p className="budget-remaining">
          {formatAmount(remaining)} <span>remaining</span>
        </p>
        <div className={`budget-status${isNearLimit ? ' warning' : ''}`}>
          {isNearLimit ? (
            <AlertTriangle aria-hidden="true" size={16} />
          ) : (
            <CheckCircle2 aria-hidden="true" size={16} />
          )}
          <span>
            {isNearLimit
              ? 'You’re getting close to your limit.'
              : 'You’re on track this month.'}
          </span>
        </div>
      </div>
    </WidgetCard>
  )
}

export default MonthlyBudget
