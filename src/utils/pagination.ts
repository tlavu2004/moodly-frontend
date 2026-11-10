export function readPage(value: string | null): number {
  const page = Number(value ?? 0)
  return Number.isSafeInteger(page) && page >= 0 ? page : 0
}
