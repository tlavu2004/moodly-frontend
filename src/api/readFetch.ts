/** Share only in-flight identical GETs. Responses are never cached after settlement. */
export function createReadFetch(fetchRequest: typeof fetch): typeof fetch {
  const pending = new Map<string, { promise: Promise<Response>; controller: AbortController; consumers: number }>()
  return (input, init) => {
    const request = new Request(input, init)
    if (request.signal.aborted) return Promise.reject(new DOMException('Request aborted', 'AbortError'))
    if (request.method !== 'GET') {
      // A refetch must not join a read that started before a write.
      pending.clear()
      return fetchRequest(request).finally(() => pending.clear())
    }
    // Headers are kept only in memory while pending and are never logged.
    const key = JSON.stringify([request.url, [...request.headers], request.credentials, request.cache, request.mode, request.redirect, request.integrity, request.referrerPolicy])
    let entry = pending.get(key)
    if (!entry || entry.controller.signal.aborted) {
      const controller = new AbortController()
      const promise = fetchRequest(new Request(request, { signal: controller.signal }))
      entry = { promise, controller, consumers: 0 }
      pending.set(key, entry)
      const current = entry
      const remove = () => { if (pending.get(key) === current) pending.delete(key) }
      void promise.then(remove, remove)
    }
    const current = entry
    current.consumers++
    return new Promise<Response>((resolve, reject) => {
      let settled = false
      const finish = () => {
        settled = true
        request.signal.removeEventListener('abort', abort)
        current.consumers--
      }
      const abort = () => {
        if (settled) return
        finish()
        reject(new DOMException('Request aborted', 'AbortError'))
        if (current.consumers === 0) current.controller.abort()
      }
      request.signal.addEventListener('abort', abort, { once: true })
      void current.promise.then((response) => {
        if (settled) return
        finish()
        resolve(response.clone())
      }, (error: unknown) => {
        if (settled) return
        finish()
        reject(error)
      })
    })
  }
}
