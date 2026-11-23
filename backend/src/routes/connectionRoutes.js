import { Router } from 'express'
import { connectionController } from '../controllers/connectionController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { z } from 'zod'

const idParams = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.any().optional(),
  body: z.any().optional(),
})
const providerParams = z.object({
  params: z.object({ provider: z.enum(['mpesa','equity','kcb','cooperative','visa','mastercard','paypal']) }),
  query: z.any().optional(),
  body: z.any().optional(),
})

const router = Router()

router.use(requireAuth)
router.get('/providers', connectionController.providers)
router.get('/', connectionController.list)
router.get('/sync-events', connectionController.syncHistory)
router.get('/:id/accounts', validate(idParams), connectionController.accounts)
router.post('/providers/:provider/connect', validate(providerParams), connectionController.connect)
router.post('/:id/sync', validate(idParams), connectionController.sync)
router.get('/:id/sync-runs', validate(idParams), connectionController.syncRuns)
router.delete('/:id', validate(idParams), connectionController.disconnect)

export default router
