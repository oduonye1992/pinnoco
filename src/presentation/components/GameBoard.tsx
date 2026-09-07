import { useEffect, useMemo, useState } from 'react'
import type { ChessSessionStore } from '../../application/chess-session.store'
import { getGamePath } from '../../domains/game/game.model'
import type { BoardSquare, CoordinateMoveInput, GameSession, PositionNode, PromotionPiece } from '../../domains/game/game.types'
import { ChessBoard } from './ChessBoard'
import { PromotionPicker } from './PromotionPicker'
import { TimelineControls } from './TimelineControls'

interface GameBoardProps {
  game: GameSession
  previewPosition?: PositionNode | null
  store: ChessSessionStore
}

export function GameBoard({ game, previewPosition = null, store }: GameBoardProps) {
  const path = useMemo(() => getGamePath(game), [game])
  const [cursor, setCursor] = useState(path.length - 1)
  const [moving, setMoving] = useState(false)
  const [promotionMove, setPromotionMove] = useState<Omit<CoordinateMoveInput, 'promotion'> | null>(null)
  const [selected, setSelected] = useState<BoardSquare | null>(null)
  const activeCursor = Math.min(Math.max(cursor, 0), path.length - 1)
  const position = path[activeCursor]
  const displayPosition = previewPosition ?? position
  const pieces = useMemo(() => store.getBoard(displayPosition.fen), [displayPosition.fen, store])
  const latest = activeCursor === path.length - 1
  const openingHint = !previewPosition
    && latest
    && path.length === 1
    && game.turn === game.participants.humanColor
  const visibleSelected = selected ?? (openingHint ? 'e2' : null)
  const legalTargets = visibleSelected === 'e2' ? ['e3', 'e4'] as BoardSquare[] : []
  const interactive = !previewPosition
    && latest
    && game.status === 'active'
    && game.turn === game.participants.humanColor
    && !moving
  const liveStatus = game.status === 'checkmate'
    ? 'Checkmate'
    : game.status === 'draw'
      ? 'Draw'
      : game.turn === game.participants.humanColor
        ? 'Your turn'
        : 'Codex to move'
  const gameMessage = latest
    ? game.turn === game.participants.humanColor
      ? 'Make a move. Codex will see it.'
      : 'Codex is up next.'
    : 'Use the arrows to review each move.'
  useEffect(() => {
    setCursor(path.length - 1)
    setPromotionMove(null)
    setSelected(null)
  }, [game.currentNodeId, path.length])

  const play = (move: CoordinateMoveInput) => {
    setMoving(true)
    void store.dispatch({
      actor: 'human',
      move,
      source: 'human',
      type: 'playMove',
    }).then((result) => {
      if (result.ok) {
        setSelected(null)
        if (result.value.data.kind === 'movePlayed') {
          window.dispatchEvent(new CustomEvent('pinnoco:move', {
            detail: { actor: 'human', move: result.value.data.move, revision: result.value.state.revision },
          }))
        }
      }
      setMoving(false)
    })
  }

  const handleSquare = (square: BoardSquare) => {
    if (!interactive) return
    const piece = pieces.find((candidate) => candidate.square === square)

    if (!selected) {
      if (openingHint && (square === 'e3' || square === 'e4')) {
        play({ from: 'e2', to: square })
        return
      }
      if (piece?.color === game.participants.humanColor) setSelected(square)
      return
    }

    const selectedPiece = pieces.find((candidate) => candidate.square === selected)
    const promotionRank = game.participants.humanColor === 'white' ? '8' : '1'
    if (selectedPiece?.kind === 'pawn' && square.endsWith(promotionRank)) {
      setPromotionMove({ from: selected, to: square })
      return
    }

    play({ from: selected, to: square })
    if (piece?.color === game.participants.humanColor) setSelected(square)
  }

  const promote = (promotion: PromotionPiece) => {
    if (!promotionMove) return
    const move = { ...promotionMove, promotion }
    setPromotionMove(null)
    play(move)
  }

  return (
    <section className={`board-panel live-panel ${previewPosition ? 'previewing' : ''}`} aria-labelledby="game-label">
      <div className="board-column">
        <ChessBoard
          interactive={interactive}
          interactiveColor={game.participants.humanColor}
          label="Live chess board"
          lastMove={previewPosition ? null : displayPosition.move}
          onSquare={handleSquare}
          pieces={pieces}
          scenario={Boolean(previewPosition)}
          legalTargets={legalTargets}
          selected={visibleSelected}
          showCastlePreview={Boolean(previewPosition)}
          showInfluence={Boolean(previewPosition)}
        />
      </div>
      {previewPosition ? (
        <aside className="game-console preview-console">
          <div className="game-heading">
            <div><p>Future position</p><h1 id="game-label">{previewPosition.move?.san}</h1></div>
          </div>
          <div className="position-context"><div><span>Next step</span><strong>Ask Codex about this line.</strong></div></div>
        </aside>
      ) : <aside className="game-console">
        <div className="game-heading">
          <div>
            <p>{latest ? (game.scenarioTitle ?? (openingHint ? 'White to play' : 'Live game')) : 'Past position'}</p>
            <h1 id="game-label">{latest ? liveStatus : position.move?.san || 'Start'}</h1>
          </div>
        </div>
        <p className="game-intro">{gameMessage}</p>
        <TimelineControls
          current={activeCursor}
          label="Game history"
          onChange={(step) => {
            setCursor(Math.min(Math.max(step, 0), path.length - 1))
            setSelected(null)
          }}
          positions={path}
        />
      </aside>}
      {promotionMove ? (
        <PromotionPicker
          onCancel={() => setPromotionMove(null)}
          onChoose={promote}
        />
      ) : null}
    </section>
  )
}
