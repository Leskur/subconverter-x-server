import * as esbuild from 'esbuild'
import { cp, mkdir } from 'node:fs/promises'

await mkdir('dist', { recursive: true })

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  external: [],
}

await esbuild.build({
  ...shared,
  entryPoints: ['src/adapters/standalone.ts'],
  outfile: 'dist/standalone.cjs',
})

await esbuild.build({
  ...shared,
  entryPoints: ['src/adapters/lambda.ts'],
  outfile: 'dist/lambda.cjs',
})

await cp('data', 'dist/data', { recursive: true })

console.log('Build complete: dist/standalone.cjs, dist/lambda.cjs')
