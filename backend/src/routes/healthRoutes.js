import { Router } from 'express'
import { env } from '../config/env.js'

const router = Router()

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'finance-tracker-backend',
    supabaseConfigured: env.isConfigured,
  })
})

export default router
