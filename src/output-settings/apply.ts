import { DEFAULT_DNS_SERVER, DEFAULT_SKIP_PROXY } from '../core/constants.js'
import type { OutputSettings } from './types.js'

/** 拆分逗号分隔的 DNS 列表 */
export function parseDnsServers(raw?: string): string[] {
  const value = (raw ?? DEFAULT_DNS_SERVER).trim()
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * 从 skip-proxy 风格列表提取 CIDR/IP，供 QuanX excluded_routes 使用。
 * 主机名（localhost、*.local 等）会被丢弃。
 */
export function skipProxyToCidrs(raw?: string): string[] {
  const value = (raw ?? DEFAULT_SKIP_PROXY).trim()
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false
      // IPv4 / CIDR
      if (/^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?$/.test(s)) return true
      // bare IPv6 or [ipv6]/prefix (simple)
      if (s.includes(':')) return true
      return false
    })
}

export function resolveDnsServer(settings?: Pick<OutputSettings, 'dnsServer'>): string {
  return settings?.dnsServer?.trim() || DEFAULT_DNS_SERVER
}

export function resolveSkipProxy(settings?: Pick<OutputSettings, 'skipProxy'>): string {
  return settings?.skipProxy?.trim() || DEFAULT_SKIP_PROXY
}
