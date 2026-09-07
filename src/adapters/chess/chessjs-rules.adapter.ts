import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import type { ChessRulesPort, PositionInspection, RulesTransition } from '../../ports/chess-rules.port'
import { domainError } from '../../shared/domain-error'
import { failure, success, type Result } from '../../shared/result'
import type {
  BoardPiece,
  BoardSquare,
  MoveInput,
  PieceColor,
  PieceKind,
} from '../../domains/game/game.types'

const colors: Record<Color, PieceColor> = { b: 'black', w: 'white' }
const pieces: Record<PieceSymbol, PieceKind> = {
  b: 'bishop',
  k: 'king',
  n: 'knight',
  p: 'pawn',
  q: 'queen',
  r: 'rook',
}

function getStatus(game: Chess) {
  if (game.isCheckmate()) return 'checkmate' as const
  if (game.isDraw()) return 'draw' as const
  return 'active' as const
}

function readPieces(game: Chess): BoardPiece[] {
  return game.board().flatMap((rank) => rank.flatMap((piece) => piece
    ? [{
        color: colors[piece.color],
        kind: pieces[piece.type],
        square: piece.square as BoardSquare,
      }]
    : []))
}

export class ChessJsRulesAdapter implements ChessRulesPort {
  initialFen(): string {
    return new Chess().fen()
  }

  inspect(fen: string): Result<PositionInspection> {
    try {
      const game = new Chess(fen)
      return success({
        fen: game.fen(),
        gameOver: game.isGameOver(),
        inCheck: game.inCheck(),
        legalMoves: game.moves(),
        pieces: readPieces(game),
        status: getStatus(game),
        turn: colors[game.turn()],
      })
    } catch {
      return failure(domainError('INVALID_POSITION', 'The chess position is not valid.'))
    }
  }

  isValidFen(fen: unknown): fen is string {
    if (typeof fen !== 'string') return false
    return this.inspect(fen).ok
  }

  play(fen: string, input: MoveInput): Result<RulesTransition> {
    try {
      const game = new Chess(fen)
      const requestedMove = typeof input === 'string'
        ? input
        : {
            from: input.from as Square,
            promotion: input.promotion || 'q',
            to: input.to as Square,
          }
      const move = game.move(requestedMove as Parameters<Chess['move']>[0], { strict: false })

      if (!move) {
        return failure(domainError('ILLEGAL_MOVE', 'That move is not legal in this position.'))
      }

      return success({
        fen: game.fen(),
        inCheck: game.inCheck(),
        move: {
          color: colors[move.color],
          from: move.from as BoardSquare,
          promotion: move.promotion ? pieces[move.promotion] : undefined,
          san: move.san,
          to: move.to as BoardSquare,
          uci: `${move.from}${move.to}${move.promotion || ''}`,
        },
        status: getStatus(game),
        turn: colors[game.turn()],
      })
    } catch {
      return failure(domainError('ILLEGAL_MOVE', 'That move is not legal in this position.'))
    }
  }
}
