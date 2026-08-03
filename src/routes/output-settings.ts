import { Hono } from 'hono'
import { outputSettingsStore } from '../output-settings/store.js'
import type { OutputSettingsInput } from '../output-settings/types.js'

const app = new Hono()

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

app.get('/', async (c) => {
  return c.json(await outputSettingsStore.get())
})

app.get('/default', async (c) => {
  return c.json(await outputSettingsStore.getDefault())
})

app.put('/', async (c) => {
  let body: OutputSettingsInput
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (body.urlTestUrl !== undefined) {
    if (typeof body.urlTestUrl !== 'string' || !body.urlTestUrl.trim()) {
      return c.json({ error: 'urlTestUrl 不能为空' }, 400)
    }
    if (!isHttpUrl(body.urlTestUrl.trim())) {
      return c.json({ error: 'urlTestUrl 必须是 http(s) URL' }, 400)
    }
  }

  if (body.urlTestInterval !== undefined) {
    if (typeof body.urlTestInterval !== 'number' || body.urlTestInterval < 60) {
      return c.json({ error: 'urlTestInterval 不能小于 60 秒' }, 400)
    }
  }

  if (body.skipProxy !== undefined && typeof body.skipProxy !== 'string') {
    return c.json({ error: 'skipProxy 必须是字符串' }, 400)
  }

  if (body.dnsServer !== undefined) {
    if (typeof body.dnsServer !== 'string' || !body.dnsServer.trim()) {
      return c.json({ error: 'dnsServer 不能为空' }, 400)
    }
  }

  const config = await outputSettingsStore.save(body)
  return c.json(config)
})

app.post('/reset', async (c) => {
  return c.json(await outputSettingsStore.reset())
})

export default app
