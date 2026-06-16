export type RulesMergeMode = 'replace' | 'prepend' | 'append'
export type ProxyGroupsMergeMode = 'replace' | 'merge'

export interface RulesConfig {
  rules: string[]
  proxyGroups: unknown[]
  rulesMerge: RulesMergeMode
  proxyGroupsMerge: ProxyGroupsMergeMode
}

export interface RulesInput {
  rules?: string[]
  proxyGroups?: unknown[]
  rulesMerge?: RulesMergeMode
  proxyGroupsMerge?: ProxyGroupsMergeMode
}
