import type { TrojanProxy } from '../types.js'
import { decodeName, parseQuery } from '../../utils/uri.js'

export function parseTrojanLine(line: string): TrojanProxy | null {
  if (!line.startsWith('trojan://')) return null

  let url: URL
  try {
    url = new URL(line)
  } catch {
    return null
  }

  const password = decodeURIComponent(url.password || url.username)
  const server = url.hostname
  const port = url.port ? Number(url.port) : 443
  if (!password || !server || Number.isNaN(port)) return null

  const params = parseQuery(url.search)
  const name = decodeName(url.hash.slice(1)) || `${server}:${port}`

  return {
    type: 'trojan',
    name,
    server,
    port,
    password,
    sni: params.sni || params.peer || undefined,
    alpn: params.alpn || undefined,
    fingerprint: params.fp || undefined,
    network: params.type || undefined,
    host: params.host || undefined,
    path: params.path || undefined,
  }
}
