import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import type { RulesConfig, RulesInput, RulesMergeMode } from './types.js'
import { appDataDir } from '../utils/paths.js'

function userRulesPath(): string {
  return join(appDataDir(), 'rules.yaml')
}

const DEFAULT_RULES_YAML = `rules-merge: replace
rules:
  - GEOIP,CN,DIRECT
  - MATCH,PROXY
`

function defaultRules(): RulesConfig {
  return normalizeRules(parse(DEFAULT_RULES_YAML))
}

function parseRulesMerge(raw: unknown): RulesMergeMode {
  if (raw === 'prepend' || raw === 'append' || raw === 'replace') return raw
  return 'replace'
}

function normalizeRules(raw: unknown): RulesConfig {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const rules = Array.isArray(record.rules)
    ? record.rules.map((rule) => String(rule).trim()).filter(Boolean)
    : []

  return {
    rules,
    rulesMerge: parseRulesMerge(record['rules-merge'] ?? record.rulesMerge),
  }
}

export class FileRulesStore {
  constructor(
    private readonly userPath = userRulesPath(),
  ) {}

  async get(): Promise<RulesConfig | null> {
    // 1. Try user-saved rules
    try {
      const content = await readFile(this.userPath, 'utf8')
      return normalizeRules(parse(content))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }

    // 2. Fall back to built-in defaults
    return defaultRules()
  }

  async getDefault(): Promise<RulesConfig | null> {
    return defaultRules()
  }

  async save(input: RulesInput): Promise<RulesConfig> {
    const existing = (await this.get()) ?? {
      rules: [],
      rulesMerge: 'prepend' as const,
    }
    const config: RulesConfig = {
      rules: input.rules ?? existing.rules,
      rulesMerge: input.rulesMerge ?? existing.rulesMerge,
    }

    await mkdir(dirname(this.userPath), { recursive: true })
    const yaml = stringify({
      'rules-merge': config.rulesMerge,
      rules: config.rules,
    })
    await writeFile(this.userPath, yaml, 'utf8')
    return config
  }

  async reset(): Promise<RulesConfig | null> {
    try {
      await unlink(this.userPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    return this.getDefault()
  }
}

export const rulesStore = new FileRulesStore()
