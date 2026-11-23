import { X } from 'lucide-react'

function TransactionModal({ children, onClose, title, size = 'medium' }) {
  function handleKeyDown(event) {
    if (event.key === 'Escape') onClose()
  }

  return (
    <div
      className="transaction-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="transaction-modal-title"
        aria-modal="true"
        className={`transaction-modal transaction-modal-${size}`}
        onKeyDown={handleKeyDown}
        role="dialog"
        tabIndex={-1}
      >
        <header className="transaction-modal-header">
          <div>
            <p className="eyebrow">FINANCE TRACKER</p>
            <h2 id="transaction-modal-title">{title}</h2>
          </div>
          <button
            aria-label="Close dialog"
            autoFocus
            className="modal-close-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

export default TransactionModal
