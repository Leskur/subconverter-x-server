import { Hono } from 'hono'
import type { RulesInput } from '../rules/types.js'
import { rulesStore } from '../rules/store.js'

const app = new Hono()

app.get('/default', async (c) => {
  const rules = await rulesStore.getDefault()
  if (!rules) return c.json({ error: 'Default rules not found' }, 404)
  return c.json(rules)
})

app.post('/reset', async (c) => {
  const rules = await rulesStore.reset()
  if (!rules) return c.json({ error: 'Default rules not found' }, 404)
  return c.json(rules)
})

app.get('/', async (c) => {
  const rules = await rulesStore.get()
  if (!rules) return c.json({ error: 'Rules not found' }, 404)
  return c.json(rules)
})

app.put('/', async (c) => {
  let body: RulesInput
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  const rules = await rulesStore.save(body)
  return c.json(rules)
})

export default app
