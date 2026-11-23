import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  BookHeart,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Feather,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import JournalEntryCard from '../components/money-journal/JournalEntryCard.jsx'
import DeleteJournalEntryModal from '../components/money-journal/DeleteJournalEntryModal.jsx'
import JournalEntryFormModal from '../components/money-journal/JournalEntryFormModal.jsx'
import { useAuth } from '../context/useAuth.js'
import {
  deleteMoneyJournalEntry,
  getMoneyJournalEntries,
  JOURNAL_PAGE_SIZE,
  saveMoneyJournalEntry,
} from '../data/moneyJournalRepository.js'
import { TODAY } from '../data/transactionData.js'
import './MoneyJournalPage.css'

const todayValue = format(TODAY, 'yyyy-MM-dd')
const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function MoneyJournalPage() {
  const { user } = useAuth()
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(TODAY))
  const [entries, setEntries] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [page, setPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [entryToDelete, setEntryToDelete] = useState(null)
  const [expandedEntryId, setExpandedEntryId] = useState(null)
  const [notice, setNotice] = useState('')
  const effectiveFrom = selectedDate || fromDate
  const effectiveTo = selectedDate || toDate
  const isDateRangeValid =
    !effectiveFrom || !effectiveTo || effectiveFrom <= effectiveTo
  const visibleDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(displayMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 1 }),
      }),
    [displayMonth],
  )
  const entryDates = useMemo(
    () => new Set(entries.map((entry) => entry.entryDate)),
    [entries],
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchText.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [searchText])

  useEffect(() => {
    if (!isDateRangeValid) return undefined

    const controller = new AbortController()
    let active = true

    async function loadEntries() {
      setIsLoading(true)
      setLoadError('')
      setEntries([])
      setTotalCount(0)
      setHasNext(false)
      try {
        const result = await getMoneyJournalEntries({
          userId: user?.id,
          search,
          from: effectiveFrom,
          to: effectiveTo,
          page,
          signal: controller.signal,
        })
        if (active) {
          setEntries(result.entries)
          setTotalCount(result.totalCount)
          setHasNext(result.hasNext)
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load Finance Tracker journal entries.', error)
        setLoadError('Your journal could not be loaded. Please try again.')
      } finally {
        if (active && !controller.signal.aborted) setIsLoading(false)
      }
    }

    loadEntries()
    return () => {
      active = false
      controller.abort()
    }
  }, [effectiveFrom, effectiveTo, isDateRangeValid, page, refreshKey, search, user?.id])

  function openCreateEntry() {
    setEditingEntry(null)
    setIsEditorOpen(true)
    setNotice('')
  }

  function openEditEntry(entry) {
    setEditingEntry(entry)
    setIsEditorOpen(true)
    setNotice('')
  }

  function selectCalendarDate(date) {
    if (isAfter(date, TODAY)) return
    const value = format(date, 'yyyy-MM-dd')
    setSelectedDate((current) => (current === value ? '' : value))
    setFromDate('')
    setToDate('')
    setDisplayMonth(startOfMonth(date))
    setPage(1)
    setNotice('')
  }

  function clearDateFilter() {
    setSelectedDate('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  async function handleSaveEntry(entry) {
    try {
      await saveMoneyJournalEntry(entry, user?.id, editingEntry)
      setIsEditorOpen(false)
      setEditingEntry(null)
      setPage(1)
      setRefreshKey((current) => current + 1)
      setNotice(editingEntry ? 'Your reflection has been updated.' : 'Your journal entry is saved.')
      return true
    } catch (error) {
      console.error('Unable to save a Finance Tracker journal entry.', error)
      return error?.message || 'Your entry could not be saved. Please try again.'
    }
  }

  async function handleDeleteEntry(entry) {
    try {
      await deleteMoneyJournalEntry(entry, user?.id)
      setEntryToDelete(null)
      setExpandedEntryId(null)
      if (entries.length === 1 && page > 1) setPage((current) => current - 1)
      else setRefreshKey((current) => current + 1)
      setNotice('Your journal entry has been deleted.')
      return true
    } catch (error) {
      console.error('Unable to delete a Finance Tracker journal entry.', error)
      return error?.message || 'The entry could not be deleted. Please try again.'
    }
  }

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * JOURNAL_PAGE_SIZE + 1
  const rangeEnd = Math.min(page * JOURNAL_PAGE_SIZE, totalCount)
  const currentPageCount = Math.max(1, Math.ceil(totalCount / JOURNAL_PAGE_SIZE))
  const selectedDateLabel = selectedDate
    ? format(parseISO(selectedDate), 'MMMM d, yyyy')
    : effectiveFrom || effectiveTo
      ? `${effectiveFrom ? format(parseISO(effectiveFrom), 'MMM d, yyyy') : 'Any date'} – ${
          effectiveTo ? format(parseISO(effectiveTo), 'MMM d, yyyy') : 'Any date'
        }`
      : 'All dates'

  return (
    <div className="money-journal-page">
      <header className="journal-page-heading">
        <div>
          <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
          <h1>Money Journal</h1>
          <p>A quiet place to notice your habits, celebrate your wins, and learn as you go.</p>
        </div>
        <button className="primary-button journal-create-button" onClick={openCreateEntry} type="button">
          <Plus aria-hidden="true" size={17} />
          Write an entry
        </button>
      </header>

      <section className="journal-welcome-card">
        <span aria-hidden="true" className="journal-welcome-mark">
          <Feather size={25} strokeWidth={1.6} />
        </span>
        <div>
          <p className="journal-welcome-kicker"><Sparkles aria-hidden="true" size={14} /> A little reflection goes a long way</p>
          <h2>Your money story is still unfolding.</h2>
          <p>Make space for what you are learning. Small moments of awareness can shape gentler habits over time.</p>
        </div>
        <span aria-hidden="true" className="journal-welcome-decoration">✦</span>
      </section>

      {notice && (
        <p aria-live="polite" className="transaction-notice" role="status">{notice}</p>
      )}
      {loadError && (
        <p className="transaction-alert" role="alert">
          {loadError}
          <button
            className="journal-retry-button"
            onClick={() => setRefreshKey((current) => current + 1)}
            type="button"
          >
            Try again
          </button>
        </p>
      )}

      <div className="journal-content-grid">
        <aside className="journal-sidebar">
          <section aria-label="Select a date" className="journal-calendar-card">
            <header className="journal-calendar-header">
              <div>
                <p className="eyebrow">YOUR DAYS</p>
                <h2>{format(displayMonth, 'MMMM yyyy')}</h2>
              </div>
              <div className="journal-calendar-controls">
                <button
                  aria-label="Previous month"
                  className="journal-calendar-arrow"
                  onClick={() => setDisplayMonth((current) => subMonths(current, 1))}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" size={17} />
                </button>
                <button
                  aria-label="Next month"
                  className="journal-calendar-arrow"
                  disabled={isSameMonth(displayMonth, TODAY)}
                  onClick={() => setDisplayMonth((current) => addMonths(current, 1))}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" size={17} />
                </button>
              </div>
            </header>
            <div aria-hidden="true" className="journal-calendar-weekdays">
              {weekdayLabels.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
            </div>
            <div className="journal-calendar-days">
              {visibleDays.map((date) => {
                const dateValue = format(date, 'yyyy-MM-dd')
                const selected = selectedDate === dateValue
                const hasEntry = entryDates.has(dateValue)
                return (
                  <button
                    aria-label={`${format(date, 'EEEE, MMMM d')}${hasEntry ? ', journal entry' : ''}`}
                    aria-pressed={selected}
                    className={[
                      'journal-calendar-day',
                      !isSameMonth(date, displayMonth) ? 'is-outside-month' : '',
                      selected ? 'is-selected' : '',
                      isSameDay(date, TODAY) ? 'is-today' : '',
                    ].filter(Boolean).join(' ')}
                    disabled={isAfter(date, TODAY)}
                    key={dateValue}
                    onClick={() => selectCalendarDate(date)}
                    type="button"
                  >
                    {format(date, 'd')}
                    {hasEntry && <i aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
            <div className="journal-calendar-footer">
              <span><i aria-hidden="true" /> Entry saved</span>
              <button onClick={clearDateFilter} type="button">All dates</button>
            </div>
          </section>

          <section className="journal-date-filter-card">
            <h2><CalendarDays aria-hidden="true" size={16} /> Filter by date</h2>
            <label>
              <span>From</span>
              <input
                max={toDate || todayValue}
                onChange={(event) => {
                  setSelectedDate('')
                  setFromDate(event.target.value)
                  setPage(1)
                }}
                type="date"
                value={fromDate}
              />
            </label>
            <label>
              <span>To</span>
              <input
                max={todayValue}
                min={fromDate || undefined}
                onChange={(event) => {
                  setSelectedDate('')
                  setToDate(event.target.value)
                  setPage(1)
                }}
                type="date"
                value={toDate}
              />
            </label>
            <p>Showing <strong>{selectedDateLabel}</strong></p>
          </section>
        </aside>

        <section aria-labelledby="journal-entries-title" className="journal-entries-panel">
          <div className="journal-entries-heading">
            <div>
              <p className="eyebrow">LOOKING BACK</p>
              <h2 id="journal-entries-title">Past entries</h2>
              <p>{totalCount.toLocaleString('en-KE')} {totalCount === 1 ? 'moment' : 'moments'} in your journal</p>
            </div>
            <div className="journal-search">
              <Search aria-hidden="true" size={16} />
              <input
                aria-label="Search journal entries"
                onChange={(event) => {
                  setSearchText(event.target.value)
                  setPage(1)
                }}
                placeholder="Search reflections, wins, tags..."
                type="search"
                value={searchText}
              />
            </div>
          </div>

          {!isDateRangeValid ? (
            <div className="journal-state journal-error-state" role="alert">
              <h3>Choose a valid date range</h3>
              <p>The start date must be on or before the end date.</p>
            </div>
          ) : isLoading && entries.length === 0 ? (
            <div className="journal-state" role="status">Gathering your reflections...</div>
          ) : loadError && entries.length === 0 ? (
            <div className="journal-state">
              <h3>Your journal is taking a moment</h3>
              <p>Check your connection, then try again.</p>
              <button
                className="secondary-button"
                onClick={() => setRefreshKey((current) => current + 1)}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="journal-state journal-empty-state">
              <span><BookHeart aria-hidden="true" size={25} /></span>
              <h3>{search || effectiveFrom || effectiveTo ? 'No reflections found' : 'Your story starts here'}</h3>
              <p>
                {search || effectiveFrom || effectiveTo
                  ? 'Try another search or date, or clear your filters to see more entries.'
                  : 'When you are ready, write a few words about your money day.'}
              </p>
              {search || effectiveFrom || effectiveTo ? (
                <button
                  className="secondary-button"
                  onClick={() => {
                    setSearchText('')
                    setSelectedDate('')
                    setFromDate('')
                    setToDate('')
                    setPage(1)
                  }}
                  type="button"
                >
                  Clear filters
                </button>
              ) : (
                <button className="primary-button" onClick={openCreateEntry} type="button">
                  <Plus aria-hidden="true" size={16} />
                  Write your first entry
                </button>
              )}
            </div>
          ) : (
            <>
              {isLoading && <p className="journal-refreshing" role="status">Updating your journal...</p>}
              <div className="journal-entry-list">
                {entries.map((entry) => (
                  <JournalEntryCard
                    entry={entry}
                    expanded={expandedEntryId === entry.id}
                    key={entry.id}
                    onDelete={setEntryToDelete}
                    onEdit={openEditEntry}
                    onToggle={(id) => setExpandedEntryId((current) => current === id ? null : id)}
                  />
                ))}
              </div>
              <footer className="journal-pagination">
                <span>Showing {rangeStart}–{rangeEnd} of {totalCount.toLocaleString('en-KE')}</span>
                <div>
                  <button
                    className="secondary-button"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage((current) => current - 1)}
                    type="button"
                  >
                    Previous
                  </button>
                  <span>Page {page} of {currentPageCount}</span>
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
            </>
          )}
        </section>
      </div>

      {isEditorOpen && (
        <JournalEntryFormModal
          entry={editingEntry}
          initialDate={selectedDate || todayValue}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveEntry}
        />
      )}
      {entryToDelete && (
        <DeleteJournalEntryModal
          entry={entryToDelete}
          onClose={() => setEntryToDelete(null)}
          onConfirm={handleDeleteEntry}
        />
      )}
    </div>
  )
}

export default MoneyJournalPage
