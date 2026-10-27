import type { ClientType, ProxyNode } from './types.js'
import type { UpdateIntervalMode } from '../subscription/types.js'
import type { OutputSettings } from '../output-settings/types.js'
import { filterNodesForClient } from './capabilities.js'
import { formatClashProxies } from '../formatters/clash.js'
import { formatLoonProxies } from '../formatters/loon.js'
import { formatQuanxProxies } from '../formatters/quanx.js'
import { formatSurfboardProxies } from '../formatters/surfboard.js'
import { formatSurgeProxies } from '../formatters/surge.js'

import type { ClashExtras } from '../rules/merge.js'

export interface FormatExtras {
  clashExtras?: ClashExtras
  outputSettings?: OutputSettings
}

export function formatProxies(
  nodes: ProxyNode[],
  client: ClientType,
  extras?: FormatExtras,
  managedConfigUrl?: string,
  updateInterval?: UpdateIntervalMode,
): { body: string; contentType: string; emittedCount: number } {
  const usable = filterNodesForClient(client, nodes)
  const outputSettings = extras?.outputSettings
  const emittedCount = usable.length

  switch (client) {
    case 'clash':
      return {
        body: formatClashProxies(usable, extras?.clashExtras, updateInterval, outputSettings),
        contentType: 'application/yaml; charset=utf-8',
        emittedCount,
      }
    case 'surge':
      return {
        body: formatSurgeProxies(usable, managedConfigUrl, extras?.clashExtras, updateInterval, outputSettings),
        contentType: 'text/plain; charset=utf-8',
        emittedCount,
      }
    case 'surfboard':
      return {
        body: formatSurfboardProxies(usable, managedConfigUrl, extras?.clashExtras, updateInterval, outputSettings),
        contentType: 'text/plain; charset=utf-8',
        emittedCount,
      }
    case 'loon':
      return {
        body: formatLoonProxies(usable, extras?.clashExtras, managedConfigUrl, updateInterval, outputSettings),
        contentType: 'text/plain; charset=utf-8',
        emittedCount,
      }
    case 'quanx':
      return {
        body: formatQuanxProxies(usable, extras?.clashExtras, outputSettings),
        contentType: 'text/plain; charset=utf-8',
        emittedCount,
      }
    default: {
      const _exhaustive: never = client
      throw new Error(`Unsupported client: ${_exhaustive}`)
    }
  }
}
