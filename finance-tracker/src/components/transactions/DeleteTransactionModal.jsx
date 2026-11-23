import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import TransactionModal from './TransactionModal.jsx'

function DeleteTransactionModal({ onClose, onConfirm, transaction }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleConfirm() {
    setIsDeleting(true)
    setErrorMessage('')
    try {
      const result = await onConfirm()
      if (result !== true) {
        setErrorMessage(
          typeof result === 'string'
            ? result
            : 'The transaction could not be deleted. Please try again.',
        )
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <TransactionModal onClose={onClose} title="Delete transaction">
      <div className="delete-transaction-content">
        <span className="delete-warning-icon">
          <AlertTriangle aria-hidden="true" size={23} />
        </span>
        <h3>Are you sure you want to delete “{transaction.title}”?</h3>
        <p>This action can’t be undone.</p>
        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}
        <footer>
          <button className="secondary-button" disabled={isDeleting} onClick={onClose} type="button">
            Keep transaction
          </button>
          <button className="danger-button" disabled={isDeleting} onClick={handleConfirm} type="button">
            <Trash2 aria-hidden="true" size={16} />
            {isDeleting ? 'Deleting...' : 'Delete transaction'}
          </button>
        </footer>
      </div>
    </TransactionModal>
  )
}

export default DeleteTransactionModal
