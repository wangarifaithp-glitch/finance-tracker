import { useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  PiggyBank,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { calendarEvents, TODAY } from '../../data/dashboardData.js'
import WidgetCard, { WidgetState } from './WidgetCard.jsx'

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const eventIcons = {
  bill: BellRing,
  income: CircleDollarSign,
  savings: PiggyBank,
  reminder: CalendarDays,
}

function CalendarPreview({ loading = false }) {
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(TODAY))
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const monthStart = startOfMonth(visibleMonth)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 }),
  })
  const selectedEvents = calendarEvents.filter((event) =>
    isSameDay(event.date, selectedDate),
  )
  const upcomingEvents = calendarEvents
    .filter((event) => event.date >= TODAY)
    .slice(0, 2)
  const eventsToShow = selectedEvents.length ? selectedEvents : upcomingEvents
  const hasCalendarEvents = calendarEvents.length > 0

  function chooseDate(day) {
    setSelectedDate(day)
    if (!isSameMonth(day, visibleMonth)) setVisibleMonth(startOfMonth(day))
  }

  return (
    <WidgetCard
      action={
        <Link aria-label="View full calendar" className="widget-view-link calendar-view-link" to="/calendar">
          View all <ArrowRight aria-hidden="true" size={14} />
        </Link>
      }
      className="calendar-widget"
      icon={CalendarDays}
      title="Calendar"
    >
      {loading || !hasCalendarEvents ? (
        <WidgetState
          emptyMessage="Bills, reminders and payday will appear here."
          emptyTitle="No upcoming dates"
          loading={loading}
        />
      ) : (
        <>
          <div className="calendar-month-heading">
            <button
              aria-label="Previous month"
              className="calendar-nav-button"
              onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={17} />
            </button>
            <span>{format(visibleMonth, 'MMMM yyyy')}</span>
            <button
              aria-label="Next month"
              className="calendar-nav-button"
              onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          </div>
          <div aria-label={format(visibleMonth, 'MMMM yyyy')} className="calendar-grid">
            {weekDays.map((day) => (
              <span className="calendar-weekday" key={day}>
                {day}
              </span>
            ))}
            {days.map((day) => {
              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, TODAY)
              const hasEvent = calendarEvents.some((event) =>
                isSameDay(event.date, day),
              )

              return (
                <button
                  aria-label={format(day, 'EEEE, MMMM d, yyyy')}
                  aria-pressed={isSelected}
                  className={[
                    'calendar-day',
                    !isSameMonth(day, visibleMonth) && 'outside-month',
                    isSelected && 'selected',
                    isToday && 'today',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={format(day, 'yyyy-MM-dd')}
                  onClick={() => chooseDate(day)}
                  type="button"
                >
                  {format(day, 'd')}
                  {hasEvent && <span aria-hidden="true" className="calendar-event-dot" />}
                </button>
              )
            })}
          </div>
          <div className="calendar-events">
            <p className="calendar-events-label">
              {selectedEvents.length
                ? format(selectedDate, 'MMM d')
                : 'Coming up'}
            </p>
            {eventsToShow.length === 0 ? (
              <WidgetState
                emptyMessage="There are no upcoming money dates."
                emptyTitle="All clear"
              />
            ) : (
              eventsToShow.map((event) => {
                const Icon = eventIcons[event.kind] || CalendarDays

                return (
                  <div className={`calendar-event event-${event.kind}`} key={event.id}>
                    <span className="calendar-event-icon">
                      <Icon aria-hidden="true" size={16} />
                    </span>
                    <span className="calendar-event-copy">
                      <strong>{event.title}</strong>
                      <small>
                        {selectedEvents.length
                          ? event.detail
                          : `${format(event.date, 'MMM d')} · ${event.detail}`}
                      </small>
                    </span>
                    <ChevronRight aria-hidden="true" className="calendar-event-arrow" size={16} />
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </WidgetCard>
  )
}

export default CalendarPreview
