import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const image = process.argv[2]
if (!image) throw new Error('Usage: node scripts/record-image.mjs <image> [output.json]')
const [info] = JSON.parse(execFileSync('docker', ['image', 'inspect', image], { encoding: 'utf8' }))
const labels = info.Config.Labels ?? {}
const output = process.argv[3] ?? 'reports/container-image.json'
const record = {
  image,
  imageId: info.Id,
  // Registry manifest digests only exist after pull/push; imageId is not a deploy digest.
  repoDigests: info.RepoDigests ?? [],
  revision: labels['org.opencontainers.image.revision'],
  environment: labels['io.moodly.environment'],
  version: labels['org.opencontainers.image.version'],
}
if (!record.revision || record.revision === 'unknown') throw new Error('Missing source revision; build with SOURCE_REVISION')
await mkdir(dirname(output), { recursive: true })
await writeFile(output, JSON.stringify(record, null, 2) + '\n')
console.log(`Recorded image identity in ${output}`)
