import { assertSafeSubscriptionUrl } from '../utils/uri.js'
import { buildFetchHeaders } from '../utils/headers.js'

export interface IngestOptions {
  fetchImpl?: typeof fetch
  timeoutMs?: number
  /** 客户端 → 本服务 的入站头，转发时会过滤 hop-by-hop */
  incomingHeaders?: Headers
  /** 本服务拉取订阅链接时使用的 User-Agent（覆盖入站 UA） */
  fetchUserAgent?: string
}

/** 实际 HTTP GET 订阅链接正文 */
async function fetchSubscription(
  rawUrl: string,
  options: IngestOptions = {},
): Promise<string> {
  const url = assertSafeSubscriptionUrl(rawUrl)
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? 15_000
  const headers = buildFetchHeaders(options.incomingHeaders, options.fetchUserAgent)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Subscription responded with ${response.status}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

/** 拉取订阅链接正文（可覆盖拉取时的 UA） */
export async function ingestSubscription(
  rawUrl: string,
  options: IngestOptions = {},
): Promise<string> {
  return fetchSubscription(rawUrl, options)
}
