import { isDemoMode, isSupabaseConfigured, supabase } from './supabaseClient.js'
import { sampleMoneyJournalEntries } from './moneyJournalData.js'

const storageKey = 'finance-tracker.moneyJournal.v1'
export const JOURNAL_PAGE_SIZE = 10
const journalColumns =
  'id,title,entry_date,reflection,financial_win,lesson,tags,created_at,updated_at'

function requireSupabaseUser(userId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for this deployment.')
  }
  if (!userId) {
    throw new Error('Sign in before accessing your money journal.')
  }
}

function isJournalEntryList(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.title === 'string' &&
        typeof entry.entryDate === 'string' &&
        typeof entry.reflection === 'string' &&
        typeof entry.financialWin === 'string' &&
        typeof entry.lesson === 'string' &&
        Array.isArray(entry.tags),
    )
  )
}

function loadDemoEntries() {
  const saved = window.localStorage.getItem(storageKey)
  if (saved === null) return sampleMoneyJournalEntries

  const parsed = JSON.parse(saved)
  if (!isJournalEntryList(parsed)) {
    throw new Error('Saved journal entries have an unsupported format.')
  }
  return parsed
}

function saveDemoEntries(entries) {
  window.localStorage.setItem(storageKey, JSON.stringify(entries))
}

function mapEntry(row) {
  return {
    id: row.id,
    title: row.title,
    entryDate: row.entry_date,
    reflection: row.reflection || '',
    financialWin: row.financial_win || '',
    lesson: row.lesson || '',
    tags: row.tags || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapEntryToRow(entry, userId) {
  return {
    user_id: userId,
    title: entry.title.trim(),
    entry_date: entry.entryDate,
    reflection: entry.reflection.trim(),
    financial_win: entry.financialWin.trim(),
    lesson: entry.lesson.trim(),
    tags: entry.tags,
  }
}

function matchesSearch(entry, query) {
  if (!query) return true
  const searchableText = [
    entry.title,
    entry.reflection,
    entry.financialWin,
    entry.lesson,
    ...entry.tags,
  ]
    .join(' ')
    .toLocaleLowerCase()
  return query
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => searchableText.includes(term))
}

export async function getMoneyJournalEntries({
  userId,
  search = '',
  from = '',
  to = '',
  page = 1,
  signal,
}) {
  if (!Number.isInteger(page) || page < 1) {
    throw new Error('Choose a valid journal page.')
  }
  if (from && to && from > to) {
    throw new Error('The start date must be on or before the end date.')
  }

  if (isDemoMode) {
    const query = search.trim()
    const entries = loadDemoEntries()
      .filter((entry) => (!from || entry.entryDate >= from) && (!to || entry.entryDate <= to))
      .filter((entry) => matchesSearch(entry, query))
      .sort((left, right) =>
        right.entryDate.localeCompare(left.entryDate) ||
        right.createdAt.localeCompare(left.createdAt),
      )
    const start = (page - 1) * JOURNAL_PAGE_SIZE
    return {
      entries: entries.slice(start, start + JOURNAL_PAGE_SIZE),
      totalCount: entries.length,
      hasNext: start + JOURNAL_PAGE_SIZE < entries.length,
    }
  }

  requireSupabaseUser(userId)
  let request = supabase.rpc('search_money_journal_entries', {
    p_search: search.trim(),
    p_from: from || null,
    p_to: to || null,
    p_page_size: JOURNAL_PAGE_SIZE,
    p_page_offset: (page - 1) * JOURNAL_PAGE_SIZE,
  })
  if (signal) request = request.abortSignal(signal)

  const { data, error } = await request
  if (error) throw error
  if (!data || !Array.isArray(data.entries)) {
    throw new Error('The journal returned an unsupported response.')
  }
  return {
    entries: data.entries.map(mapEntry),
    totalCount: Number(data.totalCount) || 0,
    hasNext: (page - 1) * JOURNAL_PAGE_SIZE + data.entries.length < Number(data.totalCount),
  }
}

export async function saveMoneyJournalEntry(entry, userId, previousEntry) {
  if (isDemoMode) {
    const entries = loadDemoEntries()
    const now = new Date().toISOString()
    const savedEntry = {
      ...entry,
      id: previousEntry?.id || entry.id || globalThis.crypto.randomUUID(),
      createdAt: previousEntry?.createdAt || now,
      updatedAt: now,
    }
    const nextEntries = previousEntry
      ? entries.map((item) => (item.id === previousEntry.id ? savedEntry : item))
      : [savedEntry, ...entries]
    saveDemoEntries(nextEntries)
    return savedEntry
  }

  requireSupabaseUser(userId)
  const row = mapEntryToRow(entry, userId)
  if (previousEntry) delete row.user_id
  const result = previousEntry
    ? await supabase
        .from('money_journal_entries')
        .update(row)
        .eq('id', previousEntry.id)
        .select(journalColumns)
        .single()
    : await supabase
        .from('money_journal_entries')
        .insert(row)
        .select(journalColumns)
        .single()
  if (result.error) throw result.error
  return mapEntry(result.data)
}

export async function deleteMoneyJournalEntry(entry, userId) {
  if (isDemoMode) {
    saveDemoEntries(loadDemoEntries().filter((item) => item.id !== entry.id))
    return
  }

  requireSupabaseUser(userId)
  const { error } = await supabase
    .from('money_journal_entries')
    .delete()
    .eq('id', entry.id)
    .select('id')
    .single()
  if (error) throw error
}
