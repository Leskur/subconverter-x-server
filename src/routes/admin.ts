import { Hono } from 'hono'
import { VERSION } from '../utils/version.js'
import { getAuthToken } from '../middleware/auth.js'

const app = new Hono()

app.get('/meta', (c) => {
  return c.json({
    service: 'subconverter-x',
    version: VERSION,
    authEnabled: !!getAuthToken(),
  })
})

export default app
