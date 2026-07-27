import type { ClientType, ProxyNode } from './types.js'
import type { UpdateIntervalMode } from '../subscription/types.js'
import { filterNodesForClient } from './capabilities.js'
import { formatClashProxies } from '../formatters/clash.js'
import { formatLoonProxies } from '../formatters/loon.js'
import { formatQuanxProxies } from '../formatters/quanx.js'
import { formatSurfboardProxies } from '../formatters/surfboard.js'

import type { ClashExtras } from '../rules/merge.js'

export interface FormatExtras {
  clashExtras?: ClashExtras
}

export function formatProxies(
  nodes: ProxyNode[],
  client: ClientType,
  extras?: FormatExtras,
  managedConfigUrl?: string,
  updateInterval?: UpdateIntervalMode,
): { body: string; contentType: string; emittedCount: number } {
  const usable = filterNodesForClient(client, nodes)

  switch (client) {
    case 'clash':
    case 'surge':
      return {
        body: formatClashProxies(usable, extras?.clashExtras, updateInterval),
        contentType: 'application/yaml; charset=utf-8',
        emittedCount: usable.length,
      }
    case 'surfboard':
      return {
        body: formatSurfboardProxies(usable, managedConfigUrl, extras?.clashExtras, updateInterval),
        contentType: 'text/plain; charset=utf-8',
        emittedCount: usable.length,
      }
    case 'loon':
      return {
        body: formatLoonProxies(usable, extras?.clashExtras, managedConfigUrl, updateInterval),
        contentType: 'text/plain; charset=utf-8',
        emittedCount: usable.length,
      }
    case 'quanx':
      return {
        body: formatQuanxProxies(usable, extras?.clashExtras),
        contentType: 'text/plain; charset=utf-8',
        emittedCount: usable.length,
      }
    default:
      return {
        body: formatClashProxies(usable, extras?.clashExtras, updateInterval),
        contentType: 'application/yaml; charset=utf-8',
        emittedCount: usable.length,
      }
  }
}
