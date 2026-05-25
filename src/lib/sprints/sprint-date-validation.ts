/** Local calendar date as `YYYY-MM-DD` (matches `<input type="date">`). */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function calendarDayMs(dateStr: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr ?? '').trim())
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2]) - 1
  const d = Number(match[3])
  const ms = new Date(y, m, d).getTime()
  return Number.isNaN(ms) ? null : ms
}

export function isSprintStartDateInPast(startDateStr: string, today: Date = new Date()): boolean {
  const startMs = calendarDayMs(startDateStr)
  if (startMs === null) return false
  const todayMs = calendarDayMs(getLocalDateString(today))
  if (todayMs === null) return false
  return startMs < todayMs
}

export function validateSprintStartNotInPast(startDateStr: string): string | null {
  if (isSprintStartDateInPast(startDateStr)) {
    return 'Sprint start date cannot be in the past'
  }
  return null
}
