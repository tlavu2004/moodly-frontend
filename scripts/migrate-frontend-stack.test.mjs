import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migrationPlan } from './migrate-frontend-stack.mjs'
const root = process.cwd()
const container = () => ({ Id: 'old-fe', Config: { Labels: {
  'com.docker.compose.project': 'moodly-frontend-test',
  'com.docker.compose.service': 'frontend',
  'com.docker.compose.project.working_dir': root,
} }, State: { Status: 'exited', Running: false }, Mounts: [] })
const network = () => ({ Id: 'old-network', Name: 'moodly-frontend-test_default', Labels: { 'com.docker.compose.project': 'moodly-frontend-test', 'com.docker.compose.network': 'default' }, Containers: {} })
test('plan only stopped legacy FE; repeated migration is empty', () => {
  assert.deepEqual(migrationPlan([container()], [network()], root), { containers: ['old-fe'], networks: ['old-network'] })
  assert.deepEqual(migrationPlan([], [], root), { containers: [], networks: [] })
})
test('refuse active container', () => {
  const c = container(); c.State = { Status: 'running', Running: true }
  assert.throws(() => migrationPlan([c], [], root), /Stop/)
})
test('refuse any mounted data', () => {
  const c = container(); c.Mounts = [{ Type: 'volume', Name: 'data' }]
  assert.throws(() => migrationPlan([c], [], root), /mounts/)
})
test('refuse backend and current project', () => {
  for (const project of ['moodly-backend-local', 'moodly-frontend-local']) {
    const c = container(); c.Config.Labels['com.docker.compose.project'] = project
    assert.throws(() => migrationPlan([c], [], root), /ownership/)
  }
})
test('refuse other checkout and other service', () => {
  assert.throws(() => migrationPlan([container()], [], root + '/other'), /ownership/)
  const c = container(); c.Config.Labels['com.docker.compose.service'] = 'database'
  assert.throws(() => migrationPlan([c], [], root), /ownership/)
})
test('refuse shared networks', () => {
  const n = network(); n.Containers = { unrelated: {} }
  assert.throws(() => migrationPlan([container()], [n], root), /network/)
})

test('refuse missing checkout ownership label', () => {
  const c = container(); delete c.Config.Labels['com.docker.compose.project.working_dir']
  assert.throws(() => migrationPlan([c], [], root), /ownership/)
})
test('refuse custom or unlabelled network', () => {
  const n = network(); n.Name = 'custom-network'
  assert.throws(() => migrationPlan([], [n], root), /network/)
})
