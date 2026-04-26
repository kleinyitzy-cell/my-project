import { useAppStore } from './store/useAppStore'
import { BottomNav } from './components/Layout/BottomNav'
import { TodayView } from './components/Today/TodayView'
import { WeekView } from './components/Week/WeekView'
import { HabitsView } from './components/Habits/HabitsView'
import { TasksView } from './components/Tasks/TasksView'
import { GoalsView } from './components/Goals/GoalsView'

export default function App() {
  const { currentView } = useAppStore()

  return (
    <div className="min-h-screen bg-slate-900 text-white max-w-lg mx-auto">
      {currentView === 'today'  && <TodayView />}
      {currentView === 'week'   && <WeekView />}
      {currentView === 'habits' && <HabitsView />}
      {currentView === 'tasks'  && <TasksView />}
      {currentView === 'goals'  && <GoalsView />}
      <BottomNav />
    </div>
  )
}
