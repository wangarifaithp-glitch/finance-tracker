import { Router } from 'express'
import { transactionController } from '../controllers/transactionController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
  createTransactionSchema,
  transactionIdSchema,
  transactionListSchema,
  updateTransactionSchema,
} from '../validation/schemas.js'

const router = Router()

router.use(requireAuth)
router.get('/', validate(transactionListSchema), transactionController.list)
router.post('/', validate(createTransactionSchema), transactionController.create)
router.patch('/:id', validate(updateTransactionSchema), transactionController.update)
router.delete('/:id', validate(transactionIdSchema), transactionController.remove)

export default router
