import type { ClientType } from './types.js'

const CLIENT_ALIASES: Record<string, ClientType> = {
  clash: 'clash',
  mihomo: 'clash',
  'clash.meta': 'clash',
  'clash meta': 'clash',
  meta: 'clash',
  surge: 'surge',
  shadowrocket: 'surge',
  surfboard: 'surfboard',
  loon: 'loon',
  quanx: 'quanx',
  quantumult: 'quanx',
  'quantumult x': 'quanx',
}

export function normalizeClient(value: string | undefined): ClientType | null {
  if (!value) return null
  const key = value.trim().toLowerCase()
  return CLIENT_ALIASES[key] ?? null
}

export function detectClientFromUserAgent(userAgent: string | undefined): ClientType | null {
  if (!userAgent) return null
  const ua = userAgent.toLowerCase()

  if (ua.includes('clash.meta') || ua.includes('clash meta') || ua.includes('mihomo') || ua.includes('clash')) {
    return 'clash'
  }

  if (ua.includes('surge') || ua.includes('shadowrocket')) {
    return 'surge'
  }

  if (ua.includes('surfboard')) {
    return 'surfboard'
  }

  if (ua.includes('loon')) {
    return 'loon'
  }

  if (ua.includes('quantumult')) {
    return 'quanx'
  }

  return null
}

export function resolveClient(
  userAgent: string | undefined,
  forceClient: string | undefined,
  fallback: ClientType = 'clash',
): ClientType {
  return normalizeClient(forceClient) ?? detectClientFromUserAgent(userAgent) ?? fallback
}

export function resolveClientOrNull(
  userAgent: string | undefined,
  forceClient: string | undefined,
): ClientType | null {
  return normalizeClient(forceClient) ?? detectClientFromUserAgent(userAgent)
}
