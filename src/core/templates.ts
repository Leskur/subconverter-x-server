import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { URL_TEST_INTERVAL_SEC, URL_TEST_URL } from './constants.js'
import { appDataDir } from '../utils/paths.js'

function templateFilePath(): string {
  return join(appDataDir(), 'templates', 'template-clash.yaml')
}

const DEFAULT_CLASH_TEMPLATE = `mixed-port: 7890
mode: rule
external-controller: 127.0.0.1:9090
proxy-groups:
  - name: PROXY
    type: select
    proxies: []
  - name: AUTO
    type: url-test
    url: ${URL_TEST_URL}
    interval: ${URL_TEST_INTERVAL_SEC}
    proxies: []
`

export interface TemplateStore {
  get(): Promise<string>
  getDefault(): string
  save(content: string): Promise<void>
}

export class FileTemplateStore implements TemplateStore {
  getDefault(): string {
    return DEFAULT_CLASH_TEMPLATE
  }

  async get(): Promise<string> {
    const path = templateFilePath()
    try {
      return await readFile(path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return this.getDefault()
    }
  }

  async save(content: string): Promise<void> {
    const path = templateFilePath()
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content, 'utf8')
  }
}

export const templateStore = new FileTemplateStore()
