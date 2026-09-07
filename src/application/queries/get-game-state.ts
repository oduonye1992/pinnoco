import { getGamePath } from '../../domains/game/game.model'
import type { ChessSessionState } from '../../domains/session/session.types'
import type { ChessRulesPort } from '../../ports/chess-rules.port'
import { CONTRACT_SCHEMA_VERSION } from '../../shared/contract-metadata'
import { getScenarioState } from './get-scenario-state'

export function getGameState(state: ChessSessionState, rules: ChessRulesPort) {
  const current = state.game.nodes[state.game.currentNodeId]
  const inspection = rules.inspect(current.fen)

  if (!inspection.ok) return inspection

  return {
    ok: true as const,
    value: {
      fen: current.fen,
      gameId: state.game.id,
      gameOver: inspection.value.gameOver,
      history: getGamePath(state.game).slice(1).map((node) => node.move?.san).filter(Boolean),
      inCheck: state.game.inCheck,
      legalMoves: inspection.value.legalMoves,
      participants: state.game.participants,
      revision: state.revision,
      scenario: getScenarioState(state),
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      status: state.game.status,
      startingScenario: state.game.scenarioTitle ?? null,
      turn: state.game.turn,
    },
  }
}
