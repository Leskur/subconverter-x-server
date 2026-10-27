import { Hono } from 'hono'
import { convertSubscription, fetchRawSubscription } from '../core/convert.js'
import { resolveClientOrNull } from '../core/client.js'
import { logSubAccess } from '../utils/sub-log.js'

const app = new Hono()

app.get('/', async (c) => {
  const started = Date.now()
  const userAgent = c.req.header('user-agent') ?? undefined
  const upstreamUrl = c.req.query('url')
  const forceClient = c.req.query('target') ?? undefined

  if (!upstreamUrl) {
    logSubAccess(c, started, 400, { error: 'missing url' })
    return c.json({ error: 'Missing required query parameter: url' }, 400)
  }

  const client = resolveClientOrNull(userAgent, forceClient)

  if (!client) {
    try {
      const raw = await fetchRawSubscription({ upstreamUrl, requestHeaders: new Headers(c.req.raw.headers) })
      logSubAccess(c, started, 200, { mode: 'passthrough', bytes: raw.length })
      return c.text(raw, 200, { 'Content-Type': 'text/plain; charset=utf-8' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fetch failed'
      logSubAccess(c, started, 400, { mode: 'passthrough', error: message })
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
    logSubAccess(c, started, 200, {
      client: result.client,
      format: result.format,
      nodes: result.nodeCount,
      emitted: result.emittedCount,
      groups: result.proxyGroupCount,
      rules: result.ruleCount,
      bytes: result.body.length,
    })
    return c.body(result.body, 200, { 'Content-Type': result.contentType })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Conversion failed'
    logSubAccess(c, started, 400, { client, error: message })
    return c.json({ error: message }, 400)
  }
})

export default app
