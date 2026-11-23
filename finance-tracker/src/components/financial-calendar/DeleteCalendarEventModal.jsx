import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import TransactionModal from '../transactions/TransactionModal.jsx'

function DeleteCalendarEventModal({ event, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleConfirm() {
    setIsDeleting(true)
    setErrorMessage('')
    try {
      const result = await onConfirm(event)
      if (result !== true) {
        setErrorMessage(
          typeof result === 'string'
            ? result
            : 'The event could not be deleted. Please try again.',
        )
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <TransactionModal onClose={onClose} title="Delete calendar event">
      <div className="delete-transaction-content calendar-delete-content">
        <span className="delete-warning-icon">
          <AlertTriangle aria-hidden="true" size={23} />
        </span>
        <h3>Delete “{event.title}”?</h3>
        <p>
          {event.recurrence === 'none'
            ? 'This event and its reminder will be removed.'
            : 'This recurring series and its payment history will be removed.'}
        </p>
        {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
        <footer>
          <button className="secondary-button" disabled={isDeleting} onClick={onClose} type="button">
            Keep event
          </button>
          <button className="danger-button" disabled={isDeleting} onClick={handleConfirm} type="button">
            <Trash2 aria-hidden="true" size={16} />
            {isDeleting ? 'Deleting...' : 'Delete event'}
          </button>
        </footer>
      </div>
    </TransactionModal>
  )
}

export default DeleteCalendarEventModal
