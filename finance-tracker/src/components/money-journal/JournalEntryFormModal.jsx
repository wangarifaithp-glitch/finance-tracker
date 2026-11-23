import { useState } from 'react'
import { format } from 'date-fns'
import { MessageCircleHeart } from 'lucide-react'
import { journalPrompts } from '../../data/moneyJournalData.js'
import { TODAY } from '../../data/transactionData.js'
import TransactionModal from '../transactions/TransactionModal.jsx'

function JournalEntryFormModal({ entry, initialDate, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    title: entry?.title || '',
    entryDate: entry?.entryDate || initialDate || format(TODAY, 'yyyy-MM-dd'),
    reflection: entry?.reflection || '',
    financialWin: entry?.financialWin || '',
    lesson: entry?.lesson || '',
    tags: entry?.tags.join(', ') || '',
  }))
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function addPrompt(prompt) {
    setForm((current) => ({
      ...current,
      reflection: current.reflection.trim()
        ? `${current.reflection.trim()}\n\n${prompt}\n`
        : `${prompt}\n`,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (![form.reflection, form.financialWin, form.lesson].some((value) => value.trim())) {
      setFormError('Add a reflection, a win, or something you learned before saving.')
      return
    }

    const tags = Array.from(
      new Set(
        form.tags
          .split(',')
          .map((tag) => tag.trim().slice(0, 30))
          .filter(Boolean),
      ),
    ).slice(0, 10)
    const title = form.title.trim() || `Money notes · ${format(new Date(`${form.entryDate}T12:00:00`), 'MMM d')}`

    setIsSaving(true)
    setFormError('')
    try {
      const saved = await onSave({
        id: entry?.id,
        title,
        entryDate: form.entryDate,
        reflection: form.reflection.trim(),
        financialWin: form.financialWin.trim(),
        lesson: form.lesson.trim(),
        tags,
      })
      if (saved === true) onClose()
      else if (typeof saved === 'string') setFormError(saved)
    } catch (error) {
      console.error('Unable to save the journal entry form.', error)
      setFormError('Your entry could not be saved. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TransactionModal
      onClose={onClose}
      size="large"
      title={entry ? 'Return to this reflection' : 'A moment with your money'}
    >
      <form className="transaction-form journal-entry-form" onSubmit={handleSubmit}>
        <p className="journal-form-intro">
          There is no right answer. Take a breath and write what feels true for you.
        </p>
        <div className="form-grid">
          <label className="form-field">
            <span>Date <i>*</i></span>
            <input
              max={format(TODAY, 'yyyy-MM-dd')}
              name="entryDate"
              onChange={updateField}
              required
              type="date"
              value={form.entryDate}
            />
          </label>
          <label className="form-field">
            <span>Title <small>Optional</small></span>
            <input
              maxLength={100}
              name="title"
              onChange={updateField}
              placeholder="A small win, a new insight..."
              value={form.title}
            />
          </label>
          <fieldset className="journal-prompts form-field form-field-wide">
            <legend><MessageCircleHeart aria-hidden="true" size={15} /> A gentle prompt, if helpful</legend>
            <div className="journal-prompt-list">
              {journalPrompts.map((prompt) => (
                <button key={prompt} onClick={() => addPrompt(prompt)} type="button">
                  {prompt}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="form-field form-field-wide">
            <span>My reflection</span>
            <textarea
              maxLength={12000}
              name="reflection"
              onChange={updateField}
              placeholder="What has been on your mind about money?"
              rows={5}
              value={form.reflection}
            />
          </label>
          <label className="form-field form-field-wide">
            <span>A financial win</span>
            <textarea
              maxLength={2000}
              name="financialWin"
              onChange={updateField}
              placeholder="Notice something you did well, no matter how small."
              rows={2}
              value={form.financialWin}
            />
          </label>
          <label className="form-field form-field-wide">
            <span>Something I learned</span>
            <textarea
              maxLength={2000}
              name="lesson"
              onChange={updateField}
              placeholder="What might you carry into tomorrow?"
              rows={2}
              value={form.lesson}
            />
          </label>
          <label className="form-field form-field-wide">
            <span>Tags <small>Separate with commas</small></span>
            <input
              maxLength={300}
              name="tags"
              onChange={updateField}
              placeholder="saving, mindful spending, goals"
              value={form.tags}
            />
          </label>
        </div>

        {formError && <p className="form-error" role="alert">{formError}</p>}
        <footer className="transaction-form-footer">
          <button className="secondary-button" disabled={isSaving} onClick={onClose} type="button">
            Cancel
          </button>
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : entry ? 'Save reflection' : 'Save entry'}
          </button>
        </footer>
      </form>
    </TransactionModal>
  )
}

export default JournalEntryFormModal
