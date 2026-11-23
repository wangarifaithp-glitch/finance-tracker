import { sampleSavingsGoals } from './savingsGoalData.js'
import { isDemoMode, isSupabaseConfigured, supabase } from './supabaseClient.js'

const storageKey = 'finance-tracker.savingsGoals.v1'
const goalColumns =
  'id,title,category,target_amount,saved_amount,deadline,icon,color,created_at,updated_at'
const historyPageSize = 20

function requireSupabaseUser(userId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for this deployment.')
  }
  if (!userId) {
    throw new Error('Sign in before accessing savings goals.')
  }
}

function isGoalList(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (goal) =>
        goal &&
        typeof goal.id === 'string' &&
        typeof goal.title === 'string' &&
        typeof goal.targetAmount === 'number' &&
        typeof goal.savedAmount === 'number' &&
        Array.isArray(goal.history),
    )
  )
}

function loadDemoGoals() {
  const saved = window.localStorage.getItem(storageKey)
  if (saved === null) return sampleSavingsGoals

  const parsed = JSON.parse(saved)
  if (!isGoalList(parsed)) {
    throw new Error('Saved savings goals have an unsupported format.')
  }
  return parsed
}

function saveDemoGoals(goals) {
  window.localStorage.setItem(storageKey, JSON.stringify(goals))
}

function mapGoal(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    targetAmount: Number(row.target_amount),
    savedAmount: Number(row.saved_amount),
    deadline: row.deadline || '',
    icon: row.icon,
    color: row.color,
    history: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapGoalToRow(goal, userId) {
  return {
    user_id: userId,
    title: goal.title,
    category: goal.category,
    target_amount: goal.targetAmount,
    deadline: goal.deadline || null,
    icon: goal.icon,
    color: goal.color,
  }
}

function mapHistoryRow(row) {
  return {
    id: row.id,
    movement: row.movement,
    amount: Number(row.amount),
    note: row.note,
    createdAt: row.created_at,
  }
}

export async function getSavingsGoals(userId, signal) {
  if (isDemoMode) return loadDemoGoals()

  requireSupabaseUser(userId)
  let query = supabase
    .from('savings_goals')
    .select(goalColumns)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
  if (signal) query = query.abortSignal(signal)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(mapGoal)
}

export async function saveSavingsGoal(goal, userId, previousGoal) {
  if (isDemoMode) {
    const goals = loadDemoGoals()
    const savedGoal = {
      ...goal,
      id: previousGoal?.id || goal.id || globalThis.crypto.randomUUID(),
      savedAmount: previousGoal?.savedAmount || 0,
      history: previousGoal?.history || [],
    }
    const nextGoals = previousGoal
      ? goals.map((item) => (item.id === previousGoal.id ? savedGoal : item))
      : [savedGoal, ...goals]
    saveDemoGoals(nextGoals)
    return savedGoal
  }

  requireSupabaseUser(userId)
  const row = mapGoalToRow(goal, userId)
  if (previousGoal) delete row.user_id
  const result = previousGoal
    ? await supabase
        .from('savings_goals')
        .update(row)
        .eq('id', previousGoal.id)
        .select(goalColumns)
        .single()
    : await supabase.from('savings_goals').insert(row).select(goalColumns).single()
  if (result.error) throw result.error
  return mapGoal(result.data)
}

export async function deleteSavingsGoal(goal, userId) {
  if (isDemoMode) {
    saveDemoGoals(loadDemoGoals().filter((item) => item.id !== goal.id))
    return
  }

  requireSupabaseUser(userId)
  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', goal.id)
    .select('id')
    .single()
  if (error) throw error
}

export async function recordSavingsGoalMovement(
  goal,
  userId,
  movement,
  amount,
  note,
) {
  if (!['contribution', 'withdrawal'].includes(movement)) {
    throw new Error('Choose a valid savings goal action.')
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter an amount greater than zero.')
  }

  if (isDemoMode) {
    const goals = loadDemoGoals()
    const currentGoal = goals.find((item) => item.id === goal.id)
    if (!currentGoal) throw new Error('Savings goal not found.')
    if (movement === 'withdrawal' && amount > currentGoal.savedAmount) {
      throw new Error('You cannot withdraw more than the amount saved.')
    }

    const updatedGoal = {
      ...currentGoal,
      savedAmount:
        currentGoal.savedAmount + (movement === 'contribution' ? amount : -amount),
      history: [
        {
          id: globalThis.crypto.randomUUID(),
          movement,
          amount,
          note,
          createdAt: new Date().toISOString(),
        },
        ...currentGoal.history,
      ],
    }
    saveDemoGoals(goals.map((item) => (item.id === goal.id ? updatedGoal : item)))
    return {
      completedNow:
        movement === 'contribution' &&
        currentGoal.savedAmount < currentGoal.targetAmount &&
        updatedGoal.savedAmount >= currentGoal.targetAmount,
    }
  }

  requireSupabaseUser(userId)
  const { data: completedNow, error } = await supabase.rpc('record_savings_goal_movement', {
    p_goal_id: goal.id,
    p_movement: movement,
    p_amount: amount,
    p_note: note,
  })
  if (error) throw error
  return { completedNow: Boolean(completedNow) }
}

export async function getSavingsGoalHistory(
  goal,
  userId,
  page = 1,
  signal,
) {
  if (isDemoMode) {
    const start = (page - 1) * historyPageSize
    const history = [...goal.history].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    )
    return {
      entries: history.slice(start, start + historyPageSize),
      totalCount: history.length,
      hasNext: start + historyPageSize < history.length,
    }
  }

  requireSupabaseUser(userId)
  const start = (page - 1) * historyPageSize
  let query = supabase
    .from('savings_goal_contributions')
    .select('id,movement,amount,note,created_at', { count: 'planned' })
    .eq('goal_id', goal.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(start, start + historyPageSize)
  if (signal) query = query.abortSignal(signal)

  const { data, count, error } = await query
  if (error) throw error
  const entries = data || []
  return {
    entries: entries.slice(0, historyPageSize).map(mapHistoryRow),
    totalCount: Math.max(count ?? 0, start + entries.length),
    hasNext: entries.length > historyPageSize,
  }
}
