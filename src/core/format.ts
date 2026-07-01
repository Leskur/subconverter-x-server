import type { ClientType, ProxyNode } from './types.js'
import type { UpdateIntervalMode } from '../subscription/types.js'
import { formatClashProxies } from '../formatters/clash.js'
import { formatSingboxConfig } from '../formatters/singbox.js'
import { formatLoonProxies } from '../formatters/loon.js'
import { formatQuanxProxies } from '../formatters/quanx.js'
import { formatSurfboardProxies } from '../formatters/surfboard.js'

import type { ClashExtras } from '../rules/merge.js'

export interface FormatExtras {
  clashExtras?: ClashExtras
  singboxTemplate?: Record<string, unknown>
  singboxRules?: string[]
}

export function formatProxies(
  nodes: ProxyNode[],
  client: ClientType,
  extras?: FormatExtras,
  managedConfigUrl?: string,
  updateInterval?: UpdateIntervalMode,
): { body: string; contentType: string } {
  switch (client) {
    case 'clash':
    case 'surge':
      return {
        body: formatClashProxies(nodes, extras?.clashExtras, updateInterval),
        contentType: 'application/yaml; charset=utf-8',
      }
    case 'surfboard':
      return {
        body: formatSurfboardProxies(nodes, managedConfigUrl, extras?.clashExtras, updateInterval),
        contentType: 'text/plain; charset=utf-8',
      }
    case 'loon':
      return {
        body: formatLoonProxies(nodes, extras?.clashExtras, managedConfigUrl, updateInterval),
        contentType: 'text/plain; charset=utf-8',
      }
    case 'quanx':
      return {
        body: formatQuanxProxies(nodes, extras?.clashExtras),
        contentType: 'text/plain; charset=utf-8',
      }
    case 'singbox':
    default:
      return {
        body: formatSingboxConfig(nodes, extras?.singboxTemplate ?? {}, extras?.singboxRules),
        contentType: 'application/json; charset=utf-8',
      }
  }
}
