import { handleRequest } from './handler.js'

export interface LambdaEvent {
  rawPath?: string
  path?: string
  rawQueryString?: string
  queryStringParameters?: Record<string, string | undefined> | null
  headers?: Record<string, string | undefined> | null
  requestContext?: {
    http?: {
      method?: string
      path?: string
    }
  }
  httpMethod?: string
}

export interface LambdaResult {
  statusCode: number
  headers?: Record<string, string>
  body: string
}

function buildUrl(event: LambdaEvent): string {
  const path = event.rawPath ?? event.path ?? event.requestContext?.http?.path ?? '/'
  const query = event.rawQueryString
    ? `?${event.rawQueryString}`
    : event.queryStringParameters
      ? `?${new URLSearchParams(
          Object.entries(event.queryStringParameters).filter((entry): entry is [string, string] => !!entry[1]),
        ).toString()}`
      : ''

  return `https://localhost${path}${query}`
}

function buildHeaders(event: LambdaEvent): Headers {
  const headers = new Headers()
  const source = event.headers ?? {}

  for (const [key, value] of Object.entries(source)) {
    if (value) headers.set(key, value)
  }

  return headers
}

export async function handler(event: LambdaEvent): Promise<LambdaResult> {
  const method = event.requestContext?.http?.method ?? event.httpMethod ?? 'GET'
  const request = new Request(buildUrl(event), {
    method,
    headers: buildHeaders(event),
  })

  const response = await handleRequest(request)
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
  }
}

export default handler
