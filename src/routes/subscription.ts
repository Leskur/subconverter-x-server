import { Hono } from 'hono'
import type { SubscriptionInput } from '../subscription/types.js'
import { subscriptionStore } from '../subscription/store.js'

const app = new Hono()

app.get('/', async (c) => {
  const config = await subscriptionStore.get()
  return c.json(config)
})

app.put('/', async (c) => {
  let body: SubscriptionInput
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  if (body.updateInterval !== 'auto' && (typeof body.updateInterval !== 'number' || body.updateInterval < 300)) {
    return c.json({ error: '更新间隔不能小于 5 分钟' }, 400)
  }
  const config = await subscriptionStore.save(body)
  return c.json(config)
})

app.post('/reset', async (c) => {
  const config = await subscriptionStore.reset()
  return c.json(config)
})

export default app
