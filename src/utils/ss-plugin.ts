export interface SsPluginOpts {
  mode?: string
  host?: string
}

/** 将 URI / Clash 里常见的 obfs 插件名归一为 Clash 侧的 `obfs`。 */
export function normalizeSsPluginName(name: string | undefined): string | undefined {
  if (!name) return undefined
  const key = name.trim().toLowerCase()
  if (key === 'obfs' || key === 'obfs-local' || key === 'simple-obfs') return 'obfs'
  return name.trim()
}

/** 解析 `obfs=http;obfs-host=bing.com` 或 `mode=http;host=bing.com`。 */
export function parseSsPluginOptsString(raw: string): SsPluginOpts | undefined {
  const opts: SsPluginOpts = {}
  for (const part of raw.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim().toLowerCase()
    const value = trimmed.slice(eq + 1).trim()
    if (!value) continue
    if (key === 'obfs' || key === 'mode') opts.mode = value
    else if (key === 'obfs-host' || key === 'host') opts.host = value
  }
  return opts.mode || opts.host ? opts : undefined
}

/** Clash YAML 的 plugin-opts：支持 object 或 string。 */
export function parseSsPluginOpts(raw: unknown): SsPluginOpts | undefined {
  if (raw == null) return undefined
  if (typeof raw === 'string') return parseSsPluginOptsString(raw)
  if (typeof raw !== 'object') return undefined

  const record = raw as Record<string, unknown>
  const mode =
    typeof record.mode === 'string'
      ? record.mode
      : typeof record.obfs === 'string'
        ? record.obfs
        : undefined
  const host =
    typeof record.host === 'string'
      ? record.host
      : typeof record['obfs-host'] === 'string'
        ? record['obfs-host']
        : undefined

  return mode || host ? { mode, host } : undefined
}

/** SIP002 `plugin` 查询参数：`obfs-local;obfs=http;obfs-host=...` */
export function parseSip002Plugin(pluginValue: string): {
  plugin?: string
  pluginOpts?: SsPluginOpts
} {
  const decoded = (() => {
    try {
      return decodeURIComponent(pluginValue)
    } catch {
      return pluginValue
    }
  })()

  const semicolon = decoded.indexOf(';')
  if (semicolon === -1) {
    return { plugin: normalizeSsPluginName(decoded) }
  }

  return {
    plugin: normalizeSsPluginName(decoded.slice(0, semicolon)),
    pluginOpts: parseSsPluginOptsString(decoded.slice(semicolon + 1)),
  }
}

export function toClashPluginOpts(opts: SsPluginOpts | undefined): Record<string, string> | undefined {
  if (!opts) return undefined
  const out: Record<string, string> = {}
  if (opts.mode) out.mode = opts.mode
  if (opts.host) out.host = opts.host
  return Object.keys(out).length > 0 ? out : undefined
}
