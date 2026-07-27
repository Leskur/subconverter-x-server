import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

declare const __VERSION__: string | undefined

// esbuild define (production) or read package.json (dev)
function getVersion(): string {
  if (typeof __VERSION__ !== 'undefined') return __VERSION__
  try {
    const dir = dirname(fileURLToPath(import.meta.url))
    return JSON.parse(readFileSync(join(dir, '../../package.json'), 'utf8')).version
  } catch {
    return '0.0.0'
  }
}

export const VERSION: string = getVersion()
