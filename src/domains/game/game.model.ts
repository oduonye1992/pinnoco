import { domainError } from '../../shared/domain-error'
import type { IdFactory } from '../../shared/identifiers'
import { failure, success, type Result } from '../../shared/result'
import type {
  GameParticipants,
  GameSession,
  GameStatus,
  MoveActor,
  PieceColor,
  PositionNode,
  ChessMove,
} from './game.types'

export interface GameTransition {
  fen: string
  inCheck: boolean
  move: ChessMove
  status: GameStatus
  turn: PieceColor
}

export function appendGameTransition(
  game: GameSession,
  transition: GameTransition,
  createIdentifier: IdFactory,
): GameSession {
  const parent = game.nodes[game.currentNodeId]
  const nodeId = createIdentifier('position')
  const node: PositionNode = {
    children: [],
    fen: transition.fen,
    id: nodeId,
    move: transition.move,
    parentId: parent.id,
    ply: parent.ply + 1,
  }

  return {
    ...game,
    currentNodeId: nodeId,
    inCheck: transition.inCheck,
    nodes: {
      ...game.nodes,
      [parent.id]: { ...parent, children: [...parent.children, nodeId] },
      [nodeId]: node,
    },
    status: transition.status,
    turn: transition.turn,
  }
}

export function authorizeMove(game: GameSession, actor: MoveActor): Result<void> {
  if (game.status !== 'active') {
    return failure(domainError('INVALID_POSITION', 'The game is already over.'))
  }

  if (actor === 'agent' && game.participants.agentMode === 'teacher') {
    return failure(domainError('NOT_AUTHORIZED', 'The agent is teaching and is not an opponent in this game.'))
  }

  const authorizedColor = actor === 'agent'
    ? game.participants.agentColor
    : game.participants.humanColor

  if (authorizedColor !== game.turn) {
    return failure(domainError('WRONG_TURN', `It is ${game.turn}'s turn.`))
  }

  return success(undefined)
}

export function createGameSession(
  fen: string,
  participants: GameParticipants,
  turn: PieceColor,
  createIdentifier: IdFactory,
  scenarioTitle?: string,
): GameSession {
  const gameId = createIdentifier('game')
  const rootNodeId = createIdentifier('position')

  return {
    currentNodeId: rootNodeId,
    id: gameId,
    inCheck: false,
    nodes: {
      [rootNodeId]: {
        children: [],
        fen,
        id: rootNodeId,
        move: null,
        parentId: null,
        ply: 0,
      },
    },
    participants,
    rootNodeId,
    ...(scenarioTitle ? { scenarioTitle } : {}),
    status: 'active',
    turn,
  }
}

export function getGamePath(game: GameSession): PositionNode[] {
  return getPathToNode(game.nodes, game.currentNodeId)
}

export function getPathToNode(
  nodes: Record<string, PositionNode>,
  nodeId: string,
): PositionNode[] {
  const path: PositionNode[] = []
  let current = nodes[nodeId]

  while (current) {
    path.push(current)
    if (!current.parentId) break
    current = nodes[current.parentId]
  }

  return path.reverse()
}
