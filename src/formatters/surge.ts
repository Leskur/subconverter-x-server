import type { ProxyNode } from '../core/types.js'
import type { ClashExtras } from '../rules/merge.js'
import type { OutputSettings } from '../output-settings/types.js'
import type { UpdateIntervalMode } from '../subscription/types.js'
import { formatSurgeStyleIni } from './ini-shell.js'

/** 字段对齐 https://manual.nssurge.com/policy/proxy.html */
export function formatSurgeProxies(
  nodes: ProxyNode[],
  managedConfigUrl?: string,
  extras?: ClashExtras,
  updateInterval?: UpdateIntervalMode,
  outputSettings?: OutputSettings,
): string {
  return formatSurgeStyleIni({
    target: 'surge',
    nodes,
    generalLines: [],
    managedConfigUrl,
    extras,
    updateInterval,
    outputSettings,
  })
}
