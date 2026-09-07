import type { ChessSessionState } from '../../domains/session/session.types'
import { success, type Result } from '../../shared/result'
import { validateRevision } from './command-guards'
import type { ClearScenarioCommand, SessionCommandOutcome } from './command.types'

export function clearScenario(
  state: ChessSessionState,
  command: ClearScenarioCommand,
): Result<SessionCommandOutcome> {
  const revision = validateRevision(state, command.source, command.expectedRevision)
  if (!revision.ok) return revision

  return success({
    announcement: 'The scenario is closed.',
    data: { kind: 'scenarioCleared' },
    state: state.analysis
      ? { ...state, analysis: null, revision: state.revision + 1 }
      : state,
  })
}
