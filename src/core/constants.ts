import type { UpdateIntervalMode } from '../subscription/types.js'

/** url-test 探测地址（Cloudflare generate_204） */
export const URL_TEST_URL = 'http://cp.cloudflare.com/generate_204'

/** AUTO 代理组测速间隔（秒） */
export const URL_TEST_INTERVAL_SEC = 300

/** 托管配置默认更新间隔（秒）；`auto` 时等同此值 */
export const MANAGED_CONFIG_INTERVAL_SEC = 43200

/** Surge / Surfboard / Loon dns-server；Clash nameserver；QuanX [dns] server（默认阿里 + 腾讯） */
export const DEFAULT_DNS_SERVER = '223.5.5.5, 119.29.29.29'

/** Surge / Surfboard / Loon skip-proxy；QuanX 仅取其中 CIDR 写入 excluded_routes */
export const DEFAULT_SKIP_PROXY =
  '127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, localhost, *.local'

export const RULE_GEOIP_CN_DIRECT = 'GEOIP,CN,DIRECT'
export const RULE_MATCH_PROXY = 'MATCH,PROXY'
export const RULE_FINAL_PROXY = 'FINAL,PROXY'

export const SURGE_STYLE_DEFAULT_RULES = [RULE_GEOIP_CN_DIRECT, RULE_FINAL_PROXY]
export const LOON_DEFAULT_RULES = [RULE_FINAL_PROXY]

export function resolveManagedConfigInterval(updateInterval?: UpdateIntervalMode): number {
  if (updateInterval && updateInterval !== 'auto') return updateInterval
  return MANAGED_CONFIG_INTERVAL_SEC
}
