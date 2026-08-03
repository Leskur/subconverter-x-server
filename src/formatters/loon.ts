import {
  DEFAULT_DNS_SERVER,
  DEFAULT_SKIP_PROXY,
  LOON_DEFAULT_RULES,
  resolveManagedConfigInterval,
  URL_TEST_INTERVAL_SEC,
  URL_TEST_URL,
} from '../core/constants.js'
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
import type { UpdateIntervalMode } from '../subscription/types.js'

function ssLine(node: ShadowsocksProxy): string {
  const parts = [`${node.name} = Shadowsocks,${node.server},${node.port},${node.method},"${node.password}"`]
  parts.push('fast-open=false', 'udp=true')
  return parts.join(',')
}

function vmessLine(node: VmessProxy): string {
  const transport = node.network === 'ws' ? 'ws' : node.network === 'grpc' ? 'grpc' : 'tcp'
  const tls = node.tls ? 'true' : 'false'
  const parts = [
    `${node.name} = vmess,${node.server},${node.port},${node.cipher ?? 'aes-128-gcm'},"${node.uuid}"`,
    `transport=${transport}`,
  ]
  if (node.network === 'grpc' && node.path) parts.push(`host=${node.path}`)
  else {
    if (node.path) parts.push(`path=${node.path}`)
    if (node.host) parts.push(`host=${node.host}`)
  }
  parts.push(`over-tls=${tls}`)
  if (node.sni) parts.push(`tls-name=${node.sni}`)
  if (node.tls) parts.push('skip-cert-verify=false')
  return parts.join(',')
}

function vlessLine(node: VlessProxy): string {
  const transport = node.network === 'ws' ? 'ws' : node.network === 'grpc' ? 'grpc' : 'tcp'
  const tls = node.security === 'tls' || node.security === 'reality' ? 'true' : 'false'
  const parts = [
    `${node.name} = VLESS,${node.server},${node.port},"${node.uuid}"`,
    `transport=${transport}`,
  ]
  if (node.network === 'grpc' && (node.serviceName || node.path)) {
    parts.push(`host=${node.serviceName || node.path}`)
  } else {
    if (node.path) parts.push(`path=${node.path}`)
    if (node.host) parts.push(`host=${node.host}`)
  }
  parts.push(`over-tls=${tls}`)
  if (node.sni) parts.push(`tls-name=${node.sni}`)
  if (node.flow) parts.push(`flow=${node.flow}`)
  if (node.security === 'reality') {
    if (node.realityPublicKey) parts.push(`reality-public-key=${node.realityPublicKey}`)
    if (node.realityShortId) parts.push(`reality-short-id=${node.realityShortId}`)
  }
  return parts.join(',')
}

function trojanLine(node: TrojanProxy): string {
  const parts = [
    `${node.name} = trojan,${node.server},${node.port},"${node.password}"`,
    'skip-cert-verify=false',
  ]
  if (node.sni) parts.push(`tls-name=${node.sni}`)
  if (node.network === 'ws') {
    parts.push('transport=ws')
    if (node.path) parts.push(`path=${node.path}`)
    if (node.host) parts.push(`host=${node.host}`)
  }
  return parts.join(',')
}

function hysteria2Line(node: Hysteria2Proxy): string {
  const parts = [
    `${node.name} = Hysteria2,${node.server},${node.port},"${node.password}"`,
  ]
  if (node.sni) parts.push(`tls-name=${node.sni}`)
  if (node.insecure) parts.push('skip-cert-verify=true')
  if (node.obfs) parts.push(`obfs=${node.obfs}`)
  if (node.obfsPassword) parts.push(`obfs-password=${node.obfsPassword}`)
  return parts.join(',')
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

export function formatLoonProxies(
  nodes: ProxyNode[],
  extras?: ClashExtras,
  managedConfigUrl?: string,
  updateInterval?: UpdateIntervalMode,
  outputSettings?: OutputSettings,
): string {
  const lines = nodes.map(proxyLine).filter(Boolean)
  const names = nodes.map((n) => n.name)
  const ruleLines = extras?.rules?.length
    ? extras.rules.map((r) => r.replace(/^MATCH,/, 'FINAL,'))
    : [...LOON_DEFAULT_RULES]
  const intervalValue = resolveManagedConfigInterval(updateInterval)
  const header = managedConfigUrl
    ? [`#!MANAGED-CONFIG ${managedConfigUrl} interval=${intervalValue} strict=false`, '']
    : []
  const url = outputSettings?.urlTestUrl ?? URL_TEST_URL
  const testInterval = outputSettings?.urlTestInterval ?? URL_TEST_INTERVAL_SEC
  const dnsServer = outputSettings?.dnsServer ?? DEFAULT_DNS_SERVER
  const skipProxy = outputSettings?.skipProxy ?? DEFAULT_SKIP_PROXY
  return [
    ...header,
    '[General]',
    `dns-server = ${dnsServer}`,
    `skip-proxy = ${skipProxy}`,
    '',
    '[Proxy]',
    ...lines,
    '',
    '[Proxy Group]',
    `PROXY = select,AUTO,${names.join(',')}`,
    `AUTO = url-test,${names.join(',')},url=${url},interval=${testInterval}`,
    '',
    '[Rule]',
    ...ruleLines,
  ].join('\n')
}
