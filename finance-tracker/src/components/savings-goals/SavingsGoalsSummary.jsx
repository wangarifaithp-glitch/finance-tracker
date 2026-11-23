import { CircleCheck, CircleDashed, PiggyBank, Target } from 'lucide-react'
import { useCurrency } from '../../context/useCurrency.js'

function SavingsGoalsSummary({ goals }) {
  const { formatAmount } = useCurrency()
  const summary = goals.reduce(
    (totals, goal) => {
      totals.saved += goal.savedAmount
      totals.target += goal.targetAmount
      if (goal.savedAmount >= goal.targetAmount) totals.completed += 1
      else totals.active += 1
      return totals
    },
    { saved: 0, target: 0, active: 0, completed: 0 },
  )

  const cards = [
    {
      label: 'Total saved',
      value: formatAmount(summary.saved),
      icon: PiggyBank,
      tone: 'saved',
    },
    {
      label: 'Goal targets',
      value: formatAmount(summary.target),
      icon: Target,
      tone: 'target',
    },
    {
      label: 'Active goals',
      value: summary.active.toLocaleString('en-KE'),
      icon: CircleDashed,
      tone: 'active',
    },
    {
      label: 'Completed',
      value: summary.completed.toLocaleString('en-KE'),
      icon: CircleCheck,
      tone: 'completed',
    },
  ]

  return (
    <section aria-label="Savings goals summary" className="savings-goals-summary">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <article className={`savings-summary-card summary-${tone}`} key={label}>
          <span className="savings-summary-icon">
            <Icon aria-hidden="true" size={19} strokeWidth={1.9} />
          </span>
          <div>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        </article>
      ))}
    </section>
  )
}

export default SavingsGoalsSummary
