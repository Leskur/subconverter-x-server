import type {
  Hysteria2Proxy,
  ProxyNode,
  ShadowsocksProxy,
  TrojanProxy,
  VlessProxy,
  VmessProxy,
} from '../core/types.js'
import type { ClashExtras } from '../rules/merge.js'

function ssLine(node: ShadowsocksProxy): string {
  const parts = [
    `${node.name} = ss, ${node.server}, ${node.port}`,
    `encrypt-method=${node.method}`,
    `password=${node.password}`,
    'udp-relay=true',
  ]
  if (node.plugin === 'obfs' && node.pluginOpts) {
    const opts = node.pluginOpts as unknown as Record<string, string>
    if (opts.mode) parts.push(`obfs=${opts.mode}`)
    if (opts.host) parts.push(`obfs-host=${opts.host}`)
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

function vlessLine(node: VlessProxy): string {
  const hasTls = node.security === 'tls' || node.security === 'reality'
  const parts = [
    `${node.name} = vless, ${node.server}, ${node.port}`,
    `username=${node.uuid}`,
    'udp-relay=true',
  ]
  if (node.network === 'ws') {
    parts.push('ws=true')
    if (node.path) parts.push(`ws-path=${node.path}`)
    if (node.host) parts.push(`ws-headers=Host:${node.host}`)
  }
  if (hasTls) {
    parts.push('tls=true')
    if (node.sni) parts.push(`sni=${node.sni}`)
  }
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
    case 'vless': return vlessLine(node)
    case 'trojan': return trojanLine(node)
    case 'hysteria2': return hysteria2Line(node)
    default: return ''
  }
}

export function formatSurfboardProxies(nodes: ProxyNode[], managedConfigUrl?: string, extras?: ClashExtras): string {
  const usable = nodes.filter((n) => n.type !== 'raw')
  const lines = usable.map(proxyLine)
  const names = usable.map((n) => n.name)
  const header = managedConfigUrl
    ? [`#!MANAGED-CONFIG ${managedConfigUrl} interval=43200 strict=false`, '']
    : []

  const ruleLines = extras?.rules?.length
    ? extras.rules.map((r) => r.replace(/^MATCH,/, 'FINAL,'))
    : ['GEOIP,CN,DIRECT', 'FINAL,PROXY']

  return [
    ...header,
    '[General]',
    'loglevel = notify',
    'skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, localhost, *.local',
    'dns-server = system, 223.5.5.5',
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
