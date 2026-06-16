import type { ShadowsocksProxy } from '../../types/proxy.js'
import { decodeBase64Loose, decodeName, parseQuery } from '../../utils/uri.js'

function parsePlugin(pluginValue: string): { plugin?: string; pluginOpts?: string } {
  const semicolon = pluginValue.indexOf(';')
  if (semicolon === -1) {
    return { plugin: pluginValue }
  }

  return {
    plugin: pluginValue.slice(0, semicolon),
    pluginOpts: pluginValue.slice(semicolon + 1),
  }
}

function parseLegacyBody(body: string): { method: string; password: string; server: string; port: number } | null {
  const decoded = decodeBase64Loose(body)
  const at = decoded.lastIndexOf('@')
  if (at === -1) return null

  const creds = decoded.slice(0, at)
  const hostPart = decoded.slice(at + 1)
  const colon = creds.indexOf(':')
  if (colon === -1) return null

  const method = creds.slice(0, colon)
  const password = creds.slice(colon + 1)
  const hostMatch = hostPart.match(/^(.*?):(\d+)$/)
  if (!hostMatch) return null

  return {
    method,
    password,
    server: hostMatch[1],
    port: Number(hostMatch[2]),
  }
}

export function parseShadowsocksLine(line: string): ShadowsocksProxy | null {
  if (!line.startsWith('ss://')) return null

  let url: URL
  try {
    url = new URL(line)
  } catch {
    return null
  }

  const name = decodeName(url.hash.slice(1))
  const params = parseQuery(url.search)
  const pluginInfo = params.plugin ? parsePlugin(params.plugin) : {}

  if (url.username && url.password) {
    const method = decodeURIComponent(url.username)
    const password = decodeURIComponent(url.password)
    const server = url.hostname
    const port = url.port ? Number(url.port) : 8388
    if (!method || !password || !server || Number.isNaN(port)) return null

    return {
      type: 'shadowsocks',
      name: name || `${server}:${port}`,
      server,
      port,
      method,
      password,
      ...pluginInfo,
    }
  }

  const body = line.slice('ss://'.length).split('#')[0]?.split('?')[0]
  if (!body) return null

  const parsed = parseLegacyBody(body)
  if (!parsed) return null

  return {
    type: 'shadowsocks',
    name: name || `${parsed.server}:${parsed.port}`,
    server: parsed.server,
    port: parsed.port,
    method: parsed.method,
    password: parsed.password,
    ...pluginInfo,
  }
}
