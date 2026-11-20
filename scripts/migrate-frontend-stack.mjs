import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const legacy = 'moodly-frontend-test'
const projectLabel = 'com.docker.compose.project'
const normalized = path => {
  const value = resolve(path).replaceAll('\\', '/')
  return process.platform === 'win32' ? value.toLowerCase() : value
}

export function migrationPlan(containers, networks, root) {
  for (const container of containers) {
    const labels = container.Config?.Labels ?? {}
    if (labels[projectLabel] !== legacy || labels['com.docker.compose.service'] !== 'frontend'
      || !labels['com.docker.compose.project.working_dir']
      || normalized(labels['com.docker.compose.project.working_dir']) !== normalized(root)) {
      throw new Error('Refusing cleanup: container ownership does not match this frontend checkout.')
    }
    if (!['exited', 'created'].includes(container.State?.Status) || container.State?.Running || container.State?.Paused) {
      throw new Error('Stop the legacy frontend project before migration.')
    }
    if (container.Mounts?.length) throw new Error('Refusing cleanup: legacy container has mounts; review data separately.')
  }
  const ids = new Set(containers.map(container => container.Id))
  for (const network of networks) {
    if (network.Labels?.[projectLabel] !== legacy || network.Name !== `${legacy}_default`
      || network.Labels?.['com.docker.compose.network'] !== 'default' || Object.keys(network.Containers ?? {}).some(id => !ids.has(id))) {
      throw new Error('Refusing cleanup: network ownership or attached containers do not match.')
    }
  }
  return { containers: [...ids], networks: networks.map(network => network.Id) }
}

function docker(...args) { return execFileSync('docker', args, { encoding: 'utf8' }).trim() }
function inspectAll(kind, ids) { return ids.length ? JSON.parse(docker(kind, 'inspect', ...ids)) : [] }
function ids(output) { return output.split(/\s+/).filter(Boolean) }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/migrate-frontend-stack.mjs [--apply]')
    const containerIds = ids(docker('ps', '-aq', '--filter', `label=${projectLabel}=${legacy}`))
    const networkIds = ids(docker('network', 'ls', '-q', '--filter', `label=${projectLabel}=${legacy}`))
    const plan = migrationPlan(inspectAll('container', containerIds), inspectAll('network', networkIds), process.cwd())
    console.log(`Legacy frontend cleanup: ${plan.containers.length} stopped containers, ${plan.networks.length} networks; no image/volume deletion.`)
    if (!process.argv.includes('--apply')) {
      console.log('Dry run only. Run make local-container-migrate to apply.')
    } else {
      for (const id of plan.containers) {
        migrationPlan(inspectAll('container', [id]), [], process.cwd())
        docker('container', 'rm', id) // No --force and no --volumes.
      }
      for (const id of plan.networks) {
        migrationPlan([], inspectAll('network', [id]), process.cwd())
        docker('network', 'rm', id)
      }
      console.log('PASS legacy project removed; use the shared moodly-frontend-local project.')
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
