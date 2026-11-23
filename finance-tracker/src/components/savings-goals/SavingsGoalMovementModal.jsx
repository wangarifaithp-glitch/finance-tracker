import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { useCurrency } from '../../context/useCurrency.js'
import TransactionModal from '../transactions/TransactionModal.jsx'

function SavingsGoalMovementModal({ goal, movement, onClose, onSave }) {
  const { convertToBase, currency, formatAmount, fractionDigits } = useCurrency()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const isWithdrawal = movement === 'withdrawal'
  const step = fractionDigits === 0 ? '1' : `0.${'0'.repeat(fractionDigits - 1)}1`

  async function handleSubmit(event) {
    event.preventDefault()
    const enteredAmount = Number(amount)
    if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) {
      setFormError('Enter an amount greater than zero.')
      return
    }

    const amountInBase = convertToBase(enteredAmount)
    if (amountInBase === null) {
      setFormError('Exchange rates are unavailable. Try again after rates load.')
      return
    }
    if (isWithdrawal && amountInBase > goal.savedAmount) {
      setFormError(`You can withdraw up to ${formatAmount(goal.savedAmount)}.`)
      return
    }

    setIsSaving(true)
    setFormError('')
    try {
      const saved = await onSave(goal, movement, amountInBase, note.trim())
      if (saved === true) onClose()
      else if (typeof saved === 'string') setFormError(saved)
    } catch (error) {
      console.error('Unable to update savings goal balance.', error)
      setFormError('The savings goal could not be updated. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TransactionModal
      onClose={onClose}
      title={isWithdrawal ? 'Withdraw from your goal' : 'Add to your goal'}
    >
      <form className="transaction-form savings-goal-form" onSubmit={handleSubmit}>
        <div className="goal-movement-intro">
          <span className={isWithdrawal ? 'movement-withdrawal' : 'movement-contribution'}>
            {isWithdrawal ? (
              <ArrowUpFromLine aria-hidden="true" size={20} />
            ) : (
              <ArrowDownToLine aria-hidden="true" size={20} />
            )}
          </span>
          <div>
            <strong>{goal.title}</strong>
            <p>Saved so far: {formatAmount(goal.savedAmount)}</p>
          </div>
        </div>

        <label className="form-field">
          <span>Amount ({currency}) <i>*</i></span>
          <div className="amount-input-wrap">
            <span>{currency}</span>
            <input
              autoFocus
              min={step}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              required
              step={step}
              type="number"
              value={amount}
            />
          </div>
        </label>
        <label className="form-field goal-note-field">
          <span>Note <small>(optional)</small></span>
          <textarea
            maxLength={300}
            onChange={(event) => setNote(event.target.value)}
            placeholder={isWithdrawal ? 'What is this withdrawal for?' : 'Add a little context'}
            rows="3"
            value={note}
          />
        </label>

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <footer className="transaction-form-footer">
          <button className="secondary-button" disabled={isSaving} onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving
              ? 'Saving...'
              : isWithdrawal
                ? 'Confirm withdrawal'
                : 'Add contribution'}
          </button>
        </footer>
      </form>
    </TransactionModal>
  )
}

export default SavingsGoalMovementModal
