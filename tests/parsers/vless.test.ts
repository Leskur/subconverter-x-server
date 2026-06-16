import { describe, expect, it } from 'vitest'
import { parseVlessLine } from '../../src/core/parsers/vless.js'

describe('parseVlessLine', () => {
  it('parses reality vless uri', () => {
    const line =
      'vless://6ba85179-e30c-4893-aa12-bdfa7fb4bfe2@example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.cloudflare.com&fp=chrome&pbk=test-pbk&sid=abcd&type=tcp#HK-01'

    const node = parseVlessLine(line)
    expect(node).toMatchObject({
      type: 'vless',
      name: 'HK-01',
      server: 'example.com',
      port: 443,
      uuid: '6ba85179-e30c-4893-aa12-bdfa7fb4bfe2',
      flow: 'xtls-rprx-vision',
      security: 'reality',
      sni: 'www.cloudflare.com',
      fingerprint: 'chrome',
      realityPublicKey: 'test-pbk',
      realityShortId: 'abcd',
      network: 'tcp',
    })
  })
})
