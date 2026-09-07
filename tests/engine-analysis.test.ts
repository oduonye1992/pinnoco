import { describe, expect, it } from 'vitest'
import { createTools } from '../src/adapters/agent/tools'
import type { EngineLine, EnginePort } from '../src/ports/engine.port'
import { getGameHistory } from '../src/application/queries/get-game-history'
import { success } from '../src/shared/result'
import { createTestApplication } from './helpers'

class FakeEngine implements EnginePort {
  constructor(private readonly lines: EngineLine[]) {}

  analyze(_fen: string, _options: { lines: number; timeMs: number }, _signal: AbortSignal) {
    return Promise.resolve(success(this.lines))
  }
}

describe('Stockfish advisor', () => {
  it('returns SAN candidate lines without changing the live game', async () => {
    const { store } = createTestApplication()
    const tool = createTools(store, new FakeEngine([
      { evaluation: 0.2, moves: ['e2e4', 'c7c5'] },
      { evaluation: 0.1, moves: ['d2d4', 'd7d5'] },
    ])).find(({ name }) => name === 'pinnoco_analyze_position')

    const result = await tool?.execute({ expectedRevision: 0, lines: 2, timeMs: 500 })
    const payload = JSON.parse(result?.content[0].text || '{}')

    expect(result?.isError).not.toBe(true)
    expect(payload.lines).toEqual([
      { evaluation: 0.2, moves: ['e4', 'c5'], uci: ['e2e4', 'c7c5'] },
      { evaluation: 0.1, moves: ['d4', 'd5'], uci: ['d2d4', 'd7d5'] },
    ])
    expect(payload.revision).toBe(0)
    expect(getGameHistory(store.getSnapshot().session)).toHaveLength(1)
  })

  it('rejects analysis based on an old revision', async () => {
    const { store } = createTestApplication()
    const tool = createTools(store, new FakeEngine([])).find(({ name }) => name === 'pinnoco_analyze_position')

    await store.dispatch({ actor: 'human', move: 'e4', source: 'human', type: 'playMove' })
    const result = await tool?.execute({ expectedRevision: 0 })
    const payload = JSON.parse(result?.content[0].text || '{}')

    expect(result?.isError).toBe(true)
    expect(payload.error.code).toBe('STALE_REVISION')
  })

  it('lets Codex commit its own reply after the human move', async () => {
    const { store } = createTestApplication()
    const tool = createTools(store).find(({ name }) => name === 'pinnoco_play_move')

    await store.dispatch({ actor: 'human', move: 'e4', source: 'human', type: 'playMove' })
    const result = await tool?.execute({ expectedRevision: 1, move: 'c5' })

    expect(result?.isError).not.toBe(true)
    expect(getGameHistory(store.getSnapshot().session).slice(1).map((node) => node.move?.san)).toEqual(['e4', 'c5'])
  })
})
