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

  return url
}
