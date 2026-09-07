import { useEffect, useRef } from 'react'
import type { PromotionPiece } from '../../domains/game/game.types'

const choices: Array<{ label: string; symbol: string; value: PromotionPiece }> = [
  { label: 'Queen', symbol: '♕', value: 'q' },
  { label: 'Rook', symbol: '♖', value: 'r' },
  { label: 'Bishop', symbol: '♗', value: 'b' },
  { label: 'Knight', symbol: '♘', value: 'n' },
]

interface PromotionPickerProps {
  onCancel: () => void
  onChoose: (piece: PromotionPiece) => void
}

export function PromotionPicker({ onCancel, onChoose }: PromotionPickerProps) {
  const card = useRef<HTMLElement>(null)
  const firstChoice = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    firstChoice.current?.focus()
  }, [])

  return (
    <div className="promotion-backdrop">
      <section
        aria-labelledby="promotion-title"
        aria-modal="true"
        className="promotion-card"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel()
          if (event.key !== 'Tab') return
          const buttons = card.current?.querySelectorAll('button')
          if (!buttons?.length) return
          const first = buttons[0]
          const last = buttons[buttons.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }}
        ref={card}
        role="dialog"
      >
        <h2 id="promotion-title">Pick a piece</h2>
        <div className="promotion-options">
          {choices.map((choice, index) => (
            <button
              aria-label={choice.label}
              key={choice.value}
              onClick={() => onChoose(choice.value)}
              ref={index === 0 ? firstChoice : undefined}
              type="button"
            >
              <span aria-hidden="true">{choice.symbol}</span>
              {choice.label}
            </button>
          ))}
        </div>
        <button className="promotion-cancel" onClick={onCancel} type="button">Cancel</button>
      </section>
    </div>
  )
}
