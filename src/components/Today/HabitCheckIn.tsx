import { useAppStore } from '../../store/useAppStore'
import { todayString, getStreakFor } from '../../utils/dateUtils'
import { HabitKey } from '../../types'

const HABITS: { key: HabitKey; label: string; icon: string }[] = [
  { key: 'prayerMorning',   label: 'Morning Prayer', icon: '🌅' },
  { key: 'prayerEvening',   label: 'Evening Prayer', icon: '🌙' },
  { key: 'learningMorning', label: 'Morning Study',  icon: '📖' },
  { key: 'learningEvening', label: 'Evening Study',  icon: '📚' },
  { key: 'exercise',        label: 'Exercise',        icon: '💪' },
]

export function HabitCheckIn() {
  const { habitLogs, toggleHabit, getHabitLog } = useAppStore()
  const today = todayString()
  const log = getHabitLog(today)

  const completed = Object.values(log).filter((v) => v === true).length
  const total = HABITS.length

  return (
    <div className="bg-slate-800 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Today's Habits</h3>
        <span className="text-slate-400 text-sm">{completed}/{total}</span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {HABITS.map(({ key, label, icon }) => {
          const done = log[key]
          const streak = getStreakFor(habitLogs as Record<string, Record<string, boolean | string>>, key)
          return (
            <button
              key={key}
              onClick={() => toggleHabit(today, key)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                done
                  ? 'bg-slate-700 border-slate-600'
                  : 'bg-slate-900 border-slate-700 opacity-70'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className={`flex-1 text-sm font-medium text-left ${done ? 'text-white' : 'text-slate-400'}`}>
                {label}
              </span>
              {streak > 0 && (
                <span className="text-xs text-slate-500">{streak}🔥</span>
              )}
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
              }`}>
                {done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
