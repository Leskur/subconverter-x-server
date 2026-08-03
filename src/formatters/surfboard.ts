import type { ProxyNode } from '../core/types.js'
import type { ClashExtras } from '../rules/merge.js'
import type { OutputSettings } from '../output-settings/types.js'
import type { UpdateIntervalMode } from '../subscription/types.js'
import { formatSurgeStyleIni } from './ini-shell.js'

export function formatSurfboardProxies(
  nodes: ProxyNode[],
  managedConfigUrl?: string,
  extras?: ClashExtras,
  updateInterval?: UpdateIntervalMode,
  outputSettings?: OutputSettings,
): string {
  return formatSurgeStyleIni({
    target: 'surfboard',
    nodes,
    generalLines: ['enhanced-mode-by-rule = true'],
    managedConfigUrl,
    extras,
    updateInterval,
    outputSettings,
  })
}
