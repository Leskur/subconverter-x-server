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
  const parts = [`${node.name} = Shadowsocks,${node.server},${node.port},${node.method},"${node.password}"`]
  parts.push('fast-open=false', 'udp=true')
  return parts.join(',')
}

function vmessLine(node: VmessProxy): string {
  const transport = node.network === 'ws' ? 'ws' : 'tcp'
  const tls = node.tls ? 'true' : 'false'
  const parts = [
    `${node.name} = vmess,${node.server},${node.port},${node.cipher ?? 'aes-128-gcm'},"${node.uuid}"`,
    `transport=${transport}`,
  ]
  if (node.path) parts.push(`path=${node.path}`)
  if (node.host) parts.push(`host=${node.host}`)
  parts.push(`over-tls=${tls}`)
  if (node.sni) parts.push(`tls-name=${node.sni}`)
  if (node.tls) parts.push('skip-cert-verify=false')
  return parts.join(',')
}

function vlessLine(node: VlessProxy): string {
  const transport = node.network === 'ws' ? 'ws' : 'tcp'
  const tls = node.security === 'tls' || node.security === 'reality' ? 'true' : 'false'
  const parts = [
    `${node.name} = VLESS,${node.server},${node.port},"${node.uuid}"`,
    `transport=${transport}`,
  ]
  if (node.path) parts.push(`path=${node.path}`)
  if (node.host) parts.push(`host=${node.host}`)
  parts.push(`over-tls=${tls}`)
  if (node.sni) parts.push(`tls-name=${node.sni}`)
  return parts.join(',')
}

function trojanLine(node: TrojanProxy): string {
  const parts = [
    `${node.name} = trojan,${node.server},${node.port},"${node.password}"`,
    'skip-cert-verify=false',
  ]
  if (node.sni) parts.push(`tls-name=${node.sni}`)
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

export function formatLoonProxies(nodes: ProxyNode[], extras?: ClashExtras): string {
  const usable = nodes.filter((n) => n.type !== 'raw')
  const lines = usable.map(proxyLine)
  const names = usable.map((n) => n.name)
  const ruleLines = extras?.rules?.length
    ? extras.rules.map((r) => r.replace(/^MATCH,/, 'FINAL,'))
    : ['FINAL,PROXY']
  return [
    '[Proxy]',
    ...lines,
    '',
    '[Proxy Group]',
    `PROXY = select,${names.join(',')}`,
    `AUTO = url-test,${names.join(',')},url=http://cp.cloudflare.com/generate_204,interval=300`,
    '',
    '[Rule]',
    ...ruleLines,
  ].join('\n')
}
