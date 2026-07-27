import { createMiddleware } from 'hono/factory'
import { timingSafeEqual } from 'node:crypto'

let activeToken: string | null = null

export function setAuthToken(token: string | null) {
  activeToken = token
}

export function getAuthToken(): string | null {
  return activeToken ?? (process.env.ADMIN_TOKEN || null)
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const token = getAuthToken()
  if (!token) return next()

  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  if (!safeCompare(auth.slice(7), token)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return next()
})
