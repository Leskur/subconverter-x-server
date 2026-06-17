export type RulesMergeMode = 'replace' | 'prepend' | 'append'

export interface RulesConfig {
  rules: string[]
  rulesMerge: RulesMergeMode
}

export interface RulesInput {
  rules?: string[]
  rulesMerge?: RulesMergeMode
}
