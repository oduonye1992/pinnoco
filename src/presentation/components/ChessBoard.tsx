import { useRef, useState } from 'react'
import type {
  BoardFile,
  BoardPiece,
  BoardRank,
  BoardSquare,
  ChessMove,
} from '../../domains/game/game.types'
import { ChessPiece } from './ChessPiece'

const files: BoardFile[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const ranks: BoardRank[] = ['8', '7', '6', '5', '4', '3', '2', '1']
interface ChessBoardProps {
  ghostPieces?: BoardPiece[]
  interactive?: boolean
  interactiveColor?: BoardPiece['color']
  legalTargets?: BoardSquare[]
  label: string
  lastMove?: ChessMove | null
  onSquare?: (square: BoardSquare) => void
  pieces: BoardPiece[]
  scenario?: boolean
  selected?: BoardSquare | null
  showCastlePreview?: boolean
  showInfluence?: boolean
}

interface DragState {
  piece: BoardPiece
  square: BoardSquare
  x: number
  y: number
}

function squareCenter(square: BoardSquare) {
  const file = files.indexOf(square[0] as BoardFile)
  const rank = ranks.indexOf(square[1] as BoardRank)
  return { x: (file * 100) + 50, y: (rank * 100) + 50 }
}

function squareAtPoint(
  board: HTMLDivElement,
  clientX: number,
  clientY: number,
): { square: BoardSquare; x: number; y: number } | null {
  const bounds = board.getBoundingClientRect()
  const x = clientX - bounds.left
  const y = clientY - bounds.top
  if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) return null

  const fileIndex = Math.min(files.length - 1, Math.floor((x / bounds.width) * files.length))
  const rankIndex = Math.min(ranks.length - 1, Math.floor((y / bounds.height) * ranks.length))
  return {
    square: `${files[fileIndex]}${ranks[rankIndex]}`,
    x,
    y,
  }
}

export function ChessBoard({
  ghostPieces = [],
  interactive = false,
  interactiveColor = 'white',
  legalTargets = [],
  label,
  lastMove,
  onSquare,
  pieces,
  scenario = false,
  selected,
  showCastlePreview = false,
  showInfluence = false,
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const draggedRef = useRef(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dropSquare, setDropSquare] = useState<BoardSquare | null>(null)
  const pieceBySquare = new Map(pieces.map((piece) => [piece.square, piece]))
  const ghostBySquare = new Map(ghostPieces.map((piece) => [piece.square, piece]))
  const moveFrom = lastMove ? squareCenter(lastMove.from) : null
  const moveTo = lastMove ? squareCenter(lastMove.to) : null
  const moveLength = moveFrom && moveTo ? Math.hypot(moveTo.x - moveFrom.x, moveTo.y - moveFrom.y) : 0
  const unitX = moveFrom && moveTo && moveLength ? (moveTo.x - moveFrom.x) / moveLength : 0
  const unitY = moveFrom && moveTo && moveLength ? (moveTo.y - moveFrom.y) / moveLength : 0
  const finishDrag = (clientX: number, clientY: number) => {
    if (!drag || !boardRef.current) return
    const target = squareAtPoint(boardRef.current, clientX, clientY)?.square ?? null
    const shouldPlay = target !== null && target !== drag.square
    setDrag(null)
    setDropSquare(null)
    if (shouldPlay) onSquare?.(target)
  }
  const boardWidth = boardRef.current?.getBoundingClientRect().width ?? 0
  const dragSize = boardWidth / 8

  return (
    <div className={`board-frame ${scenario ? 'scenario-board' : ''}`}>
      <div aria-hidden="true" className="rank-axis">
        {ranks.map((rank) => <span key={rank}>{rank}</span>)}
      </div>
      <div
        aria-label={label}
        className={`chess-board ${interactive ? 'interactive' : ''}`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setDrag(null)
            setDropSquare(null)
          }
        }}
        onPointerCancel={() => {
          setDrag(null)
          setDropSquare(null)
        }}
        onPointerMove={(event) => {
          if (!drag || !boardRef.current) return
          const point = squareAtPoint(boardRef.current, event.clientX, event.clientY)
          if (!point) return
          if (Math.hypot(point.x - drag.x, point.y - drag.y) > 5) draggedRef.current = true
          setDrag((current) => current ? { ...current, x: point.x, y: point.y } : current)
          setDropSquare(point.square)
        }}
        onPointerUp={(event) => finishDrag(event.clientX, event.clientY)}
        ref={boardRef}
        role="grid"
      >
        {moveFrom && moveTo ? (
          <svg aria-hidden="true" className={`move-vector ${showInfluence ? 'study-marker' : ''}`} viewBox="0 0 800 800">
            <defs>
              <marker id="study-arrow" markerHeight="5" markerWidth="5" orient="auto" refX="4" refY="2.5">
                <path d="M0 0v5l4.5-2.5Z" />
              </marker>
            </defs>
            <rect className="move-square move-from" height="100" width="100" x={moveFrom.x - 50} y={moveFrom.y - 50} />
            <rect className="move-square move-to" height="100" width="100" x={moveTo.x - 50} y={moveTo.y - 50} />
            {showInfluence ? <line className="study-path" markerEnd="url(#study-arrow)" x1={moveFrom.x + (unitX * 40)} x2={moveTo.x - (unitX * 42)} y1={moveFrom.y + (unitY * 40)} y2={moveTo.y - (unitY * 42)} /> : null}
          </svg>
        ) : null}
        {showCastlePreview ? (
          <svg aria-hidden="true" className="future-vectors" viewBox="0 0 800 800">
            <defs>
              <marker id="future-arrow" markerHeight="4" markerWidth="4" orient="auto" refX="3.5" refY="2">
                <path d="M0 0v4l4-2Z" />
              </marker>
            </defs>
            <path d="M454 28 H646" markerEnd="url(#future-arrow)" />
            <path d="M746 72 H554" markerEnd="url(#future-arrow)" />
          </svg>
        ) : null}
        {ranks.flatMap((rank, rankIndex) => files.map((file, fileIndex) => {
        const square: BoardSquare = `${file}${rank}`
        const piece = pieceBySquare.get(square)
        const ghostPiece = ghostBySquare.get(square)
        const active = selected === square
        return (
          <button
            aria-label={`${square}${piece ? `, ${piece.color} ${piece.kind}` : ', empty'}`}
            className={`square ${(rankIndex + fileIndex) % 2 === 0 ? 'light' : 'dark'} ${active ? 'selected' : ''} ${dropSquare === square ? 'drag-target' : ''}`}
            data-square={square}
            disabled={!interactive}
            key={square}
            onClick={() => interactive && onSquare?.(square)}
            role="gridcell"
            type="button"
          >
            {legalTargets.includes(square) ? <span aria-hidden="true" className={`legal-hint ${square === 'e4' ? 'recommended' : 'optional'}`} /> : null}
            {fileIndex === 0 ? <span aria-hidden="true" className="inside-rank">{rank}</span> : null}
            {rankIndex === ranks.length - 1 ? <span aria-hidden="true" className="inside-file">{file}</span> : null}
            {piece ? (
              <span
                className={`piece piece-${piece.kind} ${piece.color === 'white' ? 'white-piece' : 'black-piece'} ${drag?.square === square ? 'drag-source' : ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  if (!draggedRef.current) onSquare?.(square)
                }}
                onDragStart={(event) => event.preventDefault()}
                onPointerDown={(event) => {
                  if (!interactive || event.button !== 0 || piece.color !== interactiveColor) return
                  event.preventDefault()
                  event.stopPropagation()
                  draggedRef.current = false
                  const point = boardRef.current
                    ? squareAtPoint(boardRef.current, event.clientX, event.clientY)
                    : null
                  if (!point) return
                  setDrag({ piece, square, x: point.x, y: point.y })
                  setDropSquare(square)
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
              >
                <ChessPiece color={piece.color} kind={piece.kind} />
              </span>
            ) : null}
            {ghostPiece ? <span className={`piece ghost-piece piece-${ghostPiece.kind} ${ghostPiece.color}-piece`}><ChessPiece color={ghostPiece.color} kind={ghostPiece.kind} /></span> : null}
          </button>
        )
        }))}
        {drag && dragSize ? (
          <span
            aria-hidden="true"
            className={`drag-piece piece piece-${drag.piece.kind} ${drag.piece.color === 'white' ? 'white-piece' : 'black-piece'}`}
            style={{ height: dragSize, left: drag.x - (dragSize / 2), top: drag.y - (dragSize / 2), width: dragSize }}
          >
            <ChessPiece color={drag.piece.color} kind={drag.piece.kind} />
          </span>
        ) : null}
      </div>
      <div aria-hidden="true" className="file-axis">
        {files.map((file) => <span key={file}>{file}</span>)}
      </div>
    </div>
  )
}
