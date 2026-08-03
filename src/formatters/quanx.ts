import type {
  Hysteria2Proxy,
  ProxyNode,
  ShadowsocksProxy,
  TrojanProxy,
  VlessProxy,
  VmessProxy,
} from '../core/types.js'
import type { ClashExtras } from '../rules/merge.js'
import type { OutputSettings } from '../output-settings/types.js'
import { parseDnsServers, skipProxyToCidrs } from '../output-settings/apply.js'
import {
  DEFAULT_DNS_SERVER,
  DEFAULT_SKIP_PROXY,
  URL_TEST_INTERVAL_SEC,
  URL_TEST_URL,
} from '../core/constants.js'

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

export function formatQuanxProxies(
  nodes: ProxyNode[],
  extras?: ClashExtras,
  outputSettings?: OutputSettings,
): string {
  const lines = nodes.map(proxyLine).filter(Boolean)
  const tags = nodes.map((n) => n.name)
  const ruleLines = extras?.rules?.length
    ? extras.rules.map(toQuanxRule)
    : ['final, PROXY']
  const url = outputSettings?.urlTestUrl ?? URL_TEST_URL
  const interval = outputSettings?.urlTestInterval ?? URL_TEST_INTERVAL_SEC
  const dnsServers = parseDnsServers(outputSettings?.dnsServer ?? DEFAULT_DNS_SERVER)
  const excluded = skipProxyToCidrs(outputSettings?.skipProxy ?? DEFAULT_SKIP_PROXY)

  const general: string[] = ['[general]', `server_check_url=${url}`]
  if (excluded.length > 0) {
    general.push(`excluded_routes=${excluded.join(', ')}`)
  }

  const dns: string[] = ['[dns]', ...dnsServers.map((s) => `server = ${s}`)]

  return [
    ...general,
    '',
    ...dns,
    '',
    '[server_local]',
    ...lines,
    '',
    '[policy]',
    `static=PROXY, AUTO, ${tags.join(', ')}, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Proxy.png`,
    `url-latency-benchmark=AUTO, server-tag-regex=.*, check-interval=${interval}, tolerance=0, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png`,
    '',
    '[filter_local]',
    ...ruleLines,
  ].join('\n')
}
