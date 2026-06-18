import { parse as parseYaml } from 'yaml'
import type { ConvertInput, ConvertResult } from '../types/proxy.js'
import { formatProxies } from './format.js'
import { ingestSubscription, type IngestOptions } from './ingest.js'
import { parseProxyLines, parseSubscription } from './parse.js'
import { resolveClient } from './route.js'
import { resolveClashExtras } from '../profiles/merge.js'
import { rulesStore } from '../profiles/store.js'
import { templateStore } from '../profiles/templates.js'
import { logRequest } from '../utils/log.js'

const CLASH_SKIP_KEYS = new Set(['proxies', 'proxy-groups', 'rules'])

async function loadClashTemplateTopLevel(): Promise<Record<string, unknown>> {
  try {
    const raw = await templateStore.get('clash')
    const doc = parseYaml(raw)
    if (!doc || typeof doc !== 'object') return {}
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(doc as Record<string, unknown>)) {
      if (!CLASH_SKIP_KEYS.has(key)) result[key] = value
    }
    return result
  } catch {
    return {}
  }
}

export interface ConvertOptions extends IngestOptions {
  defaultClient?: ConvertInput['forceClient']
  fallbackUserAgent?: string
}

const DEFAULT_FALLBACK_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const CLIENT_UA: Record<string, string> = {
  clash: 'ClashforWindows/0.20.39',
  surge: 'Surge/2024',
  singbox: 'SFA/1.13.13 (678; sing-box 1.13.13; language zh_CN)',
}

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
  let { format, nodes, proxyGroups, rules, topLevel, raw } = parseSubscription(body)
  logRequest('parsed', { format, nodes: nodes.length })

  if (format === 'singbox' && raw) {
    return {
      body: raw,
      contentType: 'application/json; charset=utf-8',
      client: 'singbox',
      nodeCount: 0,
    }
  }

  const needsClientRetry =
    nodes.length === 0 && input.forceClient && CLIENT_UA[input.forceClient]
  const fallbackUa = options.fallbackUserAgent ?? DEFAULT_FALLBACK_USER_AGENT
  const needsFallbackRetry =
    nodes.length === 0 &&
    !needsClientRetry &&
    !isBrowserUserAgent(userAgent) &&
    fallbackUa.toLowerCase() !== userAgent?.toLowerCase()

  const retryUa = needsClientRetry ? CLIENT_UA[input.forceClient!] : needsFallbackRetry ? fallbackUa : null

  if (retryUa) {
    const retryBody = await ingestSubscription(input.upstreamUrl, {
      ...options,
      requestHeaders: input.requestHeaders,
      overrideUserAgent: retryUa,
    })
    const retry = parseSubscription(retryBody)
    logRequest('parsed', { retryUa, format: retry.format, nodes: retry.nodes.length })

    if (retry.format === 'singbox' && retry.raw) {
      return {
        body: retry.raw,
        contentType: 'application/json; charset=utf-8',
        client: 'singbox',
        nodeCount: 0,
      }
    }

    if (retry.nodes.length > 0) {
      format = retry.format
      nodes = retry.nodes
      proxyGroups = retry.proxyGroups
      rules = retry.rules
      topLevel = retry.topLevel
    }
  }

  if (nodes.length === 0) {
    throw new Error('No supported proxy nodes found in upstream subscription')
  }

  const client = resolveClient(userAgent, input.forceClient, options.defaultClient ?? 'singbox')

  let clashExtras
  if (client === 'clash' || client === 'surge') {
    const rulesConfig = await rulesStore.get()
    let resolvedTopLevel = topLevel
    if (!resolvedTopLevel || Object.keys(resolvedTopLevel).length === 0) {
      resolvedTopLevel = await loadClashTemplateTopLevel()
    }
    clashExtras = resolveClashExtras(rulesConfig, { proxyGroups, rules, topLevel: resolvedTopLevel })
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
