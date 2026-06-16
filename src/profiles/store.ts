import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import type {
  ProxyGroupsMergeMode,
  RulesConfig,
  RulesInput,
  RulesMergeMode,
} from './types.js'

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

function parseProxyGroupsMerge(raw: unknown): ProxyGroupsMergeMode {
  if (raw === 'merge' || raw === 'replace') return raw
  return 'replace'
}

function normalizeRules(raw: unknown): RulesConfig {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const rules = Array.isArray(record.rules)
    ? record.rules.map((rule) => String(rule).trim()).filter(Boolean)
    : []
  const proxyGroups = Array.isArray(record['proxy-groups']) ? record['proxy-groups'] : []

  return {
    rules,
    proxyGroups,
    rulesMerge: parseRulesMerge(record['rules-merge'] ?? record.rulesMerge),
    proxyGroupsMerge: parseProxyGroupsMerge(record['proxy-groups-merge'] ?? record.proxyGroupsMerge),
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
      proxyGroups: [],
      rulesMerge: 'prepend' as const,
      proxyGroupsMerge: 'replace' as const,
    }
    const config: RulesConfig = {
      rules: input.rules ?? existing.rules,
      proxyGroups: input.proxyGroups ?? existing.proxyGroups,
      rulesMerge: input.rulesMerge ?? existing.rulesMerge,
      proxyGroupsMerge: input.proxyGroupsMerge ?? existing.proxyGroupsMerge,
    }

    await mkdir(dirname(this.filePath), { recursive: true })
    const yaml = stringify({
      'rules-merge': config.rulesMerge,
      'proxy-groups-merge': config.proxyGroupsMerge,
      rules: config.rules,
      'proxy-groups': config.proxyGroups,
    })
    await writeFile(this.filePath, yaml, 'utf8')
    return config
  }
}

export const rulesStore = new FileRulesStore()

// @deprecated use rulesStore
export const profileStore = rulesStore
