import type { ChessSessionState } from '../domains/session/session.types'
import type { Result } from '../shared/result'

export interface GameRepository {
  clear(): void
  load(): ChessSessionState | null
  save(state: ChessSessionState): Result<void>
}
