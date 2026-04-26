import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { View, HabitLog, HabitKey, Task, Goal, GoalEntry, Priority, TaskCategory, GoalCategory, GoalFrequency } from '../types'
import { todayString } from '../utils/dateUtils'

interface AppState {
  currentView: View
  selectedDate: string
  habitLogs: Record<string, HabitLog>
  tasks: Task[]
  goals: Goal[]

  setView: (view: View) => void
  setSelectedDate: (date: string) => void
  toggleHabit: (date: string, key: HabitKey) => void
  getHabitLog: (date: string) => HabitLog
  addTask: (title: string, priority: Priority, category: TaskCategory, dueDate?: string) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  addGoal: (title: string, category: GoalCategory, frequency: GoalFrequency, target: number, unit: string) => void
  logGoalProgress: (id: string, value: number) => void
  deleteGoal: (id: string) => void
}

function emptyHabitLog(date: string): HabitLog {
  return { date, prayerMorning: false, prayerEvening: false, learningMorning: false, learningEvening: false, exercise: false }
}

const DEFAULT_GOALS: Goal[] = [
  {
    id: 'g-prayer-streak',
    title: 'Daily Prayer (AM + PM)',
    category: 'spiritual',
    frequency: 'daily',
    target: 2,
    unit: 'sessions',
    entries: [],
    createdAt: todayString(),
  },
  {
    id: 'g-exercise-week',
    title: 'Exercise this week',
    category: 'health',
    frequency: 'weekly',
    target: 4,
    unit: 'sessions',
    entries: [],
    createdAt: todayString(),
  },
  {
    id: 'g-sleep',
    title: 'In bed by 10pm',
    category: 'health',
    frequency: 'daily',
    target: 1,
    unit: 'nights',
    entries: [],
    createdAt: todayString(),
  },
  {
    id: 'g-learning',
    title: 'Daily Study (AM + PM)',
    category: 'personal',
    frequency: 'daily',
    target: 2,
    unit: 'sessions',
    entries: [],
    createdAt: todayString(),
  },
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentView: 'today',
      selectedDate: todayString(),
      habitLogs: {},
      tasks: [],
      goals: DEFAULT_GOALS,

      setView: (view) => set({ currentView: view }),
      setSelectedDate: (date) => set({ selectedDate: date }),

      getHabitLog: (date) => {
        return get().habitLogs[date] ?? emptyHabitLog(date)
      },

      toggleHabit: (date, key) => {
        const logs = get().habitLogs
        const current = logs[date] ?? emptyHabitLog(date)
        set({
          habitLogs: {
            ...logs,
            [date]: { ...current, [key]: !current[key] },
          },
        })
      },

      addTask: (title, priority, category, dueDate) => {
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          priority,
          category,
          dueDate,
          completed: false,
          createdAt: todayString(),
        }
        set((s) => ({ tasks: [task, ...s.tasks] }))
      },

      toggleTask: (id) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
        }))
      },

      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      },

      addGoal: (title, category, frequency, target, unit) => {
        const goal: Goal = {
          id: crypto.randomUUID(),
          title,
          category,
          frequency,
          target,
          unit,
          entries: [],
          createdAt: todayString(),
        }
        set((s) => ({ goals: [...s.goals, goal] }))
      },

      logGoalProgress: (id, value) => {
        const today = todayString()
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== id) return g
            const existing = g.entries.find((e) => e.date === today)
            const entries: GoalEntry[] = existing
              ? g.entries.map((e) => (e.date === today ? { ...e, value: e.value + value } : e))
              : [...g.entries, { date: today, value }]
            return { ...g, entries }
          }),
        }))
      },

      deleteGoal: (id) => {
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
      },
    }),
    { name: 'schedule-organizer-v1' }
  )
)
