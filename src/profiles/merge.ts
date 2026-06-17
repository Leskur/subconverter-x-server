import type { RulesConfig, RulesMergeMode } from './types.js'

export interface ClashExtras {
  proxyGroups?: unknown[]
  rules?: string[]
  topLevel?: Record<string, unknown>
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

export function resolveClashExtras(
  rulesConfig: RulesConfig | null | undefined,
  upstream?: ClashExtras,
): ClashExtras {
  return {
    proxyGroups: upstream?.proxyGroups,
    rules: rulesConfig
      ? mergeRules(rulesConfig.rules, upstream?.rules, rulesConfig.rulesMerge)
      : upstream?.rules,
    topLevel: upstream?.topLevel,
  }
}
