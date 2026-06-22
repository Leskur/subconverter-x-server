import { stringify } from 'yaml'
import type { ClashExtras } from '../profiles/merge.js'
import type { Hysteria2Proxy, ProxyNode, RawProxy, ShadowsocksProxy, TrojanProxy, VlessProxy, VmessProxy } from '../types/proxy.js'

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
  if (node.network) proxy['network'] = node.network
  if (node.security) proxy['tls'] = node.security === 'tls' || node.security === 'reality'
  if (node.sni) proxy['servername'] = node.sni
  if (node.fingerprint) proxy['client-fingerprint'] = node.fingerprint
  if (node.alpn) proxy['alpn'] = node.alpn.split(',')
  if (node.host) proxy['ws-opts'] = { headers: { Host: node.host }, path: node.path || '/' }
  if (node.network === 'grpc' && (node.serviceName || node.path)) {
    proxy['grpc-opts'] = { 'grpc-service-name': node.serviceName || node.path }
  }
  if (node.security === 'reality') {
    proxy['tls'] = true
    proxy['reality-opts'] = {
      'public-key': node.realityPublicKey,
      'short-id': node.realityShortId || '',
    }
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
  if (node.pluginOpts) proxy['plugin-opts'] = node.pluginOpts

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
  if (node.host || node.path) {
    proxy['ws-opts'] = { path: node.path || '/', headers: node.host ? { Host: node.host } : undefined }
  }

  return proxy
}

export function formatClashProxies(nodes: ProxyNode[], extras?: ClashExtras): string {
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
      return { ...g, proxies: [...nodeNames] }
    }
    return g
  }

  const upstreamGroups = extras?.proxyGroups ?? []
  const upstreamNames = new Set(
    upstreamGroups
      .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
      .map((g) => g['name'])
      .filter((n): n is string => typeof n === 'string'),
  )

  const defaultGroups: unknown[] = []
  if (!upstreamNames.has('PROXY')) {
    defaultGroups.push({ name: 'PROXY', type: 'select', proxies: nodeNames })
  }
  if (!upstreamNames.has('AUTO')) {
    defaultGroups.push({ name: 'AUTO', type: 'url-test', url: 'http://cp.cloudflare.com/generate_204', interval: 300, proxies: nodeNames })
  }

  const groups = [...upstreamGroups.map(fillProxies), ...defaultGroups]

  const output: Record<string, unknown> = {
    ...(extras?.topLevel ?? {}),
    proxies,
    'proxy-groups': groups,
  }
  if (extras?.rules && extras.rules.length > 0) {
    output.rules = extras.rules
  }

  return stringify(output)
}
