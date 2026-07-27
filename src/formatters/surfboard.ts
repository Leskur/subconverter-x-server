import type {
  Hysteria2Proxy,
  ProxyNode,
  ShadowsocksProxy,
  TrojanProxy,
  VmessProxy,
} from '../core/types.js'
import type { ClashExtras } from '../rules/merge.js'
import type { UpdateIntervalMode } from '../subscription/types.js'

/** 节点能力裁剪见 core/capabilities.ts；此处只负责写出已支持协议。 */

function ssLine(node: ShadowsocksProxy): string {
  const parts = [
    `${node.name} = ss, ${node.server}, ${node.port}`,
    `encrypt-method=${node.method}`,
    `password=${node.password}`,
    'udp-relay=true',
  ]
  if (node.plugin === 'obfs' && node.pluginOpts) {
    if (node.pluginOpts.mode) parts.push(`obfs=${node.pluginOpts.mode}`)
    if (node.pluginOpts.host) parts.push(`obfs-host=${node.pluginOpts.host}`)
  }
  return parts.join(', ')
}

function vmessLine(node: VmessProxy): string {
  const parts = [
    `${node.name} = vmess, ${node.server}, ${node.port}`,
    `username=${node.uuid}`,
    'udp-relay=true',
  ]
  if (node.network === 'ws') {
    parts.push('ws=true')
    if (node.path) parts.push(`ws-path=${node.path}`)
    if (node.host) parts.push(`ws-headers=Host:${node.host}`)
  }
  if (node.tls) {
    parts.push('tls=true')
    if (node.sni) parts.push(`sni=${node.sni}`)
  }
  if (node.cipher && node.cipher !== 'auto') parts.push(`vmess-aead=true`)
  return parts.join(', ')
}

function trojanLine(node: TrojanProxy): string {
  const parts = [
    `${node.name} = trojan, ${node.server}, ${node.port}`,
    `password=${node.password}`,
    'udp-relay=true',
  ]
  if (node.sni) parts.push(`sni=${node.sni}`)
  parts.push('skip-cert-verify=false')
  return parts.join(', ')
}

function hysteria2Line(node: Hysteria2Proxy): string {
  const parts = [
    `${node.name} = hysteria2, ${node.server}, ${node.port}`,
    `password=${node.password}`,
    'udp-relay=true',
  ]
  if (node.sni) parts.push(`sni=${node.sni}`)
  if (node.insecure) parts.push('skip-cert-verify=true')
  if (node.obfs) parts.push(`obfs=${node.obfs}`)
  if (node.obfsPassword) parts.push(`obfs-password=${node.obfsPassword}`)
  return parts.join(', ')
}

function proxyLine(node: ProxyNode): string {
  switch (node.type) {
    case 'shadowsocks': return ssLine(node)
    case 'vmess': return vmessLine(node)
    case 'trojan': return trojanLine(node)
    case 'hysteria2': return hysteria2Line(node)
    default: return ''
  }
}

export function formatSurfboardProxies(nodes: ProxyNode[], managedConfigUrl?: string, extras?: ClashExtras, updateInterval?: UpdateIntervalMode): string {
  const lines = nodes.map(proxyLine).filter(Boolean)
  const names = nodes.map((n) => n.name)
  const intervalValue = updateInterval && updateInterval !== 'auto' ? updateInterval : 43200
  const header = managedConfigUrl
    ? [`#!MANAGED-CONFIG ${managedConfigUrl} interval=${intervalValue} strict=false`, '']
    : []

  const ruleLines = extras?.rules?.length
    ? extras.rules.map((r) => r.replace(/^MATCH,/, 'FINAL,'))
    : ['GEOIP,CN,DIRECT', 'FINAL,PROXY']

  return [
    ...header,
    '[General]',
    'loglevel = notify',
    'skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, localhost, *.local',
    'enhanced-mode-by-rule = true',
    '',
    '[Proxy]',
    ...lines,
    '',
    '[Proxy Group]',
    `PROXY = select, AUTO, ${names.join(', ')}`,
    `AUTO = url-test, ${names.join(', ')}, url=http://cp.cloudflare.com/generate_204, interval=300`,
    '',
    '[Rule]',
    ...ruleLines,
  ].join('\n')
}
