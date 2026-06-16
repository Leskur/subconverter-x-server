import type { ProxyNode } from '../types/proxy.js'
import type { ProxyGroupsMergeMode, RulesConfig, RulesMergeMode } from './types.js'

export interface ClashExtras {
  proxyGroups?: unknown[]
  rules?: string[]
}

function cloneGroups(groups: unknown[]): unknown[] {
  return JSON.parse(JSON.stringify(groups)) as unknown[]
}

function groupName(group: unknown): string | null {
  if (!group || typeof group !== 'object') return null
  const name = (group as Record<string, unknown>).name
  return typeof name === 'string' && name.length > 0 ? name : null
}

export function normalizeMergedRules(rules: string[]): string[] {
  const seen = new Set<string>()
  const regular: string[] = []
  const match: string[] = []

  for (const rule of rules) {
    const trimmed = rule.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    if (/^MATCH,/i.test(trimmed)) {
      match.push(trimmed)
    } else {
      regular.push(trimmed)
    }
  }

  return [...regular, ...match]
}

export function mergeRules(
  custom: string[],
  upstream: string[] | undefined,
  mode: RulesMergeMode,
): string[] | undefined {
  if (custom.length === 0) return upstream
  if (!upstream?.length) return custom

  switch (mode) {
    case 'prepend':
      return normalizeMergedRules([...custom, ...upstream])
    case 'append':
      return normalizeMergedRules([...upstream, ...custom])
    case 'replace':
    default:
      return custom
  }
}

export function mergeProxyGroups(
  custom: unknown[],
  upstream: unknown[] | undefined,
  mode: ProxyGroupsMergeMode,
): unknown[] {
  if (custom.length === 0) return upstream ?? []
  if (!upstream?.length || mode === 'replace') return custom

  const customByName = new Map<string, unknown>()
  const customWithoutName: unknown[] = []

  for (const group of custom) {
    const name = groupName(group)
    if (name) customByName.set(name, group)
    else customWithoutName.push(group)
  }

  const result: unknown[] = []
  const added = new Set<string>()

  for (const group of upstream) {
    const name = groupName(group)
    if (name && customByName.has(name)) {
      result.push(customByName.get(name))
      added.add(name)
      continue
    }
    result.push(group)
    if (name) added.add(name)
  }

  for (const [name, group] of customByName) {
    if (!added.has(name)) result.push(group)
  }

  return [...result, ...customWithoutName]
}

export function fillProxyGroupNodes(groups: unknown[], nodeNames: string[]): unknown[] {
  return groups.map((group) => {
    if (!group || typeof group !== 'object') return group

    const record = { ...(group as Record<string, unknown>) }
    const proxies = record.proxies

    if (Array.isArray(proxies)) {
      if (proxies.length === 0 || proxies.includes('*')) {
        record.proxies = nodeNames
      }
    }

    return record
  })
}

function defaultProxyGroup(nodeNames: string[]): unknown[] {
  return [
    {
      name: 'PROXY',
      type: 'select',
      proxies: nodeNames,
    },
  ]
}

export function resolveClashExtras(
  nodes: ProxyNode[],
  rulesConfig: RulesConfig | null | undefined,
  upstream?: ClashExtras,
): ClashExtras {
  const nodeNames = nodes.map((node) => node.name)

  if (rulesConfig) {
    const mergedGroups = mergeProxyGroups(
      rulesConfig.proxyGroups,
      upstream?.proxyGroups,
      rulesConfig.proxyGroupsMerge,
    )
    const groups =
      mergedGroups.length > 0
        ? fillProxyGroupNodes(cloneGroups(mergedGroups), nodeNames)
        : defaultProxyGroup(nodeNames)

    return {
      proxyGroups: groups,
      rules: mergeRules(rulesConfig.rules, upstream?.rules, rulesConfig.rulesMerge),
    }
  }

  if (upstream?.proxyGroups && upstream.proxyGroups.length > 0) {
    return {
      proxyGroups: fillProxyGroupNodes(cloneGroups(upstream.proxyGroups), nodeNames),
      rules: upstream.rules,
    }
  }

  return {
    proxyGroups: defaultProxyGroup(nodeNames),
    rules: upstream?.rules,
  }
}
