import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import {
  DEFAULT_DNS_SERVER,
  DEFAULT_SKIP_PROXY,
  URL_TEST_INTERVAL_SEC,
  URL_TEST_URL,
} from '../core/constants.js'
import { appDataDir } from '../utils/paths.js'
import type { OutputSettings, OutputSettingsInput } from './types.js'

function settingsPath(): string {
  return join(appDataDir(), 'output-settings.yaml')
}

export function defaultOutputSettings(): OutputSettings {
  return {
    urlTestUrl: URL_TEST_URL,
    urlTestInterval: URL_TEST_INTERVAL_SEC,
    skipProxy: DEFAULT_SKIP_PROXY,
    dnsServer: DEFAULT_DNS_SERVER,
  }
}

function parseInterval(raw: unknown, fallback: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 60) return Math.floor(raw)
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    const n = Number(raw)
    if (n >= 60) return n
  }
  return fallback
}

function normalizeSettings(raw: unknown): OutputSettings {
  const defaults = defaultOutputSettings()
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}

  const urlTestUrl =
    typeof record.urlTestUrl === 'string'
      ? record.urlTestUrl.trim()
      : typeof record['url-test-url'] === 'string'
        ? String(record['url-test-url']).trim()
        : defaults.urlTestUrl

  const skipProxy =
    typeof record.skipProxy === 'string'
      ? record.skipProxy.trim()
      : typeof record['skip-proxy'] === 'string'
        ? String(record['skip-proxy']).trim()
        : defaults.skipProxy

  const dnsServer =
    typeof record.dnsServer === 'string'
      ? record.dnsServer.trim()
      : typeof record['dns-server'] === 'string'
        ? String(record['dns-server']).trim()
        : defaults.dnsServer

  return {
    urlTestUrl: urlTestUrl || defaults.urlTestUrl,
    urlTestInterval: parseInterval(
      record.urlTestInterval ?? record['url-test-interval'],
      defaults.urlTestInterval,
    ),
    skipProxy: skipProxy || defaults.skipProxy,
    dnsServer: dnsServer || defaults.dnsServer,
  }
}

export class FileOutputSettingsStore {
  constructor(private readonly path = settingsPath()) {}

  async get(): Promise<OutputSettings> {
    try {
      const content = await readFile(this.path, 'utf8')
      return normalizeSettings(parse(content))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    return defaultOutputSettings()
  }

  async getDefault(): Promise<OutputSettings> {
    return defaultOutputSettings()
  }

  async save(input: OutputSettingsInput): Promise<OutputSettings> {
    const existing = await this.get()
    const config = normalizeSettings({
      urlTestUrl: input.urlTestUrl ?? existing.urlTestUrl,
      urlTestInterval: input.urlTestInterval ?? existing.urlTestInterval,
      skipProxy: input.skipProxy ?? existing.skipProxy,
      dnsServer: input.dnsServer ?? existing.dnsServer,
    })

    await mkdir(dirname(this.path), { recursive: true })
    const yaml = stringify({
      'url-test-url': config.urlTestUrl,
      'url-test-interval': config.urlTestInterval,
      'skip-proxy': config.skipProxy,
      'dns-server': config.dnsServer,
    })
    await writeFile(this.path, yaml, 'utf8')
    return config
  }

  async reset(): Promise<OutputSettings> {
    try {
      await unlink(this.path)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    return this.getDefault()
  }
}

export const outputSettingsStore = new FileOutputSettingsStore()
