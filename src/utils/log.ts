function timestamp(): string {
  return new Date().toLocaleString('sv').replace(' ', 'T')
}

function formatField(key: string, value: unknown): string {
  const text = String(value)
  if (/[\s="&]/.test(text)) {
    return `${key}="${text.replace(/"/g, '\\"')}"`
  }
  return `${key}=${text}`
}

/** 单行 access 风格日志：method path status latency [fields…] */
export function logAccess(fields: Record<string, unknown>): void {
  const order = ['method', 'path', 'status', 'latency']
  const ordered: string[] = []

  for (const key of order) {
    const value = fields[key]
    if (value !== undefined && value !== '') {
      ordered.push(formatField(key, value))
    }
  }

  for (const [key, value] of Object.entries(fields)) {
    if (order.includes(key) || value === undefined || value === '') continue
    ordered.push(formatField(key, value))
  }

  console.log(`[${timestamp()}] ${ordered.join(' ')}`)
}
