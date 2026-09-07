import { createAnalysisWorkspace } from '../../domains/analysis/analysis.model'
import type { ChessSessionState } from '../../domains/session/session.types'
import type { ChessRulesPort, RulesTransition } from '../../ports/chess-rules.port'
import { domainError } from '../../shared/domain-error'
import type { IdFactory } from '../../shared/identifiers'
import { failure, success, type Result } from '../../shared/result'
import { validateRevision } from './command-guards'
import type { SessionCommandOutcome, ShowScenarioCommand } from './command.types'

export function showScenario(
  state: ChessSessionState,
  command: ShowScenarioCommand,
  rules: ChessRulesPort,
  createIdentifier: IdFactory,
): Result<SessionCommandOutcome> {
  const revision = validateRevision(state, command.source, command.expectedRevision)
  if (!revision.ok) return revision

  const line = command.line.map((move) => move.trim()).filter(Boolean)
  if (line.length === 0 || line.length > 8) {
    return failure(domainError('INVALID_INPUT', 'Give between one and eight moves to show.'))
  }

  const source = state.game.nodes[state.game.currentNodeId]
  const transitions: RulesTransition[] = []
  let fen = source.fen

  for (const move of line) {
    const transition = rules.play(fen, move)
    if (!transition.ok) return transition
    transitions.push(transition.value)
    fen = transition.value.fen
  }

  const analysis = createAnalysisWorkspace(
    source.fen,
    source.id,
    source.ply,
    command.title.trim() || 'Possible line',
    transitions,
    createIdentifier,
  )

  return success({
    announcement: `A scenario with ${line.length} ${line.length === 1 ? 'move' : 'moves'} is open.`,
    data: { analysis, kind: 'scenarioShown' },
    state: {
      ...state,
      analysis,
      revision: state.revision + 1,
    },
  })
}
