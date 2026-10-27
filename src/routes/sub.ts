import { Hono } from 'hono'
import { convertSubscription, resolveFetchUserAgent } from '../core/convert.js'
import { ingestSubscription } from '../core/ingest.js'
import { detectOutputClient } from '../core/client.js'
import { logSubAccess } from '../utils/sub-log.js'

const app = new Hono()

app.get('/', async (c) => {
  const started = Date.now()
  const userAgent = c.req.header('user-agent') ?? undefined
  const subscriptionUrl = c.req.query('url')
  const target = c.req.query('target') ?? undefined
  const fetchUserAgent = resolveFetchUserAgent(
    c.req.query('ua')?.trim() || undefined,
    userAgent,
  )

  if (!subscriptionUrl) {
    logSubAccess(c, started, 400, { error: 'missing url' })
    return c.json({ error: 'Missing required query parameter: url' }, 400)
  }

  // 输出客户端：优先 target，否则从 User-Agent 识别；认不出则透传
  const outputClient = detectOutputClient(userAgent, target)
  const incomingHeaders = new Headers(c.req.raw.headers)

  if (!outputClient) {
    try {
      const raw = await ingestSubscription(subscriptionUrl, {
        incomingHeaders,
        fetchUserAgent,
      })
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
      subscriptionUrl,
      incomingHeaders,
      outputClient,
      fetchUserAgent,
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
    logSubAccess(c, started, 400, { client: outputClient, error: message })
    return c.json({ error: message }, 400)
  }
})

export default app
