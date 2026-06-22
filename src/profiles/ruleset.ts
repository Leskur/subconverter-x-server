import { assertSafeUpstreamUrl } from '../utils/uri.js'

const RULESET_PREFIX = 'rule-set:'
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

interface CacheEntry {
  rules: string[]
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

export function isRulesetRef(rule: string): boolean {
  return rule.trimStart().startsWith(RULESET_PREFIX)
}

export function parseRulesetRef(rule: string): { url: string; policy: string } | null {
  const trimmed = rule.trim()
  if (!trimmed.startsWith(RULESET_PREFIX)) return null
  const rest = trimmed.slice(RULESET_PREFIX.length)
  const commaIdx = rest.lastIndexOf(',')
  if (commaIdx === -1) return null
  const url = rest.slice(0, commaIdx).trim()
  const policy = rest.slice(commaIdx + 1).trim()
  if (!url || !policy) return null
  return { url, policy }
}

async function fetchRuleset(url: string): Promise<string[]> {
  const cached = cache.get(url)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rules
  }

  assertSafeUpstreamUrl(url)
  const res = await fetch(url, { headers: { 'User-Agent': 'subconverter-x' } })
  if (!res.ok) throw new Error(`Failed to fetch ruleset ${url}: ${res.status}`)
  const text = await res.text()

  const rules = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith(';'))

  cache.set(url, { rules, fetchedAt: Date.now() })
  return rules
}

export async function expandRulesetRefs(rules: string[]): Promise<string[]> {
  const result: string[] = []
  for (const rule of rules) {
    const ref = parseRulesetRef(rule)
    if (!ref) {
      result.push(rule)
      continue
    }
    try {
      const fetched = await fetchRuleset(ref.url)
      for (const line of fetched) {
        const parts = line.split(',')
        if (parts.length === 1) {
          // 裸域名，当 DOMAIN-SUFFIX 处理
          result.push(`DOMAIN-SUFFIX,${line},${ref.policy}`)
        } else if (parts.length === 2) {
          // TYPE,value — 追加策略
          result.push(`${line},${ref.policy}`)
        } else {
          // TYPE,value,POLICY — 已有策略，原样保留
          result.push(line)
        }
      }
    } catch {
      result.push(rule)
    }
  }
  return result
}
