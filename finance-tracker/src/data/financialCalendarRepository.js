import { isDemoMode, isSupabaseConfigured, supabase } from './supabaseClient.js'
import { sampleFinancialCalendarEvents } from './financialCalendarData.js'

const storageKey = 'finance-tracker.financialCalendar.v1'
const eventColumns =
  'id,title,event_type,event_date,amount,recurrence,repeat_until,remind_before_days,notes,completed_dates,created_at,updated_at'
const eventTypeValues = [
  'bill',
  'rent',
  'payday',
  'subscription',
  'loan_payment',
  'savings_contribution',
  'recurring_expense',
  'reminder',
]
const recurrenceValues = ['none', 'daily', 'weekly', 'monthly', 'yearly']
const reminderValues = [null, 0, 1, 3, 7]

function requireSupabaseUser(userId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for this deployment.')
  }
  if (!userId) {
    throw new Error('Sign in before accessing your financial calendar.')
  }
}

function loadDemoEvents() {
  const saved = window.localStorage.getItem(storageKey)
  if (saved === null) return sampleFinancialCalendarEvents

  const parsed = JSON.parse(saved)
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (event) =>
        event &&
        typeof event.id === 'string' &&
        typeof event.title === 'string' &&
        typeof event.eventDate === 'string' &&
        Array.isArray(event.completedDates),
    )
  ) {
    throw new Error('Saved calendar events have an unsupported format.')
  }
  return parsed
}

function saveDemoEvents(events) {
  window.localStorage.setItem(storageKey, JSON.stringify(events))
}

function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    eventDate: row.event_date,
    amount: row.amount === null ? null : Number(row.amount),
    recurrence: row.recurrence,
    repeatUntil: row.repeat_until || '',
    remindBeforeDays:
      row.remind_before_days === null ? null : Number(row.remind_before_days),
    notes: row.notes || '',
    completedDates: row.completed_dates || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapEventToRow(event, userId) {
  return {
    user_id: userId,
    title: event.title.trim(),
    event_type: event.eventType,
    event_date: event.eventDate,
    amount: event.amount,
    recurrence: event.recurrence,
    repeat_until: event.repeatUntil || null,
    remind_before_days: event.remindBeforeDays,
    notes: event.notes.trim(),
  }
}

export async function getFinancialCalendarEvents({ userId, from, to, signal }) {
  if (!from || !to || from > to) {
    throw new Error('Choose a valid calendar date range.')
  }

  if (isDemoMode) {
    return loadDemoEvents()
      .filter(
        (event) =>
          event.eventDate <= to &&
          (event.recurrence !== 'none' || event.eventDate >= from) &&
          (!event.repeatUntil || event.repeatUntil >= from),
      )
      .sort((left, right) => left.eventDate.localeCompare(right.eventDate))
  }

  requireSupabaseUser(userId)
  let request = supabase.rpc('list_financial_calendar_events', {
    p_from: from,
    p_to: to,
  })
  if (signal) request = request.abortSignal(signal)

  const { data, error } = await request
  if (error) throw error
  if (!Array.isArray(data)) {
    throw new Error('The financial calendar returned an unsupported response.')
  }
  return data.map(mapEvent)
}

export async function saveFinancialCalendarEvent(event, userId, previousEvent) {
  if (!event.title.trim()) throw new Error('Give this calendar event a title.')
  if (!event.eventDate) throw new Error('Choose a date for this event.')
  if (!eventTypeValues.includes(event.eventType)) {
    throw new Error('Choose a valid calendar event category.')
  }
  if (!recurrenceValues.includes(event.recurrence)) {
    throw new Error('Choose a valid recurrence option.')
  }
  if (!reminderValues.includes(event.remindBeforeDays)) {
    throw new Error('Choose a valid reminder option.')
  }
  if (
    event.amount !== null &&
    (!Number.isFinite(event.amount) || event.amount < 0)
  ) {
    throw new Error('Enter a valid event amount.')
  }
  if (event.repeatUntil && event.repeatUntil < event.eventDate) {
    throw new Error('The repeat-until date must be on or after the event date.')
  }

  if (isDemoMode) {
    const events = loadDemoEvents()
    const now = new Date().toISOString()
    const savedEvent = {
      ...event,
      id: previousEvent?.id || event.id || globalThis.crypto.randomUUID(),
      completedDates: previousEvent?.completedDates || [],
      createdAt: previousEvent?.createdAt || now,
      updatedAt: now,
    }
    const nextEvents = previousEvent
      ? events.map((item) => (item.id === previousEvent.id ? savedEvent : item))
      : [savedEvent, ...events]
    saveDemoEvents(nextEvents)
    return savedEvent
  }

  requireSupabaseUser(userId)
  const row = mapEventToRow(event, userId)
  if (previousEvent) delete row.user_id
  const result = previousEvent
    ? await supabase
        .from('financial_calendar_events')
        .update(row)
        .eq('id', previousEvent.id)
        .select(eventColumns)
        .single()
    : await supabase
        .from('financial_calendar_events')
        .insert(row)
        .select(eventColumns)
        .single()
  if (result.error) throw result.error
  return mapEvent(result.data)
}

export async function deleteFinancialCalendarEvent(event, userId) {
  if (isDemoMode) {
    saveDemoEvents(loadDemoEvents().filter((item) => item.id !== event.id))
    return
  }

  requireSupabaseUser(userId)
  const { error } = await supabase
    .from('financial_calendar_events')
    .delete()
    .eq('id', event.id)
    .select('id')
    .single()
  if (error) throw error
}

export async function setFinancialCalendarOccurrencePaid(
  event,
  userId,
  occurrenceDate,
  isPaid,
) {
  if (isDemoMode) {
    const events = loadDemoEvents()
    const currentEvent = events.find((item) => item.id === event.id)
    if (!currentEvent) throw new Error('Calendar event not found.')
    const completedDates = new Set(currentEvent.completedDates)
    if (isPaid) completedDates.add(occurrenceDate)
    else completedDates.delete(occurrenceDate)
    saveDemoEvents(
      events.map((item) =>
        item.id === event.id
          ? {
              ...item,
              completedDates: Array.from(completedDates).sort(),
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    )
    return
  }

  requireSupabaseUser(userId)
  const { error } = await supabase.rpc('set_financial_calendar_occurrence_paid', {
    p_event_id: event.id,
    p_occurrence_date: occurrenceDate,
    p_is_paid: isPaid,
  })
  if (error) throw error
}
