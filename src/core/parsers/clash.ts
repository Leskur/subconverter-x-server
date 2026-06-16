import { parse as parseYaml } from 'yaml'
import type { ProxyNode } from '../../types/proxy.js'

interface ClashProxy {
  name?: string
  type?: string
  server?: string
  port?: number | string
  cipher?: string
  password?: string
  uuid?: string
  alterId?: number | string
  flow?: string
  network?: string
  tls?: boolean
  sni?: string
  servername?: string
  alpn?: string[] | string
  'client-fingerprint'?: string
  plugin?: string
  'plugin-opts'?: unknown
  'ws-opts'?: { path?: string; headers?: Record<string, string> }
  'grpc-opts'?: { 'grpc-service-name'?: string }
  'reality-opts'?: { 'public-key'?: string; 'short-id'?: string }
}

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  const text = String(value).trim()
  return text.length > 0 ? text : undefined
}

function asNumber(value: unknown): number | undefined {
  const text = asString(value)
  if (text === undefined) return undefined
  const num = Number(text)
  return Number.isNaN(num) ? undefined : num
}

function asAlpn(value: string[] | string | undefined): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) return value.join(',')
  return asString(value)
}

function mapClashProxy(raw: ClashProxy): ProxyNode | null {
  const type = asString(raw.type)?.toLowerCase()
  const server = asString(raw.server)
  const port = asNumber(raw.port)
  const name = asString(raw.name) || (server && port ? `${server}:${port}` : undefined)

  if (!type || !server || port === undefined || !name) return null

  const network = asString(raw.network)
  const host = raw['ws-opts']?.headers?.Host
  const path = raw['ws-opts']?.path
  const serviceName = raw['grpc-opts']?.['grpc-service-name']
  const sni = asString(raw.servername) || asString(raw.sni)
  const fingerprint = asString(raw['client-fingerprint'])
  const alpn = asAlpn(raw.alpn)

  switch (type) {
    case 'ss':
    case 'shadowsocks': {
      const method = asString(raw.cipher)
      const password = asString(raw.password)
      if (!method || !password) return null
      return {
        type: 'shadowsocks',
        name,
        server,
        port,
        method,
        password,
        plugin: asString(raw.plugin),
        pluginOpts:
          typeof raw['plugin-opts'] === 'string' ? raw['plugin-opts'] : undefined,
      }
    }

    case 'vmess': {
      const uuid = asString(raw.uuid)
      if (!uuid) return null
      return {
        type: 'vmess',
        name,
        server,
        port,
        uuid,
        alterId: asNumber(raw.alterId) ?? 0,
        cipher: asString(raw.cipher) || 'auto',
        network: network || 'tcp',
        tls: raw.tls === true,
        sni,
        alpn,
        fingerprint,
        host: asString(host),
        path: asString(path),
      }
    }

    case 'vless': {
      const uuid = asString(raw.uuid)
      if (!uuid) return null
      const realityPublicKey = raw['reality-opts']?.['public-key']
      const realityShortId = raw['reality-opts']?.['short-id']
      const security = realityPublicKey ? 'reality' : raw.tls ? 'tls' : undefined
      return {
        type: 'vless',
        name,
        server,
        port,
        uuid,
        flow: asString(raw.flow),
        network: network || 'tcp',
        security,
        sni,
        fingerprint,
        alpn,
        host: asString(host),
        path: asString(path),
        serviceName: asString(serviceName),
        realityPublicKey: asString(realityPublicKey),
        realityShortId: asString(realityShortId),
      }
    }

    case 'trojan': {
      const password = asString(raw.password)
      if (!password) return null
      return {
        type: 'trojan',
        name,
        server,
        port,
        password,
        sni,
        alpn,
        fingerprint,
        network,
        host: asString(host),
        path: asString(path),
      }
    }

    default:
      return null
  }
}

export function parseClashConfig(raw: string): {
  nodes: ProxyNode[]
  proxyGroups: unknown[]
  rules: string[]
} {
  let doc: unknown
  try {
    doc = parseYaml(raw)
  } catch {
    return { nodes: [], proxyGroups: [], rules: [] }
  }

  if (!doc || typeof doc !== 'object') return { nodes: [], proxyGroups: [], rules: [] }

  const record = doc as { proxies?: unknown; 'proxy-groups'?: unknown; rules?: unknown }
  const proxies = record.proxies
  if (!Array.isArray(proxies)) return { nodes: [], proxyGroups: [], rules: [] }

  const nodes: ProxyNode[] = []
  for (const item of proxies) {
    if (item && typeof item === 'object') {
      const node = mapClashProxy(item as ClashProxy)
      if (node) nodes.push(node)
    }
  }

  const proxyGroups = Array.isArray(record['proxy-groups']) ? record['proxy-groups'] : []
  const rules = Array.isArray(record.rules)
    ? record.rules.map((rule) => String(rule).trim()).filter(Boolean)
    : []

  return { nodes, proxyGroups, rules }
}
