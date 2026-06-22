import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appDataDir } from '../utils/paths.js'

export type TemplateType = 'clash' | 'singbox'

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
