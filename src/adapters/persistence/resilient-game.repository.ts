import type { ChessSessionState } from '../../domains/session/session.types'
import type { GameRepository } from '../../ports/game-repository.port'
import { success, type Result } from '../../shared/result'

export class ResilientGameRepository implements GameRepository {
  private primaryAvailable = true
  private state: ChessSessionState | null = null

  constructor(private readonly primary: GameRepository | null) {}

  clear(): void {
    this.state = null
    if (!this.primary || !this.primaryAvailable) return

    try {
      this.primary.clear()
    } catch {
      this.primaryAvailable = false
    }
  }

  load(): ChessSessionState | null {
    if (!this.primary || !this.primaryAvailable) return this.state

    try {
      const loaded = this.primary.load()
      if (loaded) this.state = loaded
      return loaded
    } catch {
      this.primaryAvailable = false
      return this.state
    }
  }

  save(state: ChessSessionState): Result<void> {
    this.state = state
    if (!this.primary || !this.primaryAvailable) return success(undefined)

    try {
      const saved = this.primary.save(state)
      if (saved.ok) return saved
    } catch {
      // The in-memory copy below keeps the game playable for this page session.
    }

    this.primaryAvailable = false
    return success(undefined)
  }
}
