import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/app.js'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('GET /sub', () => {
  it('returns 400 when url is missing', async () => {
    const res = await app.fetch(new Request('http://localhost/sub?target=clash'))
    assert.equal(res.status, 400)
    assert.match(res.headers.get('content-type') ?? '', /^application\/json/i)
    const body = await res.json()
    assert.equal(body.error, 'Missing required query parameter: url')
  })

  it('passthroughs raw subscription when client is not recognized', async () => {
    globalThis.fetch = async () => new Response('raw-subscription-body', { status: 200 })

    const res = await app.fetch(
      new Request('http://localhost/sub?url=http%3A%2F%2Fsource.local%2Fsub', {
        headers: { 'user-agent': 'curl/8.0.1' },
      }),
    )

    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8')
    assert.equal(await res.text(), 'raw-subscription-body')
  })

  it('converts subscription to clash yaml when target=clash', async () => {
    globalThis.fetch = async () =>
      new Response('ss://aes-128-gcm:password@example.com:8388#SS-Node', { status: 200 })

    const res = await app.fetch(
      new Request('http://localhost/sub?url=http%3A%2F%2Fsource.local%2Fsub&target=clash'),
    )

    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'application/yaml; charset=utf-8')
    const body = await res.text()
    assert.match(body, /^proxies:/m)
    assert.match(body, /name: SS-Node/)
  })
})
