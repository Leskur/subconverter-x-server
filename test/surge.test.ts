import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatSurgeProxies } from '../src/formatters/surge.js'
import { formatProxies } from '../src/core/format.js'
import type { ProxyNode } from '../src/core/types.js'

const nodes: ProxyNode[] = [
  {
    type: 'shadowsocks',
    name: 'SS-HK',
    server: '1.2.3.4',
    port: 8388,
    method: 'chacha20-ietf-poly1305',
    password: 'secret',
    plugin: 'obfs',
    pluginOpts: { mode: 'http', host: 'www.bing.com' },
  },
  {
    type: 'vmess',
    name: 'VMESS-JP',
    server: 'jp.example.com',
    port: 443,
    uuid: '0233d11c-15a4-47d3-ade3-48ffca0ce119',
    cipher: 'aes-128-gcm',
    network: 'ws',
    tls: true,
    sni: 'jp.example.com',
    host: 'jp.example.com',
    path: '/ws',
  },
  {
    type: 'trojan',
    name: 'TROJAN-US',
    server: 'us.example.com',
    port: 443,
    password: 'trojan-pwd',
    sni: 'us.example.com',
    network: 'ws',
    path: '/trojan',
    host: 'us.example.com',
  },
  {
    type: 'hysteria2',
    name: 'HY2',
    server: 'hy2.example.com',
    port: 443,
    password: 'hy2-pwd',
    sni: 'hy2.example.com',
    obfs: 'salamander',
    obfsPassword: 'obfs-secret',
  },
  {
    type: 'vless',
    name: 'VLESS-SKIP',
    server: 'vless.example.com',
    port: 443,
    uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  },
]

describe('formatSurgeProxies', () => {
  it('emits Surge INI sections and proxy lines', () => {
    const body = formatSurgeProxies(nodes.slice(0, 4), 'https://example.com/sub', {
      rules: ['DOMAIN-SUFFIX,google.com,PROXY', 'MATCH,PROXY'],
    })

    assert.match(body, /^#!MANAGED-CONFIG https:\/\/example\.com\/sub interval=43200 strict=false/m)
    assert.match(body, /\[General\]/)
    assert.match(body, /dns-server = 223\.5\.5\.5, 119\.29\.29\.29/)
    assert.doesNotMatch(body, /enhanced-mode-by-rule/)

    assert.match(
      body,
      /SS-HK = ss, 1\.2\.3\.4, 8388, encrypt-method=chacha20-ietf-poly1305, password=secret, udp-relay=true, obfs=http, obfs-host=www\.bing\.com/,
    )
    assert.match(
      body,
      /VMESS-JP = vmess, jp\.example\.com, 443, username=0233d11c-15a4-47d3-ade3-48ffca0ce119, udp-relay=true, encrypt-method=aes-128-gcm, ws=true, ws-path=\/ws, ws-headers=Host:jp\.example\.com, tls=true, sni=jp\.example\.com, vmess-aead=true/,
    )
    assert.match(
      body,
      /TROJAN-US = trojan, us\.example\.com, 443, password=trojan-pwd, udp-relay=true, sni=us\.example\.com, ws=true, ws-path=\/trojan, ws-headers=Host:us\.example\.com, skip-cert-verify=false/,
    )
    assert.match(
      body,
      /HY2 = hysteria2, hy2\.example\.com, 443, password=hy2-pwd, sni=hy2\.example\.com, salamander-password=obfs-secret/,
    )

    assert.match(body, /\[Proxy Group\]/)
    assert.match(body, /PROXY = select, AUTO, SS-HK, VMESS-JP, TROJAN-US, HY2/)
    assert.match(body, /FINAL,PROXY/)
    assert.doesNotMatch(body, /MATCH,PROXY/)
  })
})

describe('formatProxies(surge)', () => {
  it('routes surge to INI and filters unsupported protocols', () => {
    const result = formatProxies(nodes, 'surge')
    assert.equal(result.contentType, 'text/plain; charset=utf-8')
    assert.equal(result.emittedCount, 4)
    assert.match(result.body, /\[Proxy\]/)
    assert.doesNotMatch(result.body, /VLESS-SKIP/)
    assert.doesNotMatch(result.body, /^proxies:/m)
  })
})
