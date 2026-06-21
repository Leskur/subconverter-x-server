import { parse as parseYaml } from 'yaml'
import type { ConvertInput, ConvertResult } from '../types/proxy.js'
import { formatProxies } from './format.js'
import { ingestSubscription, type IngestOptions } from './ingest.js'
import { parseProxyLines, parseSubscription } from './parse.js'
import { resolveClient } from './route.js'
import { resolveClashExtras } from '../profiles/merge.js'
import { rulesStore } from '../profiles/store.js'
import { templateStore } from '../profiles/templates.js'

const CLASH_SKIP_KEYS = new Set(['proxies', 'proxy-groups', 'rules'])

interface ClashTemplateExtras {
  topLevel: Record<string, unknown>
  proxyGroups: unknown[]
}

async function loadClashTemplate(): Promise<ClashTemplateExtras> {
  try {
    const raw = await templateStore.get('clash')
    const doc = parseYaml(raw)
    if (!doc || typeof doc !== 'object') return { topLevel: {}, proxyGroups: [] }
    const record = doc as Record<string, unknown>
    const topLevel: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(record)) {
      if (!CLASH_SKIP_KEYS.has(key)) topLevel[key] = value
    }
    const proxyGroups = Array.isArray(record['proxy-groups']) ? record['proxy-groups'] : []
    return { topLevel, proxyGroups }
  } catch {
    return { topLevel: {}, proxyGroups: [] }
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
  let proxyGroupsSource: 'upstream' | 'template' | undefined
  if (client === 'clash' || client === 'surge') {
    const rulesConfig = await rulesStore.get()
    let resolvedTopLevel = topLevel
    let resolvedProxyGroups = proxyGroups
    if (!resolvedTopLevel || Object.keys(resolvedTopLevel).length === 0) {
      const tmpl = await loadClashTemplate()
      resolvedTopLevel = tmpl.topLevel
      if (!resolvedProxyGroups || resolvedProxyGroups.length === 0) {
        resolvedProxyGroups = tmpl.proxyGroups
        proxyGroupsSource = 'template'
      } else {
        proxyGroupsSource = 'upstream'
      }
    } else {
      proxyGroupsSource = 'upstream'
    }
    clashExtras = resolveClashExtras(rulesConfig, { proxyGroups: resolvedProxyGroups, rules, topLevel: resolvedTopLevel })
  }

  const formatted = formatProxies(nodes, client, clashExtras)
  const proxyGroupCount = clashExtras?.proxyGroups?.length

  return {
    ...formatted,
    client,
    nodeCount: nodes.length,
    format,
    proxyGroupsSource,
    proxyGroupCount,
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
