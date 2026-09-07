import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PositionNode } from '../../domains/game/game.types'

interface TimelineControlsProps {
  current: number
  label: string
  onChange: (step: number) => void
  positions: PositionNode[]
}

export function TimelineControls({ current, label, onChange, positions }: TimelineControlsProps) {
  const moveName = current === 0 ? 'Start here' : positions[current]?.move?.san || 'Start here'
  const moveCount = positions.length - 1
  const historyLabel = current === 0 ? 'History' : `Move ${current} of ${moveCount}`
  const positionLabel = current === moveCount ? '' : 'Reviewing'

  return (
    <div className="timeline-controls" aria-label={label}>
      <button aria-label="Previous move" disabled={current === 0} onClick={() => onChange(current - 1)} type="button"><ChevronLeft size={17} /><span>Back</span></button>
      <div className="timeline-position" aria-live="polite">
        <span className="timeline-index">{historyLabel}</span>
        <strong>{moveName}</strong>
        {positionLabel ? <span>{positionLabel}</span> : null}
      </div>
      <button aria-label="Next move" disabled={current === moveCount} onClick={() => onChange(current + 1)} type="button"><span>Next</span><ChevronRight size={17} /></button>
    </div>
  )
}
