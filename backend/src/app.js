import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import financialRoutes from './routes/financialRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'
import connectionRoutes from './routes/connectionRoutes.js'
import webhookRoutes from './routes/webhookRoutes.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true)
        callback(new Error('Origin is not allowed by CORS.'))
      },
      credentials: true,
    }),
  )
  app.use(express.json({
    limit: '100kb',
    verify: (req, _res, buffer) => {
      req.rawBody = buffer
    },
  }))
  app.use(
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      limit: env.rateLimitMax,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
      },
    }),
  )

  app.use('/health', healthRoutes)
  app.use('/api/v1/financial', financialRoutes)
  app.use('/api/v1/transactions', transactionRoutes)
  app.use('/api/v1/connections', connectionRoutes)
  app.use('/api/v1/webhooks', webhookRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
