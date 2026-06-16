import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { handleRequest } from './handler.js'

function listLanAddresses(): string[] {
  const addresses: string[] = []
  for (const iface of Object.values(networkInterfaces())) {
    if (!iface) continue
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) {
        addresses.push(info.address)
      }
    }
  }
  return addresses
}

async function toWebRequest(req: import('node:http').IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? '127.0.0.1'
  const url = new URL(req.url ?? '/', `http://${host}`)
  const headers = new Headers()

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else {
      headers.set(key, value)
    }
  }

  // Read body for methods that typically have one
  let body: Buffer | undefined
  if (req.method && ['PUT', 'POST', 'PATCH'].includes(req.method)) {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(chunk as Buffer)
    }
    if (chunks.length > 0) {
      body = Buffer.concat(chunks)
    }
  }

  return new Request(url, {
    method: req.method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
    duplex: 'half',
  } as RequestInit)
}

async function sendNodeResponse(webResponse: Response, res: import('node:http').ServerResponse): Promise<void> {
  res.statusCode = webResponse.status
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  const body = await webResponse.text()
  res.end(body)
}

export async function serve(port = 3000, host = '0.0.0.0'): Promise<void> {
  const server = createServer((req, res) => {
    void (async () => {
      try {
        const webReq = await toWebRequest(req)
        const response = await handleRequest(webReq)
        await sendNodeResponse(response, res)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error'
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: message }))
      }
    })()
  })

  await new Promise<void>((resolve) => {
    server.listen(port, host, resolve)
  })

  console.log(`subconverter-x listening on http://${host}:${port}`)
  console.log(`  Local:   http://127.0.0.1:${port}`)
  if (host === '0.0.0.0' || host === '::') {
    for (const address of listLanAddresses()) {
      console.log(`  Network: http://${address}:${port}`)
    }
  }
}

async function runCli(argv: string[]): Promise<void> {
  const command = argv[0]

  if (command === 'serve') {
    const portArg = argv.find((arg) => arg.startsWith('--port='))
    const hostArg = argv.find((arg) => arg.startsWith('--host='))
    const port = portArg ? Number(portArg.split('=')[1]) : 3000
    const host = hostArg ? hostArg.split('=')[1] : '0.0.0.0'
    await serve(port, host)
    return
  }

  console.log(`Usage:
  subconverter-x serve [--host=0.0.0.0] [--port=3000]

HTTP API:
  GET /health
  GET /api/admin/meta
  GET /api/rules
  PUT /api/rules
  GET /sub?url=<upstream>&target=<singbox|clash|surge>
       (target optional; falls back to client User-Agent. ua= is an alias for target.)`)
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('standalone.ts') ||
  process.argv[1].endsWith('standalone.cjs') ||
  process.argv[1].includes('subconverter-x')
)

if (isMain) {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    void serve()
  } else {
    void runCli(args)
  }
}
