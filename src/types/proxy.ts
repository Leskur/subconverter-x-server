export type ProxyType = 'vless' | 'shadowsocks' | 'trojan' | 'vmess'

export type ClientType = 'singbox' | 'clash' | 'surge'

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
  pluginOpts?: string
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

export type ProxyNode = VlessProxy | ShadowsocksProxy | TrojanProxy | VmessProxy

export interface ConvertInput {
  upstreamUrl: string
  requestHeaders?: Headers
  forceClient?: ClientType
}

export interface ConvertResult {
  body: string
  contentType: string
  client: ClientType
  nodeCount: number
  format?: string
  proxyGroupsSource?: 'upstream' | 'template'
  proxyGroupCount?: number
}
