import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Banknote,
  Bell,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Home,
  Pencil,
  PiggyBank,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { financialEventTypes, payableEventTypes } from '../../data/financialCalendarData.js'

const eventIcons = {
  bill: CreditCard,
  rent: Home,
  payday: Banknote,
  subscription: RefreshCw,
  loan_payment: CircleDollarSign,
  savings_contribution: PiggyBank,
  recurring_expense: RefreshCw,
  reminder: Bell,
}

function recurrenceLabel(recurrence) {
  if (recurrence === 'none') return ''
  return `Every ${recurrence === 'daily' ? 'day' : recurrence === 'weekly' ? 'week' : recurrence === 'monthly' ? 'month' : 'year'}`
}

function CalendarEventCard({
  event,
  formatAmount,
  compact = false,
  onDelete,
  onEdit,
  onTogglePaid,
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [actionError, setActionError] = useState('')
  const Icon = eventIcons[event.eventType] || CalendarDays
  const eventType = financialEventTypes.find((item) => item.value === event.eventType)
  const canMarkPaid = payableEventTypes.includes(event.eventType)
  const completionLabel = event.eventType === 'savings_contribution' ? 'contribution' : 'bill'
  const reminderLabel =
    event.remindBeforeDays === null
      ? ''
      : event.remindBeforeDays === 0
        ? 'Reminder on the day'
        : `Reminder ${event.remindBeforeDays} day${event.remindBeforeDays === 1 ? '' : 's'} before`

  async function handleTogglePaid() {
    setIsUpdating(true)
    setActionError('')
    try {
      const result = await onTogglePaid(event)
      if (result !== true) {
        setActionError(
          typeof result === 'string'
            ? result
            : 'The event status could not be updated. Please try again.',
        )
      }
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <article
      className={`calendar-event-card calendar-type-${event.eventType}${compact ? ' is-compact' : ''}${
        event.isPaid ? ' is-paid' : ''
      }`}
    >
      <span aria-hidden="true" className="calendar-event-icon">
        <Icon size={16} />
      </span>
      <div className="calendar-event-copy">
        <div className="calendar-event-title-row">
          <div>
            <p className="calendar-event-date">{format(parseISO(event.occurrenceDate), 'EEE, MMM d')}</p>
            <h3>{event.title}</h3>
          </div>
          <div className="calendar-event-side">
            {event.amount !== null && (
              <strong className="calendar-event-amount">{formatAmount(event.amount)}</strong>
            )}
            {event.isPaid && <span className="calendar-paid-badge">{event.eventType === 'savings_contribution' ? 'Done' : 'Paid'}</span>}
          </div>
        </div>
        <div className="calendar-event-meta">
          <span className="calendar-event-type-label">{eventType?.label || 'Financial event'}</span>
          {event.recurrence !== 'none' && <span>{recurrenceLabel(event.recurrence)}</span>}
          {reminderLabel && <span>{reminderLabel}</span>}
        </div>
        {event.notes && !compact && <p className="calendar-event-notes">{event.notes}</p>}
        {actionError && <p className="calendar-event-error" role="alert">{actionError}</p>}
        <div className="calendar-event-actions">
          {canMarkPaid && (
            <button
              className={`calendar-complete-button${event.isPaid ? ' is-completed' : ''}`}
              disabled={isUpdating}
              onClick={handleTogglePaid}
              type="button"
            >
              {isUpdating
                ? 'Updating...'
                : event.isPaid
                  ? `Mark ${completionLabel} unpaid`
                  : `Mark ${completionLabel} paid`}
            </button>
          )}
          {!compact && (
            <div className="calendar-management-actions">
              <button
                aria-label={`Edit ${event.title}`}
                className="calendar-action-button"
                onClick={() => onEdit(event)}
                type="button"
              >
                <Pencil aria-hidden="true" size={14} />
              </button>
              <button
                aria-label={`Delete ${event.title}`}
                className="calendar-action-button calendar-delete-button"
                onClick={() => onDelete(event)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default CalendarEventCard
