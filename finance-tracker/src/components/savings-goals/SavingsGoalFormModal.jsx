import { useState } from 'react'
import { savingsGoalCategories, savingsGoalColors, savingsGoalIcons } from '../../data/savingsGoalData.js'
import { useCurrency } from '../../context/useCurrency.js'
import TransactionModal from '../transactions/TransactionModal.jsx'

function SavingsGoalFormModal({ goal, onClose, onSave }) {
  const { convertToBase, currency, formatInputAmount, fractionDigits } = useCurrency()
  const [initialTarget] = useState(() =>
    goal ? formatInputAmount(goal.targetAmount) : '',
  )
  const [form, setForm] = useState(() => ({
    title: goal?.title || '',
    target: initialTarget,
    category: goal?.category || 'Personal',
    deadline: goal?.deadline || '',
    icon: goal?.icon || 'target',
    color: goal?.color || 'lavender',
  }))
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const categories = Array.from(
    new Set([...savingsGoalCategories, ...(goal ? [goal.category] : [])]),
  )
  const step = fractionDigits === 0 ? '1' : `0.${'0'.repeat(fractionDigits - 1)}1`

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const target = Number(form.target)
    if (!form.title.trim()) {
      setFormError('Give your goal a name.')
      return
    }
    if (!Number.isFinite(target) || target <= 0) {
      setFormError('Enter a target amount greater than zero.')
      return
    }

    const targetAmount =
      goal && form.target === initialTarget ? goal.targetAmount : convertToBase(target)
    if (targetAmount === null) {
      setFormError('Exchange rates are unavailable. Try again after rates load.')
      return
    }

    setIsSaving(true)
    setFormError('')
    try {
      const saved = await onSave({
        id: goal?.id,
        title: form.title.trim(),
        targetAmount,
        category: form.category,
        deadline: form.deadline,
        icon: form.icon,
        color: form.color,
      })
      if (saved === true) onClose()
      else if (typeof saved === 'string') setFormError(saved)
    } catch (error) {
      console.error('Unable to save the savings goal form.', error)
      setFormError('The goal could not be saved. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TransactionModal
      onClose={onClose}
      size="large"
      title={goal ? 'Edit your goal' : 'Create a savings goal'}
    >
      <form className="transaction-form savings-goal-form" onSubmit={handleSubmit}>
        <p className="goal-form-intro">
          Every big milestone starts with a small, thoughtful step.
        </p>
        <div className="form-grid">
          <label className="form-field form-field-wide">
            <span>Goal name <i>*</i></span>
            <input
              autoComplete="off"
              maxLength={80}
              name="title"
              onChange={updateField}
              placeholder="e.g. Emergency fund or a new phone"
              required
              value={form.title}
            />
          </label>
          <label className="form-field">
            <span>Target amount ({currency}) <i>*</i></span>
            <div className="amount-input-wrap">
              <span>{currency}</span>
              <input
                min={step}
                name="target"
                onChange={updateField}
                placeholder="0"
                required
                step={step}
                type="number"
                value={form.target}
              />
            </div>
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
            <span>Deadline</span>
            <input
              name="deadline"
              onChange={updateField}
              type="date"
              value={form.deadline}
            />
          </label>
          <label className="form-field">
            <span>Goal icon</span>
            <select name="icon" onChange={updateField} value={form.icon}>
              {savingsGoalIcons.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="form-field form-field-wide goal-color-field">
            <legend>Choose an accent</legend>
            <div className="goal-color-options">
              {savingsGoalColors.map((color) => (
                <button
                  aria-label={`${color} accent`}
                  aria-pressed={form.color === color}
                  className={`goal-color-option goal-color-${color}${
                    form.color === color ? ' selected' : ''
                  }`}
                  key={color}
                  onClick={() => setForm((current) => ({ ...current, color }))}
                  type="button"
                >
                  <span className="visually-hidden">{color}</span>
                </button>
              ))}
            </div>
          </fieldset>
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
            {isSaving ? 'Saving...' : goal ? 'Save changes' : 'Create goal'}
          </button>
        </footer>
      </form>
    </TransactionModal>
  )
}

export default SavingsGoalFormModal
