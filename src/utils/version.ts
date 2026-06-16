import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

let cachedVersion: string | null = null

export async function getAppVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion
  try {
    const raw = await readFile(join(process.cwd(), 'package.json'), 'utf8')
    const pkg = JSON.parse(raw) as { version?: string }
    cachedVersion = pkg.version ?? '0.0.0'
  } catch {
    cachedVersion = '0.0.0'
  }
  return cachedVersion
}
