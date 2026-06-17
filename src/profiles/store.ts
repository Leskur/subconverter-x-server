import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import type { RulesConfig, RulesInput, RulesMergeMode } from './types.js'

function rulesFilePath(): string {
  return process.env.RULES_FILE ?? join(process.cwd(), 'data', 'rules.yaml')
}

function legacyDefaultPath(): string {
  return join(process.cwd(), 'data', 'profiles', 'default.yaml')
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
  constructor(private readonly filePath = rulesFilePath()) {}

  async get(): Promise<RulesConfig | null> {
    try {
      const content = await readFile(this.filePath, 'utf8')
      return normalizeRules(parse(content))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }

    try {
      const legacy = await readFile(legacyDefaultPath(), 'utf8')
      const config = normalizeRules(parse(legacy))
      await this.save(config)
      return config
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
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

    await mkdir(dirname(this.filePath), { recursive: true })
    const yaml = stringify({
      'rules-merge': config.rulesMerge,
      rules: config.rules,
    })
    await writeFile(this.filePath, yaml, 'utf8')
    return config
  }
}

export const rulesStore = new FileRulesStore()

// @deprecated use rulesStore
export const profileStore = rulesStore
