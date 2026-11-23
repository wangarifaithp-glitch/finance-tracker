import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, History } from 'lucide-react'
import { useAuth } from '../../context/useAuth.js'
import { useCurrency } from '../../context/useCurrency.js'
import { getSavingsGoalHistory } from '../../data/savingsGoalRepository.js'
import TransactionModal from '../transactions/TransactionModal.jsx'

const pageSize = 20

function SavingsGoalHistoryModal({ goal, onClose }) {
  const { user } = useAuth()
  const { formatAmount } = useCurrency()
  const [entries, setEntries] = useState([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadHistory() {
      setIsLoading(true)
      setErrorMessage('')
      try {
        const result = await getSavingsGoalHistory(goal, user?.id, page, controller.signal)
        if (!active) return
        setEntries(result.entries)
        setTotalCount(result.totalCount)
        setHasNext(result.hasNext)
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load savings goal history.', error)
        setErrorMessage('Contribution history could not be loaded.')
      } finally {
        if (active && !controller.signal.aborted) setIsLoading(false)
      }
    }

    loadHistory()
    return () => {
      active = false
      controller.abort()
    }
  }, [goal, page, retryKey, user?.id])

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <TransactionModal onClose={onClose} title="Goal activity">
      <div className="goal-history-modal">
        <div className="goal-history-heading">
          <span>
            <History aria-hidden="true" size={18} />
          </span>
          <div>
            <strong>{goal.title}</strong>
            <p>Every step you have taken toward this goal.</p>
          </div>
        </div>

        {errorMessage ? (
          <div className="goal-history-state">
            <p role="alert">{errorMessage}</p>
            <button
              className="secondary-button"
              onClick={() => setRetryKey((current) => current + 1)}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <p className="goal-history-state" role="status">Loading activity...</p>
        ) : entries.length === 0 ? (
          <div className="goal-history-state">
            <p>No contributions yet. Your first step can start today.</p>
          </div>
        ) : (
          <ul className="goal-history-list">
            {entries.map((entry) => {
              const isContribution = entry.movement === 'contribution'
              return (
                <li key={entry.id}>
                  <span
                    className={`goal-history-icon${
                      isContribution ? ' is-contribution' : ' is-withdrawal'
                    }`}
                  >
                    {isContribution ? (
                      <ArrowDownLeft aria-hidden="true" size={17} />
                    ) : (
                      <ArrowUpRight aria-hidden="true" size={17} />
                    )}
                  </span>
                  <div className="goal-history-entry">
                    <strong>
                      {isContribution ? 'Added money' : 'Withdrew money'}
                    </strong>
                    <span>
                      {format(new Date(entry.createdAt), 'MMM d, yyyy · h:mm a')}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </span>
                  </div>
                  <strong className={isContribution ? 'history-positive' : 'history-negative'}>
                    {isContribution ? '+' : '−'}{formatAmount(entry.amount)}
                  </strong>
                </li>
              )
            })}
          </ul>
        )}

        {!errorMessage && entries.length > 0 && (
          <footer className="goal-history-pagination">
            <span>
              Page {page} of {pageCount}
            </span>
            <div>
              <button
                className="secondary-button"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Previous
              </button>
              <button
                className="secondary-button"
                disabled={!hasNext || isLoading}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </footer>
        )}
      </div>
    </TransactionModal>
  )
}

export default SavingsGoalHistoryModal
