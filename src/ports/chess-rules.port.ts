import type { DomainError } from '../shared/domain-error'
import type { Result } from '../shared/result'
import type {
  BoardPiece,
  ChessMove,
  GameStatus,
  MoveInput,
  PieceColor,
} from '../domains/game/game.types'

export interface PositionInspection {
  fen: string
  gameOver: boolean
  inCheck: boolean
  legalMoves: string[]
  pieces: BoardPiece[]
  status: GameStatus
  turn: PieceColor
}

export interface RulesTransition {
  fen: string
  inCheck: boolean
  move: ChessMove
  status: GameStatus
  turn: PieceColor
}

export interface ChessRulesPort {
  initialFen(): string
  inspect(fen: string): Result<PositionInspection>
  isValidFen(fen: unknown): fen is string
  play(fen: string, input: MoveInput): Result<RulesTransition>
}

export type ChessRulesError = DomainError
