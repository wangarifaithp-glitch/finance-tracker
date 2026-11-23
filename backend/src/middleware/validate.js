import { ZodError } from 'zod'
import { AppError } from '../utils/errors.js'

export function validate(schema) {
  return (req, _res, next) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      if (!result.success) {
        const message = result.error.issues
          .map((issue) => issue.message)
          .join(' ')
        return next(new AppError(message, 400, 'VALIDATION_ERROR'))
      }
      req.validated = result.data
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return next(new AppError('The request is invalid.', 400, 'VALIDATION_ERROR'))
      }
      next(error)
    }
  }
}
