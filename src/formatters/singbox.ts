import type {
  ProxyNode,
  ShadowsocksProxy,
  TrojanProxy,
  VlessProxy,
  VmessProxy,
} from '../types/proxy.js'

function buildTransport(node: VlessProxy | TrojanProxy): Record<string, unknown> | undefined {
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

function buildVmessTransport(node: VmessProxy): Record<string, unknown> | undefined {
  const network = node.network ?? 'tcp'
  if (network === 'tcp' || network === 'none') return undefined

  const transport: Record<string, unknown> = { type: network }

  if (network === 'ws') {
    transport.path = node.path || '/'
    if (node.host) transport.headers = { Host: node.host }
  }

  if (network === 'grpc') {
    transport.service_name = node.path || ''
  }

  if (network === 'http' || network === 'h2') {
    transport.path = node.path || '/'
    transport.host = node.host ? [node.host] : undefined
  }

  return transport
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

  const transport = buildVmessTransport(node)
  if (transport) outbound.transport = transport

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

export function formatSingboxOutbounds(nodes: ProxyNode[]): string {
  const outbounds = nodes.map((node) => {
    switch (node.type) {
      case 'vless':
        return vlessOutbound(node)
      case 'shadowsocks':
        return shadowsocksOutbound(node)
      case 'trojan':
        return trojanOutbound(node)
      case 'vmess':
        return vmessOutbound(node)
    }
  })

  return JSON.stringify({ outbounds }, null, 2)
}
