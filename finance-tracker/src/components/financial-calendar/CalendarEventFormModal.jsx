import { useState } from 'react'
import { useCurrency } from '../../context/useCurrency.js'
import {
  financialEventTypes,
  recurrenceOptions,
  reminderOptions,
} from '../../data/financialCalendarData.js'
import TransactionModal from '../transactions/TransactionModal.jsx'

function CalendarEventFormModal({ event, initialDate, onClose, onSave }) {
  const { convertToBase, currency, formatInputAmount, fractionDigits } = useCurrency()
  const [initialAmount] = useState(() =>
    event?.amount === null || event?.amount === undefined
      ? ''
      : formatInputAmount(event.amount),
  )
  const [form, setForm] = useState(() => ({
    title: event?.title || '',
    eventType: event?.eventType || 'bill',
    eventDate: event?.eventDate || initialDate,
    amount: initialAmount,
    recurrence: event?.recurrence || 'none',
    repeatUntil: event?.repeatUntil || '',
    remindBeforeDays:
      event?.remindBeforeDays === null || event?.remindBeforeDays === undefined
        ? ''
        : String(event.remindBeforeDays),
    notes: event?.notes || '',
  }))
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const amountStep = fractionDigits === 0 ? '1' : `0.${'0'.repeat(fractionDigits - 1)}1`

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault()
    if (!form.title.trim()) {
      setFormError('Give this event a name.')
      return
    }
    if (!form.eventDate) {
      setFormError('Choose a date for this event.')
      return
    }
    if (form.recurrence !== 'none' && form.repeatUntil && form.repeatUntil < form.eventDate) {
      setFormError('The repeat-until date must be on or after the event date.')
      return
    }

    let amount = null
    if (form.amount.trim()) {
      const enteredAmount = Number(form.amount)
      if (!Number.isFinite(enteredAmount) || enteredAmount < 0) {
        setFormError('Enter an amount of zero or more.')
        return
      }
      amount =
        event && form.amount === initialAmount
          ? event.amount
          : convertToBase(enteredAmount)
      if (amount === null) {
        setFormError('Exchange rates are unavailable. Try again after rates load.')
        return
      }
    }

    setIsSaving(true)
    setFormError('')
    try {
      const saved = await onSave({
        id: event?.id,
        title: form.title.trim(),
        eventType: form.eventType,
        eventDate: form.eventDate,
        amount,
        recurrence: form.recurrence,
        repeatUntil: form.recurrence === 'none' ? '' : form.repeatUntil,
        remindBeforeDays: form.remindBeforeDays === '' ? null : Number(form.remindBeforeDays),
        notes: form.notes.trim(),
      })
      if (saved === true) onClose()
      else if (typeof saved === 'string') setFormError(saved)
    } catch (error) {
      console.error('Unable to save the financial calendar event form.', error)
      setFormError('Your event could not be saved. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TransactionModal
      onClose={onClose}
      size="large"
      title={event ? 'Edit calendar event' : 'Add a financial event'}
    >
      <form className="transaction-form calendar-event-form" onSubmit={handleSubmit}>
        <p className="calendar-form-intro">
          Keep important money dates and gentle reminders in one place.
        </p>
        <div className="form-grid">
          <label className="form-field form-field-wide">
            <span>Event name <i>*</i></span>
            <input
              autoComplete="off"
              maxLength={100}
              name="title"
              onChange={updateField}
              placeholder="e.g. Electricity bill or payday"
              required
              value={form.title}
            />
          </label>
          <label className="form-field">
            <span>Category <i>*</i></span>
            <select name="eventType" onChange={updateField} value={form.eventType}>
              {financialEventTypes.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Date <i>*</i></span>
            <input
              name="eventDate"
              onChange={(event) => {
                updateField(event)
                setForm((current) => (
                  current.repeatUntil && current.repeatUntil < event.target.value
                    ? { ...current, repeatUntil: '' }
                    : current
                ))
              }}
              required
              type="date"
              value={form.eventDate}
            />
          </label>
          <label className="form-field">
            <span>Amount ({currency}) <small>Optional</small></span>
            <div className="amount-input-wrap">
              <span>{currency}</span>
              <input
                min="0"
                name="amount"
                onChange={updateField}
                placeholder="0"
                step={amountStep}
                type="number"
                value={form.amount}
              />
            </div>
          </label>
          <label className="form-field">
            <span>Repeat</span>
            <select name="recurrence" onChange={updateField} value={form.recurrence}>
              {recurrenceOptions.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          {form.recurrence !== 'none' && (
            <label className="form-field">
              <span>Repeat until <small>Optional</small></span>
              <input
                min={form.eventDate}
                name="repeatUntil"
                onChange={updateField}
                type="date"
                value={form.repeatUntil}
              />
            </label>
          )}
          <label className="form-field">
            <span>Reminder</span>
            <select name="remindBeforeDays" onChange={updateField} value={form.remindBeforeDays}>
              {reminderOptions.map(({ value, label }) => (
                <option key={value || 'none'} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="form-field form-field-wide">
            <span>Notes <small>Optional</small></span>
            <textarea
              maxLength={2000}
              name="notes"
              onChange={updateField}
              placeholder="Add a detail you would like to remember."
              rows={3}
              value={form.notes}
            />
          </label>
        </div>

        {formError && <p className="form-error" role="alert">{formError}</p>}
        <footer className="transaction-form-footer">
          <button className="secondary-button" disabled={isSaving} onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : event ? 'Save changes' : 'Add event'}
          </button>
        </footer>
      </form>
    </TransactionModal>
  )
}

export default CalendarEventFormModal
