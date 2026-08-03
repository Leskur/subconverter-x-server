import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { formatSurgeProxies } from '../src/formatters/surge.js'
import { formatSurfboardProxies } from '../src/formatters/surfboard.js'
import { formatLoonProxies } from '../src/formatters/loon.js'
import { formatClashProxies } from '../src/formatters/clash.js'
import { formatQuanxProxies } from '../src/formatters/quanx.js'
import { FileOutputSettingsStore, defaultOutputSettings } from '../src/output-settings/store.js'
import type { ProxyNode } from '../src/core/types.js'

const node: ProxyNode = {
  type: 'shadowsocks',
  name: 'SS-HK',
  server: '1.2.3.4',
  port: 8388,
  method: 'chacha20-ietf-poly1305',
  password: 'secret',
}

describe('output settings store', () => {
  it('returns defaults when file is missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sx-output-'))
    try {
      const store = new FileOutputSettingsStore(join(dir, 'output-settings.yaml'))
      assert.deepEqual(await store.get(), defaultOutputSettings())
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('saves and reloads settings', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sx-output-'))
    const path = join(dir, 'output-settings.yaml')
    try {
      const store = new FileOutputSettingsStore(path)
      const saved = await store.save({
        urlTestUrl: 'http://www.gstatic.com/generate_204',
        urlTestInterval: 120,
        skipProxy: '127.0.0.1, localhost',
        dnsServer: '8.8.8.8',
      })
      assert.equal(saved.dnsServer, '8.8.8.8')
      assert.equal((await store.get()).urlTestInterval, 120)

      const yaml = await readFile(path, 'utf8')
      assert.match(yaml, /url-test-url:/)
      assert.match(yaml, /dns-server: 8\.8\.8\.8/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

const customSettings = {
  urlTestUrl: 'http://www.gstatic.com/generate_204',
  urlTestInterval: 120,
  skipProxy: '127.0.0.1, localhost',
  dnsServer: '8.8.8.8',
}

describe('output settings in formatters', () => {
  it('applies custom dns, skip-proxy and url-test in surge', () => {
    const body = formatSurgeProxies([node], undefined, undefined, undefined, customSettings)
    assert.match(body, /dns-server = 8\.8\.8\.8/)
    assert.match(body, /skip-proxy = 127\.0\.0\.1, localhost/)
    assert.match(body, /url=http:\/\/www\.gstatic\.com\/generate_204, interval=120/)
  })

  it('applies dns-server in surfboard and loon', () => {
    const surfboard = formatSurfboardProxies([node], undefined, undefined, undefined, customSettings)
    assert.match(surfboard, /dns-server = 8\.8\.8\.8/)

    const loon = formatLoonProxies([node], undefined, undefined, undefined, customSettings)
    assert.match(loon, /dns-server = 8\.8\.8\.8/)
    assert.match(loon, /skip-proxy = 127\.0\.0\.1, localhost/)
  })

  it('applies dns and url-test in clash', () => {
    const body = formatClashProxies([node], undefined, undefined, customSettings)
    assert.match(body, /nameserver:/)
    assert.match(body, /- 8\.8\.8\.8/)
    assert.match(body, /url: http:\/\/www\.gstatic\.com\/generate_204/)
    assert.match(body, /interval: 120/)
    const dnsAt = body.indexOf('dns:')
    const proxiesAt = body.indexOf('proxies:')
    assert.ok(dnsAt >= 0 && proxiesAt > dnsAt, 'dns should appear before proxies')
  })

  it('applies dns, check url and excluded_routes in quanx', () => {
    const body = formatQuanxProxies([node], undefined, {
      ...customSettings,
      skipProxy: '127.0.0.1, 10.0.0.0/8, localhost',
    })
    assert.match(body, /server_check_url=http:\/\/www\.gstatic\.com\/generate_204/)
    assert.match(body, /excluded_routes=127\.0\.0\.1, 10\.0\.0\.0\/8/)
    assert.doesNotMatch(body, /excluded_routes=.*localhost/)
    assert.match(body, /server = 8\.8\.8\.8/)
    assert.match(body, /check-interval=120/)
  })
})
