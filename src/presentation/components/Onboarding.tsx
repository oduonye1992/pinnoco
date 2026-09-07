import { Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getAgentConnectionPrompt } from '../../application/queries/get-agent-connection-prompt'
import type { PieceColor, PieceKind } from '../../domains/game/game.types'
import { copyText } from '../../shared/copy-text'
import { ChessPiece } from './ChessPiece'

interface OnboardingProps {
  onStart: () => void
}

type OnboardingPiece = { color: PieceColor; kind: PieceKind }
const black = (kind: PieceKind): OnboardingPiece => ({ color: 'black', kind })
const white = (kind: PieceKind): OnboardingPiece => ({ color: 'white', kind })
const pawnLine = (color: PieceColor) => Array.from({ length: 8 }, () => color === 'black' ? black('pawn') : white('pawn'))
const onboardingRanks: Array<Array<OnboardingPiece | null>> = [
  [black('rook'), black('knight'), black('bishop'), black('queen'), black('king'), black('bishop'), black('knight'), black('rook')],
  pawnLine('black'),
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  pawnLine('white'),
  [white('rook'), white('knight'), white('bishop'), white('queen'), white('king'), white('bishop'), white('knight'), white('rook')],
]

export function Onboarding({ onStart }: OnboardingProps) {
  const startButton = useRef<HTMLButtonElement>(null)
  const [promptCopied, setPromptCopied] = useState(false)
  const connectionPrompt = getAgentConnectionPrompt(window.location.origin)

  useEffect(() => {
    startButton.current?.focus()
  }, [])

  return (
    <div className="onboarding-backdrop">
      <section aria-labelledby="onboarding-title" aria-modal="true" className="onboarding-card" role="dialog">
        <header className="onboarding-masthead">
          <p>PINNOCO</p>
          <span>Chess with Codex</span>
        </header>
        <div className="onboarding-copy">
          <h1 id="onboarding-title">Play chess with Codex.</h1>
          <p className="onboarding-intro">Play a real game with Codex. Ask for the plan or a move breakdown whenever you want.</p>
          <button aria-label="Start Pinnoco" onClick={onStart} onKeyDown={(event) => {
            if (event.key === 'Tab') event.preventDefault()
          }} ref={startButton} type="button">Start <span aria-hidden="true">→</span></button>
          <div className="onboarding-codex">
            <p className="onboarding-codex-label">Open Codex</p>
            <button
              aria-label="Copy Codex instructions"
              className="copy-prompt"
              onClick={() => {
                void copyText(connectionPrompt).then(setPromptCopied)
              }}
              type="button"
            >
              <Copy aria-hidden="true" size={14} />
              {promptCopied ? 'Copied' : 'Copy instructions'}
            </button>
            {promptCopied ? <p aria-live="polite" className="onboarding-copy-status">Paste them in Codex.</p> : null}
          </div>
        </div>
        <div aria-hidden="true" className="onboarding-art">
          <div className="onboarding-board">
            {onboardingRanks.flatMap((rank, rankIndex) => rank.map((piece, fileIndex) => (
                <span className={`onboarding-square ${(rankIndex + fileIndex) % 2 === 0 ? 'light' : 'dark'}`} key={`${rankIndex}-${fileIndex}`}>
                {piece ? <span className={`onboarding-piece ${piece.color}-piece`}><ChessPiece color={piece.color} kind={piece.kind} /></span> : null}
                {fileIndex === 0 ? <em className="onboarding-rank">{8 - rankIndex}</em> : null}
                {rankIndex === 7 ? <em className="onboarding-file">{String.fromCharCode(97 + fileIndex)}</em> : null}
              </span>
            )))}
          </div>
        </div>
      </section>
    </div>
  )
}
