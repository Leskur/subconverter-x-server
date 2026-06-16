import { describe, expect, it } from 'vitest'
import { parseClashConfig } from '../../src/core/parsers/clash.js'
import { parseSubscription } from '../../src/core/parse.js'
import { formatClashProxies } from '../../src/formatters/clash.js'

const CLASH_YAML = `mixed-port: 7890
allow-lan: false
proxies:
  - name: SS-Node
    type: ss
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-gcm
    password: secret
    udp: true
  - name: VMess-Node
    type: vmess
    server: 5.6.7.8
    port: 443
    uuid: 11111111-2222-3333-4444-555555555555
    alterId: 0
    cipher: auto
    network: ws
    tls: true
    servername: example.com
    ws-opts:
      path: /ws
      headers:
        Host: example.com
  - name: Trojan-Node
    type: trojan
    server: 9.9.9.9
    port: 443
    password: trojanpw
    sni: t.example.com
proxy-groups:
  - name: PROXY
    type: select
`

describe('parseClashConfig', () => {
  it('extracts proxies and proxy-groups from clash yaml', () => {
    const { nodes, proxyGroups } = parseClashConfig(CLASH_YAML)
    expect(nodes).toHaveLength(3)
    expect(proxyGroups).toHaveLength(1)
    expect(proxyGroups[0]).toMatchObject({ name: 'PROXY', type: 'select' })

    expect(nodes[0]).toMatchObject({
      type: 'shadowsocks',
      name: 'SS-Node',
      server: '1.2.3.4',
      port: 8388,
      method: 'aes-256-gcm',
      password: 'secret',
    })

    expect(nodes[1]).toMatchObject({
      type: 'vmess',
      name: 'VMess-Node',
      server: '5.6.7.8',
      port: 443,
      uuid: '11111111-2222-3333-4444-555555555555',
      network: 'ws',
      tls: true,
      sni: 'example.com',
      host: 'example.com',
      path: '/ws',
    })

    expect(nodes[2]).toMatchObject({
      type: 'trojan',
      name: 'Trojan-Node',
      password: 'trojanpw',
      sni: 't.example.com',
    })
  })
})

describe('parseSubscription format detection', () => {
  it('detects clash yaml', () => {
    const result = parseSubscription(CLASH_YAML)
    expect(result.format).toBe('clash')
    expect(result.nodes).toHaveLength(3)
    expect(result.proxyGroups).toHaveLength(1)
  })

  it('detects base64 uri list', () => {
    const body = Buffer.from('ss://chacha20-ietf-poly1305:pw@1.2.3.4:8388#Node', 'utf8').toString('base64')
    const result = parseSubscription(body)
    expect(result.format).toBe('base64')
    expect(result.nodes).toHaveLength(1)
  })

  it('detects plain uri list', () => {
    const result = parseSubscription('trojan://secret@9.9.9.9:443?sni=example.com#Node')
    expect(result.format).toBe('uri-list')
    expect(result.nodes).toHaveLength(1)
  })
})

describe('formatClashProxies', () => {
  it('preserves upstream proxy-groups', () => {
    const { nodes, proxyGroups } = parseClashConfig(CLASH_YAML)
    const yaml = formatClashProxies(nodes, { proxyGroups })
    expect(yaml).toContain('proxy-groups:')
    expect(yaml).toContain('name: PROXY')
  })

  it('includes rules when provided', () => {
    const yaml = formatClashProxies(
      [
        {
          type: 'trojan',
          name: 'Node-A',
          server: '1.2.3.4',
          port: 443,
          password: 'pw',
        },
      ],
      { rules: ['GEOIP,CN,DIRECT', 'MATCH,PROXY'] },
    )
    expect(yaml).toContain('rules:')
    expect(yaml).toContain('GEOIP,CN,DIRECT')
  })

  it('generates default proxy-group when none provided', () => {
    const yaml = formatClashProxies([
      {
        type: 'trojan',
        name: 'Node-A',
        server: '1.2.3.4',
        port: 443,
        password: 'pw',
      },
    ])
    expect(yaml).toContain('proxy-groups:')
    expect(yaml).toContain('- Node-A')
  })
})
