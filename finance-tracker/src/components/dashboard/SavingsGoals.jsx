import { ArrowRight, Laptop, Plane, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { savingsGoals as defaultSavingsGoals } from '../../data/dashboardData.js'
import { useCurrency } from '../../context/useCurrency.js'
import WidgetCard, { WidgetState } from './WidgetCard.jsx'

const goalIcons = {
  laptop: Laptop,
  travel: Plane,
}

function SavingsGoals({ loading = false, goals = defaultSavingsGoals }) {
  const { formatAmount } = useCurrency()

  return (
    <WidgetCard
      action={
        <Link aria-label="View all savings goals" className="widget-view-link" to="/savings-goals">
          View all <ArrowRight aria-hidden="true" size={15} />
        </Link>
      }
      className="goals-widget"
      icon={Target}
      title="Savings Goals"
    >
      {loading || goals.length === 0 ? (
        <WidgetState
          emptyMessage="Create a goal to start planning for something special."
          emptyTitle="No savings goals yet"
          loading={loading}
        />
      ) : (
        <div className="goals-list">
          {goals.map((goal) => {
            const Icon = goalIcons[goal.icon] || Target
            const percentage = Math.round((goal.saved / goal.target) * 100)

            return (
              <article className="goal-row" key={goal.name}>
                <div className={`goal-art goal-art-${goal.color}`}>
                  <Icon aria-hidden="true" size={27} strokeWidth={1.7} />
                </div>
                <div className="goal-details">
                  <div className="goal-title-row">
                    <h3>{goal.name}</h3>
                    <span>{percentage}%</span>
                  </div>
                  <p>
                    {formatAmount(goal.target)} <span>· by {goal.deadline}</span>
                  </p>
                  <div
                    aria-label={`${goal.name} ${percentage}% saved`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={percentage}
                    className="progress-track goal-progress"
                    role="progressbar"
                  >
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                  <p className="goal-saved">{formatAmount(goal.saved)} saved</p>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}

export default SavingsGoals
