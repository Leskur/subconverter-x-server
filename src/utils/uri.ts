export function decodeName(fragment: string): string {
  try {
    return decodeURIComponent(fragment.replace(/\+/g, ' '))
  } catch {
    return fragment
  }
}

export function parseQuery(search: string): Record<string, string> {
  const params: Record<string, string> = {}
  const query = search.startsWith('?') ? search.slice(1) : search
  if (!query) return params

  for (const part of query.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    const rawKey = eq === -1 ? part : part.slice(0, eq)
    const rawValue = eq === -1 ? '' : part.slice(eq + 1)
    const key = decodeURIComponent(rawKey)
    const value = decodeURIComponent(rawValue.replace(/\+/g, ' '))
    params[key] = value
  }

  return params
}

export function decodeBase64Loose(input: string): string {
  const normalized = input.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4
  const padded = padding === 0 ? normalized : normalized + '='.repeat(4 - padding)
  return Buffer.from(padded, 'base64').toString('utf8')
}

export function tryDecodeBase64(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed || !/^[A-Za-z0-9+/_-]+=*$/.test(trimmed)) return null
  try {
    const decoded = decodeBase64Loose(trimmed)
    if (!decoded || /[\x00-\x08\x0E-\x1F]/.test(decoded)) return null
    return decoded
  } catch {
    return null
  }
}

export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local')) return true
  if (host === '::1' || host.startsWith('fe80:')) return true

  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!ipv4Match) return false

  const octets = ipv4Match.slice(1).map(Number)
  if (octets.some((n) => n > 255)) return false

  const [a, b] = octets
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true

  return false
}

export function assertSafeUpstreamUrl(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Invalid upstream URL')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Upstream URL must use http or https')
  }

  if (isPrivateHost(url.hostname)) {
    throw new Error('Upstream URL points to a private or local address')
  }

  return url
}
