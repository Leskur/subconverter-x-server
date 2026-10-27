import { Hono } from 'hono'
import type { RulesInput } from '../rules/types.js'
import { rulesStore } from '../rules/store.js'

const app = new Hono()

app.get('/default', async (c) => {
  return c.json(await rulesStore.getDefault())
})

app.post('/reset', async (c) => {
  return c.json(await rulesStore.reset())
})

app.get('/', async (c) => {
  return c.json(await rulesStore.get())
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
