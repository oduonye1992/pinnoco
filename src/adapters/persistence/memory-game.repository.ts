import type { ChessSessionState } from '../../domains/session/session.types'
import type { GameRepository } from '../../ports/game-repository.port'
import { success, type Result } from '../../shared/result'

export class MemoryGameRepository implements GameRepository {
  constructor(private state: ChessSessionState | null = null) {}

  clear(): void {
    this.state = null
  }

  load(): ChessSessionState | null {
    return this.state
  }

  save(state: ChessSessionState): Result<void> {
    this.state = state
    return success(undefined)
  }
}
