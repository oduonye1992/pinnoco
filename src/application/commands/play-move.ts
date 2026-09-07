import { appendGameTransition, authorizeMove } from '../../domains/game/game.model'
import type { ChessSessionState } from '../../domains/session/session.types'
import type { ChessRulesPort } from '../../ports/chess-rules.port'
import type { IdFactory } from '../../shared/identifiers'
import { success, type Result } from '../../shared/result'
import { validateRevision } from './command-guards'
import type { PlayMoveCommand, SessionCommandOutcome } from './command.types'

export function playMove(
  state: ChessSessionState,
  command: PlayMoveCommand,
  rules: ChessRulesPort,
  createIdentifier: IdFactory,
): Result<SessionCommandOutcome> {
  const revision = validateRevision(state, command.source, command.expectedRevision)
  if (!revision.ok) return revision

  const authorization = authorizeMove(state.game, command.actor)
  if (!authorization.ok) return authorization

  const currentPosition = state.game.nodes[state.game.currentNodeId]
  const transition = rules.play(currentPosition.fen, command.move)
  if (!transition.ok) return transition

  const game = appendGameTransition(state.game, transition.value, createIdentifier)
  const nextPlayer = game.turn === 'white' ? 'White' : 'Black'
  const announcement = game.status === 'active'
    ? `${transition.value.move.san} was played. ${nextPlayer} to move.`
    : `${transition.value.move.san} was played. The game is over.`

  return success({
    announcement,
    data: { kind: 'movePlayed', move: transition.value.move },
    state: {
      ...state,
      game,
      revision: state.revision + 1,
    },
  })
}
