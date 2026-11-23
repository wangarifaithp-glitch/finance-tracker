import crypto from 'node:crypto'

export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  const received = Buffer.from(signature.replace(/^sha256=/, '').trim())
  const expected = Buffer.from(digest)
  return received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
}
