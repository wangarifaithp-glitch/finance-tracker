import { useEffect, useState } from 'react'
import { ArrowRight, Plus, Sparkles, Target, X } from 'lucide-react'
import SavingsGoalCard from '../components/savings-goals/SavingsGoalCard.jsx'
import DeleteSavingsGoalModal from '../components/savings-goals/DeleteSavingsGoalModal.jsx'
import SavingsGoalFormModal from '../components/savings-goals/SavingsGoalFormModal.jsx'
import SavingsGoalHistoryModal from '../components/savings-goals/SavingsGoalHistoryModal.jsx'
import SavingsGoalMovementModal from '../components/savings-goals/SavingsGoalMovementModal.jsx'
import SavingsGoalsSummary from '../components/savings-goals/SavingsGoalsSummary.jsx'
import { useAuth } from '../context/useAuth.js'
import {
  deleteSavingsGoal,
  getSavingsGoals,
  recordSavingsGoalMovement,
  saveSavingsGoal,
} from '../data/savingsGoalRepository.js'
import './SavingsGoalsPage.css'

function SavingsGoalsPage() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingGoal, setEditingGoal] = useState(null)
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false)
  const [goalToMove, setGoalToMove] = useState(null)
  const [movementType, setMovementType] = useState('contribution')
  const [goalToDelete, setGoalToDelete] = useState(null)
  const [goalToViewHistory, setGoalToViewHistory] = useState(null)
  const [notice, setNotice] = useState('')
  const [celebration, setCelebration] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadGoals() {
      setIsLoading(true)
      setLoadError('')
      try {
        const result = await getSavingsGoals(user?.id, controller.signal)
        if (active) setGoals(result)
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load Finance Tracker savings goals.', error)
        setLoadError('Your savings goals could not be loaded. Please try again.')
      } finally {
        if (active && !controller.signal.aborted) setIsLoading(false)
      }
    }

    loadGoals()
    return () => {
      active = false
      controller.abort()
    }
  }, [refreshKey, user?.id])

  function openCreateGoal() {
    setEditingGoal(null)
    setIsGoalFormOpen(true)
    setNotice('')
    setCelebration('')
  }

  function openEditGoal(goal) {
    setEditingGoal(goal)
    setIsGoalFormOpen(true)
    setNotice('')
    setCelebration('')
  }

  function openMovement(goal, movement) {
    setGoalToMove(goal)
    setMovementType(movement)
    setNotice('')
  }

  async function handleSaveGoal(goal) {
    try {
      const savedGoal = await saveSavingsGoal(goal, user?.id, editingGoal)
      const completedNow =
        editingGoal &&
        editingGoal.savedAmount < editingGoal.targetAmount &&
        savedGoal.savedAmount >= savedGoal.targetAmount

      setIsGoalFormOpen(false)
      setEditingGoal(null)
      setRefreshKey((current) => current + 1)
      setNotice(editingGoal ? 'Your goal was updated.' : 'Your new goal is ready.')
      if (completedNow) setCelebration(savedGoal.title)
      return true
    } catch (error) {
      console.error('Unable to save Finance Tracker savings goal.', error)
      return error?.message || 'The goal could not be saved. Please try again.'
    }
  }

  async function handleMovement(goal, movement, amount, note) {
    try {
      const result = await recordSavingsGoalMovement(
        goal,
        user?.id,
        movement,
        amount,
        note,
      )
      setGoalToMove(null)
      setRefreshKey((current) => current + 1)
      setNotice(
        movement === 'contribution'
          ? 'Your contribution was added.'
          : 'Your withdrawal was recorded.',
      )
      if (result.completedNow) setCelebration(goal.title)
      return true
    } catch (error) {
      console.error('Unable to record savings goal movement.', error)
      return error?.message || 'The goal balance could not be updated. Please try again.'
    }
  }

  async function handleDeleteGoal(goal) {
    try {
      await deleteSavingsGoal(goal, user?.id)
      setGoalToDelete(null)
      setRefreshKey((current) => current + 1)
      setNotice(`“${goal.title}” and its activity were deleted.`)
      return true
    } catch (error) {
      console.error('Unable to delete Finance Tracker savings goal.', error)
      setLoadError('The goal could not be deleted. Please try again.')
      return error?.message || 'The goal could not be deleted. Please try again.'
    }
  }

  return (
    <div className="savings-goals-page">
      <header className="savings-goals-heading">
        <div>
          <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
          <h1>Dreams in progress</h1>
          <p>Every little deposit brings something wonderful closer.</p>
        </div>
        <button className="primary-button savings-create-button" onClick={openCreateGoal} type="button">
          <Plus aria-hidden="true" size={17} />
          Create a goal
        </button>
      </header>

      <section className="savings-goals-hero">
        <div className="savings-hero-copy">
          <span className="savings-hero-kicker">
            <Sparkles aria-hidden="true" size={15} />
            A little at a time
          </span>
          <h2>Make room for what matters.</h2>
          <p>
            Choose something you are looking forward to, set a target, and watch
            your steady progress add up.
          </p>
        </div>
        <div aria-hidden="true" className="savings-hero-art">
          <span className="hero-art-orbit orbit-one" />
          <span className="hero-art-orbit orbit-two" />
          <span className="hero-art-coin coin-one">KSh</span>
          <span className="hero-art-coin coin-two">✦</span>
          <span className="hero-art-target"><Target size={42} strokeWidth={1.5} /></span>
        </div>
      </section>

      {loadError && (
        <p className="transaction-alert" role="alert">
          {loadError}
        </p>
      )}
      {notice && (
        <p aria-live="polite" className="transaction-notice" role="status">
          {notice}
        </p>
      )}
      {celebration && (
        <div aria-live="polite" className="goal-celebration" role="status">
          <Sparkles aria-hidden="true" size={20} />
          <p>
            <strong>You did it!</strong> “{celebration}” reached its savings
            target. Celebrate this lovely milestone!
          </p>
          <button
            aria-label="Dismiss celebration"
            onClick={() => setCelebration('')}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>
      )}

      <SavingsGoalsSummary goals={goals} />

      <section aria-labelledby="savings-list-title" className="savings-goal-list-section">
        <div className="savings-goal-list-heading">
          <div>
            <p className="eyebrow">YOUR NEXT CHAPTER</p>
            <h2 id="savings-list-title">Savings goals</h2>
          </div>
          {goals.length > 0 && (
            <span className="savings-goal-count">
              {goals.length} goal{goals.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {isLoading && goals.length === 0 ? (
          <div className="savings-goals-state" role="status">
            Gathering your goals...
          </div>
        ) : loadError && goals.length === 0 ? (
          <div className="savings-goals-state">
            <h3>Goals are unavailable right now</h3>
            <p>Check your connection, then try again.</p>
            <button
              className="secondary-button"
              onClick={() => setRefreshKey((current) => current + 1)}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : goals.length === 0 ? (
          <div className="savings-goals-state savings-goals-empty">
            <span className="savings-empty-icon">
              <Target aria-hidden="true" size={25} />
            </span>
            <h3>Your next big thing starts here.</h3>
            <p>Create a goal and give your plans a place to grow.</p>
            <button className="primary-button" onClick={openCreateGoal} type="button">
              <Plus aria-hidden="true" size={16} />
              Create your first goal
              <ArrowRight aria-hidden="true" size={15} />
            </button>
          </div>
        ) : (
          <div className="savings-goals-grid">
            {goals.map((goal) => (
              <SavingsGoalCard
                goal={goal}
                key={goal.id}
                onAddMoney={openMovement}
                onDelete={setGoalToDelete}
                onEdit={openEditGoal}
                onViewHistory={setGoalToViewHistory}
              />
            ))}
          </div>
        )}
      </section>

      {isGoalFormOpen && (
        <SavingsGoalFormModal
          goal={editingGoal}
          onClose={() => setIsGoalFormOpen(false)}
          onSave={handleSaveGoal}
        />
      )}
      {goalToMove && (
        <SavingsGoalMovementModal
          goal={goalToMove}
          key={`${goalToMove.id}-${movementType}`}
          movement={movementType}
          onClose={() => setGoalToMove(null)}
          onSave={handleMovement}
        />
      )}
      {goalToDelete && (
        <DeleteSavingsGoalModal
          goal={goalToDelete}
          onClose={() => setGoalToDelete(null)}
          onConfirm={handleDeleteGoal}
        />
      )}
      {goalToViewHistory && (
        <SavingsGoalHistoryModal
          goal={goalToViewHistory}
          key={goalToViewHistory.id}
          onClose={() => setGoalToViewHistory(null)}
        />
      )}
    </div>
  )
}

export default SavingsGoalsPage
