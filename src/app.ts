import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import { logRequest } from './utils/log.js'
import adminRoutes from './routes/admin.js'
import rulesRoutes from './routes/rules.js'
import rulesetsRoutes from './routes/rulesets.js'
import subRoutes from './routes/sub.js'
import systemRoutes from './routes/system.js'

function corsOrigin(): string {
  return process.env.CORS_ORIGIN ?? '*'
}

function requestLogger() {
  return createMiddleware(async (c, next) => {
    const started = Date.now()
    const method = c.req.method
    const path = new URL(c.req.url).pathname
    const ua = c.req.header('user-agent') ?? undefined
    logRequest('request', { method, path, ua })
    await next()
    logRequest('response', { path, status: c.res.status, latency: `${Date.now() - started}ms` })
  })
}

const app = new Hono()

app.use(
  '*',
  cors({
    origin: corsOrigin(),
    allowMethods: ['GET', 'PUT', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use('*', requestLogger())

app.route('/', systemRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/rules', rulesRoutes)
app.route('/api/rulesets', rulesetsRoutes)
app.route('/sub', subRoutes)

app.all('/api/profiles/*', (c) => c.json({ error: 'Profiles API removed. Use GET/PUT /api/rules' }, 410))

app.notFound((c) => c.json({ error: 'Not Found' }, 404))

export default app
