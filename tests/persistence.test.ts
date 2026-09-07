import { describe, expect, it } from 'vitest'
import { LocalStorageGameRepository, type StorageLike } from '../src/adapters/persistence/local-storage-game.repository'
import { ChessJsRulesAdapter } from '../src/adapters/chess/chessjs-rules.adapter'
import { createInitialSession, migrateLegacySession } from '../src/application/create-session'
import { createAnalysisWorkspace } from '../src/domains/analysis/analysis.model'
import { appendGameTransition } from '../src/domains/game/game.model'
import { createDeterministicIds } from './helpers'

class TestStorage implements StorageLike {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

describe('LocalStorageGameRepository', () => {
  it('round-trips a validated session document', () => {
    const ids = createDeterministicIds()
    const rules = new ChessJsRulesAdapter()
    const storage = new TestStorage()
    const repository = new LocalStorageGameRepository(storage, rules, (legacy) => migrateLegacySession(legacy, rules, ids))
    const state = createInitialSession(rules, ids)

    expect(repository.save(state).ok).toBe(true)
    expect(repository.load()).toEqual(state)
  })

  it('clears the current and legacy session documents', () => {
    const ids = createDeterministicIds()
    const rules = new ChessJsRulesAdapter()
    const storage = new TestStorage()
    const repository = new LocalStorageGameRepository(storage, rules, (legacy) => migrateLegacySession(legacy, rules, ids))
    const state = createInitialSession(rules, ids)

    repository.save(state)
    storage.setItem('pinnoco:board:v1', JSON.stringify({ history: [], liveFen: rules.initialFen() }))
    repository.clear()

    expect(repository.load()).toBeNull()
  })

  it('rejects a corrupt current document', () => {
    const ids = createDeterministicIds()
    const rules = new ChessJsRulesAdapter()
    const storage = new TestStorage()
    storage.setItem('pinnoco:document:v1', JSON.stringify({ revision: 1, schemaVersion: 1 }))
    const repository = new LocalStorageGameRepository(storage, rules, (legacy) => migrateLegacySession(legacy, rules, ids))

    expect(repository.load()).toBeNull()
  })

  it('migrates the previous board format', () => {
    const ids = createDeterministicIds()
    const rules = new ChessJsRulesAdapter()
    const storage = new TestStorage()
    const initial = createInitialSession(rules, ids)
    const transition = rules.play(rules.initialFen(), 'e4')
    if (!transition.ok) throw new Error('Test move failed')
    const game = appendGameTransition(initial.game, transition.value, ids)
    storage.setItem('pinnoco:board:v1', JSON.stringify({
      history: ['e4'],
      liveFen: game.nodes[game.currentNodeId].fen,
      scenario: { steps: [{ san: 'e5' }, { san: 'Nf3' }], title: 'A reply' },
      version: 1,
    }))
    const repository = new LocalStorageGameRepository(storage, rules, (legacy) => migrateLegacySession(legacy, rules, ids))
    const migrated = repository.load()

    expect(migrated?.game.nodes[migrated.game.currentNodeId].fen).toBe(game.nodes[game.currentNodeId].fen)
    expect(migrated?.analysis?.title).toBe('A reply')
  })

  it('rejects a position whose move does not produce its stored FEN', () => {
    const ids = createDeterministicIds()
    const rules = new ChessJsRulesAdapter()
    const storage = new TestStorage()
    const state = createInitialSession(rules, ids)
    const transition = rules.play(rules.initialFen(), 'e4')
    if (!transition.ok) throw new Error('Test move failed')
    const game = appendGameTransition(state.game, transition.value, ids)
    const current = game.nodes[game.currentNodeId]
    const corrupt = {
      ...state,
      game: {
        ...game,
        nodes: {
          ...game.nodes,
          [current.id]: { ...current, fen: rules.initialFen() },
        },
      },
      revision: 1,
    }
    storage.setItem('pinnoco:document:v1', JSON.stringify(corrupt))
    const repository = new LocalStorageGameRepository(storage, rules, (legacy) => migrateLegacySession(legacy, rules, ids))

    expect(repository.load()).toBeNull()
  })

  it('rejects a scenario whose root does not match its source game node', () => {
    const ids = createDeterministicIds()
    const rules = new ChessJsRulesAdapter()
    const storage = new TestStorage()
    const state = createInitialSession(rules, ids)
    const gameMove = rules.play(rules.initialFen(), 'e4')
    const scenarioMove = rules.play(rules.initialFen(), 'd4')
    if (!gameMove.ok || !scenarioMove.ok) throw new Error('Test move failed')
    const game = appendGameTransition(state.game, gameMove.value, ids)
    const analysis = createAnalysisWorkspace(
      rules.initialFen(),
      game.currentNodeId,
      game.nodes[game.currentNodeId].ply,
      'Wrong source',
      [scenarioMove.value],
      ids,
    )
    storage.setItem('pinnoco:document:v1', JSON.stringify({
      ...state,
      analysis,
      game,
      revision: 2,
    }))
    const repository = new LocalStorageGameRepository(storage, rules, (legacy) => migrateLegacySession(legacy, rules, ids))

    expect(repository.load()).toBeNull()
  })
})
