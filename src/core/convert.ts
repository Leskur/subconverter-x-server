import { parse as parseYaml } from 'yaml'
import type { ConvertInput, ConvertResult } from './types.js'
import { formatProxies, type FormatExtras } from './format.js'
import { ingestSubscription, type IngestOptions } from './ingest.js'
import { parseSubscription } from './parse.js'
import { resolveOutputClient } from './client.js'
import { resolveClashExtras } from '../rules/merge.js'
import { expandRulesetRefs } from '../rules/ruleset.js'
import { rulesStore } from '../rules/store.js'
import { outputSettingsStore } from '../output-settings/store.js'
import { subscriptionStore } from '../subscription/store.js'
import { templateStore } from './templates.js'

const CLASH_SKIP_KEYS = new Set(['proxies', 'proxy-groups', 'rules'])

interface ClashTemplateExtras {
  topLevel: Record<string, unknown>
  proxyGroups: unknown[]
}

async function loadClashTemplate(): Promise<ClashTemplateExtras> {
  try {
    const raw = await templateStore.get()
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
  defaultClient?: ConvertInput['outputClient']
}

/** 按输出客户端预设的拉取 UA（部分订阅按 UA 返回不同内容） */
const FETCH_UA_BY_CLIENT: Record<string, string> = {
  clash: 'ClashforWindows/0.20.39',
  surge: 'Surge/2024',
  surfboard: 'Surfboard/2.4',
  loon: 'Loon/3.2',
  quanx: 'Quantumult%20X/1.0.30',
}

const BROWSER_FETCH_UA = 'clash-verge/v2.5.1'

function isBrowserUserAgent(userAgent: string | undefined): boolean {
  return !!userAgent && /mozilla\//i.test(userAgent)
}

/** 仅透传：拉取订阅链接原文，不改 UA、不解析、不转换 */
export async function fetchRawSubscription(
  input: Pick<ConvertInput, 'subscriptionUrl' | 'incomingHeaders'>,
  options: ConvertOptions = {},
): Promise<string> {
  return ingestSubscription(input.subscriptionUrl, {
    ...options,
    incomingHeaders: input.incomingHeaders,
  })
}

export async function convertSubscription(
  input: ConvertInput,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  const userAgent = input.incomingHeaders?.get('user-agent') ?? undefined

  // 浏览器 UA 拉订阅常得到空/网页；先换成通用客户端 UA
  const browserFetchUa = isBrowserUserAgent(userAgent) ? BROWSER_FETCH_UA : undefined
  const body = await ingestSubscription(input.subscriptionUrl, {
    ...options,
    incomingHeaders: input.incomingHeaders,
    fetchUserAgent: browserFetchUa,
  })
  let { format, nodes, proxyGroups, rules, topLevel } = parseSubscription(body)

  // 0 节点时：用输出客户端的预设 UA 再拉一次（与第一次实际使用的 UA 相同时跳过）
  const usedFetchUa = browserFetchUa ?? userAgent
  const clientFetchUa = input.outputClient ? FETCH_UA_BY_CLIENT[input.outputClient] : undefined
  const retryFetchUa =
    nodes.length === 0 &&
    clientFetchUa &&
    clientFetchUa.toLowerCase() !== usedFetchUa?.toLowerCase()
      ? clientFetchUa
      : null

  if (retryFetchUa) {
    const retryBody = await ingestSubscription(input.subscriptionUrl, {
      ...options,
      incomingHeaders: input.incomingHeaders,
      fetchUserAgent: retryFetchUa,
    })
    const retry = parseSubscription(retryBody)

    if (retry.nodes.length > 0) {
      format = retry.format
      nodes = retry.nodes
      proxyGroups = retry.proxyGroups
      rules = retry.rules
      topLevel = retry.topLevel
    }
  }

  if (nodes.length === 0) {
    throw new Error('No supported proxy nodes found in subscription')
  }

  const client = resolveOutputClient(userAgent, input.outputClient, options.defaultClient ?? 'clash')

  const extras: FormatExtras = {}
  let proxyGroupsSource: 'subscription' | 'template' | undefined
  const rulesConfig = await rulesStore.get()
  if (rulesConfig?.rules) {
    rulesConfig.rules = await expandRulesetRefs(rulesConfig.rules)
  }
  let resolvedTopLevel = topLevel
  let resolvedProxyGroups = proxyGroups
  if (!resolvedTopLevel || Object.keys(resolvedTopLevel).length === 0) {
    const tmpl = await loadClashTemplate()
    resolvedTopLevel = tmpl.topLevel
    if (!resolvedProxyGroups || resolvedProxyGroups.length === 0) {
      resolvedProxyGroups = tmpl.proxyGroups
      proxyGroupsSource = 'template'
    } else {
      proxyGroupsSource = 'subscription'
    }
  } else {
    proxyGroupsSource = 'subscription'
  }
  extras.clashExtras = resolveClashExtras(rulesConfig, { proxyGroups: resolvedProxyGroups, rules, topLevel: resolvedTopLevel })
  extras.outputSettings = await outputSettingsStore.get()

  const subConfig = await subscriptionStore.get()
  const updateInterval = subConfig.updateInterval

  const formatted = formatProxies(nodes, client, extras, input.managedConfigUrl, updateInterval)
  const proxyGroupCount = extras.clashExtras?.proxyGroups?.length
  const ruleCount = extras.clashExtras?.rules?.length

  return {
    body: formatted.body,
    contentType: formatted.contentType,
    client,
    nodeCount: nodes.length,
    emittedCount: formatted.emittedCount,
    format,
    proxyGroupsSource,
    proxyGroupCount,
    ruleCount,
  }
}
