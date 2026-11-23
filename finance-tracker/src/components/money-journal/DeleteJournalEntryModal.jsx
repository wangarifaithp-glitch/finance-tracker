import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import TransactionModal from '../transactions/TransactionModal.jsx'

function DeleteJournalEntryModal({ entry, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleConfirm() {
    setIsDeleting(true)
    setErrorMessage('')
    try {
      const result = await onConfirm(entry)
      if (result !== true) {
        setErrorMessage(
          typeof result === 'string'
            ? result
            : 'The entry could not be deleted. Please try again.',
        )
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <TransactionModal onClose={onClose} title="Delete journal entry">
      <div className="delete-transaction-content journal-delete-content">
        <span className="delete-warning-icon">
          <AlertTriangle aria-hidden="true" size={23} />
        </span>
        <h3>Let this reflection go?</h3>
        <p>“{entry.title}” will be permanently deleted.</p>
        {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
        <footer>
          <button className="secondary-button" disabled={isDeleting} onClick={onClose} type="button">
            Keep entry
          </button>
          <button className="danger-button" disabled={isDeleting} onClick={handleConfirm} type="button">
            <Trash2 aria-hidden="true" size={16} />
            {isDeleting ? 'Deleting...' : 'Delete entry'}
          </button>
        </footer>
      </div>
    </TransactionModal>
  )
}

export default DeleteJournalEntryModal
