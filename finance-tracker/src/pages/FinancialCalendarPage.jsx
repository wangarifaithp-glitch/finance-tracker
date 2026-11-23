import { useEffect, useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  addYears,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
} from 'lucide-react'
import CalendarEventCard from '../components/financial-calendar/CalendarEventCard.jsx'
import DeleteCalendarEventModal from '../components/financial-calendar/DeleteCalendarEventModal.jsx'
import CalendarEventFormModal from '../components/financial-calendar/CalendarEventFormModal.jsx'
import { useAuth } from '../context/useAuth.js'
import { useCurrency } from '../context/useCurrency.js'
import {
  deleteFinancialCalendarEvent,
  getFinancialCalendarEvents,
  saveFinancialCalendarEvent,
  setFinancialCalendarOccurrencePaid,
} from '../data/financialCalendarRepository.js'
import {
  financialEventTypes,
  payableEventTypes,
} from '../data/financialCalendarData.js'
import { TODAY } from '../data/transactionData.js'
import './FinancialCalendarPage.css'

const todayValue = format(TODAY, 'yyyy-MM-dd')
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getEventOccurrences(event, from, to) {
  const start = parseISO(event.eventDate)
  const rangeStart = parseISO(from)
  const rangeEnd = parseISO(to)
  const repeatUntil = event.repeatUntil ? parseISO(event.repeatUntil) : null
  const finalDate = repeatUntil && repeatUntil < rangeEnd ? repeatUntil : rangeEnd
  if (start > finalDate) return []

  if (event.recurrence === 'none') {
    if (start < rangeStart || start > finalDate) return []
    return [{
      ...event,
      occurrenceDate: event.eventDate,
      isPaid: event.completedDates.includes(event.eventDate),
    }]
  }

  let intervalIndex = 0
  let occurrence = start
  if (event.recurrence === 'daily') {
    intervalIndex = Math.max(0, differenceInCalendarDays(rangeStart, start))
    occurrence = addDays(start, intervalIndex)
  } else if (event.recurrence === 'weekly') {
    intervalIndex = Math.max(0, Math.ceil(differenceInCalendarDays(rangeStart, start) / 7))
    occurrence = addWeeks(start, intervalIndex)
  } else if (event.recurrence === 'monthly') {
    intervalIndex = Math.max(
      0,
      (rangeStart.getFullYear() - start.getFullYear()) * 12 +
        rangeStart.getMonth() - start.getMonth(),
    )
    occurrence = addMonths(start, intervalIndex)
    while (occurrence < rangeStart) {
      intervalIndex += 1
      occurrence = addMonths(start, intervalIndex)
    }
  } else if (event.recurrence === 'yearly') {
    intervalIndex = Math.max(0, rangeStart.getFullYear() - start.getFullYear())
    occurrence = addYears(start, intervalIndex)
    while (occurrence < rangeStart) {
      intervalIndex += 1
      occurrence = addYears(start, intervalIndex)
    }
  }

  const occurrences = []
  while (occurrence <= finalDate) {
    const occurrenceDate = format(occurrence, 'yyyy-MM-dd')
    occurrences.push({
      ...event,
      occurrenceDate,
      isPaid: event.completedDates.includes(occurrenceDate),
    })
    intervalIndex += 1
    if (event.recurrence === 'daily') occurrence = addDays(start, intervalIndex)
    else if (event.recurrence === 'weekly') occurrence = addWeeks(start, intervalIndex)
    else if (event.recurrence === 'monthly') occurrence = addMonths(start, intervalIndex)
    else occurrence = addYears(start, intervalIndex)
  }
  return occurrences
}

function FinancialCalendarPage() {
  const { user } = useAuth()
  const { formatAmount } = useCurrency()
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(TODAY))
  const [selectedDate, setSelectedDate] = useState(todayValue)
  const [viewMode, setViewMode] = useState('month')
  const [eventSeries, setEventSeries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [isEventFormOpen, setIsEventFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventToDelete, setEventToDelete] = useState(null)
  const [notice, setNotice] = useState('')
  const selectedDateValue = useMemo(() => parseISO(selectedDate), [selectedDate])
  const visibleDays = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(selectedDateValue, { weekStartsOn: 1 })
      return eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn: 1 }) })
    }
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(displayMonth), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 1 }),
    })
  }, [displayMonth, selectedDateValue, viewMode])
  const visibleFrom = format(visibleDays[0], 'yyyy-MM-dd')
  const visibleTo = format(visibleDays[visibleDays.length - 1], 'yyyy-MM-dd')
  const upcomingTo = format(addDays(TODAY, 30), 'yyyy-MM-dd')

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    async function loadCalendarEvents() {
      setIsLoading(true)
      setLoadError('')
      setEventSeries([])
      try {
        const [visibleEvents, upcomingEvents] = await Promise.all([
          getFinancialCalendarEvents({
            userId: user?.id,
            from: visibleFrom,
            to: visibleTo,
            signal: controller.signal,
          }),
          getFinancialCalendarEvents({
            userId: user?.id,
            from: todayValue,
            to: upcomingTo,
            signal: controller.signal,
          }),
        ])
        if (active) {
          const uniqueEvents = new Map()
          for (const event of [...visibleEvents, ...upcomingEvents]) {
            uniqueEvents.set(event.id, event)
          }
          setEventSeries(Array.from(uniqueEvents.values()))
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return
        console.error('Unable to load Finance Tracker financial calendar events.', error)
        setLoadError('Your financial calendar could not be loaded. Please try again.')
      } finally {
        if (active && !controller.signal.aborted) setIsLoading(false)
      }
    }

    loadCalendarEvents()
    return () => {
      active = false
      controller.abort()
    }
  }, [upcomingTo, user?.id, visibleFrom, visibleTo, refreshKey])

  const visibleOccurrences = useMemo(
    () => eventSeries.flatMap((event) => getEventOccurrences(event, visibleFrom, visibleTo)),
    [eventSeries, visibleFrom, visibleTo],
  )
  const eventsByDate = useMemo(() => {
    const grouped = new Map()
    for (const event of visibleOccurrences) {
      const dayEvents = grouped.get(event.occurrenceDate) || []
      dayEvents.push(event)
      grouped.set(event.occurrenceDate, dayEvents)
    }
    return grouped
  }, [visibleOccurrences])
  const selectedEvents = (eventsByDate.get(selectedDate) || []).slice().sort(
    (left, right) => left.title.localeCompare(right.title),
  )
  const upcomingEvents = useMemo(
    () =>
      eventSeries
        .flatMap((event) => getEventOccurrences(event, todayValue, upcomingTo))
        .filter(
          (event) =>
            !event.isPaid &&
            (payableEventTypes.includes(event.eventType) ||
              event.eventType === 'payday' ||
              event.eventType === 'reminder'),
        )
        .sort(
          (left, right) =>
            left.occurrenceDate.localeCompare(right.occurrenceDate) ||
            left.title.localeCompare(right.title),
        ),
    [eventSeries, upcomingTo],
  )
  const upcomingBills = upcomingEvents.filter((event) =>
    payableEventTypes.includes(event.eventType),
  )
  const upcomingTotal = upcomingBills.reduce(
    (total, event) => total + (event.amount || 0),
    0,
  )
  const selectedDateLabel = format(selectedDateValue, 'EEEE, MMMM d, yyyy')
  const calendarHeading =
    viewMode === 'week'
      ? `${format(visibleDays[0], 'MMM d')} – ${format(visibleDays[6], 'MMM d, yyyy')}`
      : format(displayMonth, 'MMMM yyyy')

  function moveCalendarPeriod(direction) {
    const currentDate = selectedDateValue
    const nextDate =
      viewMode === 'week'
        ? direction > 0
          ? addWeeks(currentDate, 1)
          : subWeeks(currentDate, 1)
        : direction > 0
          ? addMonths(currentDate, 1)
          : subMonths(currentDate, 1)
    setSelectedDate(format(nextDate, 'yyyy-MM-dd'))
    setDisplayMonth(startOfMonth(nextDate))
  }

  function selectCalendarDate(date) {
    const value = format(date, 'yyyy-MM-dd')
    setSelectedDate(value)
    setDisplayMonth(startOfMonth(date))
    setNotice('')
  }

  function openCreateEvent() {
    setEditingEvent(null)
    setIsEventFormOpen(true)
    setNotice('')
  }

  function openEditEvent(event) {
    setEditingEvent(event)
    setIsEventFormOpen(true)
    setNotice('')
  }

  async function handleSaveEvent(event) {
    try {
      await saveFinancialCalendarEvent(event, user?.id, editingEvent)
      setIsEventFormOpen(false)
      setEditingEvent(null)
      setRefreshKey((current) => current + 1)
      setNotice(editingEvent ? 'Your calendar event has been updated.' : 'Your calendar event has been added.')
      return true
    } catch (error) {
      console.error('Unable to save a Finance Tracker financial calendar event.', error)
      return error?.message || 'Your event could not be saved. Please try again.'
    }
  }

  async function handleDeleteEvent(event) {
    try {
      await deleteFinancialCalendarEvent(event, user?.id)
      setEventToDelete(null)
      setRefreshKey((current) => current + 1)
      setNotice(
        event.recurrence === 'none'
          ? 'Your event has been deleted.'
          : 'Your recurring event series has been deleted.',
      )
      return true
    } catch (error) {
      console.error('Unable to delete a Finance Tracker financial calendar event.', error)
      return error?.message || 'The event could not be deleted. Please try again.'
    }
  }

  async function handleTogglePaid(event) {
    try {
      await setFinancialCalendarOccurrencePaid(
        event,
        user?.id,
        event.occurrenceDate,
        !event.isPaid,
      )
      setRefreshKey((current) => current + 1)
      setNotice(
        event.isPaid
          ? 'The event was marked unpaid.'
          : event.eventType === 'savings_contribution'
            ? 'The savings contribution was marked complete.'
            : 'The bill was marked paid.',
      )
      return true
    } catch (error) {
      console.error('Unable to update a Finance Tracker calendar event status.', error)
      return error?.message || 'The event status could not be updated. Please try again.'
    }
  }

  const headingDate = selectedDateValue
  const upcomingBillCount = upcomingBills.length

  return (
    <div className="financial-calendar-page">
      <header className="financial-calendar-heading">
        <div>
          <p className="eyebrow">YOUR FINANCE TRACKER SPACE</p>
          <h1>Financial Calendar</h1>
          <p>Stay close to what is coming up, one thoughtful day at a time.</p>
        </div>
        <button className="primary-button calendar-create-button" onClick={openCreateEvent} type="button">
          <Plus aria-hidden="true" size={17} />
          Add an event
        </button>
      </header>

      <section className="calendar-welcome-card">
        <span aria-hidden="true" className="calendar-welcome-mark">
          <CalendarDays size={24} strokeWidth={1.7} />
        </span>
        <div>
          <p><Sparkles aria-hidden="true" size={14} /> A little more breathing room</p>
          <h2>Make space for the dates that matter.</h2>
          <span>Keep bills, paydays, contributions and reminders in one calm place.</span>
        </div>
        <span aria-hidden="true" className="calendar-welcome-decoration">✦</span>
      </section>

      {notice && <p aria-live="polite" className="transaction-notice" role="status">{notice}</p>}
      {loadError && (
        <p className="transaction-alert" role="alert">
          {loadError}
          <button
            className="calendar-retry-button"
            onClick={() => setRefreshKey((current) => current + 1)}
            type="button"
          >
            Try again
          </button>
        </p>
      )}

      <div className="financial-calendar-layout">
        <div className="financial-calendar-main">
          <section aria-label="Financial calendar" className="financial-month-card">
            <header className="financial-month-heading">
              <div>
                <p className="eyebrow">YOUR MONTH AT A GLANCE</p>
                <h2>{calendarHeading}</h2>
              </div>
              <div className="financial-calendar-controls">
                <div aria-label="Calendar view" className="calendar-view-switch" role="group">
                  <button
                    aria-pressed={viewMode === 'month'}
                    className={viewMode === 'month' ? 'is-active' : ''}
                    onClick={() => setViewMode('month')}
                    type="button"
                  >
                    Month
                  </button>
                  <button
                    aria-pressed={viewMode === 'week'}
                    className={viewMode === 'week' ? 'is-active' : ''}
                    onClick={() => setViewMode('week')}
                    type="button"
                  >
                    Week
                  </button>
                </div>
                <button
                  aria-label="Previous period"
                  className="financial-calendar-arrow"
                  onClick={() => moveCalendarPeriod(-1)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" size={17} />
                </button>
                <button
                  aria-label="Next period"
                  className="financial-calendar-arrow"
                  onClick={() => moveCalendarPeriod(1)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" size={17} />
                </button>
                <button
                  className="calendar-today-button"
                  onClick={() => selectCalendarDate(TODAY)}
                  type="button"
                >
                  Today
                </button>
              </div>
            </header>

            <div className={`financial-calendar-grid${viewMode === 'week' ? ' is-week-view' : ''}`}>
              {weekdays.map((day) => <span className="financial-calendar-weekday" key={day}>{day}</span>)}
              {visibleDays.map((date) => {
                const dateValue = format(date, 'yyyy-MM-dd')
                const dayEvents = eventsByDate.get(dateValue) || []
                const isSelected = isSameDay(date, headingDate)
                return (
                  <button
                    aria-label={`${format(date, 'EEEE, MMMM d')}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : ''}`}
                    aria-pressed={isSelected}
                    className={[
                      'financial-calendar-day',
                      viewMode === 'month' && !isSameMonth(date, displayMonth) ? 'is-outside-month' : '',
                      isSelected ? 'is-selected' : '',
                      isSameDay(date, TODAY) ? 'is-today' : '',
                    ].filter(Boolean).join(' ')}
                    key={dateValue}
                    onClick={() => selectCalendarDate(date)}
                    type="button"
                  >
                    <span className="financial-day-number">{format(date, 'd')}</span>
                    <span className="financial-day-events">
                      {dayEvents.slice(0, viewMode === 'week' ? 4 : 2).map((event) => (
                        <i
                          className={`financial-day-event calendar-type-${event.eventType}`}
                          key={`${event.id}-${event.occurrenceDate}`}
                          title={`${event.title} · ${financialEventTypes.find((type) => type.value === event.eventType)?.label || ''}`}
                        >
                          <span>{event.title}</span>
                        </i>
                      ))}
                      {dayEvents.length > (viewMode === 'week' ? 4 : 2) && (
                        <small>+{dayEvents.length - (viewMode === 'week' ? 4 : 2)} more</small>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>

            <div aria-label="Event categories" className="financial-calendar-legend">
              {financialEventTypes.map(({ value, label }) => (
                <span key={value}><i className={`calendar-type-${value}`} />{label}</span>
              ))}
            </div>
            {isLoading && <p className="calendar-refreshing" role="status">Updating your calendar...</p>}
          </section>

          <section aria-labelledby="selected-day-heading" className="selected-day-panel">
            <header className="selected-day-heading">
              <div>
                <p className="eyebrow">YOUR PLANS</p>
                <h2 id="selected-day-heading">{selectedDateLabel}</h2>
                <p>
                  {selectedEvents.length
                    ? `${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'} planned`
                    : 'A little room in your day'}
                </p>
              </div>
              <button
                className="secondary-button selected-day-add-button"
                onClick={openCreateEvent}
                type="button"
              >
                <Plus aria-hidden="true" size={15} />
                Add to this day
              </button>
            </header>

            {isLoading && eventSeries.length === 0 ? (
              <div className="calendar-empty-state" role="status">Gathering your calendar...</div>
            ) : loadError && eventSeries.length === 0 ? (
              <div className="calendar-empty-state">
                <h3>Your calendar is taking a moment</h3>
                <p>Check your connection, then try again.</p>
                <button
                  className="secondary-button"
                  onClick={() => setRefreshKey((current) => current + 1)}
                  type="button"
                >
                  Try again
                </button>
              </div>
            ) : selectedEvents.length === 0 ? (
              <div className="calendar-empty-state">
                <span><CalendarDays aria-hidden="true" size={23} /></span>
                <h3>Nothing planned for this day</h3>
                <p>Add a bill, payday or reminder whenever it is helpful.</p>
                <button className="primary-button" onClick={openCreateEvent} type="button">
                  <Plus aria-hidden="true" size={15} />
                  Add an event
                </button>
              </div>
            ) : (
              <div className="calendar-event-list">
                {selectedEvents.map((event) => (
                  <CalendarEventCard
                    event={event}
                    formatAmount={formatAmount}
                    key={`${event.id}-${event.occurrenceDate}`}
                    onDelete={setEventToDelete}
                    onEdit={openEditEvent}
                    onTogglePaid={handleTogglePaid}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="upcoming-calendar-sidebar">
          <section aria-labelledby="upcoming-bills-heading" className="upcoming-bills-card">
            <div className="upcoming-bills-heading">
              <span><CalendarDays aria-hidden="true" size={17} /></span>
              <div>
                <p className="eyebrow">THE NEXT 30 DAYS</p>
                <h2 id="upcoming-bills-heading">Coming up</h2>
              </div>
            </div>
            {upcomingBillCount > 0 && (
              <div className="upcoming-bills-summary">
                <span>{upcomingBillCount} bill{upcomingBillCount === 1 ? '' : 's'} to plan for</span>
                <strong>{formatAmount(upcomingTotal)}</strong>
              </div>
            )}
            {isLoading && upcomingEvents.length === 0 ? (
              <div className="upcoming-empty-state" role="status">Looking ahead...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="upcoming-empty-state">
                <p>Nothing due in the next 30 days. Enjoy the breathing room.</p>
              </div>
            ) : (
              <div className="upcoming-event-list">
                {upcomingEvents.slice(0, 7).map((event) => (
                  <CalendarEventCard
                    compact
                    event={event}
                    formatAmount={formatAmount}
                    key={`${event.id}-${event.occurrenceDate}`}
                    onDelete={setEventToDelete}
                    onEdit={openEditEvent}
                    onTogglePaid={handleTogglePaid}
                  />
                ))}
              </div>
            )}
            {upcomingEvents.length > 7 && (
              <p className="upcoming-more-note">
                And {upcomingEvents.length - 7} more event{upcomingEvents.length - 7 === 1 ? '' : 's'} on your calendar.
              </p>
            )}
          </section>

          <section className="calendar-reminder-note">
            <Sparkles aria-hidden="true" size={16} />
            <p>
              Reminders are saved with your events and shown here. Push notifications can be connected when delivery is configured.
            </p>
          </section>
        </aside>
      </div>

      {isEventFormOpen && (
        <CalendarEventFormModal
          event={editingEvent}
          initialDate={selectedDate}
          onClose={() => setIsEventFormOpen(false)}
          onSave={handleSaveEvent}
        />
      )}
      {eventToDelete && (
        <DeleteCalendarEventModal
          event={eventToDelete}
          onClose={() => setEventToDelete(null)}
          onConfirm={handleDeleteEvent}
        />
      )}
    </div>
  )
}

export default FinancialCalendarPage
