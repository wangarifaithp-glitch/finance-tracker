import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/useAuth.js'
import { useCurrency } from '../context/useCurrency.js'
import {
  deleteBudget,
  getBudgets,
  getCategories,
  saveBudget,
} from '../data/budgetRepository.js'
import './BudgetsPage.css'

function currentPeriodMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function BudgetsPage() {
  const { user } = useAuth()
  const { formatAmount } = useCurrency()
  const [periodMonth, setPeriodMonth] = useState(currentPeriodMonth())
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [warningPercentage, setWarningPercentage] = useState(85)

  async function load() {
    const controller = new AbortController()
    setLoadError('')
    try {
      const [budgetRows, categoryRows] = await Promise.all([
        getBudgets(user?.id, periodMonth, controller.signal),
        getCategories(user?.id, controller.signal),
      ])
      setBudgets(budgetRows)
      setCategories(categoryRows)
    } catch (error) {
      console.error('Unable to load budgets.', error)
      setLoadError('Budgets could not be loaded. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    async function loadForPeriod() {
      try {
        const [budgetRows, categoryRows] = await Promise.all([
          getBudgets(user?.id, periodMonth, controller.signal),
          getCategories(user?.id, controller.signal),
        ])
        if (active) {
          setBudgets(budgetRows)
          setCategories(categoryRows)
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load budgets.', error)
        setLoadError('Budgets could not be loaded. Please try again.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadForPeriod()
    return () => {
      active = false
      controller.abort()
    }
  }, [periodMonth, user?.id])

  function openCreate() {
    setEditing(null)
    setName('')
    setAmount('')
    setCategoryId('')
    setWarningPercentage(85)
    setFormOpen(true)
  }

  function openEdit(budget) {
    setEditing(budget)
    setName(budget.name)
    setAmount(String(budget.amount))
    setCategoryId(budget.categoryId || '')
    setWarningPercentage(budget.warningPercentage)
    setFormOpen(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!name.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setLoadError('Enter a budget name and an amount greater than zero.')
      return
    }
    try {
      await saveBudget(
        {
          name: name.trim(),
          amount: Math.round(numericAmount * 100) / 100,
          periodMonth,
          warningPercentage: Number(warningPercentage),
          categoryId,
        },
        user?.id,
        editing,
      )
      setFormOpen(false)
      setEditing(null)
      setNotice(editing ? 'Budget updated.' : 'Budget created.')
      await load()
    } catch (error) {
      console.error('Unable to save budget.', error)
      setLoadError('The budget could not be saved. Please try again.')
    }
  }

  async function handleDelete(budget) {
    try {
      await deleteBudget(budget, user?.id)
      setNotice(`"${budget.name}" was deleted.`)
      await load()
    } catch (error) {
      console.error('Unable to delete budget.', error)
      setLoadError('The budget could not be deleted. Please try again.')
    }
  }

  return (
    <section aria-labelledby="budgets-title" className="budgets-page">
      <header className="budgets-heading">
        <div>
          <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
          <h1 id="budgets-title">Budgets</h1>
          <p className="section-description">Plan limits and stay ahead of monthly spending.</p>
        </div>
        <button className="budget-create-button" onClick={openCreate} type="button">
          <Plus aria-hidden="true" size={16} />Add budget
        </button>
      </header>

      <label className="budget-period-field">
        <span>Budget month</span>
        <input
          onChange={(event) => {
            setIsLoading(true)
            setPeriodMonth(`${event.target.value}-01`)
          }}
          type="month"
          value={periodMonth.slice(0, 7)}
        />
      </label>

      {loadError && <p className="budget-alert" role="alert">{loadError}</p>}
      {notice && <p className="budget-notice" role="status">{notice}</p>}

      {isLoading ? (
        <p className="budget-status" role="status">Loading budgets...</p>
      ) : budgets.length ? (
        <div className="budget-grid">
          {budgets.map((budget) => {
            const percentage = Math.min(100, Math.round((budget.spent / budget.amount) * 100))
            const exceeded = budget.spent > budget.amount
            const warning = percentage >= budget.warningPercentage
            return (
              <article className={`budget-card${exceeded ? ' exceeded' : warning ? ' warning' : ''}`} key={budget.id}>
                <header>
                  <div>
                    <h2>{budget.name}</h2>
                    <p>{exceeded ? 'Budget exceeded' : warning ? 'Approaching the limit' : 'Within budget'}</p>
                  </div>
                  <button aria-label={`Delete ${budget.name}`} className="budget-delete" onClick={() => handleDelete(budget)} type="button">
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </header>
                <div className="budget-amount-row">
                  <strong>{formatAmount(budget.spent)}</strong>
                  <span>of {formatAmount(budget.amount)}</span>
                </div>
                <div aria-label={`${percentage}% used`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={percentage} className="budget-progress" role="progressbar">
                  <span style={{ width: `${percentage}%` }} />
                </div>
                <footer>
                  {(exceeded || warning) && <AlertTriangle aria-hidden="true" size={15} />}
                  <span>{exceeded ? formatAmount(budget.spent - budget.amount) + ' over limit' : formatAmount(Math.max(0, budget.amount - budget.spent)) + ' remaining'}</span>
                  <button onClick={() => openEdit(budget)} type="button">Edit</button>
                </footer>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="budget-empty">
          <h2>No budgets for this month</h2>
          <p>Create a budget to start tracking monthly limits.</p>
        </div>
      )}

      {formOpen && (
        <div className="budget-modal-backdrop" role="presentation">
          <form aria-labelledby="budget-form-title" className="budget-modal" onSubmit={handleSubmit}>
            <h2 id="budget-form-title">{editing ? 'Edit budget' : 'Create budget'}</h2>
            <label><span>Name</span><input maxLength={100} onChange={(event) => setName(event.target.value)} required value={name} /></label>
            <label><span>Amount (KES)</span><input min="0.01" step="0.01" onChange={(event) => setAmount(event.target.value)} required type="number" value={amount} /></label>
            <label>
              <span>Category</span>
              <select onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
                <option value="">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label><span>Warning at (%)</span><input max="100" min="1" onChange={(event) => setWarningPercentage(event.target.value)} type="number" value={warningPercentage} /></label>
            <div className="budget-modal-actions">
              <button className="budget-cancel" onClick={() => setFormOpen(false)} type="button">Cancel</button>
              <button className="budget-save" type="submit">{editing ? 'Save changes' : 'Create budget'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

export default BudgetsPage
