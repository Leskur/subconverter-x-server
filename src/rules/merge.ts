import type { RulesConfig, RulesMergeMode } from './types.js'

export interface ClashExtras {
  proxyGroups?: unknown[]
  rules?: string[]
  topLevel?: Record<string, unknown>
}

function normalizeMergedRules(rules: string[]): string[] {
  const seen = new Set<string>()
  const regular: string[] = []
  const match: string[] = []

  for (const rule of rules) {
    const trimmed = rule.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    if (/^MATCH,/i.test(trimmed)) {
      match.push(trimmed)
    } else {
      regular.push(trimmed)
    }
  }

  return [...regular, ...match]
}

function mergeRules(
  custom: string[],
  subscription: string[] | undefined,
  mode: RulesMergeMode,
): string[] | undefined {
  if (custom.length === 0) return subscription
  if (!subscription?.length) return custom

  switch (mode) {
    case 'prepend':
      return normalizeMergedRules([...custom, ...subscription])
    case 'append':
      return normalizeMergedRules([...subscription, ...custom])
    case 'replace':
    default:
      return custom
  }
}

export function resolveClashExtras(
  rulesConfig: RulesConfig | null | undefined,
  subscription?: ClashExtras,
): ClashExtras {
  return {
    proxyGroups: subscription?.proxyGroups,
    rules: rulesConfig
      ? mergeRules(rulesConfig.rules, subscription?.rules, rulesConfig.rulesMerge)
      : subscription?.rules,
    topLevel: subscription?.topLevel,
  }
}
