import { toLocalDateKey } from './date.ts'

describe('toLocalDateKey', () => {
  it('uses local calendar fields instead of shifting through UTC', () => {
    expect(toLocalDateKey(new Date(2026, 8, 22, 23, 45))).toBe('2026-09-22')
  })
})
