import { Hono } from 'hono'
import { VERSION } from '../utils/version.js'
import { getDocsHtml } from './openapi.js'

const app = new Hono()

app.get('/health', (c) => c.json({ ok: true, service: 'subconverter-x' }))
app.get('/version', (c) => c.json({ version: VERSION }))
app.get('/docs', (c) => c.html(getDocsHtml(new URL(c.req.url).origin)))
app.get('/docs/', (c) => c.html(getDocsHtml(new URL(c.req.url).origin)))

export default app
