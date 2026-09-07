import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ChessSessionStore } from '../../application/chess-session.store'
import { getAnalysisPath } from '../../domains/analysis/analysis.model'
import type { AnalysisWorkspace } from '../../domains/analysis/analysis.types'

interface ScenarioBoardProps {
  analysis: AnalysisWorkspace
  currentGamePly: number
  onPreview(position: ReturnType<typeof getAnalysisPath>[number]): void
  store: ChessSessionStore
}

export function ScenarioBoard({ analysis, currentGamePly, onPreview, store }: ScenarioBoardProps) {
  const path = useMemo(() => getAnalysisPath(analysis), [analysis])
  const [cursor, setCursor] = useState(path.length - 1)
  const activeCursor = Math.min(Math.max(cursor, 0), path.length - 1)
  const position = path[activeCursor]
  const finalMove = path.at(-1)?.move
  const destinationRow = 8 - Number(position.move?.to[1] ?? 8)
  const nextMove = path[activeCursor + 1]?.move
  const previousMove = path[activeCursor - 1]?.move
  const sourceLabel = currentGamePly > analysis.sourceMoveNumber
    ? `${analysis.title} · From move ${analysis.sourceMoveNumber}`
    : analysis.title

  useEffect(() => onPreview(position), [onPreview, position])

  const close = () => {
    void store.dispatch({ source: 'human', type: 'clearScenario' })
  }

  return (
    <section className="board-panel scenario-panel" aria-labelledby="scenario-label" style={{ '--scenario-row': destinationRow } as CSSProperties}>
      <div aria-hidden="true" className="scenario-ranks">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div>
      <div className="scenario-header">
        <div className="scenario-kicker">
          <p>Study 01 <span aria-hidden="true">/</span> After Be7</p>
          <button aria-label="Close scenario" className="icon-button" onClick={close} type="button"><X size={18} /></button>
        </div>
        <div className="scenario-heading">
          <h2 id="scenario-label">{activeCursor === 0 ? sourceLabel : activeCursor === path.length - 1 ? 'The king can hide' : position.move?.san}</h2>
          <p>{activeCursor === 0
            ? 'The current position.'
            : activeCursor === path.length - 1
              ? 'The bishop made room.'
              : `${position.move?.san} puts the piece on ${position.move?.to}.`}</p>
        </div>
      </div>
      <div className="scenario-preview" aria-label="Possible future position">
        <div className="castle-notation-block">
          <b>Castle</b>
          <div className="move-equations">
            <p><span>King</span><strong>e8 <i aria-hidden="true">→</i> g8</strong></p>
            <p><span>Rook</span><strong>h8 <i aria-hidden="true">→</i> f8</strong></p>
          </div>
        </div>
        <p className="future-caption">Castling keeps the king safe and wakes the rook.</p>
      </div>
      <div className="scenario-outcome" aria-live="polite">
        <span>Why it works</span>
        <p>{activeCursor === path.length - 1 && finalMove?.san === 'Be7'
          ? 'The bishop moved out of the way.'
          : `This move puts the piece on ${position.move?.to}. Look at what opens next.`}</p>
        {activeCursor === path.length - 1 && finalMove?.san === 'Be7'
          ? <small className="lesson-note">Now the king and rook can move together.</small>
          : null}
      </div>
      <nav className="scenario-nav" aria-label="Study line history">
        <button aria-label={`Previous move${previousMove ? `, ${previousMove.san}` : ''}`} disabled={activeCursor <= 0} onClick={() => setCursor(activeCursor - 1)} type="button"><ChevronLeft size={18} /><b>Back</b></button>
        <span className="scenario-progress" aria-label={`Step ${activeCursor} of ${path.length - 1}`}>
          {path.slice(1).map((step, index) => <i className={index + 1 === activeCursor ? 'current' : ''} key={step.id}>{step.move?.san}</i>)}
        </span>
        <button aria-label={`Next move${nextMove ? `, ${nextMove.san}` : ''}`} disabled={activeCursor >= path.length - 1} onClick={() => setCursor(activeCursor + 1)} type="button"><b>Next</b><ChevronRight size={18} /></button>
      </nav>
    </section>
  )
}
