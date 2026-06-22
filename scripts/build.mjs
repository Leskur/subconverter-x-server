import * as esbuild from 'esbuild'
import { mkdir, copyFile, chmod, readFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { platform } from 'node:process'

const pkg = JSON.parse(await readFile('package.json', 'utf8'))

await mkdir('dist', { recursive: true })

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  external: [],
  define: { '__VERSION__': JSON.stringify(pkg.version) },
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

console.log('Build complete: dist/standalone.cjs, dist/lambda.cjs')

// SEA 打包
console.log('Building SEA binary...')

const isWindows = platform === 'win32'
const isMac = platform === 'darwin'
const binaryName = isWindows ? 'dist/subconverter-x.exe' : 'dist/subconverter-x'

// 1. 生成 blob
const nodeVer = parseInt(process.versions.node.split('.')[0])
const seaFlag = nodeVer >= 22 ? '--experimental-sea-config' : '--build-sea'
execSync(`node ${seaFlag} scripts/sea-config.json`, { stdio: 'inherit' })

// 2. 复制 node 可执行文件
await copyFile(process.execPath, binaryName)
if (!isWindows) await chmod(binaryName, 0o755)

// 3. 移除签名（macOS）
if (isMac) execSync(`codesign --remove-signature ${binaryName}`)

// 4. 注入 blob
execSync(
  `node node_modules/postject/dist/cli.js ${binaryName} NODE_SEA_BLOB dist/subconverter-x.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2${isMac ? ' --macho-segment-name NODE_SEA' : ''}`,
  { stdio: 'inherit' }
)

// 5. 重新签名（macOS）
if (isMac) execSync(`codesign --sign - ${binaryName}`)

console.log(`SEA binary: ${binaryName}`)
