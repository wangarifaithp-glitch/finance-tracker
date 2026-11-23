import {
  ArrowUpRight,
  ChartNoAxesCombined,
  Plus,
  Target,
  WalletCards,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const actions = [
  { label: 'Add Transaction', to: '/transactions', icon: Plus, tone: 'purple' },
  { label: 'Create Budget', to: '/budgets', icon: WalletCards, tone: 'peach' },
  { label: 'Add Savings Goal', to: '/savings-goals', icon: Target, tone: 'lavender' },
  { label: 'View Reports', to: '/reports', icon: ChartNoAxesCombined, tone: 'gold' },
]

function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="quick-actions">
      {actions.map(({ label, to, icon: Icon, tone }) => (
        <Link className="quick-action" key={to} to={to}>
          <span className={`quick-action-icon quick-${tone}`}>
            <Icon aria-hidden="true" size={16} strokeWidth={2.2} />
          </span>
          <span>{label}</span>
          <ArrowUpRight aria-hidden="true" className="quick-action-arrow" size={14} />
        </Link>
      ))}
    </nav>
  )
}

export default QuickActions
