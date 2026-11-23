import { format } from 'date-fns'
import {
  Briefcase,
  GraduationCap,
  House,
  Laptop,
  Pencil,
  Plane,
  Plus,
  Shield,
  Smartphone,
  Target,
  Trash2,
} from 'lucide-react'
import { useCurrency } from '../../context/useCurrency.js'

const goalIconMap = {
  laptop: Laptop,
  shield: Shield,
  plane: Plane,
  graduation: GraduationCap,
  briefcase: Briefcase,
  phone: Smartphone,
  house: House,
  target: Target,
}

function SavingsGoalCard({ goal, onAddMoney, onDelete, onEdit, onViewHistory }) {
  const { formatAmount } = useCurrency()
  const Icon = goalIconMap[goal.icon] || Target
  const completed = goal.savedAmount >= goal.targetAmount
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount)
  const progress = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
  const deadlineLabel = goal.deadline
    ? format(new Date(`${goal.deadline}T12:00:00`), 'MMM d, yyyy')
    : 'No deadline'

  return (
    <article className={`savings-goal-card${completed ? ' is-complete' : ''}`}>
      <div className="savings-goal-card-top">
        <div className={`savings-goal-art goal-color-${goal.color}`}>
          <Icon aria-hidden="true" size={27} strokeWidth={1.7} />
          <span aria-hidden="true" className="goal-art-sparkle">✦</span>
        </div>
        <div className="savings-goal-actions">
          <button
            aria-label={`Edit ${goal.title}`}
            className="goal-icon-action"
            onClick={() => onEdit(goal)}
            title="Edit goal"
            type="button"
          >
            <Pencil aria-hidden="true" size={16} />
          </button>
          <button
            aria-label={`Delete ${goal.title}`}
            className="goal-icon-action goal-delete-action"
            onClick={() => onDelete(goal)}
            title="Delete goal"
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        </div>
      </div>

      <div className="savings-goal-title-row">
        <div>
          <span className="savings-goal-category">{goal.category}</span>
          <h2>{goal.title}</h2>
        </div>
        {completed && (
          <span className="goal-complete-badge">
            <span aria-hidden="true">✦</span> Reached
          </span>
        )}
      </div>

      <div className="goal-progress-copy">
        <span>Progress</span>
        <strong>{progress}%</strong>
      </div>
      <div
        aria-label={`${goal.title}: ${progress}% saved`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="savings-goal-progress"
        role="progressbar"
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="savings-goal-amounts">
        <div>
          <span>Saved so far</span>
          <strong>{formatAmount(goal.savedAmount)}</strong>
        </div>
        <div>
          <span>Goal target</span>
          <strong>{formatAmount(goal.targetAmount)}</strong>
        </div>
      </div>
      <div className="savings-goal-card-bottom">
        <span className="goal-deadline">
          {completed ? 'You made it!' : `${formatAmount(remaining)} to go`}
        </span>
        <span className="goal-deadline">{deadlineLabel}</span>
      </div>

      <div className="savings-goal-card-footer">
        <button
          className="secondary-button goal-history-button"
          onClick={() => onViewHistory(goal)}
          type="button"
        >
          View activity
        </button>
        <button
          className="primary-button goal-add-button"
          onClick={() => onAddMoney(goal, 'contribution')}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          Add money
        </button>
      </div>
      {goal.savedAmount > 0 && (
        <button
          className="goal-withdraw-link"
          onClick={() => onAddMoney(goal, 'withdrawal')}
          type="button"
        >
          Withdraw or adjust saved amount
        </button>
      )}
    </article>
  )
}

export default SavingsGoalCard
