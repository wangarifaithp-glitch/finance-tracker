import crypto from 'node:crypto'
import { env } from '../config/env.js'

function getKey() {
  if (!env.connectionTokenEncryptionKey) {
    throw new Error('Connection token encryption is not configured.')
  }
  if (env.connectionTokenEncryptionKey.length < 32) {
    throw new Error('Connection token encryption key is too short.')
  }
  return crypto.createHash('sha256')
    .update(env.connectionTokenEncryptionKey)
    .digest()
}

export function encryptSecret(value) {
  if (typeof value !== 'string' || !value) throw new Error('Secret value is required.')
  const nonce = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), nonce)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: Buffer.concat([ciphertext, tag]).toString('base64'),
    nonce: nonce.toString('base64'),
  }
}

export function decryptSecret(ciphertextBase64, nonceBase64) {
  const ciphertextAndTag = Buffer.from(ciphertextBase64, 'base64')
  const nonce = Buffer.from(nonceBase64, 'base64')
  if (ciphertextAndTag.length < 16 || nonce.length !== 12) {
    throw new Error('Encrypted secret is invalid.')
  }
  const ciphertext = ciphertextAndTag.subarray(0, ciphertextAndTag.length - 16)
  const tag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16)
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), nonce)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
