import type {
  Hysteria2Proxy,
  ProxyNode,
  ShadowsocksProxy,
  TrojanProxy,
  VlessProxy,
  VmessProxy,
} from '../types/proxy.js'
import type { ClashExtras } from '../profiles/merge.js'

function ssLine(node: ShadowsocksProxy): string {
  return `shadowsocks=${node.server}:${node.port}, method=${node.method}, password=${node.password}, udp-relay=true, tag=${node.name}`
}

function vmessLine(node: VmessProxy): string {
  const parts = [`vmess=${node.server}:${node.port}`, `method=${node.cipher ?? 'none'}`, `password=${node.uuid}`]

  if (node.network === 'ws') {
    const obfs = node.tls ? 'wss' : 'ws'
    parts.push(`obfs=${obfs}`)
    if (node.host) parts.push(`obfs-host=${node.host}`)
    if (node.path) parts.push(`obfs-uri=${node.path}`)
  } else if (node.tls) {
    parts.push('obfs=over-tls')
    if (node.sni) parts.push(`obfs-host=${node.sni}`)
  }

  parts.push('udp-relay=true', `tag=${node.name}`)
  return parts.join(', ')
}

function vlessLine(node: VlessProxy): string {
  const parts = [`vless=${node.server}:${node.port}`, 'method=none', `password=${node.uuid}`]

  const hasTls = node.security === 'tls' || node.security === 'reality'

  if (node.network === 'ws') {
    parts.push(hasTls ? 'obfs=wss' : 'obfs=ws')
    if (node.host) parts.push(`obfs-host=${node.host}`)
    if (node.path) parts.push(`obfs-uri=${node.path}`)
  } else if (hasTls) {
    parts.push('obfs=over-tls')
    if (node.sni) parts.push(`obfs-host=${node.sni}`)
  }

  if (node.security === 'reality' && node.realityPublicKey) {
    parts.push(`reality-base64-pubkey=${node.realityPublicKey}`)
    if (node.realityShortId) parts.push(`reality-hex-shortid=${node.realityShortId}`)
  }

  if (node.flow) parts.push(`vless-flow=${node.flow}`)

  parts.push('udp-relay=true', `tag=${node.name}`)
  return parts.join(', ')
}

function trojanLine(node: TrojanProxy): string {
  const parts = [`trojan=${node.server}:${node.port}`, `password=${node.password}`, 'over-tls=true']
  if (node.sni) parts.push(`tls-host=${node.sni}`)
  parts.push('tls-verification=true', 'udp-relay=true', `tag=${node.name}`)
  return parts.join(', ')
}

function hysteria2Line(node: Hysteria2Proxy): string {
  const parts = [`hysteria2=${node.server}:${node.port}`, `password=${node.password}`]
  if (node.sni) parts.push(`sni=${node.sni}`)
  if (node.insecure) parts.push('tls-verification=false')
  if (node.obfs) parts.push(`obfs=${node.obfs}`)
  if (node.obfsPassword) parts.push(`obfs-password=${node.obfsPassword}`)
  parts.push('udp-relay=true', `tag=${node.name}`)
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

const CLASH_TO_QUANX_TYPE: Record<string, string> = {
  'DOMAIN': 'host',
  'DOMAIN-SUFFIX': 'host-suffix',
  'DOMAIN-KEYWORD': 'host-keyword',
  'IP-CIDR': 'ip-cidr',
  'IP-CIDR6': 'ip6-cidr',
  'GEOIP': 'geoip',
}

function toQuanxRule(rule: string): string {
  const parts = rule.split(',')
  if (parts.length === 2 && parts[0].toUpperCase() === 'MATCH') {
    return `final, ${parts[1].trim()}`
  }
  if (parts.length >= 3) {
    const type = parts[0].trim().toUpperCase()
    const value = parts[1].trim()
    const policy = parts[2].trim()
    const quanxType = CLASH_TO_QUANX_TYPE[type]
    if (quanxType) return `${quanxType}, ${value}, ${policy}`
  }
  return rule
}

export function formatQuanxProxies(nodes: ProxyNode[], extras?: ClashExtras): string {
  const usable = nodes.filter((n) => n.type !== 'raw')
  const lines = usable.map(proxyLine)
  const tags = usable.map((n) => n.name)
  const ruleLines = extras?.rules?.length
    ? extras.rules.map(toQuanxRule)
    : ['final, PROXY']
  return [
    '[server_local]',
    ...lines,
    '',
    '[policy]',
    `static=PROXY, ${tags.join(', ')}, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Proxy.png`,
    `url-latency-benchmark=AUTO, server-tag-regex=.*, check-interval=600, tolerance=0, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png`,
    '',
    '[filter_local]',
    ...ruleLines,
  ].join('\n')
}
