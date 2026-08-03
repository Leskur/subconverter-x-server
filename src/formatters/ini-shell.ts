import type { ProxyNode } from '../core/types.js'
import type { ClashExtras } from '../rules/merge.js'
import type { OutputSettings } from '../output-settings/types.js'
import type { UpdateIntervalMode } from '../subscription/types.js'
import {
  DEFAULT_DNS_SERVER,
  DEFAULT_SKIP_PROXY,
  resolveManagedConfigInterval,
  SURGE_STYLE_DEFAULT_RULES,
  URL_TEST_INTERVAL_SEC,
  URL_TEST_URL,
} from '../core/constants.js'
import { surgeStyleProxyLine, type SurgeStyleTarget } from './surge-style-proxy.js'

export function managedConfigHeader(
  managedConfigUrl?: string,
  updateInterval?: UpdateIntervalMode,
): string[] {
  if (!managedConfigUrl) return []
  const intervalValue = resolveManagedConfigInterval(updateInterval)
  return [`#!MANAGED-CONFIG ${managedConfigUrl} interval=${intervalValue} strict=false`, '']
}

export function surgeStyleRuleLines(extras?: ClashExtras): string[] {
  return extras?.rules?.length
    ? extras.rules.map((r) => r.replace(/^MATCH,/i, 'FINAL,'))
    : [...SURGE_STYLE_DEFAULT_RULES]
}

export function defaultSurgeStyleProxyGroups(
  names: string[],
  settings?: Pick<OutputSettings, 'urlTestUrl' | 'urlTestInterval'>,
): string[] {
  const url = settings?.urlTestUrl ?? URL_TEST_URL
  const interval = settings?.urlTestInterval ?? URL_TEST_INTERVAL_SEC
  return [
    `PROXY = select, AUTO, ${names.join(', ')}`,
    `AUTO = url-test, ${names.join(', ')}, url=${url}, interval=${interval}`,
  ]
}

export interface SurgeStyleIniOptions {
  target: SurgeStyleTarget
  nodes: ProxyNode[]
  generalLines: string[]
  managedConfigUrl?: string
  extras?: ClashExtras
  updateInterval?: UpdateIntervalMode
  outputSettings?: OutputSettings
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

  const skipProxy = options.outputSettings?.skipProxy ?? DEFAULT_SKIP_PROXY

  return [
    ...managedConfigHeader(options.managedConfigUrl, options.updateInterval),
    '[General]',
    'loglevel = notify',
    surgeDnsServerLine(options.outputSettings),
    `skip-proxy = ${skipProxy}`,
    ...options.generalLines,
    '',
    '[Proxy]',
    ...proxyLines,
    '',
    '[Proxy Group]',
    ...defaultSurgeStyleProxyGroups(names, options.outputSettings),
    '',
    '[Rule]',
    ...surgeStyleRuleLines(options.extras),
  ].join('\n')
}

export function surgeDnsServerLine(settings?: Pick<OutputSettings, 'dnsServer'>): string {
  return `dns-server = ${settings?.dnsServer ?? DEFAULT_DNS_SERVER}`
}
