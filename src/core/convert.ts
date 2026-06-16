import type { ConvertInput, ConvertResult } from '../types/proxy.js'
import { formatProxies } from './format.js'
import { ingestSubscription, type IngestOptions } from './ingest.js'
import { parseProxyLines, parseSubscription } from './parse.js'
import { resolveClient } from './route.js'
import { resolveClashExtras } from '../profiles/merge.js'
import { rulesStore } from '../profiles/store.js'
import { logRequest } from '../utils/log.js'

export interface ConvertOptions extends IngestOptions {
  defaultClient?: ConvertInput['forceClient']
  fallbackUserAgent?: string
}

const DEFAULT_FALLBACK_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function isBrowserUserAgent(userAgent: string | undefined): boolean {
  return !!userAgent && /mozilla\//i.test(userAgent)
}

export async function fetchRawSubscription(
  input: Pick<ConvertInput, 'upstreamUrl' | 'requestHeaders'>,
  options: ConvertOptions = {},
): Promise<string> {
  return ingestSubscription(input.upstreamUrl, {
    ...options,
    requestHeaders: input.requestHeaders,
  })
}

export async function convertSubscription(
  input: ConvertInput,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  const userAgent = input.requestHeaders?.get('user-agent') ?? undefined

  const body = await ingestSubscription(input.upstreamUrl, {
    ...options,
    requestHeaders: input.requestHeaders,
  })
  let { format, nodes, proxyGroups, rules } = parseSubscription(body)
  logRequest('parsed', { format, nodes: nodes.length })

  const fallbackUa = options.fallbackUserAgent ?? DEFAULT_FALLBACK_USER_AGENT
  const shouldRetry =
    nodes.length === 0 &&
    !isBrowserUserAgent(userAgent) &&
    fallbackUa.toLowerCase() !== userAgent?.toLowerCase()
  if (shouldRetry) {
    const retryBody = await ingestSubscription(input.upstreamUrl, {
      ...options,
      requestHeaders: input.requestHeaders,
      overrideUserAgent: fallbackUa,
    })
    const retry = parseSubscription(retryBody)
    logRequest('parsed', { retryUa: fallbackUa, format: retry.format, nodes: retry.nodes.length })

    if (retry.nodes.length > 0) {
      format = retry.format
      nodes = retry.nodes
      proxyGroups = retry.proxyGroups
      rules = retry.rules
    }
  }

  if (nodes.length === 0) {
    throw new Error('No supported proxy nodes found in upstream subscription')
  }

  const client = resolveClient(userAgent, input.forceClient, options.defaultClient ?? 'singbox')

  let clashExtras
  if (client === 'clash' || client === 'surge') {
    const rulesConfig = await rulesStore.get()
    clashExtras = resolveClashExtras(nodes, rulesConfig, { proxyGroups, rules })
  }

  const formatted = formatProxies(nodes, client, clashExtras)

  return {
    ...formatted,
    client,
    nodeCount: nodes.length,
  }
}

export async function convertFromLines(
  lines: string[],
  input: Pick<ConvertInput, 'requestHeaders' | 'forceClient'> = {},
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  const nodes = parseProxyLines(lines)

  if (nodes.length === 0) {
    throw new Error('No supported proxy nodes found in input')
  }

  const userAgent = input.requestHeaders?.get('user-agent') ?? undefined
  const client = resolveClient(userAgent, input.forceClient, options.defaultClient ?? 'singbox')
  const formatted = formatProxies(nodes, client)

  return {
    ...formatted,
    client,
    nodeCount: nodes.length,
  }
}
