import { describe, expect, it } from 'vitest'
import { getGameHistory } from '../src/application/queries/get-game-history'
import { createTestApplication } from './helpers'

describe('ChessSessionStore', () => {
  it('enforces human and agent turns', async () => {
    const { store } = createTestApplication()

    const humanMove = await store.dispatch({ actor: 'human', move: 'e4', source: 'human', type: 'playMove' })
    expect(humanMove.ok).toBe(true)
    expect(store.getSnapshot().session.revision).toBe(1)

    const secondHumanMove = await store.dispatch({ actor: 'human', move: 'e5', source: 'human', type: 'playMove' })
    expect(secondHumanMove.ok).toBe(false)
    if (!secondHumanMove.ok) expect(secondHumanMove.error.code).toBe('WRONG_TURN')

    const agentMove = await store.dispatch({ actor: 'agent', expectedRevision: 1, move: 'e5', source: 'agent', type: 'playMove' })
    expect(agentMove.ok).toBe(true)
    expect(store.getSnapshot().session.game.turn).toBe('white')
  })

  it('serializes simultaneous commands and rejects stale revisions', async () => {
    const { store } = createTestApplication()
    await store.dispatch({ actor: 'human', move: 'e4', source: 'human', type: 'playMove' })

    const first = store.dispatch({ actor: 'agent', expectedRevision: 1, move: 'e5', source: 'agent', type: 'playMove' })
    const second = store.dispatch({ actor: 'agent', expectedRevision: 1, move: 'c5', source: 'agent', type: 'playMove' })
    const [firstResult, secondResult] = await Promise.all([first, second])

    expect(firstResult.ok).toBe(true)
    expect(secondResult.ok).toBe(false)
    if (!secondResult.ok) expect(secondResult.error.code).toBe('STALE_REVISION')
    expect(getGameHistory(store.getSnapshot().session).slice(1).map((node) => node.move?.san)).toEqual(['e4', 'e5'])
  })

  it('keeps a scenario rooted at its source when the live game advances', async () => {
    const { store } = createTestApplication()
    await store.dispatch({ actor: 'human', move: 'e4', source: 'human', type: 'playMove' })
    await store.dispatch({ actor: 'agent', expectedRevision: 1, move: 'e5', source: 'agent', type: 'playMove' })

    const scenario = await store.dispatch({
      expectedRevision: 2,
      line: ['Nf3', 'Nc6'],
      source: 'agent',
      title: 'Develop the knight',
      type: 'showScenario',
    })
    expect(scenario.ok).toBe(true)
    const sourceNodeId = store.getSnapshot().session.analysis?.sourceGameNodeId

    await store.dispatch({ actor: 'human', move: 'Nf3', source: 'human', type: 'playMove' })
    expect(store.getSnapshot().session.analysis?.sourceGameNodeId).toBe(sourceNodeId)
    expect(store.getSnapshot().session.analysis?.sourceMoveNumber).toBe(2)
  })

  it('requires a revision for every agent mutation', async () => {
    const { store } = createTestApplication()
    const result = await store.dispatch({
      line: ['e4'],
      source: 'agent',
      title: 'Opening idea',
      type: 'showScenario',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('INVALID_INPUT')
  })

  it('restarts the game and clears analysis', async () => {
    const { store } = createTestApplication()
    await store.dispatch({
      line: ['e4'],
      source: 'human',
      title: 'Opening idea',
      type: 'showScenario',
    })
    const restarted = await store.dispatch({ source: 'human', type: 'restartGame' })

    expect(restarted.ok).toBe(true)
    expect(store.getSnapshot().session.analysis).toBeNull()
    expect(getGameHistory(store.getSnapshot().session)).toHaveLength(1)
    expect(store.getSnapshot().session.game.turn).toBe('white')
  })

  it('resets the saved session to a fresh opening position', async () => {
    const { store, repository } = createTestApplication()
    await store.dispatch({ actor: 'human', move: 'e4', source: 'human', type: 'playMove' })
    const previousGameId = store.getSnapshot().session.game.id

    const reset = await store.reset()

    expect(reset.ok).toBe(true)
    expect(store.getSnapshot().session.revision).toBe(0)
    expect(store.getSnapshot().session.game.id).not.toBe(previousGameId)
    expect(getGameHistory(store.getSnapshot().session)).toHaveLength(1)
    expect(repository.load()).toBeNull()
  })

  it('treats clearing an empty scenario as an idempotent command', async () => {
    const { store } = createTestApplication()
    const result = await store.dispatch({ source: 'human', type: 'clearScenario' })

    expect(result.ok).toBe(true)
    expect(store.getSnapshot().session.revision).toBe(0)
  })
})
