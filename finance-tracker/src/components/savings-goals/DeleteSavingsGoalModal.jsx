import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import TransactionModal from '../transactions/TransactionModal.jsx'

function DeleteSavingsGoalModal({ goal, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleConfirm() {
    setIsDeleting(true)
    setErrorMessage('')
    try {
      const result = await onConfirm(goal)
      if (result !== true) {
        setErrorMessage(
          typeof result === 'string'
            ? result
            : 'The goal could not be deleted. Please try again.',
        )
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <TransactionModal onClose={onClose} title="Delete savings goal">
      <div className="delete-transaction-content goal-delete-content">
        <span className="delete-warning-icon">
          <AlertTriangle aria-hidden="true" size={23} />
        </span>
        <h3>Delete “{goal.title}”?</h3>
        <p>This also removes its contribution history. This action can’t be undone.</p>
        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}
        <footer>
          <button className="secondary-button" disabled={isDeleting} onClick={onClose} type="button">
            Keep goal
          </button>
          <button className="danger-button" disabled={isDeleting} onClick={handleConfirm} type="button">
            <Trash2 aria-hidden="true" size={16} />
            {isDeleting ? 'Deleting...' : 'Delete goal'}
          </button>
        </footer>
      </div>
    </TransactionModal>
  )
}

export default DeleteSavingsGoalModal
