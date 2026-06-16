import type { ProxyNode } from '../types/proxy.js'
import { tryDecodeBase64 } from '../utils/uri.js'
import { parseClashConfig } from './parsers/clash.js'
import { parseShadowsocksLine } from './parsers/shadowsocks.js'
import { parseTrojanLine } from './parsers/trojan.js'
import { parseVlessLine } from './parsers/vless.js'
import { parseVmessLine } from './parsers/vmess.js'

const PARSERS: Array<(line: string) => ProxyNode | null> = [
  parseVlessLine,
  parseVmessLine,
  parseShadowsocksLine,
  parseTrojanLine,
]

export function parseProxyLine(line: string): ProxyNode | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  for (const parser of PARSERS) {
    const node = parser(trimmed)
    if (node) return node
  }

  return null
}

export function parseProxyLines(lines: string[]): ProxyNode[] {
  const nodes: ProxyNode[] = []

  for (const line of lines) {
    const node = parseProxyLine(line)
    if (node) nodes.push(node)
  }

  return nodes
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
}

export type SubscriptionFormat = 'clash' | 'base64' | 'uri-list'

export interface ParseSubscriptionResult {
  format: SubscriptionFormat
  nodes: ProxyNode[]
  proxyGroups?: unknown[]
  rules?: string[]
}

export function parseSubscription(raw: string): ParseSubscriptionResult {
  const trimmed = raw.trim()

  const clash = parseClashConfig(trimmed)
  if (clash.nodes.length > 0) {
    return {
      format: 'clash',
      nodes: clash.nodes,
      proxyGroups: clash.proxyGroups,
      rules: clash.rules,
    }
  }

  const decoded = tryDecodeBase64(trimmed)
  if (decoded !== null) {
    return { format: 'base64', nodes: parseProxyLines(splitLines(decoded)) }
  }

  return { format: 'uri-list', nodes: parseProxyLines(splitLines(trimmed)) }
}
