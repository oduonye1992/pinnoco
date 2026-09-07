export type AgentMode = 'opponent' | 'opponentAndTeacher' | 'teacher'
export type BoardFile = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
export type BoardRank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
export type BoardSquare = `${BoardFile}${BoardRank}`
export type GameStatus = 'active' | 'checkmate' | 'draw'
export type MoveActor = 'agent' | 'human'
export type PieceColor = 'black' | 'white'
export type PieceKind = 'bishop' | 'king' | 'knight' | 'pawn' | 'queen' | 'rook'
export type PromotionPiece = 'b' | 'n' | 'q' | 'r'

export interface BoardPiece {
  color: PieceColor
  kind: PieceKind
  square: BoardSquare
}

export interface ChessMove {
  color: PieceColor
  from: BoardSquare
  promotion?: PieceKind
  san: string
  to: BoardSquare
  uci: string
}

export interface CoordinateMoveInput {
  from: string
  promotion?: PromotionPiece
  to: string
}

export interface GameParticipants {
  agentColor: PieceColor
  agentMode: AgentMode
  humanColor: PieceColor
}

export interface GameSession {
  currentNodeId: string
  id: string
  inCheck: boolean
  nodes: Record<string, PositionNode>
  participants: GameParticipants
  rootNodeId: string
  scenarioTitle?: string
  status: GameStatus
  turn: PieceColor
}

export type MoveInput = string | CoordinateMoveInput

export interface PositionNode {
  children: string[]
  fen: string
  id: string
  move: ChessMove | null
  parentId: string | null
  ply: number
}
