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

/** 由入站头组装「拉取订阅链接」时的请求头；可指定 fetchUserAgent 覆盖 UA */
export function buildFetchHeaders(
  incoming?: Headers,
  fetchUserAgent?: string,
): Record<string, string> {
  const headers: Record<string, string> = {}

  if (incoming) {
    incoming.forEach((value, key) => {
      if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return
      headers[key] = value
    })
  }

  if (fetchUserAgent) {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'user-agent') delete headers[key]
    }
    headers['User-Agent'] = fetchUserAgent
  }

  if (!Object.keys(headers).some((key) => key.toLowerCase() === 'accept')) {
    headers['Accept'] = '*/*'
  }

  return headers
}
