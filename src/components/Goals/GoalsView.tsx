import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { GoalCategory, GoalFrequency } from '../../types'
import { todayString } from '../../utils/dateUtils'
import { ProgressRing } from '../shared/ProgressRing'
import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval } from 'date-fns'

const CATEGORY_COLORS: Record<GoalCategory, { text: string; ring: string }> = {
  spiritual: { text: 'text-amber-400',   ring: '#f59e0b' },
  health:    { text: 'text-emerald-400', ring: '#34d399' },
  work:      { text: 'text-blue-400',    ring: '#60a5fa' },
  family:    { text: 'text-rose-400',    ring: '#fb7185' },
  personal:  { text: 'text-teal-400',    ring: '#2dd4bf' },
}

const CATEGORY_ICONS: Record<GoalCategory, string> = {
  spiritual: '🙏',
  health:    '💪',
  work:      '💼',
  family:    '👨‍👩‍👧',
  personal:  '🌱',
}

const CATEGORIES: GoalCategory[] = ['spiritual', 'health', 'work', 'family', 'personal']
const FREQUENCIES: GoalFrequency[] = ['daily', 'weekly', 'monthly']

function getProgress(entries: { date: string; value: number }[], frequency: GoalFrequency): number {
  const today = todayString()
  const now = new Date()

  if (frequency === 'daily') {
    return entries.find((e) => e.date === today)?.value ?? 0
  }

  if (frequency === 'weekly') {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    return entries
      .filter((e) => isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd }))
      .reduce((s, e) => s + e.value, 0)
  }

  // Monthly
  const month = format(now, 'yyyy-MM')
  return entries.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + e.value, 0)
}

export function GoalsView() {
  const { goals, addGoal, logGoalProgress, deleteGoal } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<GoalCategory>('personal')
  const [frequency, setFrequency] = useState<GoalFrequency>('daily')
  const [target, setTarget] = useState('1')
  const [unit, setUnit] = useState('times')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !unit.trim()) return
    addGoal(title.trim(), category, frequency, Number(target) || 1, unit.trim())
    setTitle('')
    setShowForm(false)
  }

  return (
    <div className="pb-24 px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-bold">Goals</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1 bg-teal-700 hover:bg-teal-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={submit} className="bg-slate-800 rounded-2xl p-4 mb-4 space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal title..."
            className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-500"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-slate-500 text-xs mb-1 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-slate-500 text-xs mb-1 block">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as GoalFrequency)}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none"
              >
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-slate-500 text-xs mb-1 block">Target</label>
              <input
                type="number"
                min="1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-slate-500 text-xs mb-1 block">Unit</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="times, pages, km..."
                className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-teal-700 text-white rounded-xl py-2 text-sm font-medium">
              Add Goal
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-700 text-slate-300 rounded-xl py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {goals.length === 0 && (
        <div className="text-center text-slate-600 py-12">
          <div className="text-4xl mb-3">🎯</div>
          <div className="text-sm">No goals yet. Add one above!</div>
        </div>
      )}

      <div className="space-y-3">
        {goals.map((goal) => {
          const current = getProgress(goal.entries, goal.frequency)
          const pct = Math.min(100, Math.round((current / goal.target) * 100))
          const done = current >= goal.target
          const colors = CATEGORY_COLORS[goal.category]

          return (
            <div key={goal.id} className={`bg-slate-800 rounded-2xl p-4 border ${done ? 'border-emerald-800' : 'border-slate-700'}`}>
              <div className="flex items-center gap-3">
                <ProgressRing value={pct} size={52} color={done ? '#10b981' : colors.ring}>
                  <span className="text-lg">{CATEGORY_ICONS[goal.category]}</span>
                </ProgressRing>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm">{goal.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs ${colors.text}`}>{goal.category}</span>
                    <span className="text-slate-600 text-xs">·</span>
                    <span className="text-slate-500 text-xs">{goal.frequency}</span>
                  </div>
                  <div className={`text-xs mt-0.5 ${done ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {current} / {goal.target} {goal.unit}
                    {done && ' ✓'}
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-center shrink-0">
                  <button
                    onClick={() => logGoalProgress(goal.id, 1)}
                    className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center transition-colors"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <span className="text-slate-400 text-xs">{pct}%</span>
                  <button
                    onClick={() => logGoalProgress(goal.id, -1)}
                    disabled={current <= 0}
                    className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <button onClick={() => deleteGoal(goal.id)} className="text-slate-700 hover:text-red-400 transition-colors ml-1 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
