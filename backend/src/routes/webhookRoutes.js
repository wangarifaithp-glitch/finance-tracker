import { Router } from 'express'
import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { verifyWebhookSignature } from '../utils/webhook.js'
import { createBackendSupabaseClient } from '../config/supabase.js'
import { AppError } from '../utils/errors.js'
import { getProviderAdapter } from '../services/transactionSyncService.js'

const router = Router()

router.post('/:provider', async (req, res, next) => {
  try {
    const provider = req.params.provider
    if (!Object.hasOwn(env.webhookSecrets, provider)) {
      throw new AppError('Webhook provider is not supported.', 404)
    }
    const secret = env.webhookSecrets[provider]
    const signature = req.get('x-finance-tracker-signature') || req.get('x-signature') || ''
    if (!secret || !verifyWebhookSignature(req.rawBody, signature, secret)) {
      throw new AppError('Webhook signature is invalid.', 401, 'INVALID_WEBHOOK_SIGNATURE')
    }

    const providerEventId =
      req.body?.id ||
      req.body?.event_id ||
      req.get('x-provider-event-id') ||
      crypto.createHash('sha256').update(req.rawBody).digest('hex')
    const payloadHash = crypto.createHash('sha256').update(req.rawBody).digest('hex')
    const supabase = createBackendSupabaseClient()
    const { data: webhookEvent, error } = await supabase
      .from('financial_webhook_events')
      .insert({
        provider,
        provider_event_id: String(providerEventId).slice(0, 255),
        event_type: String(req.body?.type || req.body?.event_type || 'provider_event').slice(0, 80),
        payload_hash: payloadHash,
        status: 'received',
      })
      .select('id')
      .single()
    if (error?.code === '23505') {
      return res.status(202).json({ data: { status: 'duplicate', processed: false } })
    }
    if (error) throw new AppError('Webhook could not be recorded.', 502, 'SUPABASE_ERROR')

    const adapter = getProviderAdapter(provider)
    if (!adapter?.processWebhook) {
      await supabase
        .from('financial_webhook_events')
        .update({
          status: 'ignored',
          error_code: 'ADAPTER_NOT_CONFIGURED',
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookEvent.id)
      return res.status(202).json({
        data: { status: 'ignored', processed: false, reason: 'PROVIDER_ADAPTER_NOT_CONFIGURED' },
      })
    }

    try {
      await adapter.processWebhook({
        supabase,
        payload: req.body,
        rawBody: req.rawBody,
      })
      await supabase
        .from('financial_webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', webhookEvent.id)
      return res.status(202).json({ data: { status: 'processed', processed: true } })
    } catch (processingError) {
      await supabase
        .from('financial_webhook_events')
        .update({
          status: 'failed',
          error_code: 'PROCESSING_FAILED',
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookEvent.id)
      throw new AppError('Webhook was received but could not be processed.', 502, 'WEBHOOK_PROCESSING_FAILED')
    }
  } catch (error) {
    next(error)
  }
})

export default router
