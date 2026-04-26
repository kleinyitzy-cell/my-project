import { useEffect, useState } from 'react'
import { TimeBlock } from '../../types'
import { formatHour, currentDecimalHour } from '../../utils/dateUtils'
import { BLOCK_COLORS } from '../../data/scheduleTemplate'

interface Props {
  blocks: TimeBlock[]
  isToday: boolean
}

export function Timeline({ blocks, isToday }: Props) {
  const [nowHour, setNowHour] = useState(currentDecimalHour())

  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => setNowHour(currentDecimalHour()), 60_000)
    return () => clearInterval(id)
  }, [isToday])

  // Visible range 5am–10pm
  const START = 5
  const END = 22
  const RANGE = END - START
  const TOTAL_PX = 680

  function pct(h: number) {
    const clamped = Math.max(START, Math.min(END, h))
    return ((clamped - START) / RANGE) * TOTAL_PX
  }

  const nowPx = isToday ? pct(nowHour) : null

  // Current block
  const currentBlock = isToday
    ? blocks.find((b) => {
        const end = b.endHour > 24 ? b.endHour - 24 : b.endHour
        return nowHour >= b.startHour && nowHour < end
      })
    : null

  return (
    <div className="bg-slate-800 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Timeline</h3>
        {currentBlock && (
          <span className={`text-xs px-2 py-1 rounded-full ${BLOCK_COLORS[currentBlock.type].bg} ${BLOCK_COLORS[currentBlock.type].text}`}>
            Now: {currentBlock.label}
          </span>
        )}
      </div>

      <div className="relative" style={{ height: TOTAL_PX }}>
        {/* Hour lines */}
        {Array.from({ length: END - START + 1 }, (_, i) => {
          const h = START + i
          const y = pct(h)
          return (
            <div key={h} className="absolute left-0 right-0 flex items-center gap-2" style={{ top: y }}>
              <span className="text-slate-600 text-xs w-10 shrink-0 text-right">{formatHour(h)}</span>
              <div className="flex-1 border-t border-slate-700/50" />
            </div>
          )
        })}

        {/* Blocks */}
        {blocks.map((block) => {
          const startH = block.startHour < START ? START : block.startHour
          const endH = block.endHour > 24 ? END : Math.min(block.endHour, END)
          if (startH >= END || endH <= START) return null
          const top = pct(startH)
          const height = pct(endH) - top
          if (height < 4) return null
          const colors = BLOCK_COLORS[block.type]
          const isCurrent = currentBlock?.id === block.id

          return (
            <div
              key={block.id}
              className={`absolute left-12 right-0 rounded-lg border px-2 py-1 ${colors.bg} ${colors.border} ${
                isCurrent ? 'ring-1 ring-white/30' : ''
              } ${block.optional ? 'opacity-60' : ''}`}
              style={{ top: top + 1, height: Math.max(height - 2, 16) }}
            >
              <div className={`text-xs font-medium truncate ${colors.text}`}>
                {block.label}
                {block.optional && <span className="ml-1 opacity-60">(opt)</span>}
              </div>
              {height > 28 && (
                <div className={`text-xs opacity-60 ${colors.text}`}>
                  {formatHour(block.startHour)} – {formatHour(block.endHour > 24 ? block.endHour - 24 : block.endHour)}
                </div>
              )}
            </div>
          )
        })}

        {/* Now indicator */}
        {nowPx !== null && nowPx >= 0 && nowPx <= TOTAL_PX && (
          <div
            className="absolute left-10 right-0 flex items-center pointer-events-none z-10"
            style={{ top: nowPx }}
          >
            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0 -ml-1" />
            <div className="flex-1 border-t border-red-400 border-dashed" />
          </div>
        )}
      </div>
    </div>
  )
}
