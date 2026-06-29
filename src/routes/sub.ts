import { Hono } from 'hono'
import { convertSubscription, fetchRawSubscription } from '../core/convert.js'
import { resolveClientOrNull } from '../core/client.js'
import { logRequest } from '../utils/log.js'

const app = new Hono()

app.get('/', async (c) => {
  const started = Date.now()
  const url = new URL(c.req.url)
  const userAgent = c.req.header('user-agent') ?? undefined
  const upstreamUrl = c.req.query('url')
  const forceClient = c.req.query('target') ?? c.req.query('ua') ?? undefined

  if (!upstreamUrl) {
    logRequest('request', { path: url.pathname, status: 400, error: 'missing url', latency: `${Date.now() - started}ms` })
    return c.json({ error: 'Missing required query parameter: url' }, 400)
  }

  const client = resolveClientOrNull(userAgent, forceClient)
  logRequest('request', { client: client ?? 'passthrough', target: forceClient, ua: userAgent, url: upstreamUrl })

  if (!client) {
    try {
      const raw = await fetchRawSubscription({ upstreamUrl, requestHeaders: new Headers(c.req.raw.headers) })
      logRequest('response', { status: 200, client: 'passthrough', bytes: raw.length, latency: `${Date.now() - started}ms`, url: upstreamUrl })
      return c.text(raw, 200, { 'Content-Type': 'text/plain; charset=utf-8' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fetch failed'
      logRequest('response', { status: 400, error: message, latency: `${Date.now() - started}ms`, url: upstreamUrl })
      return c.json({ error: message }, 400)
    }
  }

  try {
    const result = await convertSubscription({
      upstreamUrl,
      requestHeaders: new Headers(c.req.raw.headers),
      forceClient: client,
      managedConfigUrl: c.req.url,
    })
    logRequest('response', {
      status: 200,
      client: result.client,
      format: result.format,
      groups: result.proxyGroupsSource,
      nodeCount: result.nodeCount,
      groupCount: result.proxyGroupCount,
      ruleCount: result.ruleCount,
      size: result.body.length,
      latency: `${Date.now() - started}ms`,
      url: upstreamUrl,
    })
    return c.body(result.body, 200, { 'Content-Type': result.contentType })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Conversion failed'
    logRequest('response', { status: 400, client, error: message, latency: `${Date.now() - started}ms`, url: upstreamUrl })
    return c.json({ error: message }, 400)
  }
})

export default app
