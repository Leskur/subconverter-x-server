import { homedir } from 'node:os'
import { join } from 'node:path'

export function appDataDir(): string {
  const platform = process.platform
  if (platform === 'win32') {
    return join(process.env.APPDATA ?? homedir(), 'subconverter-x')
  }
  if (platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'subconverter-x')
  }
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'subconverter-x')
}
