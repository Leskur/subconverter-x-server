import type { VmessProxy } from '../types.js'
import { decodeBase64Loose } from '../../utils/uri.js'

interface VmessJson {
  v?: string | number
  ps?: string
  add?: string
  port?: string | number
  id?: string
  aid?: string | number
  scy?: string
  net?: string
  type?: string
  host?: string
  path?: string
  tls?: string
  sni?: string
  alpn?: string
  fp?: string
}

function readString(value: string | number | undefined): string | undefined {
  if (value === undefined || value === null) return undefined
  const text = String(value).trim()
  return text.length > 0 ? text : undefined
}

function readNumber(value: string | number | undefined): number | undefined {
  const text = readString(value)
  if (!text) return undefined
  const num = Number(text)
  return Number.isNaN(num) ? undefined : num
}

export function parseVmessLine(line: string): VmessProxy | null {
  if (!line.startsWith('vmess://')) return null

  const payload = line.slice('vmess://'.length).split('#')[0]?.split('?')[0]
  if (!payload) return null

  let json: VmessJson
  try {
    json = JSON.parse(decodeBase64Loose(payload)) as VmessJson
  } catch {
    return null
  }

  const server = readString(json.add)
  const port = readNumber(json.port)
  const uuid = readString(json.id)
  if (!server || port === undefined || !uuid) return null

  const name = readString(json.ps) || `${server}:${port}`
  const network = readString(json.net) || 'tcp'
  const tlsValue = readString(json.tls)

  return {
    type: 'vmess',
    name,
    server,
    port,
    uuid,
    alterId: readNumber(json.aid) ?? 0,
    cipher: readString(json.scy) || 'auto',
    network,
    headerType: readString(json.type) || undefined,
    tls: tlsValue === 'tls' || tlsValue === 'reality',
    sni: readString(json.sni) || undefined,
    alpn: readString(json.alpn) || undefined,
    fingerprint: readString(json.fp) || undefined,
    host: readString(json.host) || undefined,
    path: readString(json.path) || undefined,
  }
}
