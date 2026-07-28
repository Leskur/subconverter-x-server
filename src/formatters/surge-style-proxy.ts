import type {
  Hysteria2Proxy,
  ProxyNode,
  ShadowsocksProxy,
  TrojanProxy,
  VmessProxy,
} from '../core/types.js'

/** Surge / Surfboard 共用的 `[Proxy]` 行语法（能力裁剪见 core/capabilities.ts）。 */
export type SurgeStyleTarget = 'surge' | 'surfboard'

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

function vmessLine(node: VmessProxy, target: SurgeStyleTarget): string {
  const parts = [
    `${node.name} = vmess, ${node.server}, ${node.port}`,
    `username=${node.uuid}`,
    'udp-relay=true',
  ]
  if (target === 'surge' && (node.cipher === 'aes-128-gcm' || node.cipher === 'chacha20-ietf-poly1305')) {
    parts.push(`encrypt-method=${node.cipher}`)
  }
  if (node.network === 'ws') {
    parts.push('ws=true')
    if (node.path) parts.push(`ws-path=${node.path}`)
    if (node.host) parts.push(`ws-headers=Host:${node.host}`)
  }
  if (node.tls) {
    parts.push('tls=true')
    if (node.sni) parts.push(`sni=${node.sni}`)
    if (target === 'surge' && node.alpn) parts.push(`alpn=${node.alpn}`)
  }
  if (node.cipher && node.cipher !== 'auto') parts.push('vmess-aead=true')
  return parts.join(', ')
}

function trojanLine(node: TrojanProxy, target: SurgeStyleTarget): string {
  const parts = [
    `${node.name} = trojan, ${node.server}, ${node.port}`,
    `password=${node.password}`,
    'udp-relay=true',
  ]
  if (node.sni) parts.push(`sni=${node.sni}`)
  if (target === 'surge' && node.alpn) parts.push(`alpn=${node.alpn}`)
  if (target === 'surge' && node.network === 'ws') {
    parts.push('ws=true')
    if (node.path) parts.push(`ws-path=${node.path}`)
    if (node.host) parts.push(`ws-headers=Host:${node.host}`)
  }
  parts.push('skip-cert-verify=false')
  return parts.join(', ')
}

function hysteria2Line(node: Hysteria2Proxy, target: SurgeStyleTarget): string {
  const parts = [
    `${node.name} = hysteria2, ${node.server}, ${node.port}`,
    `password=${node.password}`,
  ]
  if (target === 'surfboard') parts.push('udp-relay=true')
  if (node.sni) parts.push(`sni=${node.sni}`)
  if (node.insecure) parts.push('skip-cert-verify=true')

  if (target === 'surge') {
    if (node.pinSHA256) parts.push(`server-cert-fingerprint-sha256=${node.pinSHA256}`)
    const obfs = (node.obfs || '').toLowerCase()
    if (node.obfsPassword) {
      if (obfs === 'gecko') {
        parts.push(`gecko-password=${node.obfsPassword}`)
      } else {
        parts.push(`salamander-password=${node.obfsPassword}`)
      }
    }
  } else {
    if (node.obfs) parts.push(`obfs=${node.obfs}`)
    if (node.obfsPassword) parts.push(`obfs-password=${node.obfsPassword}`)
  }

  return parts.join(', ')
}

export function surgeStyleProxyLine(node: ProxyNode, target: SurgeStyleTarget): string {
  switch (node.type) {
    case 'shadowsocks':
      return ssLine(node)
    case 'vmess':
      return vmessLine(node, target)
    case 'trojan':
      return trojanLine(node, target)
    case 'hysteria2':
      return hysteria2Line(node, target)
    default:
      return ''
  }
}

export function surgeStyleProxyLines(nodes: ProxyNode[], target: SurgeStyleTarget): string[] {
  return nodes.map((node) => surgeStyleProxyLine(node, target)).filter(Boolean)
}
