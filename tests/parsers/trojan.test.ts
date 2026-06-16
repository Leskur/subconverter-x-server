import { describe, expect, it } from 'vitest'
import { parseTrojanLine } from '../../src/core/parsers/trojan.js'

describe('parseTrojanLine', () => {
  it('parses trojan uri', () => {
    const line = 'trojan://topsecret@trojan.example.com:443?sni=trojan.example.com#US-01'
    const node = parseTrojanLine(line)

    expect(node).toMatchObject({
      type: 'trojan',
      name: 'US-01',
      server: 'trojan.example.com',
      port: 443,
      password: 'topsecret',
      sni: 'trojan.example.com',
    })
  })
})
