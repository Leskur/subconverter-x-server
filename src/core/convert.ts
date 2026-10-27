import { parse as parseYaml } from 'yaml'
import type { ConvertInput, ConvertResult } from './types.js'
import { formatProxies, type FormatExtras } from './format.js'
import { ingestSubscription, type IngestOptions } from './ingest.js'
import { parseSubscription } from './parse.js'
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

export type ConvertOptions = IngestOptions

export async function convertSubscription(
  input: ConvertInput,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  const client = input.outputClient

  const body = await ingestSubscription(input.subscriptionUrl, {
    ...options,
    incomingHeaders: input.incomingHeaders,
    fetchUserAgent: input.fetchUserAgent,
  })
  const { format, nodes, proxyGroups, rules, topLevel } = parseSubscription(body)

  if (nodes.length === 0) {
    throw new Error('No supported proxy nodes found in subscription')
  }

  const rulesConfig = await rulesStore.get()
  const expandedRules = await expandRulesetRefs(rulesConfig.rules)
  const rulesForMerge = { ...rulesConfig, rules: expandedRules }

  let resolvedTopLevel = topLevel
  let resolvedProxyGroups = proxyGroups
  // Clash 模板仅补 Clash 输出所需的 topLevel / proxy-groups
  if (
    client === 'clash' &&
    (!resolvedTopLevel || Object.keys(resolvedTopLevel).length === 0)
  ) {
    const tmpl = await loadClashTemplate()
    resolvedTopLevel = tmpl.topLevel
    if (!resolvedProxyGroups || resolvedProxyGroups.length === 0) {
      resolvedProxyGroups = tmpl.proxyGroups
    }
  }

  const extras: FormatExtras = {
    clashExtras: resolveClashExtras(rulesForMerge, {
      proxyGroups: resolvedProxyGroups,
      rules,
      topLevel: resolvedTopLevel,
    }),
    outputSettings: await outputSettingsStore.get(),
  }

  const subConfig = await subscriptionStore.get()
  const formatted = formatProxies(nodes, client, extras, input.managedConfigUrl, subConfig.updateInterval)

  return {
    body: formatted.body,
    contentType: formatted.contentType,
    client,
    nodeCount: nodes.length,
    emittedCount: formatted.emittedCount,
    format,
    proxyGroupCount: extras.clashExtras?.proxyGroups?.length,
    ruleCount: extras.clashExtras?.rules?.length,
  }
}
