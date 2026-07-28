import type { ProxyNode } from '../core/types.js'
import type { ClashExtras } from '../rules/merge.js'
import type { UpdateIntervalMode } from '../subscription/types.js'
import { surgeStyleProxyLine, type SurgeStyleTarget } from './surge-style-proxy.js'

const SKIP_PROXY =
  'skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, localhost, *.local'

export function managedConfigHeader(
  managedConfigUrl?: string,
  updateInterval?: UpdateIntervalMode,
): string[] {
  if (!managedConfigUrl) return []
  const intervalValue = updateInterval && updateInterval !== 'auto' ? updateInterval : 43200
  return [`#!MANAGED-CONFIG ${managedConfigUrl} interval=${intervalValue} strict=false`, '']
}

export function surgeStyleRuleLines(extras?: ClashExtras): string[] {
  return extras?.rules?.length
    ? extras.rules.map((r) => r.replace(/^MATCH,/i, 'FINAL,'))
    : ['GEOIP,CN,DIRECT', 'FINAL,PROXY']
}

export function defaultSurgeStyleProxyGroups(names: string[]): string[] {
  return [
    `PROXY = select, AUTO, ${names.join(', ')}`,
    `AUTO = url-test, ${names.join(', ')}, url=http://cp.cloudflare.com/generate_204, interval=300`,
  ]
}

export interface SurgeStyleIniOptions {
  target: SurgeStyleTarget
  nodes: ProxyNode[]
  generalLines: string[]
  managedConfigUrl?: string
  extras?: ClashExtras
  updateInterval?: UpdateIntervalMode
}

export function formatSurgeStyleIni(options: SurgeStyleIniOptions): string {
  const proxyLines: string[] = []
  const names: string[] = []
  for (const node of options.nodes) {
    const line = surgeStyleProxyLine(node, options.target)
    if (!line) continue
    proxyLines.push(line)
    names.push(node.name)
  }

  return [
    ...managedConfigHeader(options.managedConfigUrl, options.updateInterval),
    '[General]',
    'loglevel = notify',
    SKIP_PROXY,
    ...options.generalLines,
    '',
    '[Proxy]',
    ...proxyLines,
    '',
    '[Proxy Group]',
    ...defaultSurgeStyleProxyGroups(names),
    '',
    '[Rule]',
    ...surgeStyleRuleLines(options.extras),
  ].join('\n')
}
