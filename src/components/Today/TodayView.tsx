import { format, isToday as checkIsToday, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { getBlocksForDate, BLOCK_DOTS } from '../../data/scheduleTemplate'
import { Timeline } from './Timeline'
import { HabitCheckIn } from './HabitCheckIn'
import { todayString } from '../../utils/dateUtils'
import { isSecondFridayOfMonth } from '../../utils/dateUtils'

function getDayLabel(date: Date): string {
  const day = date.getDay()
  if (day === 6) return 'Sabbath'
  if (day === 5) return isSecondFridayOfMonth(date) ? 'Work Friday' : 'Admin Friday'
  return ''
}

export function TodayView() {
  const { selectedDate, setSelectedDate } = useAppStore()
  const date = parseISO(selectedDate)
  const blocks = getBlocksForDate(date)
  const isTodaySelected = checkIsToday(date)
  const dayLabel = getDayLabel(date)

  function shift(n: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + n)
    setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  // Next upcoming block
  const now = new Date()
  const nowH = now.getHours() + now.getMinutes() / 60
  const nextBlock = isTodaySelected
    ? blocks.find((b) => b.startHour > nowH)
    : null

  // Daily stats
  const workBlock = blocks.find((b) => b.type === 'work')
  const workHours = workBlock ? workBlock.endHour - workBlock.startHour : 0
  const freeHours = 17 - workHours // rough estimate
  const prayerBlocks = blocks.filter((b) => b.type === 'prayer')
  const studyBlocks = blocks.filter((b) => b.type === 'learning')

  return (
    <div className="pb-24">
      {/* Date header */}
      <div className="sticky top-0 z-20 bg-slate-900 px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <button onClick={() => shift(-1)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="text-white font-bold text-lg">{format(date, 'EEEE')}</div>
            <div className="text-slate-400 text-sm">{format(date, 'MMMM d, yyyy')}</div>
            {dayLabel && <div className="text-xs text-amber-400 mt-0.5">{dayLabel}</div>}
          </div>
          <button onClick={() => shift(1)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400">
            <ChevronRight size={20} />
          </button>
        </div>

        {!isTodaySelected && (
          <button
            onClick={() => setSelectedDate(todayString())}
            className="w-full mt-2 text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Back to today
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        {/* Day summary cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {workHours > 0 && (
            <div className="bg-blue-900/40 border border-blue-800 rounded-xl p-3 text-center">
              <div className="text-blue-300 text-lg font-bold">{workHours}h</div>
              <div className="text-blue-400 text-xs">Work</div>
            </div>
          )}
          <div className="bg-amber-900/40 border border-amber-800 rounded-xl p-3 text-center">
            <div className="text-amber-300 text-lg font-bold">{prayerBlocks.length}</div>
            <div className="text-amber-400 text-xs">Prayer</div>
          </div>
          <div className="bg-violet-900/40 border border-violet-800 rounded-xl p-3 text-center">
            <div className="text-violet-300 text-lg font-bold">{studyBlocks.length}</div>
            <div className="text-violet-400 text-xs">Study</div>
          </div>
          {workHours === 0 && (
            <div className="bg-teal-900/40 border border-teal-800 rounded-xl p-3 text-center">
              <div className="text-teal-300 text-lg font-bold">{freeHours}h</div>
              <div className="text-teal-400 text-xs">Free</div>
            </div>
          )}
        </div>

        {/* Next up */}
        {nextBlock && (
          <div className="mb-4 bg-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full shrink-0 ${BLOCK_DOTS[nextBlock.type]}`} />
            <div>
              <div className="text-slate-400 text-xs">Up next</div>
              <div className="text-white font-semibold">{nextBlock.label}</div>
            </div>
            <div className="ml-auto text-slate-400 text-sm">
              {nextBlock.startHour < 12
                ? `${Math.floor(nextBlock.startHour)}:${String(Math.round((nextBlock.startHour % 1) * 60)).padStart(2, '0')} am`
                : `${Math.floor(nextBlock.startHour) > 12 ? Math.floor(nextBlock.startHour) - 12 : Math.floor(nextBlock.startHour)}:${String(Math.round((nextBlock.startHour % 1) * 60)).padStart(2, '0')} pm`}
            </div>
          </div>
        )}

        {/* Habit check-ins — only show for today */}
        {isTodaySelected && <HabitCheckIn />}

        {/* Timeline */}
        <Timeline blocks={blocks} isToday={isTodaySelected} />
      </div>
    </div>
  )
}
