import { unlink, rmdir } from 'node:fs/promises'

export default async function teardown() {
  const directory = process.env.E2E_AUTH_DIR
  if (!directory || !/^playwright\/\.auth\/[a-f0-9-]{36}$/.test(directory)) return
  for (const file of ['user.json', 'session.json']) {
    await unlink(`${directory}/${file}`).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error
    })
  }
  await rmdir(directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
}
