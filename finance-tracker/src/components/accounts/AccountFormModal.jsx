import { useState } from 'react'
import { useCurrency } from '../../context/useCurrency.js'
import TransactionModal from '../transactions/TransactionModal.jsx'

const accountTypes = [
  { value: 'cash', label: 'Cash wallet' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'bank', label: 'Bank account' },
  { value: 'savings', label: 'Savings account' },
  { value: 'other', label: 'Other' },
]

function AccountFormModal({ account, onClose, onSave }) {
  const {
    convertCurrency,
    currency,
    currencyOptions,
    formatInputAmount,
    fractionDigits,
  } = useCurrency()
  const [initialBalance] = useState(() =>
    account ? formatInputAmount(account.openingBalance) : '',
  )
  const [name, setName] = useState(account?.name || '')
  const [accountType, setAccountType] = useState(account?.accountType || 'cash')
  const [openingBalance, setOpeningBalance] = useState(initialBalance)
  const [accountCurrency, setAccountCurrency] = useState(account?.currency || currency)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const enteredBalance = Number(openingBalance || 0)
    if (!name.trim()) {
      setError('Enter an account name.')
      return
    }
    if (!Number.isFinite(enteredBalance) || enteredBalance < 0) {
      setError('Enter a valid opening balance.')
      return
    }

    const openingBalanceInBase = convertCurrency(
      enteredBalance,
      accountCurrency,
      'KES',
    )
    if (openingBalanceInBase === null) {
      setError('Exchange rates are unavailable. Try again after rates load.')
      return
    }

    setIsSaving(true)
    try {
      const saved = await onSave({
        name: name.trim(),
        accountType,
        openingBalance: openingBalanceInBase,
        currency: accountCurrency,
      })
      if (saved === true) onClose()
      else if (typeof saved === 'string') setError(saved)
    } catch (saveError) {
      console.error('Unable to save the account form.', saveError)
      setError('The account could not be saved. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TransactionModal onClose={onClose} title={account ? 'Edit account' : 'Add account'}>
      <form className="transaction-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="form-field form-field-wide">
            <span>Account name <i>*</i></span>
            <input
              autoComplete="off"
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. M-Pesa Wallet, Main bank"
              required
              value={name}
            />
          </label>
          <label className="form-field">
            <span>Account type <i>*</i></span>
            <select
              onChange={(event) => setAccountType(event.target.value)}
              value={accountType}
            >
              {accountTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Account currency <i>*</i></span>
            <select
              onChange={(event) => setAccountCurrency(event.target.value)}
              value={accountCurrency}
            >
              {currencyOptions
                .filter((option) => option.available)
                .map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} — {option.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="form-field">
            <span>Opening balance ({accountCurrency})</span>
            <div className="amount-input-wrap">
              <span>{accountCurrency}</span>
              <input
                min="0"
                onChange={(event) => setOpeningBalance(event.target.value)}
                placeholder="0"
                step={fractionDigits === 0 ? '1' : `0.${'0'.repeat(fractionDigits - 1)}1`}
                type="number"
                value={openingBalance}
              />
            </div>
          </label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <footer className="transaction-form-footer">
          <button
            className="secondary-button"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : account ? 'Save changes' : 'Add account'}
          </button>
        </footer>
      </form>
    </TransactionModal>
  )
}

export default AccountFormModal
