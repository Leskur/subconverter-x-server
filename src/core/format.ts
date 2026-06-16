import type { ClientType, ProxyNode } from '../types/proxy.js'
import { formatClashProxies } from '../formatters/clash.js'
import { formatSingboxOutbounds } from '../formatters/singbox.js'

import type { ClashExtras } from '../profiles/merge.js'

export function formatProxies(
  nodes: ProxyNode[],
  client: ClientType,
  clashExtras?: ClashExtras,
): { body: string; contentType: string } {
  switch (client) {
    case 'clash':
      return {
        body: formatClashProxies(nodes, clashExtras),
        contentType: 'application/yaml; charset=utf-8',
      }
    case 'surge':
      return {
        body: formatClashProxies(nodes, clashExtras),
        contentType: 'application/yaml; charset=utf-8',
      }
    case 'singbox':
    default:
      return {
        body: formatSingboxOutbounds(nodes),
        contentType: 'application/json; charset=utf-8',
      }
  }
}
