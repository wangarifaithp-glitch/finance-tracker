import { sampleTransactions } from './transactionData.js'
import { loadTransactions, saveTransactions } from './transactionStorage.js'
import {
  loadDemoFinancialAccounts,
  saveDemoFinancialAccounts,
} from './financialAccountData.js'
import { isDemoMode, isSupabaseConfigured, supabase } from './supabaseClient.js'

function requireSupabaseUser(userId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for this deployment.')
  }
  if (!userId) throw new Error('Sign in before accessing accounts.')
}

function summarizeDemoAccount(account, transactions) {
  let balance = Number(account.openingBalance || 0)
  let transactionCount = 0

  for (const transaction of transactions) {
    const isSource =
      transaction.accountId === account.id ||
      (!transaction.accountId && transaction.account === account.name)
    const isDestination =
      transaction.transferAccountId === account.id ||
      (!transaction.transferAccountId && transaction.transferAccount === account.name)

    if (isSource) {
      transactionCount += 1
      if (transaction.type === 'income') balance += transaction.amount
      if (transaction.type === 'expense' || transaction.type === 'transfer') {
        balance -= transaction.amount
      }
    }

    if (isDestination && transaction.type === 'transfer') {
      if (!isSource) transactionCount += 1
      balance += transaction.amount
    }
  }

  return { ...account, balance, transactionCount }
}

export async function getFinancialAccounts(userId, signal) {
  if (isDemoMode) {
    const accounts = loadDemoFinancialAccounts()
    const transactions = loadTransactions() ?? sampleTransactions
    return accounts.map((account) => summarizeDemoAccount(account, transactions))
  }

  requireSupabaseUser(userId)
  let query = supabase.rpc('get_financial_accounts')
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error

  return (data || []).map((account) => ({
    id: account.id,
    name: account.name,
    accountType: account.account_type,
    currency: account.currency,
    openingBalance: Number(account.opening_balance),
    balance: Number(account.balance),
    transactionCount: Number(account.transaction_count),
  }))
}

export async function saveFinancialAccount(account, userId, previousAccount) {
  const isEditing = Boolean(previousAccount)
  const name = account.name.trim()
  if (!name) throw new Error('Enter an account name.')
  if (!['cash', 'mpesa', 'bank', 'savings', 'other'].includes(account.accountType)) {
    throw new Error('Choose a valid account type.')
  }
  if (!Number.isFinite(account.openingBalance) || account.openingBalance < 0) {
    throw new Error('Enter a valid opening balance.')
  }

  if (isDemoMode) {
    const accounts = loadDemoFinancialAccounts()
    const duplicate = accounts.find(
      (item) =>
        item.id !== previousAccount?.id &&
        item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
    if (duplicate) throw new Error('An account with that name already exists.')

    const savedAccount = {
      id: previousAccount?.id || account.id || globalThis.crypto.randomUUID(),
      name,
      accountType: account.accountType,
      currency: account.currency || 'KES',
      openingBalance: account.openingBalance,
    }
    const nextAccounts = isEditing
      ? accounts.map((item) => (item.id === previousAccount.id ? savedAccount : item))
      : [...accounts, savedAccount]
    saveDemoFinancialAccounts(nextAccounts)

    if (isEditing) {
      const transactions = loadTransactions() ?? sampleTransactions
      saveTransactions(
        transactions.map((transaction) => {
          const isSource =
            transaction.accountId === previousAccount.id ||
            (!transaction.accountId && transaction.account === previousAccount.name)
          const isDestination =
            transaction.transferAccountId === previousAccount.id ||
            (!transaction.transferAccountId &&
              transaction.transferAccount === previousAccount.name)
          return {
            ...transaction,
            ...(isSource ? { account: name, accountId: savedAccount.id } : {}),
            ...(isDestination
              ? { transferAccount: name, transferAccountId: savedAccount.id }
              : {}),
          }
        }),
      )
    }
    return savedAccount
  }

  requireSupabaseUser(userId)
  const row = {
    user_id: userId,
    name,
    account_type: account.accountType,
    currency: account.currency || 'KES',
    opening_balance: account.openingBalance,
  }
  const result = isEditing
    ? await supabase
        .from('financial_accounts')
        .update(row)
        .eq('id', previousAccount.id)
        .select('id,name,account_type,currency,opening_balance')
        .single()
    : await supabase
        .from('financial_accounts')
        .insert(row)
        .select('id,name,account_type,currency,opening_balance')
        .single()
  if (result.error) {
    if (result.error.code === '23505') {
      throw new Error('An account with that name already exists.')
    }
    throw result.error
  }

  return {
    id: result.data.id,
    name: result.data.name,
    accountType: result.data.account_type,
    currency: result.data.currency,
    openingBalance: Number(result.data.opening_balance),
  }
}

export async function deleteFinancialAccount(account, userId) {
  if (isDemoMode) {
    saveDemoFinancialAccounts(
      loadDemoFinancialAccounts().filter((item) => item.id !== account.id),
    )
    const transactions = loadTransactions()
    if (transactions) {
      saveTransactions(
        transactions.map((transaction) => ({
          ...transaction,
          ...(transaction.accountId === account.id ? { accountId: null } : {}),
          ...(transaction.transferAccountId === account.id
            ? { transferAccountId: null }
            : {}),
        })),
      )
    }
    return
  }

  requireSupabaseUser(userId)
  const { error } = await supabase
    .from('financial_accounts')
    .delete()
    .eq('id', account.id)
  if (error) throw error
}
