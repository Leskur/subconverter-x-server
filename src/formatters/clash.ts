import { stringify } from 'yaml'
import type { ClashExtras } from '../rules/merge.js'
import type { OutputSettings } from '../output-settings/types.js'
import { parseDnsServers } from '../output-settings/apply.js'
import type { UpdateIntervalMode } from '../subscription/types.js'
import {
  DEFAULT_DNS_SERVER,
  MANAGED_CONFIG_INTERVAL_SEC,
  URL_TEST_INTERVAL_SEC,
  URL_TEST_URL,
} from '../core/constants.js'
import type { Hysteria2Proxy, ProxyNode, RawProxy, ShadowsocksProxy, TrojanProxy, VlessProxy, VmessProxy } from '../core/types.js'
import { toClashPluginOpts } from '../utils/ss-plugin.js'

function vlessProxy(node: VlessProxy): Record<string, unknown> {
  const proxy: Record<string, unknown> = {
    name: node.name,
    type: 'vless',
    server: node.server,
    port: node.port,
    uuid: node.uuid,
    udp: true,
  }

  if (node.flow) proxy['flow'] = node.flow
  if (node.packetEncoding) proxy['packet-encoding'] = node.packetEncoding
  if (node.network) proxy['network'] = node.network
  if (node.security) proxy['tls'] = node.security === 'tls' || node.security === 'reality'
  if (node.sni) proxy['servername'] = node.sni
  if (node.fingerprint) proxy['client-fingerprint'] = node.fingerprint
  if (node.alpn) proxy['alpn'] = node.alpn.split(',')
  if (node.network === 'ws') {
    proxy['ws-opts'] = {
      path: node.path || '/',
      headers: node.host ? { Host: node.host } : undefined,
    }
  }
  if (node.network === 'grpc' && (node.serviceName || node.path)) {
    proxy['grpc-opts'] = { 'grpc-service-name': node.serviceName || node.path }
  }
  if (node.security === 'reality' && node.realityPublicKey) {
    proxy['tls'] = true
    const realityOpts: Record<string, string> = {
      'public-key': node.realityPublicKey,
      'short-id': node.realityShortId || '',
    }
    if (node.realitySpiderX) realityOpts['spider-x'] = node.realitySpiderX
    proxy['reality-opts'] = realityOpts
  }

  return proxy
}

function shadowsocksProxy(node: ShadowsocksProxy): Record<string, unknown> {
  const proxy: Record<string, unknown> = {
    name: node.name,
    type: 'ss',
    server: node.server,
    port: node.port,
    cipher: node.method,
    password: node.password,
    udp: true,
  }

  if (node.plugin) proxy['plugin'] = node.plugin
  const pluginOpts = toClashPluginOpts(node.pluginOpts)
  if (pluginOpts) proxy['plugin-opts'] = pluginOpts

  return proxy
}

function vmessProxy(node: VmessProxy): Record<string, unknown> {
  const proxy: Record<string, unknown> = {
    name: node.name,
    type: 'vmess',
    server: node.server,
    port: node.port,
    uuid: node.uuid,
    alterId: node.alterId ?? 0,
    cipher: node.cipher ?? 'auto',
    udp: true,
  }

  if (node.network && node.network !== 'tcp') proxy['network'] = node.network
  if (node.tls) proxy['tls'] = true
  if (node.sni) proxy['servername'] = node.sni
  if (node.alpn) proxy['alpn'] = node.alpn.split(',')
  if (node.fingerprint) proxy['client-fingerprint'] = node.fingerprint
  if (node.network === 'ws' && (node.host || node.path)) {
    proxy['ws-opts'] = {
      path: node.path || '/',
      headers: node.host ? { Host: node.host } : undefined,
    }
  }
  if (node.network === 'grpc' && node.path) {
    proxy['grpc-opts'] = { 'grpc-service-name': node.path }
  }

  return proxy
}

function hysteria2Proxy(node: Hysteria2Proxy): Record<string, unknown> {
  const proxy: Record<string, unknown> = {
    name: node.name,
    type: 'hysteria2',
    server: node.server,
    port: node.port,
    password: node.password,
  }

  if (node.sni) proxy['sni'] = node.sni
  if (node.insecure) proxy['skip-cert-verify'] = true
  if (node.obfs) proxy['obfs'] = node.obfs
  if (node.obfsPassword) proxy['obfs-password'] = node.obfsPassword

  return proxy
}

function trojanProxy(node: TrojanProxy): Record<string, unknown> {
  const proxy: Record<string, unknown> = {
    name: node.name,
    type: 'trojan',
    server: node.server,
    port: node.port,
    password: node.password,
    udp: true,
  }

  if (node.sni) proxy['sni'] = node.sni
  if (node.alpn) proxy['alpn'] = node.alpn.split(',')
  if (node.fingerprint) proxy['client-fingerprint'] = node.fingerprint
  if (node.network) proxy['network'] = node.network
  if (node.network === 'ws' && (node.host || node.path)) {
    proxy['ws-opts'] = { path: node.path || '/', headers: node.host ? { Host: node.host } : undefined }
  }

  return proxy
}

export function formatClashProxies(
  nodes: ProxyNode[],
  extras?: ClashExtras,
  updateInterval?: UpdateIntervalMode,
  outputSettings?: OutputSettings,
): string {
  const proxies = nodes.map((node) => {
    switch (node.type) {
      case 'vless':
        return vlessProxy(node)
      case 'shadowsocks':
        return shadowsocksProxy(node)
      case 'trojan':
        return trojanProxy(node)
      case 'vmess':
        return vmessProxy(node)
      case 'hysteria2':
        return hysteria2Proxy(node)
      case 'raw':
        return (node as RawProxy).raw
    }
  })

  const nodeNames = nodes.map((node) => node.name)

  const fillProxies = (group: unknown): unknown => {
    if (!group || typeof group !== 'object') return group
    const g = group as Record<string, unknown>
    const proxies = g['proxies']
    if (Array.isArray(proxies) && proxies.length === 0) {
      if (g['name'] === 'PROXY') {
        return { ...g, proxies: ['AUTO', ...nodeNames] }
      }
      return { ...g, proxies: [...nodeNames] }
    }
    // Inject AUTO into PROXY group if missing
    if (g['name'] === 'PROXY' && Array.isArray(proxies) && !proxies.includes('AUTO')) {
      return { ...g, proxies: ['AUTO', ...proxies] }
    }
    return g
  }

  const applyUrlTest = (group: unknown): unknown => {
    if (!group || typeof group !== 'object') return group
    const g = group as Record<string, unknown>
    if (g['type'] !== 'url-test') return group
    return {
      ...g,
      url: outputSettings?.urlTestUrl ?? (typeof g['url'] === 'string' ? g['url'] : URL_TEST_URL),
      interval:
        outputSettings?.urlTestInterval ??
        (typeof g['interval'] === 'number' ? g['interval'] : URL_TEST_INTERVAL_SEC),
    }
  }

  const subscriptionGroups = extras?.proxyGroups ?? []
  const subscriptionGroupNames = new Set(
    subscriptionGroups
      .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
      .map((g) => g['name'])
      .filter((n): n is string => typeof n === 'string'),
  )

  const defaultGroups: unknown[] = []
  if (!subscriptionGroupNames.has('AUTO')) {
    defaultGroups.push({
      name: 'AUTO',
      type: 'url-test',
      url: outputSettings?.urlTestUrl ?? URL_TEST_URL,
      interval: outputSettings?.urlTestInterval ?? URL_TEST_INTERVAL_SEC,
      proxies: nodeNames,
    })
  }
  if (!subscriptionGroupNames.has('PROXY')) {
    defaultGroups.push({ name: 'PROXY', type: 'select', proxies: ['AUTO', ...nodeNames] })
  }

  const groups = [...subscriptionGroups.map((g) => applyUrlTest(fillProxies(g))), ...defaultGroups]

  const topLevel = { ...(extras?.topLevel ?? {}) }
  const existingDns =
    topLevel.dns && typeof topLevel.dns === 'object' && !Array.isArray(topLevel.dns)
      ? { ...(topLevel.dns as Record<string, unknown>) }
      : {}
  delete topLevel.dns

  const nameserver = parseDnsServers(outputSettings?.dnsServer ?? DEFAULT_DNS_SERVER)
  const dns =
    nameserver.length > 0
      ? { enable: true, ...existingDns, nameserver }
      : Object.keys(existingDns).length > 0
        ? existingDns
        : undefined

  // dns 放在通用顶层字段之后、proxies 之前，避免落到文件末尾
  const output: Record<string, unknown> = {
    ...topLevel,
    ...(dns ? { dns } : {}),
    proxies,
    'proxy-groups': groups,
  }
  if (updateInterval) {
    const intervalValue = updateInterval === 'auto' ? MANAGED_CONFIG_INTERVAL_SEC : updateInterval
    output['profile'] = { ...(output['profile'] as Record<string, unknown> ?? {}), 'auto-update-interval': intervalValue }
  }
  if (extras?.rules && extras.rules.length > 0) {
    output.rules = extras.rules
  }

  return stringify(output)
}
