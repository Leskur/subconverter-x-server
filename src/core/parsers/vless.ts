import type { VlessProxy } from '../types.js'
import { decodeName, parseQuery } from '../../utils/uri.js'

export function parseVlessLine(line: string): VlessProxy | null {
  if (!line.startsWith('vless://')) return null

  let url: URL
  try {
    url = new URL(line)
  } catch {
    return null
  }

  const uuid = decodeURIComponent(url.username)
  const server = url.hostname
  const port = url.port ? Number(url.port) : 443
  if (!uuid || !server || Number.isNaN(port)) return null

  const params = parseQuery(url.search)
  const name = decodeName(url.hash.slice(1)) || `${server}:${port}`

  return {
    type: 'vless',
    name,
    server,
    port,
    uuid,
    flow: params.flow || undefined,
    network: params.type || 'tcp',
    security: params.security || undefined,
    sni: params.sni || params.peer || undefined,
    fingerprint: params.fp || undefined,
    alpn: params.alpn || undefined,
    host: params.host || undefined,
    path: params.path || undefined,
    serviceName: params.serviceName || undefined,
    packetEncoding: params.packetEncoding || undefined,
    realityPublicKey: params.pbk || undefined,
    realityShortId: params.sid || undefined,
    realitySpiderX: params.spx || undefined,
  }
}
