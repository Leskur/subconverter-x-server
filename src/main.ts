import { serve } from '@hono/node-server'
import app from './app.js'

const port = Number(process.env.PORT) || 15500

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' })
console.log(`Server is running at http://localhost:${port}`)
console.log(`API docs: http://localhost:${port}/docs`)
