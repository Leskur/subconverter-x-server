import type { RulesInput } from '../profiles/types.js'
import { rulesStore } from '../profiles/store.js'
import { getAppVersion } from '../utils/version.js'

function corsOrigin(): string {
  return process.env.CORS_ORIGIN ?? '*'
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': corsOrigin(),
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function isAuthEnabled(): boolean {
  return !!process.env.ADMIN_TOKEN
}

function isAuthorized(request: Request): boolean {
  const token = process.env.ADMIN_TOKEN
  if (!token) return true

  const header = request.headers.get('authorization')
  return header === `Bearer ${token}`
}

export async function handleAdminMeta(): Promise<Response> {
  const version = await getAppVersion()
  return jsonResponse({
    service: 'subconverter-x',
    version,
    authEnabled: isAuthEnabled(),
  })
}

export async function handleRulesApi(request: Request): Promise<Response> {
  if (request.method === 'GET') {
    const rules = await rulesStore.get()
    if (!rules) return jsonResponse({ error: 'Rules not found' }, 404)
    return jsonResponse(rules)
  }

  if (request.method === 'PUT') {
    if (!isAuthorized(request)) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    let body: RulesInput
    try {
      body = (await request.json()) as RulesInput
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const rules = await rulesStore.save(body)
    return jsonResponse(rules)
  }

  return jsonResponse({ error: 'Method Not Allowed' }, 405)
}

export function corsHeadersForHandler(): Record<string, string> {
  return corsHeaders()
}
