import type { Hysteria2Proxy } from '../types.js'
import { decodeName, parseQuery } from '../../utils/uri.js'

export function parseHysteria2Line(line: string): Hysteria2Proxy | null {
  if (!line.startsWith('hysteria2://') && !line.startsWith('hy2://')) return null

  let url: URL
  try {
    url = new URL(line)
  } catch {
    return null
  }

  const password = decodeURIComponent(url.username)
  if (!password) return null

  const server = url.hostname
  if (!server) return null

  const port = url.port ? Number(url.port) : 443
  if (Number.isNaN(port)) return null

  const params = parseQuery(url.search)
  const name = decodeName(url.hash.slice(1)) || `${server}:${port}`

  return {
    type: 'hysteria2',
    name,
    server,
    port,
    password,
    sni: params.sni || undefined,
    insecure: params.insecure === '1' || params.insecure === 'true' || undefined,
    obfs: params.obfs || undefined,
    obfsPassword: params['obfs-password'] || undefined,
    pinSHA256: params.pinSHA256 || undefined,
  }
}
