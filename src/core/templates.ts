import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { appDataDir } from '../utils/paths.js'

export type TemplateType = 'clash' | 'singbox'

function templateFilePath(type: TemplateType): string {
  return join(appDataDir(), `template-${type}.${type === 'singbox' ? 'json' : 'yaml'}`)
}

const DEFAULT_CLASH_TEMPLATE = `mixed-port: 7890
mode: rule
external-controller: 127.0.0.1:9090
dns:
  enable: true
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  nameserver:
    - 223.5.5.5
    - 119.29.29.29
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

const DEFAULT_SINGBOX_TEMPLATE = `{
  "log": { "level": "info", "timestamp": true },
  "dns": {
    "servers": [
      { "tag": "remote", "address": "tls://1.1.1.1", "detour": "PROXY" },
      { "tag": "local", "address": "223.5.5.5", "detour": "DIRECT" }
    ],
    "rules": [{ "geosite": "cn", "server": "local" }],
    "final": "remote"
  },
  "inbounds": [
    { "type": "mixed", "listen": "127.0.0.1", "listen_port": 7890 }
  ],
  "outbounds": [],
  "route": {
    "rules": [
      { "geosite": "cn", "outbound": "DIRECT" },
      { "geoip": "cn", "outbound": "DIRECT" }
    ],
    "final": "PROXY",
    "auto_detect_interface": true
  },
  "experimental": {
    "cache_file": { "enabled": true },
    "clash_api": { "external_controller": "127.0.0.1:9090" }
  }
}
`

export interface TemplateStore {
  get(type: TemplateType): Promise<string>
  getDefault(type: TemplateType): string
  save(type: TemplateType, content: string): Promise<void>
}

export class FileTemplateStore implements TemplateStore {
  getDefault(type: TemplateType): string {
    return type === 'singbox' ? DEFAULT_SINGBOX_TEMPLATE : DEFAULT_CLASH_TEMPLATE
  }

  async get(type: TemplateType): Promise<string> {
    const path = templateFilePath(type)
    try {
      return await readFile(path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return this.getDefault(type)
    }
  }

  async save(type: TemplateType, content: string): Promise<void> {
    const path = templateFilePath(type)
    await mkdir(appDataDir(), { recursive: true })
    await writeFile(path, content, 'utf8')
  }
}

export const templateStore = new FileTemplateStore()
