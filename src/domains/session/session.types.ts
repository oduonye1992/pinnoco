import type { AnalysisWorkspace } from '../analysis/analysis.types'
import type { GameSession } from '../game/game.types'

export const SESSION_SCHEMA_VERSION = 1

export interface ChessSessionState {
  analysis: AnalysisWorkspace | null
  game: GameSession
  revision: number
  schemaVersion: number
}
