import { ChessJsRulesAdapter } from '../src/adapters/chess/chessjs-rules.adapter'
import { MemoryGameRepository } from '../src/adapters/persistence/memory-game.repository'
import { ChessSessionStore } from '../src/application/chess-session.store'
import { createInitialSession } from '../src/application/create-session'
import type { IdFactory } from '../src/shared/identifiers'

export function createDeterministicIds(): IdFactory {
  let next = 0
  return (prefix) => `${prefix}-${++next}`
}

export function createTestApplication() {
  const createIdentifier = createDeterministicIds()
  const repository = new MemoryGameRepository()
  const rules = new ChessJsRulesAdapter()
  const state = createInitialSession(rules, createIdentifier)
  const store = new ChessSessionStore(state, repository, rules, createIdentifier)
  return { createIdentifier, repository, rules, state, store }
}
