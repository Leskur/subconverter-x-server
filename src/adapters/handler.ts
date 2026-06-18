import { convertSubscription, fetchRawSubscription } from '../core/convert.js'

import { resolveClientOrNull } from '../core/route.js'

import { corsHeadersForHandler, handleAdminMeta, handleRulesApi, handleTemplatesApi } from './profile-api.js'

import { logRequest } from '../utils/log.js'



const JSON_HEADERS = corsHeadersForHandler()



function jsonResponse(body: unknown, status = 200): Response {

  return new Response(JSON.stringify(body), {

    status,

    headers: {

      ...JSON_HEADERS,

      'Content-Type': 'application/json; charset=utf-8',

    },

  })

}



function textResponse(body: string, contentType: string, status = 200): Response {

  return new Response(body, {

    status,

    headers: {

      ...JSON_HEADERS,

      'Content-Type': contentType,

    },

  })

}



async function handleSub(request: Request, started: number): Promise<Response> {

  const url = new URL(request.url)

  const userAgent = request.headers.get('user-agent') ?? undefined

  const upstreamUrl = url.searchParams.get('url')

  const forceClient =

    url.searchParams.get('target') ?? url.searchParams.get('ua') ?? undefined



  logRequest('request', {

    method: request.method,

    path: url.pathname,

    ua: userAgent,

    target: forceClient,

    upstream: upstreamUrl ?? undefined,

  })



  if (!upstreamUrl) {

    const response = jsonResponse({ error: 'Missing required query parameter: url' }, 400)

    logRequest('response', {

      path: url.pathname,

      status: response.status,

      error: 'missing url',

      ms: Date.now() - started,

    })

    return response

  }



  const client = resolveClientOrNull(userAgent, forceClient)

  if (!client) {

    try {

      const raw = await fetchRawSubscription({

        upstreamUrl,

        requestHeaders: request.headers,

      })

      const response = textResponse(raw, 'text/plain; charset=utf-8', 200)

      logRequest('response', {

        path: url.pathname,

        status: response.status,

        client: 'passthrough',

        bytes: raw.length,

        ms: Date.now() - started,

      })

      return response

    } catch (error) {

      const message = error instanceof Error ? error.message : 'Fetch failed'

      const response = jsonResponse({ error: message }, 400)

      logRequest('response', {

        path: url.pathname,

        status: response.status,

        error: message,

        ms: Date.now() - started,

      })

      return response

    }

  }



  try {

    const result = await convertSubscription({

      upstreamUrl,

      requestHeaders: request.headers,

      forceClient: client,

    })



    const response = textResponse(result.body, result.contentType, 200)

    logRequest('response', {

      path: url.pathname,

      status: response.status,

      client: result.client,

      nodes: result.nodeCount,

      bytes: result.body.length,

      ms: Date.now() - started,

      body: result.body,

    })

    return response

  } catch (error) {

    const message = error instanceof Error ? error.message : 'Conversion failed'

    const response = jsonResponse({ error: message }, 400)

    logRequest('response', {

      path: url.pathname,

      status: response.status,

      error: message,

      ms: Date.now() - started,

    })

    return response

  }

}



export async function handleRequest(request: Request): Promise<Response> {

  const started = Date.now()

  const url = new URL(request.url)

  const userAgent = request.headers.get('user-agent') ?? undefined



  if (request.method === 'OPTIONS') {

    return new Response(null, {

      status: 204,

      headers: JSON_HEADERS,

    })

  }



  if (url.pathname === '/health') {

    logRequest('request', { method: request.method, path: url.pathname, ua: userAgent })

    const response = jsonResponse({ ok: true, service: 'subconverter-x' })

    logRequest('response', { path: url.pathname, status: response.status, ms: Date.now() - started })

    return response

  }




  if (url.pathname === '/api/admin/meta') {
    return handleAdminMeta()
  }

  if (url.pathname === '/api/rules') {
    return handleRulesApi(request)
  }

  if (url.pathname === '/api/templates/clash') {
    return handleTemplatesApi(request, 'clash')
  }

  if (url.pathname === '/api/templates/singbox') {
    return handleTemplatesApi(request, 'singbox')
  }

  if (url.pathname.startsWith('/api/profiles')) {

    return jsonResponse({ error: 'Profiles API removed. Use GET/PUT /api/rules' }, 410)

  }



  if (url.pathname === '/sub') {

    if (request.method !== 'GET') {

      return jsonResponse({ error: 'Method Not Allowed' }, 405)

    }

    return handleSub(request, started)

  }



  logRequest('request', { method: request.method, path: url.pathname, ua: userAgent })

  const response = jsonResponse({ error: 'Not Found' }, 404)

  logRequest('response', { path: url.pathname, status: response.status, ms: Date.now() - started })

  return response

}

