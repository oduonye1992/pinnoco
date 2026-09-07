import { describe, expect, it } from 'vitest'
import { OnboardingPreferencesRepository } from '../src/adapters/persistence/onboarding.repository'
import { ResilientGameRepository } from '../src/adapters/persistence/resilient-game.repository'
import { ChessJsRulesAdapter } from '../src/adapters/chess/chessjs-rules.adapter'
import { createInitialSession } from '../src/application/create-session'
import type { ChessSessionState } from '../src/domains/session/session.types'
import type { GameRepository } from '../src/ports/game-repository.port'
import { domainError } from '../src/shared/domain-error'
import { failure } from '../src/shared/result'
import { createDeterministicIds } from './helpers'

class FailingRepository implements GameRepository {
  clear(): void { throw new Error('Storage is blocked') }

  load(): ChessSessionState | null {
    throw new Error('Storage is blocked')
  }

  save() {
    return failure(domainError('PERSISTENCE_ERROR', 'Storage is blocked'))
  }
}

class FailingStorage implements Storage {
  readonly length = 0
  clear(): void { throw new Error('Storage is blocked') }
  getItem(): string | null { throw new Error('Storage is blocked') }
  key(): string | null { throw new Error('Storage is blocked') }
  removeItem(): void { throw new Error('Storage is blocked') }
  setItem(): void { throw new Error('Storage is blocked') }
}

describe('storage resilience', () => {
  it('keeps saving in memory after persistent storage fails', () => {
    const repository = new ResilientGameRepository(new FailingRepository())
    const state = createInitialSession(new ChessJsRulesAdapter(), createDeterministicIds())

    expect(repository.load()).toBeNull()
    expect(repository.save(state).ok).toBe(true)
    expect(repository.load()).toEqual(state)
  })

  it('keeps onboarding usable when browser storage is blocked', () => {
    const repository = new OnboardingPreferencesRepository(new FailingStorage())

    expect(repository.hasCompleted()).toBe(false)
    repository.complete()
    expect(repository.hasCompleted()).toBe(true)
    repository.reset()
    expect(repository.hasCompleted()).toBe(false)
  })
})
