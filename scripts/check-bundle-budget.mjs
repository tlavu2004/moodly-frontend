import { brotliCompressSync, gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DIST_DIR = resolve('dist')
const manifest = JSON.parse(readFileSync(resolve(DIST_DIR, '.vite/manifest.json'), 'utf8'))
const entry = Object.values(manifest).find((chunk) => chunk.isEntry)

if (!entry) {
  throw new Error('Vite manifest does not contain an entry chunk')
}

const budgets = {
  initialJavaScriptRaw: 520 * 1024,
  initialJavaScriptGzip: 160 * 1024,
  initialCssRaw: 45 * 1024,
  largestJavaScriptChunkRaw: 250 * 1024,
}

const initialFiles = new Set()
const collectInitialFiles = (chunk) => {
  if (initialFiles.has(chunk.file)) return

  initialFiles.add(chunk.file)
  for (const importedKey of chunk.imports ?? []) {
    collectInitialFiles(manifest[importedKey])
  }
}
collectInitialFiles(entry)

const initialJavaScript = [...initialFiles].map((file) => readFileSync(resolve(DIST_DIR, file)))
const initialCss = (entry.css ?? []).map((file) => readFileSync(resolve(DIST_DIR, file)))
const allJavaScript = Object.values(manifest)
  .filter((chunk) => chunk.file.endsWith('.js'))
  .map((chunk) => ({ file: chunk.file, bytes: readFileSync(resolve(DIST_DIR, chunk.file)).byteLength }))

const sum = (values) => values.reduce((total, value) => total + value, 0)
const initialRaw = sum(initialJavaScript.map((content) => content.byteLength))
const initialGzip = sum(initialJavaScript.map((content) => gzipSync(content).byteLength))
const initialBrotli = sum(initialJavaScript.map((content) => brotliCompressSync(content).byteLength))
const cssRaw = sum(initialCss.map((content) => content.byteLength))
const largestChunk = allJavaScript.sort((left, right) => right.bytes - left.bytes)[0]

const formatKiB = (bytes) => `${(bytes / 1024).toFixed(2)} KiB`
console.log(
  `Bundle budget: initial JS ${formatKiB(initialRaw)} raw / ${formatKiB(initialGzip)} gzip / ${formatKiB(initialBrotli)} brotli; CSS ${formatKiB(cssRaw)} raw; largest chunk ${largestChunk.file} ${formatKiB(largestChunk.bytes)} raw.`,
)

const violations = [
  [initialRaw, budgets.initialJavaScriptRaw, 'initial JavaScript raw'],
  [initialGzip, budgets.initialJavaScriptGzip, 'initial JavaScript gzip'],
  [cssRaw, budgets.initialCssRaw, 'initial CSS raw'],
  [largestChunk.bytes, budgets.largestJavaScriptChunkRaw, 'largest JavaScript chunk raw'],
].filter(([actual, maximum]) => actual > maximum)

if (violations.length > 0) {
  for (const [actual, maximum, label] of violations) {
    console.error(`${label} exceeds budget: ${formatKiB(actual)} > ${formatKiB(maximum)}`)
  }
  process.exitCode = 1
}
