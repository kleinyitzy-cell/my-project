import { useState } from 'react'
import { format, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getWeekDays, toDateString } from '../../utils/dateUtils'
import { getBlocksForDate, BLOCK_DOTS } from '../../data/scheduleTemplate'
import { useAppStore } from '../../store/useAppStore'
import { isSecondFridayOfMonth } from '../../utils/dateUtils'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function DayCard({ date, onClick }: { date: Date; onClick: () => void }) {
  const blocks = getBlocksForDate(date)
  const today = isToday(date)
  const isSabbath = date.getDay() === 6
  const isWorkFri = date.getDay() === 5 && isSecondFridayOfMonth(date)

  // Summarize block types present (excluding sleep)
  const types = [...new Set(blocks.filter((b) => b.type !== 'sleep').map((b) => b.type))]

  const workBlock = blocks.find((b) => b.type === 'work')
  const workHours = workBlock ? workBlock.endHour - workBlock.startHour : 0

  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-0 rounded-xl p-2 border text-left transition-all active:scale-95 ${
        today
          ? 'bg-slate-700 border-slate-500 ring-1 ring-blue-500'
          : isSabbath
          ? 'bg-yellow-950/40 border-yellow-800/50'
          : 'bg-slate-800 border-slate-700 hover:bg-slate-750'
      }`}
    >
      <div className={`text-xs font-bold mb-1 ${today ? 'text-blue-400' : 'text-slate-400'}`}>
        {DAY_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1]}
      </div>
      <div className={`text-sm font-semibold mb-2 ${today ? 'text-white' : 'text-slate-300'}`}>
        {format(date, 'd')}
      </div>

      {isSabbath ? (
        <div className="text-yellow-500 text-xs">Sabbath</div>
      ) : isWorkFri ? (
        <div className="text-blue-400 text-xs">Work 7–12</div>
      ) : (
        <>
          {workHours > 0 && (
            <div className="text-blue-400 text-xs mb-1">{workHours}h work</div>
          )}
          <div className="flex flex-wrap gap-0.5">
            {types.slice(0, 5).map((t) => (
              <div key={t} className={`w-2 h-2 rounded-full ${BLOCK_DOTS[t]}`} />
            ))}
          </div>
        </>
      )}
    </button>
  )
}

export function WeekView() {
  const { setSelectedDate, setView } = useAppStore()
  const [weekOffset, setWeekOffset] = useState(0)

  const refDate = new Date()
  refDate.setDate(refDate.getDate() + weekOffset * 7)
  const days = getWeekDays(refDate)

  function goToDay(date: Date) {
    setSelectedDate(toDateString(date))
    setView('today')
  }

  // Weekly stats
  const weekStats = days.map((d) => {
    const blocks = getBlocksForDate(d)
    return {
      work: blocks.find((b) => b.type === 'work') ? (blocks.find((b) => b.type === 'work')!.endHour - blocks.find((b) => b.type === 'work')!.startHour) : 0,
      prayer: blocks.filter((b) => b.type === 'prayer').length,
      study: blocks.filter((b) => b.type === 'learning').length,
    }
  })
  const totalWork = weekStats.reduce((s, d) => s + d.work, 0)
  const totalPrayer = weekStats.reduce((s, d) => s + d.prayer, 0)
  const totalStudy = weekStats.reduce((s, d) => s + d.study, 0)

  return (
    <div className="pb-24 px-4 pt-4">
      {/* Week nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset((o) => o - 1)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-white font-bold">
            {format(days[0]!, 'MMM d')} – {format(days[6]!, 'MMM d')}
          </div>
          {weekOffset === 0 && <div className="text-slate-500 text-xs">This Week</div>}
          {weekOffset === 1 && <div className="text-slate-500 text-xs">Next Week</div>}
          {weekOffset === -1 && <div className="text-slate-500 text-xs">Last Week</div>}
        </div>
        <button onClick={() => setWeekOffset((o) => o + 1)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day cards */}
      <div className="flex gap-1 mb-5">
        {days.map((d) => <DayCard key={d.toISOString()} date={d} onClick={() => goToDay(d)} />)}
      </div>

      {/* Weekly summary */}
      <div className="bg-slate-800 rounded-2xl p-4 mb-4">
        <h3 className="text-white font-semibold mb-3">Week at a Glance</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-blue-400 text-2xl font-bold">{totalWork}</div>
            <div className="text-slate-400 text-xs">Work hrs</div>
          </div>
          <div className="text-center">
            <div className="text-amber-400 text-2xl font-bold">{totalPrayer}</div>
            <div className="text-slate-400 text-xs">Prayer sessions</div>
          </div>
          <div className="text-center">
            <div className="text-violet-400 text-2xl font-bold">{totalStudy}</div>
            <div className="text-slate-400 text-xs">Study sessions</div>
          </div>
        </div>
      </div>

      {/* Day detail list */}
      <div className="space-y-2">
        {days.map((d) => {
          const blocks = getBlocksForDate(d)
          const isSabbath = d.getDay() === 6
          const today = isToday(d)
          const workBlock = blocks.find((b) => b.type === 'work')

          return (
            <button
              key={d.toISOString()}
              onClick={() => goToDay(d)}
              className={`w-full text-left bg-slate-800 rounded-xl p-3 border flex items-center gap-3 transition-all active:scale-99 ${
                today ? 'border-blue-700' : 'border-slate-700'
              }`}
            >
              <div className="w-14 shrink-0">
                <div className={`font-bold text-sm ${today ? 'text-blue-400' : 'text-slate-400'}`}>
                  {format(d, 'EEE')}
                </div>
                <div className="text-slate-500 text-xs">{format(d, 'MMM d')}</div>
              </div>
              <div className="flex-1">
                {isSabbath ? (
                  <span className="text-yellow-400 text-sm font-medium">Sabbath Rest</span>
                ) : workBlock ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-blue-400 text-sm">
                      Work {workBlock.startHour < 12 ? `${workBlock.startHour}am` : `${workBlock.startHour - 12}pm`}–{workBlock.endHour < 12 ? `${workBlock.endHour}am` : `${workBlock.endHour - 12}pm`}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-amber-400 text-sm">Prayer ×{blocks.filter(b=>b.type==='prayer').length}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-violet-400 text-sm">Study ×{blocks.filter(b=>b.type==='learning').length}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-teal-400 text-sm">Personal Day</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-amber-400 text-sm">Prayer ×{blocks.filter(b=>b.type==='prayer').length}</span>
                  </div>
                )}
              </div>
              <ChevronRight size={16} className="text-slate-600 shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
