import {
  getBudgetAnalysis,
  getInsights,
  getSavingsAnalysis,
  getSpending,
  getSummary,
} from '../services/financialService.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const financialController = {
  summary: asyncHandler(async (req, res) => {
    const { from, to } = req.validated.query
    const data = await getSummary(req.supabase, req.auth.userId, from, to)
    res.json({ data })
  }),

  spending: asyncHandler(async (req, res) => {
    const { from, to } = req.validated.query
    const data = await getSpending(req.supabase, req.auth.userId, from, to)
    res.json({ data })
  }),

  budgets: asyncHandler(async (req, res) => {
    const data = await getBudgetAnalysis(
      req.supabase,
      req.auth.userId,
      req.validated.query.month,
    )
    res.json({ data })
  }),

  savings: asyncHandler(async (req, res) => {
    const data = await getSavingsAnalysis(req.supabase, req.auth.userId)
    res.json({ data })
  }),

  insights: asyncHandler(async (req, res) => {
    const data = await getInsights(req.supabase, req.auth.userId)
    res.json({ data })
  }),
}
