import { TimeBlock, DayOfWeek } from '../types'
import { isSecondFridayOfMonth } from '../utils/dateUtils'

// Returns the ordered time blocks for a given date
export function getBlocksForDate(date: Date): TimeBlock[] {
  const day = date.getDay() as DayOfWeek

  const sleep: TimeBlock = {
    id: 'sleep', type: 'sleep', label: 'Sleep', startHour: 22, endHour: 29, // 29 = 5am next day
  }
  const wakePrep: TimeBlock = {
    id: 'wake', type: 'personal', label: 'Wake & Prep', startHour: 5, endHour: 5.5,
  }
  const prayerMorning: TimeBlock = {
    id: 'prayer-am', type: 'prayer', label: 'Morning Prayer', startHour: 5.5, endHour: 6.5,
  }
  const learningMorning: TimeBlock = {
    id: 'learning-am', type: 'learning', label: 'Morning Study', startHour: 6.5, endHour: 7,
  }
  const exercise: TimeBlock = {
    id: 'exercise', type: 'exercise', label: 'Exercise', startHour: 7, endHour: 7.75, optional: true,
  }

  // Saturday — Sabbath
  if (day === 6) {
    return [
      sleep,
      wakePrep,
      prayerMorning,
      { id: 'sabbath-am', type: 'sabbath', label: 'Sabbath Rest', startHour: 6.5, endHour: 18 },
      { id: 'learning-eve', type: 'learning', label: 'Evening Study', startHour: 18, endHour: 19 },
      { id: 'prayer-eve', type: 'prayer', label: 'Evening Prayer', startHour: 19, endHour: 19.5 },
      { id: 'family-eve', type: 'family', label: 'Family Time', startHour: 19.5, endHour: 22 },
    ]
  }

  // Sunday — personal + family
  if (day === 0) {
    return [
      sleep,
      wakePrep,
      prayerMorning,
      learningMorning,
      { ...exercise },
      { id: 'personal-sun', type: 'personal', label: 'Personal Time', startHour: 7.75, endHour: 12 },
      { id: 'family-sun', type: 'family', label: 'Family Time', startHour: 12, endHour: 17 },
      { id: 'learning-eve', type: 'learning', label: 'Evening Study', startHour: 17, endHour: 18 },
      { id: 'prayer-eve', type: 'prayer', label: 'Evening Prayer', startHour: 18, endHour: 18.5 },
      { id: 'family-eve', type: 'family', label: 'Family Time', startHour: 18.5, endHour: 22 },
    ]
  }

  // Friday
  if (day === 5) {
    const isWorkFriday = isSecondFridayOfMonth(date)
    if (isWorkFriday) {
      return [
        sleep,
        wakePrep,
        prayerMorning,
        learningMorning,
        { id: 'work-fri', type: 'work', label: 'Work', startHour: 7, endHour: 12 },
        { id: 'lunch-fri', type: 'personal', label: 'Lunch Break', startHour: 12, endHour: 13 },
        { id: 'admin-fri', type: 'admin', label: 'Admin', startHour: 13, endHour: 14 },
        { ...exercise, startHour: 14, endHour: 14.75 },
        { id: 'personal-fri', type: 'personal', label: 'Personal Time', startHour: 14.75, endHour: 17 },
        { id: 'learning-eve', type: 'learning', label: 'Evening Study', startHour: 17, endHour: 18 },
        { id: 'prayer-eve', type: 'prayer', label: 'Evening Prayer', startHour: 18, endHour: 18.5 },
        { id: 'family-eve', type: 'family', label: 'Family Time', startHour: 18.5, endHour: 22 },
      ]
    } else {
      return [
        sleep,
        wakePrep,
        prayerMorning,
        learningMorning,
        { ...exercise },
        { id: 'admin-fri', type: 'admin', label: 'Admin Work', startHour: 7.75, endHour: 12 },
        { id: 'lunch-fri', type: 'personal', label: 'Lunch Break', startHour: 12, endHour: 13 },
        { id: 'personal-fri', type: 'personal', label: 'Personal Time', startHour: 13, endHour: 17 },
        { id: 'learning-eve', type: 'learning', label: 'Evening Study', startHour: 17, endHour: 18 },
        { id: 'prayer-eve', type: 'prayer', label: 'Evening Prayer', startHour: 18, endHour: 18.5 },
        { id: 'family-eve', type: 'family', label: 'Family Time', startHour: 18.5, endHour: 22 },
      ]
    }
  }

  // Monday (1) and Thursday (4) — work 9-6
  if (day === 1 || day === 4) {
    return [
      sleep,
      wakePrep,
      prayerMorning,
      learningMorning,
      { ...exercise },
      { id: 'prep', type: 'personal', label: 'Prep / Commute', startHour: 7.75, endHour: 9 },
      { id: 'work', type: 'work', label: 'Work', startHour: 9, endHour: 18 },
      { id: 'family-eve', type: 'family', label: 'Family Time', startHour: 18, endHour: 19 },
      { id: 'learning-eve', type: 'learning', label: 'Evening Study', startHour: 19, endHour: 20 },
      { id: 'prayer-eve', type: 'prayer', label: 'Evening Prayer', startHour: 20, endHour: 20.5 },
      { id: 'wind-down', type: 'personal', label: 'Wind Down', startHour: 20.5, endHour: 22 },
    ]
  }

  // Tuesday (2) and Wednesday (3) — work 8-5
  return [
    sleep,
    wakePrep,
    prayerMorning,
    learningMorning,
    { ...exercise },
    { id: 'prep', type: 'personal', label: 'Prep / Commute', startHour: 7.75, endHour: 8 },
    { id: 'work', type: 'work', label: 'Work', startHour: 8, endHour: 17 },
    { id: 'family-eve', type: 'family', label: 'Family Time', startHour: 17, endHour: 18 },
    { id: 'learning-eve', type: 'learning', label: 'Evening Study', startHour: 18, endHour: 19 },
    { id: 'prayer-eve', type: 'prayer', label: 'Evening Prayer', startHour: 19, endHour: 19.5 },
    { id: 'wind-down', type: 'personal', label: 'Wind Down', startHour: 19.5, endHour: 22 },
  ]
}

export const BLOCK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  sleep:    { bg: 'bg-slate-800',  text: 'text-slate-300',  border: 'border-slate-700' },
  prayer:   { bg: 'bg-amber-900',  text: 'text-amber-200',  border: 'border-amber-700' },
  learning: { bg: 'bg-violet-900', text: 'text-violet-200', border: 'border-violet-700' },
  exercise: { bg: 'bg-emerald-900',text: 'text-emerald-200',border: 'border-emerald-700' },
  work:     { bg: 'bg-blue-900',   text: 'text-blue-200',   border: 'border-blue-700' },
  family:   { bg: 'bg-rose-900',   text: 'text-rose-200',   border: 'border-rose-700' },
  admin:    { bg: 'bg-zinc-800',   text: 'text-zinc-300',   border: 'border-zinc-600' },
  personal: { bg: 'bg-teal-900',   text: 'text-teal-200',   border: 'border-teal-700' },
  sabbath:  { bg: 'bg-yellow-900', text: 'text-yellow-200', border: 'border-yellow-700' },
  other:    { bg: 'bg-gray-800',   text: 'text-gray-300',   border: 'border-gray-600' },
}

export const BLOCK_DOTS: Record<string, string> = {
  sleep:    'bg-slate-500',
  prayer:   'bg-amber-400',
  learning: 'bg-violet-400',
  exercise: 'bg-emerald-400',
  work:     'bg-blue-400',
  family:   'bg-rose-400',
  admin:    'bg-zinc-400',
  personal: 'bg-teal-400',
  sabbath:  'bg-yellow-400',
  other:    'bg-gray-400',
}
