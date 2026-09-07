import { createGameSession } from '../../domains/game/game.model'
import type { ChessSessionState } from '../../domains/session/session.types'
import type { ChessRulesPort } from '../../ports/chess-rules.port'
import { domainError } from '../../shared/domain-error'
import type { IdFactory } from '../../shared/identifiers'
import { failure, success, type Result } from '../../shared/result'
import { validateRevision } from './command-guards'
import type { SetScenarioCommand, SessionCommandOutcome } from './command.types'

export function setScenario(
  state: ChessSessionState,
  command: SetScenarioCommand,
  rules: ChessRulesPort,
  createIdentifier: IdFactory,
): Result<SessionCommandOutcome> {
  const revision = validateRevision(state, command.source, command.expectedRevision)
  if (!revision.ok) return revision

  const inspection = rules.inspect(command.fen)
  if (!inspection.ok) return inspection
  if (inspection.value.gameOver) {
    return failure(domainError('INVALID_POSITION', 'Choose a scenario with a legal move.'))
  }
  if (inspection.value.turn !== command.turn) {
    return failure(domainError('INVALID_POSITION', 'The scenario turn does not match the board position.'))
  }

  const title = command.title.trim() || 'Chess scenario'
  const freshGame = createGameSession(
    inspection.value.fen,
    state.game.participants,
    inspection.value.turn,
    createIdentifier,
    title,
  )

  return success({
    announcement: `${title} is ready. ${inspection.value.turn === 'white' ? 'White' : 'Black'} to move.`,
    data: { kind: 'scenarioSet', title, turn: inspection.value.turn },
    state: {
      analysis: null,
      game: {
        ...freshGame,
        inCheck: inspection.value.inCheck,
        status: inspection.value.status,
      },
      revision: state.revision + 1,
      schemaVersion: state.schemaVersion,
    },
  })
}
