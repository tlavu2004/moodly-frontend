import { toMoodlyDateKey } from './date.ts'

it.each([
  ['2026-11-05T16:59:59Z', '2026-11-05'],
  ['2026-11-05T17:00:00Z', '2026-11-06'],
  ['2026-11-06T00:30:00+14:00', '2026-11-05'],
  ['2026-11-05T23:30:00-08:00', '2026-11-06'],
])('uses the backend calendar for %s', (instant, expected) => {
  expect(toMoodlyDateKey(new Date(instant))).toBe(expected)
})
