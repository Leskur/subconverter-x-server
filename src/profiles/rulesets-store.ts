import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export interface CustomRuleset {
  id: string
  name: string
  rules: { type: string; content: string; policy: string }[]
  createdAt: number
}

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

function filePath(): string {
  return join(appDataDir(), 'rulesets.json')
}

export class FileRulesetsStore {
  async getAll(): Promise<CustomRuleset[]> {
    try {
      const content = await readFile(filePath(), 'utf8')
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return []
    }
  }

  async save(rulesets: CustomRuleset[]): Promise<CustomRuleset[]> {
    await mkdir(dirname(filePath()), { recursive: true })
    await writeFile(filePath(), JSON.stringify(rulesets, null, 2), 'utf8')
    return rulesets
  }
}

export const rulesetsStore = new FileRulesetsStore()
