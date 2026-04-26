import { useState } from 'react'
import { Plus, Trash2, Circle, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { Priority, TaskCategory } from '../../types'

const PRIORITY_COLORS: Record<Priority, string> = {
  high:   'text-red-400 bg-red-900/30 border-red-800',
  medium: 'text-amber-400 bg-amber-900/30 border-amber-800',
  low:    'text-slate-400 bg-slate-800 border-slate-700',
}

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  work:      'text-blue-400',
  personal:  'text-teal-400',
  admin:     'text-zinc-400',
  spiritual: 'text-amber-400',
}

const CATEGORIES: TaskCategory[] = ['work', 'personal', 'admin', 'spiritual']
const PRIORITIES: Priority[] = ['high', 'medium', 'low']

export function TasksView() {
  const { tasks, addTask, toggleTask, deleteTask } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [category, setCategory] = useState<TaskCategory>('personal')
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('active')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    addTask(title.trim(), priority, category, dueDate || undefined)
    setTitle('')
    setDueDate('')
    setShowForm(false)
  }

  const filtered = tasks.filter((t) =>
    filter === 'all' ? true : filter === 'active' ? !t.completed : t.completed
  )

  const grouped = {
    high:   filtered.filter((t) => t.priority === 'high'   && !t.completed),
    medium: filtered.filter((t) => t.priority === 'medium' && !t.completed),
    low:    filtered.filter((t) => t.priority === 'low'    && !t.completed),
    done:   filtered.filter((t) => t.completed),
  }

  return (
    <div className="pb-24 px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-bold">Tasks</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
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
            placeholder="Task title..."
            className="w-full bg-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-slate-500 text-xs mb-1 block">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none"
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-slate-500 text-xs mb-1 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-slate-500 text-xs mb-1 block">Due date (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-medium">
              Add Task
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-700 text-slate-300 rounded-xl py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-slate-800 rounded-xl p-1">
        {(['active', 'done', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {f === 'active' ? `Active (${tasks.filter(t=>!t.completed).length})` : f === 'done' ? `Done (${tasks.filter(t=>t.completed).length})` : 'All'}
          </button>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center text-slate-600 py-12">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-sm">No tasks yet. Add one above!</div>
        </div>
      )}

      {/* Priority groups */}
      {filter !== 'done' && (['high', 'medium', 'low'] as Priority[]).map((p) => {
        const items = grouped[p]
        if (items.length === 0) return null
        return (
          <div key={p} className="mb-4">
            <div className={`text-xs font-semibold uppercase tracking-wider mb-2 px-1 ${PRIORITY_COLORS[p].split(' ')[0]}`}>
              {p} priority
            </div>
            <div className="space-y-2">
              {items.map((task) => (
                <div key={task.id} className={`flex items-start gap-3 bg-slate-800 rounded-xl p-3 border ${PRIORITY_COLORS[task.priority].split(' ').slice(1).join(' ')}`}>
                  <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
                    <Circle size={20} className="text-slate-600" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm">{task.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs ${CATEGORY_COLORS[task.category]}`}>{task.category}</span>
                      {task.dueDate && <span className="text-slate-500 text-xs">Due {task.dueDate}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="text-slate-700 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Done list */}
      {(filter === 'done' || filter === 'all') && grouped.done.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 px-1">Completed</div>
          <div className="space-y-2">
            {grouped.done.map((task) => (
              <div key={task.id} className="flex items-start gap-3 bg-slate-800/50 rounded-xl p-3 border border-slate-800 opacity-60">
                <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-500 text-sm line-through">{task.title}</div>
                  <span className={`text-xs ${CATEGORY_COLORS[task.category]}`}>{task.category}</span>
                </div>
                <button onClick={() => deleteTask(task.id)} className="text-slate-700 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
