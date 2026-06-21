import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type TemplateType = 'clash' | 'singbox'

function appDataDir(): string {
  const platform = process.platform
  if (platform === 'win32') {
    return join(process.env.APPDATA ?? homedir(), 'subconverter-x')
  }
  if (platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'subconverter-x')
  }
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'subconverter-x')
}

function templateFilePath(type: TemplateType): string {
  return join(appDataDir(), `template-${type}.${type === 'singbox' ? 'json' : 'yaml'}`)
}

const _dir = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_CLASH_TEMPLATE = readFileSync(join(_dir, 'template-clash.yaml'), 'utf8')
export const DEFAULT_SINGBOX_TEMPLATE = readFileSync(join(_dir, 'template-singbox.json'), 'utf8')

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
