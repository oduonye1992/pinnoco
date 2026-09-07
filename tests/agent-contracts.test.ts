import { describe, expect, it } from 'vitest'
import { createPrompts } from '../src/adapters/agent/prompts'
import { getAgentConnectionPrompt } from '../src/application/queries/get-agent-connection-prompt'
import { createResources } from '../src/adapters/agent/resources'
import { createTools } from '../src/adapters/agent/tools'
import { createTestApplication } from './helpers'

describe('agent contracts', () => {
  it('keeps prompts, resources, and tools alphabetically ordered', () => {
    const { store } = createTestApplication()
    const prompts = createPrompts().map(({ name }) => name)
    const resources = createResources(store).map(({ name }) => name)
    const tools = createTools(store).map(({ name }) => name)

    expect(prompts).toEqual([...prompts].sort())
    expect(resources).toEqual([...resources].sort())
    expect(tools).toEqual([...tools].sort())
  })

  it('gives Codex the page location and startup tool sequence', async () => {
    const result = await createPrompts()[0].execute({})
    const text = result.messages[0].content.text

    expect(text).toContain('http://127.0.0.1:5573')
    expect(text).toContain('pinnoco_get_started')
    expect(text).toContain('pinnoco_set_scenario')
    expect(text).toContain('pinnoco_start_game')
    expect(text).toContain('pinnoco_wait_for_human_move')
    expect(text).toContain('do not read source code or use browser automation')
  })

  it('keeps the onboarding handoff limited to the page and WebMCP prompt', () => {
    expect(getAgentConnectionPrompt('https://pinnoco.example')).toBe(
      'Open Pinnoco at https://pinnoco.example. Use the WebMCP prompt pinnoco_start_game.',
    )
  })

  it('returns revisioned live state through the read tool', async () => {
    const { store } = createTestApplication()
    const tool = createTools(store).find(({ name }) => name === 'pinnoco_get_game_state')
    const result = await tool?.execute({})
    const payload = JSON.parse(result?.content[0].text || '{}')

    expect(payload.revision).toBe(0)
    expect(payload.schemaVersion).toBe(1)
    expect(payload.turn).toBe('white')
  })

  it('notices a human move without requiring a move message', async () => {
    const { store } = createTestApplication()
    const tool = createTools(store).find(({ name }) => name === 'pinnoco_wait_for_human_move')
    const waiting = tool?.execute({ afterRevision: 0, timeoutMs: 1_000 })

    await store.dispatch({ actor: 'human', move: 'e4', source: 'human', type: 'playMove' })

    const result = await waiting
    const payload = JSON.parse(result?.content[0].text || '{}')
    expect(payload.event).toBe('humanMove')
    expect(payload.move.san).toBe('e4')
    expect(payload.revision).toBe(1)
  })

  it('resets the app through the agent contract', async () => {
    const { store } = createTestApplication()
    await store.dispatch({ actor: 'human', move: 'e4', source: 'human', type: 'playMove' })
    const tool = createTools(store).find(({ name }) => name === 'pinnoco_reset_app')

    const result = await tool?.execute({ expectedRevision: 1 })
    const payload = JSON.parse(result?.content[0].text || '{}')
    expect(result?.isError).not.toBe(true)
    expect(payload.message).toContain('reset')
    expect(payload.revision).toBe(0)
  })

  it('starts a selected scenario with the requested player to move', async () => {
    const { store } = createTestApplication()
    const tool = createTools(store).find(({ name }) => name === 'pinnoco_set_scenario')

    const result = await tool?.execute({ expectedRevision: 0, topic: 'endgame', turn: 'human' })
    const payload = JSON.parse(result?.content[0].text || '{}')

    expect(result?.isError).not.toBe(true)
    expect(payload.startingScenario).toBe('Endgame')
    expect(payload.turn).toBe('white')
    expect(payload.history).toEqual([])
    expect(payload.legalMoves.length).toBeGreaterThan(0)
  })

  it('opens the board through the agent contract without making a move', async () => {
    const { store } = createTestApplication()
    const tool = createTools(store).find(({ name }) => name === 'pinnoco_start_game')

    const result = await tool?.execute({ expectedRevision: 0 })
    const payload = JSON.parse(result?.content[0].text || '{}')

    expect(result?.isError).not.toBe(true)
    expect(payload.started).toBe(true)
    expect(payload.revision).toBe(0)
  })

  it('rejects a mutating tool call without expectedRevision', async () => {
    const { store } = createTestApplication()
    const tool = createTools(store).find(({ name }) => name === 'pinnoco_show_scenario')
    const result = await tool?.execute({ line: ['e4'] })
    const payload = JSON.parse(result?.content[0].text || '{}')

    expect(result?.isError).toBe(true)
    expect(payload.error.code).toBe('INVALID_INPUT')
    expect(payload.gameId).toBeTruthy()
    expect(payload.revision).toBe(0)
    expect(payload.schemaVersion).toBe(1)
  })

  it('exposes the live state, history, guide, and scenario resources', () => {
    const { store } = createTestApplication()
    const uris = createResources(store).map(({ uri }) => uri)

    expect(uris).toEqual([
      'pinnoco://guide',
      'pinnoco://game/history',
      'pinnoco://game/current',
      'pinnoco://scenario/current',
    ])
  })

  it('returns contract metadata even when no scenario is open', async () => {
    const { store } = createTestApplication()
    const resource = createResources(store).find(({ name }) => name === 'pinnoco_scenario_state')
    const result = await resource?.provide('pinnoco://scenario/current')
    const payload = JSON.parse(result?.contents[0].text || '{}')

    expect(payload.gameId).toBeTruthy()
    expect(payload.revision).toBe(0)
    expect(payload.scenario).toBeNull()
    expect(payload.schemaVersion).toBe(1)
  })
})
