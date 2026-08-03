export interface OutputSettings {
  /** url-test / 测速地址（各客户端映射到对应字段） */
  urlTestUrl: string
  /** 测速间隔（秒） */
  urlTestInterval: number
  /** 直连绕过列表（Surge/Surfboard/Loon: skip-proxy；QuanX: excluded_routes 仅 CIDR） */
  skipProxy: string
  /** DNS 服务器（逗号分隔；Clash nameserver / QuanX [dns] server / 其余 dns-server） */
  dnsServer: string
}

export type OutputSettingsInput = Partial<OutputSettings>
