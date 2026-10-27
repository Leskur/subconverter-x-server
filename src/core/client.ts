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

function parseClientAlias(value: string | undefined): ClientType | null {
  if (!value) return null
  const key = value.trim().toLowerCase()
  return CLIENT_ALIASES[key] ?? null
}

function detectClientFromUa(userAgent: string | undefined): ClientType | null {
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

/** 解析输出客户端；找不到返回 null（用于透传） */
export function detectOutputClient(
  userAgent: string | undefined,
  targetOrClient: string | undefined,
): ClientType | null {
  return parseClientAlias(targetOrClient) ?? detectClientFromUa(userAgent)
}
