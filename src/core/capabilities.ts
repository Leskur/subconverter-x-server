import type { ClientType, ProxyNode, ProxyType } from './types.js'

/** 已解析的标准协议（不含 raw）。 */
const STANDARD: readonly ProxyType[] = [
  'vless',
  'shadowsocks',
  'trojan',
  'vmess',
  'hysteria2',
]

/**
 * 各客户端当前确认支持的协议。
 * 新增支持时只改这里，并补齐对应 formatter 的输出实现。
 * `raw` 仅 Clash 保留未知类型透传。
 */
const CLIENT_CAPABILITIES: Record<ClientType, readonly ProxyType[]> = {
  clash: [...STANDARD, 'raw'],
  // Surge / Shadowrocket：官方不支持 VLESS；输出为 Surge INI
  surge: ['shadowsocks', 'trojan', 'vmess', 'hysteria2'],
  // Surfboard 对齐 Surge，暂不支持 VLESS
  surfboard: ['shadowsocks', 'trojan', 'vmess', 'hysteria2'],
  loon: [...STANDARD],
  quanx: [...STANDARD],
}

export function filterNodesForClient(client: ClientType, nodes: ProxyNode[]): ProxyNode[] {
  const allow = new Set(CLIENT_CAPABILITIES[client])
  return nodes.filter((node) => allow.has(node.type))
}
