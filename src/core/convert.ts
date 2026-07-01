import { parse as parseYaml } from 'yaml'
import type { ConvertInput, ConvertResult } from './types.js'
import { formatProxies, type FormatExtras } from './format.js'
import { ingestSubscription, type IngestOptions } from './ingest.js'
import { parseSubscription } from './parse.js'
import { resolveClient } from './client.js'
import { resolveClashExtras } from '../rules/merge.js'
import { expandRulesetRefs } from '../rules/ruleset.js'
import { rulesStore } from '../rules/store.js'
import { subscriptionStore } from '../subscription/store.js'
import { templateStore } from './templates.js'

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

async function loadSingboxTemplate(): Promise<Record<string, unknown>> {
  try {
    const raw = await templateStore.get('singbox')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    return {}
  } catch {
    return {}
  }
}

export interface ConvertOptions extends IngestOptions {
  defaultClient?: ConvertInput['forceClient']
  fallbackUserAgent?: string
}

const DEFAULT_FALLBACK_USER_AGENT = 'clash.meta'

const CLIENT_UA: Record<string, string> = {
  clash: 'ClashforWindows/0.20.39',
  surge: 'Surge/2024',
  singbox: 'SFA/1.13.13 (678; sing-box 1.13.13; language zh_CN)',
  surfboard: 'Surfboard/2.4',
  loon: 'Loon/3.2',
  quanx: 'Quantumult%20X/1.0.30',
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

  const overrideUa = isBrowserUserAgent(userAgent) ? 'clash.meta' : undefined
  const body = await ingestSubscription(input.upstreamUrl, {
    ...options,
    requestHeaders: input.requestHeaders,
    overrideUserAgent: overrideUa,
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

  // Retry strategy: if upstream returned 0 nodes, try again with a different UA.
  // 1. Client retry: use a known UA for the target client (e.g. Clash, Surge).
  //    This handles airports that require a specific client UA to return YAML.
  // 2. Fallback retry: if no client-specific UA applies, use a generic clash.meta UA.
  //    Skipped if the original UA is already a browser UA (already overridden above).
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

  const extras: FormatExtras = {}
  let proxyGroupsSource: 'upstream' | 'template' | undefined
  const rulesConfig = await rulesStore.get()
  if (rulesConfig?.rules) {
    rulesConfig.rules = await expandRulesetRefs(rulesConfig.rules)
  }
  if (client !== 'singbox') {
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
    extras.clashExtras = resolveClashExtras(rulesConfig, { proxyGroups: resolvedProxyGroups, rules, topLevel: resolvedTopLevel })
  } else {
    extras.singboxTemplate = await loadSingboxTemplate()
    extras.singboxRules = rulesConfig?.rules
  }

  const subConfig = await subscriptionStore.get()
  const updateInterval = subConfig.updateInterval

  const formatted = formatProxies(nodes, client, extras, input.managedConfigUrl, updateInterval)
  const proxyGroupCount = extras.clashExtras?.proxyGroups?.length
  const ruleCount = extras.clashExtras?.rules?.length ?? extras.singboxRules?.length

  return {
    ...formatted,
    client,
    nodeCount: nodes.length,
    format,
    proxyGroupsSource,
    proxyGroupCount,
    ruleCount,
  }
}
