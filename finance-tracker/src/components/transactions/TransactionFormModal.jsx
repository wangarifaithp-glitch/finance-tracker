import { useState } from 'react'
import { Paperclip, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import {
  paymentMethods,
  TODAY,
  transactionCategories,
} from '../../data/transactionData.js'
import { useCurrency } from '../../context/useCurrency.js'
import TransactionModal from './TransactionModal.jsx'

function TransactionFormModal({ accounts, onClose, onSave, transaction }) {
  const {
    convertCurrency,
    getConversionRate,
    currency,
    currencyOptions,
    formatInputAmount,
    fractionDigits,
  } = useCurrency()
  const [initialAmount] = useState(() =>
    transaction ? formatInputAmount(transaction.amount) : '',
  )
  const initialAccount =
    accounts.find((account) => account.id === transaction?.accountId) ||
    accounts.find((account) => account.name === transaction?.account) ||
    accounts[0]
  const initialTransferAccount =
    accounts.find((account) => account.id === transaction?.transferAccountId) ||
    accounts.find((account) => account.name === transaction?.transferAccount)
  const [form, setForm] = useState(() => ({
    title: transaction?.title || '',
    amount: initialAmount,
    originalCurrency: transaction?.originalCurrency || initialAccount?.currency || currency,
    type: transaction?.type || 'expense',
    category: transaction?.category || transactionCategories.expense[0],
    date: transaction?.date || format(TODAY, 'yyyy-MM-dd'),
    account: initialAccount?.name || transaction?.account || '',
    accountId: transaction?.accountId || initialAccount?.id || '',
    transferAccount: initialTransferAccount?.name || transaction?.transferAccount || '',
    transferAccountId:
      initialTransferAccount?.id || transaction?.transferAccountId || '',
    paymentMethod: transaction?.paymentMethod || paymentMethods[0],
    notes: transaction?.notes || '',
    receipt: transaction?.receipt || null,
  }))
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const categories = transactionCategories[form.type]

  function updateField(event) {
    const { name, value } = event.target

    if (name === 'type') {
      setForm((current) => ({
        ...current,
        type: value,
        category: transactionCategories[value][0],
        transferAccount:
          value === 'transfer' ? current.transferAccount : '',
        transferAccountId: value === 'transfer' ? current.transferAccountId : '',
      }))
      return
    }

    if (name === 'accountId') {
      const selectedAccount = accounts.find((account) => account.id === value)
      setForm((current) => ({
        ...current,
        accountId: value,
        account: selectedAccount?.name || '',
        originalCurrency: selectedAccount?.currency || current.originalCurrency,
        ...(current.transferAccountId === value
          ? { transferAccountId: '', transferAccount: '' }
          : {}),
      }))
      return
    }

    if (name === 'transferAccountId') {
      const selectedAccount = accounts.find((account) => account.id === value)
      setForm((current) => ({
        ...current,
        transferAccountId: value,
        transferAccount: selectedAccount?.name || '',
      }))
      return
    }

    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleReceiptChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      setFormError('Please choose a receipt smaller than 1 MB.')
      event.target.value = ''
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setFormError('Choose a JPG, PNG, WebP, or PDF receipt.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        receipt: {
          name: file.name,
          type: file.type,
          dataUrl: String(reader.result),
        },
      }))
      setFormError('')
    }
    reader.onerror = () => {
      setFormError('The receipt could not be read. Please try another file.')
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const amount = Number(form.amount)

    if (!form.title.trim()) {
      setFormError('Enter a transaction title.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter an amount greater than zero.')
      return
    }
    if (!form.date || !form.category || !form.account || !form.paymentMethod) {
      setFormError('Complete all required transaction details.')
      return
    }
    if (!form.accountId) {
      setFormError('Choose an account from your Accounts page before adding transactions.')
      return
    }
    if (form.type === 'transfer' && (!form.transferAccountId || form.accountId === form.transferAccountId)) {
      setFormError('Choose a different destination account for this transfer.')
      return
    }

    const amountInBase =
      transaction &&
      form.amount === initialAmount &&
      (transaction.originalCurrency || 'KES') === form.originalCurrency
        ? transaction.amount
        : convertCurrency(amount, form.originalCurrency, 'KES')
    if (amountInBase === null) {
      setFormError('Exchange rates are unavailable. Try again after rates load.')
      return
    }

    setIsSaving(true)
    try {
      const conversionRate =
        form.originalCurrency === 'KES'
          ? 1
          : getConversionRate(form.originalCurrency, 'KES')
      const saved = await onSave({
        ...form,
        id: transaction?.id,
        title: form.title.trim(),
        amount: amountInBase,
        originalAmount: amount,
        originalCurrency: form.originalCurrency,
        reportingCurrency: currency,
        conversionDate: form.date,
        conversionRate,
        notes: form.notes.trim(),
      })

      if (saved === true) onClose()
      else if (typeof saved === 'string') setFormError(saved)
    } catch (error) {
      console.error('Unable to save the transaction form.', error)
      setFormError('The transaction could not be saved. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TransactionModal
      onClose={onClose}
      size="large"
      title={transaction ? 'Edit transaction' : 'Add transaction'}
    >
      <form className="transaction-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="form-field form-field-wide">
            <span>Transaction title <i>*</i></span>
            <input
              autoComplete="off"
              maxLength={80}
              name="title"
              onChange={updateField}
              placeholder="e.g. Groceries, salary, rent"
              required
              value={form.title}
            />
          </label>
          <label className="form-field">
            <span>Original amount <i>*</i></span>
            <div className="amount-input-wrap">
              <span>{form.originalCurrency}</span>
              <input
                min={fractionDigits === 0 ? '1' : `0.${'0'.repeat(fractionDigits - 1)}1`}
                name="amount"
                onChange={updateField}
                placeholder="0"
                required
                step={fractionDigits === 0 ? '1' : `0.${'0'.repeat(fractionDigits - 1)}1`}
                type="number"
                value={form.amount}
              />
            </div>
          </label>
          <label className="form-field">
            <span>Original currency <i>*</i></span>
            <select
              name="originalCurrency"
              onChange={updateField}
              value={form.originalCurrency}
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
            <span>Transaction type <i>*</i></span>
            <select name="type" onChange={updateField} value={form.type}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </label>
          <label className="form-field">
            <span>Category <i>*</i></span>
            <select name="category" onChange={updateField} value={form.category}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Date <i>*</i></span>
            <input
              max="9999-12-31"
              name="date"
              onChange={updateField}
              required
              type="date"
              value={form.date}
            />
          </label>
          <label className="form-field">
            <span>Account <i>*</i></span>
            <select
              disabled={accounts.length === 0}
              name="accountId"
              onChange={updateField}
              required
              value={form.accountId}
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          {form.type === 'transfer' && (
            <label className="form-field">
              <span>Destination account <i>*</i></span>
              <select
                name="transferAccountId"
                onChange={updateField}
                required
                value={form.transferAccountId}
              >
                <option value="">Select destination</option>
                {accounts
                  .filter((account) => account.id !== form.accountId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label className="form-field">
            <span>Payment method <i>*</i></span>
            <select
              name="paymentMethod"
              onChange={updateField}
              value={form.paymentMethod}
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field form-field-wide">
            <span>Notes</span>
            <textarea
              maxLength={500}
              name="notes"
              onChange={updateField}
              placeholder="Add a note about this transaction (optional)"
              rows="3"
              value={form.notes}
            />
          </label>
          <div className="form-field form-field-wide">
            <span>Receipt attachment <small>(optional, image or PDF up to 1 MB)</small></span>
            {form.receipt ? (
              <div className="receipt-selection">
                <Paperclip aria-hidden="true" size={16} />
                <span>{form.receipt.name}</span>
                <button
                  aria-label="Remove receipt"
                  className="remove-receipt-button"
                  onClick={() =>
                    setForm((current) => ({ ...current, receipt: null }))
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={15} />
                  Remove
                </button>
              </div>
            ) : (
              <label className="receipt-picker">
                <Paperclip aria-hidden="true" size={16} />
                <span>Choose a receipt</span>
                <input
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleReceiptChange}
                  type="file"
                />
              </label>
            )}
          </div>
        </div>

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
            : transaction
              ? 'Save changes'
              : 'Save transaction'}
          </button>
        </footer>
      </form>
    </TransactionModal>
  )
}

export default TransactionFormModal
