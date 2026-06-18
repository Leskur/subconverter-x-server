import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export type TemplateType = 'clash' | 'singbox'

function templateFilePath(type: TemplateType): string {
  const dir = process.env.RULES_FILE
    ? dirname(process.env.RULES_FILE)
    : join(process.cwd(), 'data')
  return join(dir, `template-${type}.${type === 'singbox' ? 'json' : 'yaml'}`)
}

const DEFAULT_CLASH_TEMPLATE = `mixed-port: 7890
allow-lan: false
bind-address: '*'
mode: rule
log-level: info
external-controller: 127.0.0.1:9090
unified-delay: true
tcp-concurrent: true
dns:
  enable: true
  ipv6: false
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  nameserver:
    - 223.5.5.5
    - 119.29.29.29
  fallback:
    - 1.1.1.1
    - 8.8.8.8
proxy-groups:
  - name: PROXY
    type: select
    proxies: []
  - name: AUTO
    type: url-test
    url: http://cp.cloudflare.com/generate_204
    interval: 300
    proxies: []
`

const DEFAULT_SINGBOX_TEMPLATE = JSON.stringify(
  {
    log: { level: 'info', timestamp: true },
    dns: {
      servers: [
        { tag: 'remote', address: 'tls://1.1.1.1', detour: 'PROXY' },
        { tag: 'local', address: '223.5.5.5', detour: 'DIRECT' },
      ],
      rules: [{ geosite: 'cn', server: 'local' }],
      final: 'remote',
    },
    inbounds: [
      { type: 'mixed', listen: '127.0.0.1', listen_port: 7890 },
    ],
    outbounds: [],
    route: {
      rules: [
        { geosite: 'cn', outbound: 'DIRECT' },
        { geoip: 'cn', outbound: 'DIRECT' },
      ],
      final: 'PROXY',
      auto_detect_interface: true,
    },
    experimental: {
      cache_file: { enabled: true },
      clash_api: { external_controller: '127.0.0.1:9090' },
    },
  },
  null,
  2,
)

export interface TemplateStore {
  get(type: TemplateType): Promise<string>
  save(type: TemplateType, content: string): Promise<void>
}

export class FileTemplateStore implements TemplateStore {
  async get(type: TemplateType): Promise<string> {
    const path = templateFilePath(type)
    try {
      return await readFile(path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return type === 'singbox' ? DEFAULT_SINGBOX_TEMPLATE : DEFAULT_CLASH_TEMPLATE
    }
  }

  async save(type: TemplateType, content: string): Promise<void> {
    const path = templateFilePath(type)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content, 'utf8')
  }
}

export const templateStore = new FileTemplateStore()
