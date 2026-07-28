import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseVlessLine } from '../src/parsers/vless.js'
import { parseVmessLine } from '../src/parsers/vmess.js'
import { parseShadowsocksLine } from '../src/parsers/shadowsocks.js'
import { parseTrojanLine } from '../src/parsers/trojan.js'
import { parseHysteria2Line } from '../src/parsers/hysteria2.js'

describe('parseVlessLine', () => {
  it('parses valid vless uri', () => {
    const line =
      'vless://11111111-1111-1111-1111-111111111111@example.com:443?type=ws&security=reality&host=cdn.example.com&path=%2Fvless&sni=example.com&pbk=pubkey&sid=ab12#VLESS-1'
    const node = parseVlessLine(line)
    assert.ok(node)
    assert.equal(node.type, 'vless')
    assert.equal(node.name, 'VLESS-1')
    assert.equal(node.host, 'cdn.example.com')
    assert.equal(node.path, '/vless')
    assert.equal(node.realityPublicKey, 'pubkey')
  })

  it('returns null for invalid scheme', () => {
    assert.equal(parseVlessLine('http://example.com'), null)
  })
})

describe('parseVmessLine', () => {
  it('parses valid vmess uri', () => {
    const payload = Buffer.from(
      JSON.stringify({
        ps: 'VMESS-1',
        add: 'vm.example.com',
        port: 443,
        id: '22222222-2222-2222-2222-222222222222',
        aid: 0,
        scy: 'aes-128-gcm',
        net: 'ws',
        host: 'ws.example.com',
        path: '/ws',
        tls: 'tls',
      }),
      'utf8',
    ).toString('base64')
    const node = parseVmessLine(`vmess://${payload}`)
    assert.ok(node)
    assert.equal(node.type, 'vmess')
    assert.equal(node.name, 'VMESS-1')
    assert.equal(node.network, 'ws')
    assert.equal(node.tls, true)
  })

  it('returns null for invalid payload', () => {
    assert.equal(parseVmessLine('vmess://not-base64-json'), null)
  })
})

describe('parseShadowsocksLine', () => {
  it('parses valid ss uri', () => {
    const line = 'ss://aes-128-gcm:pass@example.com:8388#SS-1'
    const node = parseShadowsocksLine(line)
    assert.ok(node)
    assert.equal(node.type, 'shadowsocks')
    assert.equal(node.name, 'SS-1')
    assert.equal(node.method, 'aes-128-gcm')
  })

  it('returns null for invalid ss uri', () => {
    assert.equal(parseShadowsocksLine('ss://bad-format'), null)
  })
})

describe('parseTrojanLine', () => {
  it('parses valid trojan uri', () => {
    const line = 'trojan://secret@example.com:443?type=ws&host=cdn.example.com&path=%2Ftrojan&sni=example.com#TROJAN-1'
    const node = parseTrojanLine(line)
    assert.ok(node)
    assert.equal(node.type, 'trojan')
    assert.equal(node.name, 'TROJAN-1')
    assert.equal(node.network, 'ws')
    assert.equal(node.path, '/trojan')
  })

  it('returns null for invalid scheme', () => {
    assert.equal(parseTrojanLine('http://example.com'), null)
  })
})

describe('parseHysteria2Line', () => {
  it('parses valid hy2 uri', () => {
    const line = 'hy2://password@example.com:443?sni=example.com&insecure=1&obfs=salamander&obfs-password=obfpass#HY2-1'
    const node = parseHysteria2Line(line)
    assert.ok(node)
    assert.equal(node.type, 'hysteria2')
    assert.equal(node.name, 'HY2-1')
    assert.equal(node.insecure, true)
    assert.equal(node.obfsPassword, 'obfpass')
  })

  it('returns null for invalid uri', () => {
    assert.equal(parseHysteria2Line('hy2://@'), null)
  })
})
