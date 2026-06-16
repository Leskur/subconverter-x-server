import { describe, expect, it } from 'vitest'
import { decodeSubscriptionBody, fetchUpstream } from '../src/core/ingest.js'
import { resolveClient } from '../src/core/route.js'
import { convertFromLines, convertSubscription } from '../src/core/convert.js'
import { buildUpstreamHeaders } from '../src/utils/headers.js'

describe('convertSubscription fallback UA', () => {
  function makeHtmlFetch() {
    let calls = 0
    const fetchImpl = async () => {
      calls += 1
      return new Response('<!DOCTYPE html><html>Just a moment...</html>', { status: 200 })
    }
    return { fetchImpl: fetchImpl as typeof fetch, getCalls: () => calls }
  }

  it('retries with browser UA when client UA is a non-browser client', async () => {
    const { fetchImpl, getCalls } = makeHtmlFetch()
    await expect(
      convertSubscription(
        { upstreamUrl: 'https://example.com/sub', requestHeaders: new Headers({ 'User-Agent': 'clash.meta' }), forceClient: 'clash' },
        { fetchImpl },
      ),
    ).rejects.toThrow()
    expect(getCalls()).toBe(2)
  })

  it('does not retry when client UA is already a browser', async () => {
    const { fetchImpl, getCalls } = makeHtmlFetch()
    const browserUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'
    await expect(
      convertSubscription(
        { upstreamUrl: 'https://example.com/sub', requestHeaders: new Headers({ 'User-Agent': browserUa }), forceClient: 'clash' },
        { fetchImpl },
      ),
    ).rejects.toThrow()
    expect(getCalls()).toBe(1)
  })
})

describe('buildUpstreamHeaders', () => {
  it('forwards client headers and strips hop-by-hop headers', () => {
    const incoming = new Headers({
      Host: 'localhost:3000',
      'User-Agent': 'clash-verge/v2.5.1',
      'Accept-Language': 'zh-CN',
      Connection: 'keep-alive',
      'Content-Length': '0',
    })

    expect(buildUpstreamHeaders(incoming)).toEqual({
      'user-agent': 'clash-verge/v2.5.1',
      'accept-language': 'zh-CN',
      Accept: '*/*',
    })
  })
})

describe('ingest', () => {
  it('decodes base64 subscription body', () => {
    const body = Buffer.from('vless://uuid@1.1.1.1:443#A\ntrojan://pw@2.2.2.2:443#B', 'utf8').toString('base64')
    const lines = decodeSubscriptionBody(body)
    expect(lines).toHaveLength(2)
  })

  it('forwards client headers to upstream fetch', async () => {
    let capturedHeaders: Record<string, string> | undefined
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string> | undefined
      return new Response('ss://chacha20-ietf-poly1305:pw@1.2.3.4:8388#Node', { status: 200 })
    }

    const requestHeaders = new Headers({
      'User-Agent': 'clash-verge/v2.5.1',
      'Accept-Language': 'en-US',
    })

    await fetchUpstream('https://example.com/sub', {
      fetchImpl: fetchImpl as typeof fetch,
      requestHeaders,
    })

    expect(capturedHeaders).toMatchObject({
      'user-agent': 'clash-verge/v2.5.1',
      'accept-language': 'en-US',
    })
    expect(capturedHeaders?.Host).toBeUndefined()
  })
})

describe('route', () => {
  it('prefers explicit ua override', () => {
    expect(resolveClient('ClashMeta/1.0', 'singbox')).toBe('singbox')
  })

  it('detects clash from user agent', () => {
    expect(resolveClient('clash.meta/android')).toBe('clash')
  })
})

describe('convertFromLines', () => {
  it('formats singbox json', async () => {
    const result = await convertFromLines(
      ['ss://chacha20-ietf-poly1305:pw@1.2.3.4:8388#Node'],
      { forceClient: 'singbox' },
    )

    expect(result.contentType).toContain('application/json')
    expect(result.body).toContain('"type": "shadowsocks"')
    expect(result.nodeCount).toBe(1)
  })

  it('formats clash yaml', async () => {
    const result = await convertFromLines(
      ['trojan://secret@9.9.9.9:443?sni=example.com#Node'],
      { forceClient: 'clash' },
    )

    expect(result.contentType).toContain('yaml')
    expect(result.body).toContain('proxies:')
    expect(result.body).toContain('proxy-groups:')
    expect(result.body).toContain('type: trojan')
  })

  it('applies rules.yaml for clash output', async () => {
    const ss = Buffer.from('ss://chacha20-ietf-poly1305:pw@1.2.3.4:8388#Node', 'utf8').toString('base64')
    const fetchImpl = async () => new Response(ss, { status: 200 })

    const result = await convertSubscription(
      {
        upstreamUrl: 'https://example.com/sub',
        requestHeaders: new Headers({ 'User-Agent': 'clash.meta' }),
        forceClient: 'clash',
      },
      { fetchImpl: fetchImpl as typeof fetch },
    )

    expect(result.body).toContain('rules:')
    expect(result.body).toContain('GEOIP,CN,DIRECT')
    expect(result.body).toContain('MATCH,PROXY')
  })
})
