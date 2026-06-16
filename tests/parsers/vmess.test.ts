import { describe, expect, it } from 'vitest'
import { parseVmessLine } from '../../src/core/parsers/vmess.js'

describe('parseVmessLine', () => {
  it('parses vmess uri', () => {
    const json = {
      ps: 'VMess-Node',
      port: '15236',
      id: '11111111-2222-3333-4444-555555555555',
      aid: 0,
      net: 'tcp',
      type: 'none',
      tls: 'none',
      add: '203.0.113.10',
    }
    const payload = Buffer.from(JSON.stringify(json), 'utf8').toString('base64')
    const node = parseVmessLine(`vmess://${payload}`)

    expect(node).toMatchObject({
      type: 'vmess',
      name: 'VMess-Node',
      server: '203.0.113.10',
      port: 15236,
      uuid: '11111111-2222-3333-4444-555555555555',
      alterId: 0,
      cipher: 'auto',
      network: 'tcp',
      tls: false,
    })
  })
})
