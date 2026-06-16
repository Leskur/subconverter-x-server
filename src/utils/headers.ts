const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

export function buildUpstreamHeaders(
  incoming?: Headers,
  overrideUserAgent?: string,
): Record<string, string> {
  const headers: Record<string, string> = {}

  if (incoming) {
    incoming.forEach((value, key) => {
      if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return
      headers[key] = value
    })
  }

  if (overrideUserAgent) {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'user-agent') delete headers[key]
    }
    headers['User-Agent'] = overrideUserAgent
  }

  if (!Object.keys(headers).some((key) => key.toLowerCase() === 'accept')) {
    headers['Accept'] = '*/*'
  }

  return headers
}
