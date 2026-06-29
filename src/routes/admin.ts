import { Hono } from 'hono'
import { VERSION } from '../utils/version.js'

const app = new Hono()

app.get('/meta', (c) => {
  return c.json({
    service: 'subconverter-x',
    version: VERSION,
    authEnabled: !!process.env.ADMIN_TOKEN,
  })
})

export default app
