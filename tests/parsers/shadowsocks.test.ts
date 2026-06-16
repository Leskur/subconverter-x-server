import { describe, expect, it } from 'vitest'
import { parseShadowsocksLine } from '../../src/core/parsers/shadowsocks.js'

describe('parseShadowsocksLine', () => {
  it('parses sip002 userinfo form', () => {
    const line = 'ss://chacha20-ietf-poly1305:password123@1.2.3.4:8388#SG-01'
    const node = parseShadowsocksLine(line)

    expect(node).toMatchObject({
      type: 'shadowsocks',
      name: 'SG-01',
      server: '1.2.3.4',
      port: 8388,
      method: 'chacha20-ietf-poly1305',
      password: 'password123',
    })
  })

  it('parses legacy base64 form', () => {
    const encoded = Buffer.from('aes-256-gcm:secret@5.6.7.8:443', 'utf8').toString('base64')
    const line = `ss://${encoded}#Legacy`
    const node = parseShadowsocksLine(line)

    expect(node).toMatchObject({
      type: 'shadowsocks',
      name: 'Legacy',
      server: '5.6.7.8',
      port: 443,
      method: 'aes-256-gcm',
      password: 'secret',
    })
  })
})
