import { AlertTriangle } from 'lucide-react'
import TransactionModal from '../transactions/TransactionModal.jsx'

function AccountDeleteModal({ account, isDeleting, onClose, onConfirm }) {
  return (
    <TransactionModal onClose={onClose} title="Delete account">
      <div className="account-delete-content">
        <span className="account-delete-icon">
          <AlertTriangle aria-hidden="true" size={22} />
        </span>
        <p>
          Delete <strong>{account.name}</strong>? Its transaction records will remain,
          but they will no longer be linked to this account.
        </p>
        <footer className="transaction-form-footer">
          <button
            className="secondary-button"
            disabled={isDeleting}
            onClick={onClose}
            type="button"
          >
            Keep account
          </button>
          <button
            className="danger-button"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? 'Deleting...' : 'Delete account'}
          </button>
        </footer>
      </div>
    </TransactionModal>
  )
}

export default AccountDeleteModal
