import { stringify } from 'yaml'
import type { ProxyNode, ShadowsocksProxy, TrojanProxy, VlessProxy, VmessProxy } from '../types/proxy.js'

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

import type { ClashExtras } from '../profiles/merge.js'

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
    }
  })

  const groups =
    extras?.proxyGroups && extras.proxyGroups.length > 0
      ? extras.proxyGroups
      : [
          {
            name: 'PROXY',
            type: 'select',
            proxies: nodes.map((node) => node.name),
          },
        ]

  const output: Record<string, unknown> = { proxies, 'proxy-groups': groups }
  if (extras?.rules && extras.rules.length > 0) {
    output.rules = extras.rules
  }

  return stringify(output)
}
