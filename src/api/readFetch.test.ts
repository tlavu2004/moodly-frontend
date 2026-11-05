import { vi } from 'vitest'
import { createReadFetch } from './readFetch.ts'

function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((done) => { resolve = done })
  return { promise, resolve }
}

it('shares concurrent GETs, gives each reader a body, and never caches settled data', async () => {
  const next = deferred()
  const network = vi.fn<typeof fetch>().mockReturnValueOnce(next.promise).mockResolvedValue(new Response('fresh'))
  const request = createReadFetch(network)
  const first = request('https://api.test/habits')
  const second = request('https://api.test/habits')
  expect(network).toHaveBeenCalledTimes(1)
  next.resolve(new Response('current'))
  expect(await (await first).text()).toBe('current')
  expect(await (await second).text()).toBe('current')
  expect(await (await request('https://api.test/habits')).text()).toBe('fresh')
  expect(network).toHaveBeenCalledTimes(2)
})

it('aborts upstream only when all consumers cancel and lets a new reader start fresh', async () => {
  const next = deferred()
  const network = vi.fn<typeof fetch>().mockReturnValue(next.promise)
  const request = createReadFetch(network)
  const one = new AbortController(), two = new AbortController()
  const first = request('https://api.test/habits', { signal: one.signal })
  const second = request('https://api.test/habits', { signal: two.signal })
  const upstream = (network.mock.calls[0][0] as Request).signal
  one.abort()
  await expect(first).rejects.toMatchObject({ name: 'AbortError' })
  expect(upstream.aborted).toBe(false)
  two.abort()
  await expect(second).rejects.toMatchObject({ name: 'AbortError' })
  expect(upstream.aborted).toBe(true)
  const third = request('https://api.test/habits')
  expect(network).toHaveBeenCalledTimes(2)
  next.resolve(new Response('ok'))
  await third
})

it('never coalesces mutations, different query parameters, or different headers', async () => {
  const network = vi.fn<typeof fetch>().mockResolvedValue(new Response('ok'))
  const request = createReadFetch(network)
  await Promise.all([
    request('https://api.test/habits', { method: 'POST' }), request('https://api.test/habits', { method: 'POST' }),
    request('https://api.test/entries?page=0'), request('https://api.test/entries?page=1'),
    request('https://api.test/habits', { headers: { Accept: 'application/json' } }), request('https://api.test/habits'),
  ])
  expect(network).toHaveBeenCalledTimes(6)
})

it('does not reuse an older in-flight read across a mutation boundary', async () => {
  const old = deferred()
  const network = vi.fn<typeof fetch>().mockReturnValueOnce(old.promise).mockResolvedValueOnce(new Response('saved')).mockResolvedValueOnce(new Response('fresh'))
  const request = createReadFetch(network)
  const first = request('https://api.test/habits')
  await request('https://api.test/habits', { method: 'POST' })
  expect(await (await request('https://api.test/habits')).text()).toBe('fresh')
  old.resolve(new Response('older'))
  await first
  expect(network).toHaveBeenCalledTimes(3)
})
