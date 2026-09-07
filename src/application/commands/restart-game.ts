import { createGameSession } from '../../domains/game/game.model'
import type { ChessSessionState } from '../../domains/session/session.types'
import type { ChessRulesPort } from '../../ports/chess-rules.port'
import type { IdFactory } from '../../shared/identifiers'
import { success, type Result } from '../../shared/result'
import { validateRevision } from './command-guards'
import type { RestartGameCommand, SessionCommandOutcome } from './command.types'

export function restartGame(
  state: ChessSessionState,
  command: RestartGameCommand,
  rules: ChessRulesPort,
  createIdentifier: IdFactory,
): Result<SessionCommandOutcome> {
  const revision = validateRevision(state, command.source, command.expectedRevision)
  if (!revision.ok) return revision

  const game = createGameSession(
    rules.initialFen(),
    state.game.participants,
    'white',
    createIdentifier,
  )

  return success({
    announcement: 'A new game is ready. White to move.',
    data: { kind: 'gameRestarted' },
    state: {
      analysis: null,
      game,
      revision: state.revision + 1,
      schemaVersion: state.schemaVersion,
    },
  })
}
