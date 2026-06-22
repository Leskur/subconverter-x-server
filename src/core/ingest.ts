import { assertSafeUpstreamUrl } from '../utils/uri.js'
import { buildUpstreamHeaders } from '../utils/headers.js'

export interface IngestOptions {
  fetchImpl?: typeof fetch
  timeoutMs?: number
  requestHeaders?: Headers
  overrideUserAgent?: string
}

export async function fetchUpstream(
  rawUrl: string,
  options: IngestOptions = {},
): Promise<string> {
  const url = assertSafeUpstreamUrl(rawUrl)
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 15_000
  const headers = buildUpstreamHeaders(options.requestHeaders, options.overrideUserAgent)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Upstream responded with ${response.status}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

export async function ingestSubscription(
  rawUrl: string,
  options: IngestOptions = {},
): Promise<string> {
  return fetchUpstream(rawUrl, options)
}
