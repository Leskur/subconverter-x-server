export type ProxyType = 'vless' | 'shadowsocks' | 'trojan' | 'vmess' | 'hysteria2' | 'raw'

export type ClientType = 'clash' | 'surge' | 'surfboard' | 'loon' | 'quanx'

export interface BaseProxy {
  type: ProxyType
  name: string
  server: string
  port: number
}

export interface VlessProxy extends BaseProxy {
  type: 'vless'
  uuid: string
  flow?: string
  network?: string
  security?: string
  sni?: string
  fingerprint?: string
  alpn?: string
  host?: string
  path?: string
  serviceName?: string
  packetEncoding?: string
  realityPublicKey?: string
  realityShortId?: string
  realitySpiderX?: string
}

export interface ShadowsocksProxy extends BaseProxy {
  type: 'shadowsocks'
  method: string
  password: string
  plugin?: string
  pluginOpts?: {
    mode?: string
    host?: string
  }
}

export interface TrojanProxy extends BaseProxy {
  type: 'trojan'
  password: string
  sni?: string
  alpn?: string
  fingerprint?: string
  network?: string
  host?: string
  path?: string
}

export interface VmessProxy extends BaseProxy {
  type: 'vmess'
  uuid: string
  alterId?: number
  cipher?: string
  network?: string
  headerType?: string
  tls?: boolean
  sni?: string
  alpn?: string
  fingerprint?: string
  host?: string
  path?: string
}

export interface Hysteria2Proxy extends BaseProxy {
  type: 'hysteria2'
  password: string
  sni?: string
  insecure?: boolean
  obfs?: string
  obfsPassword?: string
  pinSHA256?: string
}

export interface RawProxy extends BaseProxy {
  type: 'raw'
  raw: Record<string, unknown>
}

export type ProxyNode = VlessProxy | ShadowsocksProxy | TrojanProxy | VmessProxy | Hysteria2Proxy | RawProxy

export interface ConvertInput {
  /** 待转换的订阅链接（通常来自机场） */
  subscriptionUrl: string
  /** 客户端 → 本服务 的入站请求头（识别 UA + 转发拉取订阅） */
  incomingHeaders?: Headers
  /** 最终输出格式对应的客户端 */
  outputClient?: ClientType
  /** 写入 #!MANAGED-CONFIG 的自身订阅 URL（转换后的订阅链接） */
  managedConfigUrl?: string
}

export interface ConvertResult {
  body: string
  contentType: string
  client: ClientType
  /** 从订阅链接解析到的节点数 */
  nodeCount: number
  /** 按客户端能力过滤后实际输出的节点数 */
  emittedCount: number
  format?: string
  proxyGroupsSource?: 'subscription' | 'template'
  proxyGroupCount?: number
  ruleCount?: number
}
