import type {
  Hysteria2Proxy,
  ProxyNode,
  ShadowsocksProxy,
  TrojanProxy,
  VlessProxy,
  VmessProxy,
} from '../core/types.js'

type TransportableNode = VlessProxy | TrojanProxy | VmessProxy

function buildTransport(node: TransportableNode): Record<string, unknown> | undefined {
  const network = node.network ?? 'tcp'
  if (network === 'tcp' || network === 'none') return undefined

  const transport: Record<string, unknown> = { type: network }

  if (network === 'ws') {
    transport.path = node.path || '/'
    if (node.host) {
      transport.headers = { Host: node.host }
    }
  }

  if (network === 'grpc') {
    const serviceName = 'serviceName' in node ? node.serviceName : undefined
    transport.service_name = serviceName || node.path || ''
  }

  if (network === 'http' || network === 'h2') {
    transport.path = node.path || '/'
    transport.host = node.host ? [node.host] : undefined
  }

  return transport
}

function buildTls(node: VlessProxy | TrojanProxy): Record<string, unknown> | undefined {
  const security = 'security' in node ? node.security : node.sni ? 'tls' : undefined

  if (security === 'reality' && node.type === 'vless') {
    return {
      enabled: true,
      server_name: node.sni,
      reality: {
        enabled: true,
        public_key: node.realityPublicKey,
        short_id: node.realityShortId || '',
      },
      utls: node.fingerprint
        ? {
            enabled: true,
            fingerprint: node.fingerprint,
          }
        : undefined,
    }
  }

  if (security === 'tls' || node.sni || node.fingerprint) {
    return {
      enabled: true,
      server_name: node.sni,
      alpn: node.alpn?.split(','),
      utls: node.fingerprint
        ? {
            enabled: true,
            fingerprint: node.fingerprint,
          }
        : undefined,
    }
  }

  return undefined
}

function vlessOutbound(node: VlessProxy): Record<string, unknown> {
  const outbound: Record<string, unknown> = {
    type: 'vless',
    tag: node.name,
    server: node.server,
    server_port: node.port,
    uuid: node.uuid,
  }

  if (node.flow) outbound.flow = node.flow
  if (node.packetEncoding) outbound.packet_encoding = node.packetEncoding

  const tls = buildTls(node)
  if (tls) outbound.tls = tls

  const transport = buildTransport(node)
  if (transport) outbound.transport = transport

  return outbound
}

function shadowsocksOutbound(node: ShadowsocksProxy): Record<string, unknown> {
  return {
    type: 'shadowsocks',
    tag: node.name,
    server: node.server,
    server_port: node.port,
    method: node.method,
    password: node.password,
  }
}

function vmessOutbound(node: VmessProxy): Record<string, unknown> {
  const outbound: Record<string, unknown> = {
    type: 'vmess',
    tag: node.name,
    server: node.server,
    server_port: node.port,
    uuid: node.uuid,
    security: node.cipher ?? 'auto',
    alter_id: node.alterId ?? 0,
  }

  if (node.tls || node.sni || node.fingerprint) {
    outbound.tls = {
      enabled: true,
      server_name: node.sni,
      alpn: node.alpn?.split(','),
      utls: node.fingerprint
        ? {
            enabled: true,
            fingerprint: node.fingerprint,
          }
        : undefined,
    }
  }

  const transport = buildTransport(node)
  if (transport) outbound.transport = transport

  return outbound
}

function hysteria2Outbound(node: Hysteria2Proxy): Record<string, unknown> {
  const outbound: Record<string, unknown> = {
    type: 'hysteria2',
    tag: node.name,
    server: node.server,
    server_port: node.port,
    password: node.password,
  }

  if (node.sni || node.insecure || node.pinSHA256) {
    outbound.tls = {
      enabled: true,
      server_name: node.sni,
      insecure: node.insecure ?? false,
      ...(node.pinSHA256 ? { certificate_path: undefined, pinned_certificate: node.pinSHA256 } : {}),
    }
  }

  if (node.obfs) {
    outbound.obfs = {
      type: node.obfs,
      password: node.obfsPassword,
    }
  }

  return outbound
}

function trojanOutbound(node: TrojanProxy): Record<string, unknown> {
  const outbound: Record<string, unknown> = {
    type: 'trojan',
    tag: node.name,
    server: node.server,
    server_port: node.port,
    password: node.password,
  }

  const tls = buildTls(node)
  if (tls) outbound.tls = tls

  const transport = buildTransport(node)
  if (transport) outbound.transport = transport

  return outbound
}

export function formatSingboxOutbounds(nodes: ProxyNode[]): Record<string, unknown>[] {
  return nodes.filter((n) => n.type !== 'raw').map((node) => {
    switch (node.type) {
      case 'vless':
        return vlessOutbound(node)
      case 'shadowsocks':
        return shadowsocksOutbound(node)
      case 'trojan':
        return trojanOutbound(node)
      case 'vmess':
        return vmessOutbound(node)
      case 'hysteria2':
        return hysteria2Outbound(node)
    }
  })
}

function normalizePolicy(policy: string): string {
  switch (policy.trim().toUpperCase()) {
    case 'DIRECT':
      return 'direct'
    case 'REJECT':
      return 'block'
    default:
      return policy.trim()
  }
}

function parseClashRule(rule: string): Record<string, unknown> | null {
  const trimmed = rule.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  const parts = trimmed.split(',').map((p) => p.trim())
  if (parts.length < 2) return null

  const type = parts[0].toUpperCase()
  const value = parts[1]
  const policy = parts[2] ?? 'PROXY'
  const outbound = normalizePolicy(policy)

  switch (type) {
    case 'DOMAIN':
      return { domain: value, outbound }
    case 'DOMAIN-SUFFIX':
      return { domain_suffix: value, outbound }
    case 'DOMAIN-KEYWORD':
      return { domain_keyword: value, outbound }
    case 'GEOSITE':
    case 'GEOIP':
      return null
    case 'IP-CIDR':
    case 'IP-CIDR6':
      return { ip_cidr: value, outbound }
    case 'SRC-IP-CIDR':
      return { source_ip_cidr: value, outbound }
    case 'DST-PORT':
      return { port: Number(value), outbound }
    case 'SRC-PORT':
      return { source_port: Number(value), outbound }
    case 'PROCESS-NAME':
      return { process_name: value, outbound }
    case 'MATCH':
    case 'FINAL':
      return null
    default:
      return null
  }
}

export function convertClashRulesToSingbox(rules: string[]): Record<string, unknown>[] {
  return rules.map(parseClashRule).filter((r): r is Record<string, unknown> => r !== null)
}

export function formatSingboxConfig(nodes: ProxyNode[], template: Record<string, unknown>, rules?: string[]): string {
  const nodeOutbounds = formatSingboxOutbounds(nodes)
  const nodeTags = nodeOutbounds.map((o) => String(o.tag))
  const selectorTag = 'PROXY'

  const selectorOutbound = {
    type: 'selector',
    tag: selectorTag,
    outbounds: ['direct', 'AUTO', ...nodeTags],
    default: 'AUTO',
  }

  const urltestOutbound = {
    type: 'urltest',
    tag: 'AUTO',
    outbounds: nodeTags,
    url: 'http://cp.cloudflare.com/generate_204',
    interval: '5m',
  }

  const config = { ...template }
  const templateOutbounds = Array.isArray(config.outbounds) ? (config.outbounds as Record<string, unknown>[]) : []
  const existingTags = new Set(templateOutbounds.map((o) => String(o.tag)))
  const autoOutbounds = existingTags.has('AUTO') ? [] : [urltestOutbound]
  const selectorOutbounds = existingTags.has('PROXY') ? [] : [selectorOutbound]

  config.outbounds = [
    ...selectorOutbounds,
    ...autoOutbounds,
    ...nodeOutbounds,
    ...templateOutbounds,
  ]

  if (config.route && typeof config.route === 'object') {
    const route = config.route as Record<string, unknown>
    if (!route.final) {
      route.final = selectorTag
    }
    if (rules && rules.length > 0) {
      const converted = convertClashRulesToSingbox(rules)
      const existing = Array.isArray(route.rules) ? (route.rules as Record<string, unknown>[]) : []
      route.rules = [...converted, ...existing]
    }
  }

  return JSON.stringify(config, null, 2)
}
