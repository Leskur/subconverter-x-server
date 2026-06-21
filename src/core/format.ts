import type { ClientType, ProxyNode } from '../types/proxy.js'
import { formatClashProxies } from '../formatters/clash.js'
import { formatSingboxOutbounds } from '../formatters/singbox.js'
import { formatLoonProxies } from '../formatters/loon.js'
import { formatQuanxProxies } from '../formatters/quanx.js'
import { formatSurfboardProxies } from '../formatters/surfboard.js'

import type { ClashExtras } from '../profiles/merge.js'

export function formatProxies(
  nodes: ProxyNode[],
  client: ClientType,
  clashExtras?: ClashExtras,
  managedConfigUrl?: string,
): { body: string; contentType: string } {
  switch (client) {
    case 'clash':
    case 'surge':
      return {
        body: formatClashProxies(nodes, clashExtras),
        contentType: 'application/yaml; charset=utf-8',
      }
    case 'surfboard':
      return {
        body: formatSurfboardProxies(nodes, managedConfigUrl, clashExtras),
        contentType: 'text/plain; charset=utf-8',
      }
    case 'loon':
      return {
        body: formatLoonProxies(nodes, clashExtras),
        contentType: 'text/plain; charset=utf-8',
      }
    case 'quanx':
      return {
        body: formatQuanxProxies(nodes, clashExtras),
        contentType: 'text/plain; charset=utf-8',
      }
    case 'singbox':
    default:
      return {
        body: formatSingboxOutbounds(nodes),
        contentType: 'application/json; charset=utf-8',
      }
  }
}
