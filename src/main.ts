import { serve } from '@hono/node-server'
import app from './app.js'
import { configStore } from './config/store.js'
import { setAuthToken, getAuthToken } from './middleware/auth.js'

const port = Number(process.env.PORT) || 15500

async function main() {
  // Load or generate token on first launch
  if (!process.env.ADMIN_TOKEN) {
    const token = await configStore.ensureToken()
    setAuthToken(token)
  }

  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' })
  console.log(`Server is running at http://localhost:${port}`)
  console.log(`API docs: http://localhost:${port}/docs`)
  if (getAuthToken()) {
    console.log(`Auth token: ${getAuthToken()}`)
  }
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
