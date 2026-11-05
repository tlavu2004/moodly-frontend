const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
})

/** Moodly uses the backend calendar, regardless of the browser's timezone. */
export function toMoodlyDateKey(date: Date): string {
  const parts = calendar.formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}
