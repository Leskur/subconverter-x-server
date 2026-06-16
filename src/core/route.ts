import type { ClientType } from '../types/proxy.js'

const CLIENT_ALIASES: Record<string, ClientType> = {
  singbox: 'singbox',
  'sing-box': 'singbox',
  sfa: 'singbox',
  sfi: 'singbox',
  clash: 'clash',
  mihomo: 'clash',
  'clash.meta': 'clash',
  'clash meta': 'clash',
  meta: 'clash',
  surge: 'surge',
  shadowrocket: 'surge',
}

export function normalizeClient(value: string | undefined): ClientType | null {
  if (!value) return null
  const key = value.trim().toLowerCase()
  return CLIENT_ALIASES[key] ?? null
}

export function detectClientFromUserAgent(userAgent: string | undefined): ClientType | null {
  if (!userAgent) return null
  const ua = userAgent.toLowerCase()

  if (ua.includes('sing-box') || ua.includes('singbox') || ua.includes('sfa') || ua.includes('sfi')) {
    return 'singbox'
  }

  if (ua.includes('clash.meta') || ua.includes('clash meta') || ua.includes('mihomo') || ua.includes('clash')) {
    return 'clash'
  }

  if (ua.includes('surge') || ua.includes('shadowrocket')) {
    return 'surge'
  }

  return null
}

export function resolveClient(
  userAgent: string | undefined,
  forceClient: string | undefined,
  fallback: ClientType = 'singbox',
): ClientType {
  return normalizeClient(forceClient) ?? detectClientFromUserAgent(userAgent) ?? fallback
}

export function resolveClientOrNull(
  userAgent: string | undefined,
  forceClient: string | undefined,
): ClientType | null {
  return normalizeClient(forceClient) ?? detectClientFromUserAgent(userAgent)
}
