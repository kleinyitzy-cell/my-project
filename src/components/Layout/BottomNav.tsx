import { CalendarDays, LayoutGrid, Activity, CheckSquare, Target } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { View } from '../../types'

const TABS: { view: View; icon: React.ReactNode; label: string }[] = [
  { view: 'today',  icon: <CalendarDays size={22} />, label: 'Today' },
  { view: 'week',   icon: <LayoutGrid size={22} />,  label: 'Week' },
  { view: 'habits', icon: <Activity size={22} />,    label: 'Habits' },
  { view: 'tasks',  icon: <CheckSquare size={22} />, label: 'Tasks' },
  { view: 'goals',  icon: <Target size={22} />,      label: 'Goals' },
]

export function BottomNav() {
  const { currentView, setView } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex safe-bottom">
      {TABS.map(({ view, icon, label }) => {
        const active = currentView === view
        return (
          <button
            key={view}
            onClick={() => setView(view)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              active ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            {icon}
            <span className="text-xs">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
