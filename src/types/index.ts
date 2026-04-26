export type View = 'today' | 'week' | 'habits' | 'tasks' | 'goals'

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=Sun, 1=Mon...6=Sat

export type BlockType =
  | 'sleep'
  | 'prayer'
  | 'learning'
  | 'exercise'
  | 'work'
  | 'family'
  | 'admin'
  | 'personal'
  | 'sabbath'
  | 'other'

export interface TimeBlock {
  id: string
  type: BlockType
  label: string
  startHour: number  // decimal hours, e.g. 5.5 = 5:30am
  endHour: number
  optional?: boolean // exercise is optional (3-5x/week)
}

export type HabitKey =
  | 'prayerMorning'
  | 'prayerEvening'
  | 'learningMorning'
  | 'learningEvening'
  | 'exercise'

export interface HabitLog {
  date: string // YYYY-MM-DD
  prayerMorning: boolean
  prayerEvening: boolean
  learningMorning: boolean
  learningEvening: boolean
  exercise: boolean
  [key: string]: boolean | string
}

export type Priority = 'high' | 'medium' | 'low'
export type TaskCategory = 'work' | 'personal' | 'admin' | 'spiritual'

export interface Task {
  id: string
  title: string
  priority: Priority
  category: TaskCategory
  dueDate?: string
  completed: boolean
  createdAt: string
}

export type GoalFrequency = 'daily' | 'weekly' | 'monthly'
export type GoalCategory = 'spiritual' | 'health' | 'work' | 'family' | 'personal'

export interface Goal {
  id: string
  title: string
  category: GoalCategory
  frequency: GoalFrequency
  target: number
  unit: string
  entries: GoalEntry[]
  createdAt: string
}

export interface GoalEntry {
  date: string
  value: number
}
