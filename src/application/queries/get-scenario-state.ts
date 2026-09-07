import { getAnalysisPath } from '../../domains/analysis/analysis.model'
import type { ChessSessionState } from '../../domains/session/session.types'
import { CONTRACT_SCHEMA_VERSION } from '../../shared/contract-metadata'

export function getScenarioState(state: ChessSessionState) {
  if (!state.analysis) return null

  return {
    gameId: state.game.id,
    line: getAnalysisPath(state.analysis).slice(1).map((node) => ({
      fen: node.fen,
      move: node.move,
      nodeId: node.id,
      ply: node.ply,
    })),
    revision: state.revision,
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    sourceGameNodeId: state.analysis.sourceGameNodeId,
    sourceMoveNumber: state.analysis.sourceMoveNumber,
    title: state.analysis.title,
  }
}
