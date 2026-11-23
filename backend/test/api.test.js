import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'

async function withServer(run) {
  const server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const address = server.address()
  try {
    await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
}

test('health endpoint reports backend status', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`)
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.status, 'ok')
    assert.equal(body.service, 'finance-tracker-backend')
  })
})

test('protected endpoints require a bearer token', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/financial/summary`)
    assert.equal(response.status, 401)
    const body = await response.json()
    assert.equal(body.error.code, 'REQUEST_ERROR')
  })
})

test('unknown routes return a documented not-found response', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/not-real`)
    assert.equal(response.status, 404)
    const body = await response.json()
    assert.equal(body.error.code, 'NOT_FOUND')
  })
})

test('invalid bearer token fails closed', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/financial/spending`, {
      headers: { Authorization: 'Bearer invalid-token' },
    })
    assert.equal(response.status, 401)
  })
})
