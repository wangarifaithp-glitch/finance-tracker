import { Router } from 'express'
import { financialController } from '../controllers/financialController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import {
  budgetSchema,
  dateRangeSchema,
} from '../validation/schemas.js'

const router = Router()

router.use(requireAuth)
router.get('/summary', validate(dateRangeSchema), financialController.summary)
router.get('/spending', validate(dateRangeSchema), financialController.spending)
router.get('/budgets', validate(budgetSchema), financialController.budgets)
router.get('/savings', financialController.savings)
router.get('/insights', financialController.insights)

export default router
