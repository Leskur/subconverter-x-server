function timestamp(): string {
  return new Date().toISOString()
}

export function logRequest(message: string, fields: Record<string, unknown> = {}): void {
  const { body, ...rest } = fields
  const parts = Object.entries(rest)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${String(value)}`)

  if (parts.length === 0) {
    console.log(`[${timestamp()}] ${message}`)
  } else {
    console.log(`[${timestamp()}] ${message} ${parts.join(' ')}`)
  }

  if (body !== undefined && process.env.LOG_BODY === '1') {
    console.log(String(body))
  }
}
