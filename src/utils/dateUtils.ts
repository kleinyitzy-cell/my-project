import { format, startOfWeek, addDays, isToday, parseISO } from 'date-fns'

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function todayString(): string {
  return toDateString(new Date())
}

export function getWeekDays(referenceDate: Date): Date[] {
  const monday = startOfWeek(referenceDate, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function isSecondFridayOfMonth(date: Date): boolean {
  if (date.getDay() !== 5) return false
  const month = date.getMonth()
  const year = date.getFullYear()
  let fridayCount = 0
  for (let d = 1; d <= date.getDate(); d++) {
    if (new Date(year, month, d).getDay() === 5) fridayCount++
  }
  return fridayCount === 2
}

export function formatHour(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h < 12 ? 'am' : 'pm'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${displayH}${period}` : `${displayH}:${String(m).padStart(2, '0')}${period}`
}

export function currentDecimalHour(): number {
  const now = new Date()
  return now.getHours() + now.getMinutes() / 60
}

export function isTodayDate(dateStr: string): boolean {
  return isToday(parseISO(dateStr))
}

export function getLast30Days(): string[] {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(toDateString(d))
  }
  return days
}

export function getStreakFor(logs: Record<string, Record<string, boolean | string>>, habitKey: string): number {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = toDateString(d)
    if (logs[key]?.[habitKey]) {
      streak++
    } else {
      break
    }
  }
  return streak
}
