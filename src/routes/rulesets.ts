import { Hono } from 'hono'
import { rulesetsStore, type CustomRuleset } from '../rules/rulesets-store.js'

const app = new Hono()

app.get('/', async (c) => {
  const rulesets = await rulesetsStore.getAll()
  return c.json(rulesets)
})

app.put('/', async (c) => {
  let body: CustomRuleset[]
  try {
    body = await c.req.json()
    if (!Array.isArray(body)) throw new Error('Expected array')
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  const saved = await rulesetsStore.save(body)
  return c.json(saved)
})

export default app
