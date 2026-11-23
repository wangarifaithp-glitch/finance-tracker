import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim()
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const env = {
  port: Number(process.env.PORT || 4000),
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '',
  connectionTokenEncryptionKey: process.env.CONNECTION_TOKEN_ENCRYPTION_KEY?.trim() || '',
  syncMaxAttempts: Number(process.env.SYNC_MAX_ATTEMPTS || 3),
  syncProviderTimeoutMs: Number(process.env.SYNC_PROVIDER_TIMEOUT_MS || 30000),
  webhookSecrets: {
    mpesa: process.env.MPESA_WEBHOOK_SECRET?.trim() || '',
    equity: process.env.EQUITY_WEBHOOK_SECRET?.trim() || '',
    kcb: process.env.KCB_WEBHOOK_SECRET?.trim() || '',
    cooperative: process.env.COOPERATIVE_WEBHOOK_SECRET?.trim() || '',
    visa: process.env.VISA_WEBHOOK_SECRET?.trim() || '',
    mastercard: process.env.MASTERCARD_WEBHOOK_SECRET?.trim() || '',
    paypal: process.env.PAYPAL_WEBHOOK_SECRET?.trim() || '',
  },
  corsOrigins,
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
  isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  enabledProviders: {
    mpesa: process.env.MPESA_ENABLED === 'true',
    equity: process.env.EQUITY_ENABLED === 'true',
    kcb: process.env.KCB_ENABLED === 'true',
    cooperative: process.env.COOPERATIVE_ENABLED === 'true',
    visa: process.env.VISA_ENABLED === 'true',
    mastercard: process.env.MASTERCARD_ENABLED === 'true',
    paypal: process.env.PAYPAL_ENABLED === 'true',
  },
}
