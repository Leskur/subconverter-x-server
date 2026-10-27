import type { Context } from 'hono'
import { logAccess } from './log.js'

export function logSubAccess(c: Context, started: number, status: number, extra: Record<string, unknown> = {}): void {
  const rawUrl = c.req.query('url')
  const target = c.req.query('target')
  logAccess({
    method: c.req.method,
    path: '/sub',
    status,
    latency: `${Date.now() - started}ms`,
    ...(rawUrl ? { url: rawUrl } : {}),
    ...(target ? { target } : {}),
    ...extra,
  })
}
