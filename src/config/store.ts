import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { parse, stringify } from 'yaml'
import { appDataDir } from '../utils/paths.js'
import type { UpdateIntervalMode } from '../subscription/types.js'

function configPath(): string {
  return join(appDataDir(), 'config.yaml')
}

interface AppConfig {
  token: string
  updateInterval: UpdateIntervalMode
}

function parseUpdateInterval(raw: unknown): UpdateIntervalMode {
  if (raw === 'auto') return 'auto'
  if (typeof raw === 'number' && raw >= 300) return raw
  return 'auto'
}

function normalizeConfig(raw: unknown): AppConfig {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const token = typeof record.token === 'string' ? record.token.trim() : ''
  const updateInterval = parseUpdateInterval(record.updateInterval ?? record['update-interval'])
  return { token, updateInterval }
}

function generateToken(): string {
  return randomBytes(24).toString('hex')
}

export class FileConfigStore {
  constructor(
    private readonly path = configPath(),
  ) {}

  async get(): Promise<AppConfig> {
    try {
      const content = await readFile(this.path, 'utf8')
      return normalizeConfig(parse(content))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    return { token: '', updateInterval: 'auto' }
  }

  private async write(config: AppConfig): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    const yaml = stringify({
      token: config.token || undefined,
      'update-interval': config.updateInterval,
    })
    await writeFile(this.path, yaml, 'utf8')
  }

  async ensureToken(): Promise<string> {
    const config = await this.get()
    if (config.token) return config.token

    const token = generateToken()
    await this.write({ ...config, token })
    return token
  }

  async getUpdateInterval(): Promise<UpdateIntervalMode> {
    const config = await this.get()
    return config.updateInterval
  }

  async setUpdateInterval(interval: UpdateIntervalMode): Promise<void> {
    const config = await this.get()
    await this.write({ ...config, updateInterval: interval })
  }
}

export const configStore = new FileConfigStore()
