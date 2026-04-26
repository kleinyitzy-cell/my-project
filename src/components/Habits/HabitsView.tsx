import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { getLast30Days, getStreakFor, todayString } from '../../utils/dateUtils'
import { HabitKey } from '../../types'
import { ProgressRing } from '../shared/ProgressRing'

const HABITS: { key: HabitKey; label: string; icon: string; color: string; ringColor: string }[] = [
  { key: 'prayerMorning',   label: 'Morning Prayer (1hr)', icon: '🌅', color: 'text-amber-400',   ringColor: '#f59e0b' },
  { key: 'prayerEvening',   label: 'Evening Prayer (30m)', icon: '🌙', color: 'text-amber-300',   ringColor: '#fcd34d' },
  { key: 'learningMorning', label: 'Morning Study (30m)',  icon: '📖', color: 'text-violet-400',  ringColor: '#a78bfa' },
  { key: 'learningEvening', label: 'Evening Study (1hr)',  icon: '📚', color: 'text-violet-300',  ringColor: '#c4b5fd' },
  { key: 'exercise',        label: 'Exercise (3–5×/wk)',  icon: '💪', color: 'text-emerald-400', ringColor: '#34d399' },
]

function CalendarDot({ done, date }: { done: boolean; date: string }) {
  const isToday = date === todayString()
  return (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
        done
          ? 'bg-emerald-500 text-white'
          : isToday
          ? 'bg-slate-700 ring-1 ring-slate-500 text-slate-500'
          : 'bg-slate-800 text-slate-700'
      }`}
    >
      {format(parseISO(date), 'd')}
    </div>
  )
}

export function HabitsView() {
  const { habitLogs } = useAppStore()
  const last30 = getLast30Days()

  // Weekly exercise count
  const thisWeekDays: string[] = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - d.getDay() + i + 1) // Mon-based
    thisWeekDays.push(format(d, 'yyyy-MM-dd'))
  }
  const weeklyExercise = thisWeekDays.filter((d) => habitLogs[d]?.exercise).length

  return (
    <div className="pb-24 px-4 pt-4">
      <h2 className="text-white text-xl font-bold mb-4">Habit Tracker</h2>

      {/* Streak cards */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        {HABITS.map(({ key, label, icon, color, ringColor }) => {
          const streak = getStreakFor(habitLogs as Record<string, Record<string, boolean | string>>, key)
          const total30 = last30.filter((d) => habitLogs[d]?.[key]).length
          const pct = Math.round((total30 / 30) * 100)

          const isExercise = key === 'exercise'
          const displayLabel = isExercise ? `${weeklyExercise}/5 this week` : `${streak} day streak`

          return (
            <div key={key} className="bg-slate-800 rounded-2xl p-4 flex items-center gap-4">
              <ProgressRing value={isExercise ? (weeklyExercise / 5) * 100 : pct} size={56} color={ringColor}>
                <span className="text-xl">{icon}</span>
              </ProgressRing>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${color}`}>{label}</div>
                <div className="text-slate-400 text-xs mt-0.5">{displayLabel}</div>
                {!isExercise && (
                  <div className="text-slate-600 text-xs">{total30}/30 days completed</div>
                )}
              </div>
              {streak > 0 && !isExercise && (
                <div className="text-right shrink-0">
                  <div className="text-white font-bold text-xl">{streak}</div>
                  <div className="text-slate-500 text-xs">days</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 30-day calendar grids */}
      {HABITS.map(({ key, label, icon, color }) => (
        <div key={key} className="bg-slate-800 rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <span>{icon}</span>
            <span className={`font-semibold text-sm ${color}`}>{label}</span>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {last30.map((d) => (
              <CalendarDot key={d} done={!!habitLogs[d]?.[key]} date={d} />
            ))}
          </div>
        </div>
      ))}

      {/* Sleep goal reminder */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-indigo-800/50">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">😴</span>
          <span className="text-indigo-300 font-semibold">Sleep Goal</span>
        </div>
        <div className="text-slate-400 text-sm">Ideal: in bed by <span className="text-white font-medium">10:00 pm</span>, wake at <span className="text-white font-medium">5:00–5:30 am</span></div>
        <div className="text-slate-500 text-xs mt-1">~7 hrs sleep • Track this as a habit to build consistency</div>
      </div>
    </div>
  )
}
