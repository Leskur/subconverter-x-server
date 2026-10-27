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

/** 解析 target 等短别名（如 mihomo → clash） */
function parseClientAlias(value: string | undefined): ClientType | null {
  if (!value) return null
  const key = value.trim().toLowerCase()
  return CLIENT_ALIASES[key] ?? null
}

/** 从入站 User-Agent 检测输出格式 */
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

/**
 * 解析输出格式：优先 target，否则按入站 UA 检测。
 * 都无法匹配时返回 null（路由侧原样返回订阅正文）。
 */
export function detectOutputClient(
  target: string | undefined,
  userAgent: string | undefined,
): ClientType | null {
  return parseClientAlias(target) ?? detectClientFromUa(userAgent)
}
