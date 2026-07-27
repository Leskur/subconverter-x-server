function timestamp(): string {
  return new Date().toLocaleString('sv').replace(' ', 'T')
}

export function logRequest(message: string, fields: Record<string, unknown> = {}): void {
  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${String(value)}`)

  if (parts.length === 0) {
    console.log(`[${timestamp()}] ${message}`)
  } else {
    console.log(`[${timestamp()}] ${message} ${parts.join(' ')}`)
  }
}
