import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Paperclip } from 'lucide-react'
import { getTransactionReceiptUrl } from '../../data/transactionRepository.js'
import { useCurrency } from '../../context/useCurrency.js'
import TransactionModal from './TransactionModal.jsx'

function TransactionDetailsModal({ onClose, onEdit, transaction }) {
  const { formatAmount } = useCurrency()
  const [receiptState, setReceiptState] = useState({ key: '', url: '', error: '' })
  const receiptKey = transaction.receipt?.path || transaction.receipt?.dataUrl || ''
  const receiptUrl = receiptState.key === receiptKey ? receiptState.url : ''
  const receiptError = receiptState.key === receiptKey ? receiptState.error : ''
  const formattedDate = format(
    new Date(`${transaction.date}T12:00:00`),
    'EEEE, MMMM d, yyyy',
  )

  useEffect(() => {
    let active = true
    if (!receiptKey) return undefined

    getTransactionReceiptUrl(transaction.receipt)
      .then((url) => {
        if (active) setReceiptState({ key: receiptKey, url: url || '', error: '' })
      })
      .catch((error) => {
        if (!active) return
        console.error('Unable to access the transaction receipt.', error)
        setReceiptState({
          key: receiptKey,
          url: '',
          error: 'The receipt could not be opened. Please try again later.',
        })
      })

    return () => {
      active = false
    }
  }, [receiptKey, transaction.id, transaction.receipt])

  return (
    <TransactionModal onClose={onClose} title="Transaction details">
      <div className="transaction-details-modal">
        <div className={`detail-amount-card detail-${transaction.type}`}>
          <span>
            {transaction.type === 'income' ? (
              <ArrowDownLeft aria-hidden="true" size={19} />
            ) : transaction.type === 'transfer' ? (
              <ArrowLeftRight aria-hidden="true" size={19} />
            ) : (
              <ArrowUpRight aria-hidden="true" size={19} />
            )}
          </span>
          <div>
            <p>{transaction.title}</p>
            <strong>
              {transaction.type === 'expense' ? '−' : transaction.type === 'income' ? '+' : ''}
              {formatAmount(transaction.amount)}
            </strong>
          </div>
          <span className={`transaction-type-badge type-${transaction.type}`}>
            {transaction.type}
          </span>
        </div>

        <dl className="transaction-detail-list">
          <div>
            <dt>Category</dt>
            <dd>{transaction.category}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{formattedDate}</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>{transaction.account}</dd>
          </div>
          {transaction.type === 'transfer' && transaction.transferAccount && (
            <div>
              <dt>Destination account</dt>
              <dd>{transaction.transferAccount}</dd>
            </div>
          )}
          <div>
            <dt>Payment method</dt>
            <dd>{transaction.paymentMethod}</dd>
          </div>
          <div>
            <dt>Notes</dt>
            <dd>{transaction.notes || 'No notes added'}</dd>
          </div>
          {transaction.receipt && (
            <div>
              <dt>Receipt</dt>
              <dd>
                {receiptUrl ? (
                  <a
                    className="receipt-detail-link"
                    href={receiptUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Paperclip aria-hidden="true" size={15} />
                    {transaction.receipt.name}
                  </a>
                ) : (
                  <span role={receiptError ? 'alert' : 'status'}>
                    {receiptError || 'Preparing secure receipt link...'}
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>
        <footer className="transaction-details-footer">
          <button className="secondary-button" onClick={onClose} type="button">
            Close
          </button>
          <button className="primary-button" onClick={onEdit} type="button">
            Edit transaction
          </button>
        </footer>
      </div>
    </TransactionModal>
  )
}

export default TransactionDetailsModal
