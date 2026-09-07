import type { ChessSessionStore } from '../../application/chess-session.store'
import { getAgentGuide } from '../../application/queries/get-agent-guide'
import { getGameHistory } from '../../application/queries/get-game-history'
import { getGameState } from '../../application/queries/get-game-state'
import { getScenarioState } from '../../application/queries/get-scenario-state'
import { CONTRACT_SCHEMA_VERSION } from '../../shared/contract-metadata'
import type { AgentResource } from './capability.types'

function resourceContents(uri: string, value: unknown) {
  return {
    contents: [{
      mimeType: 'application/json',
      text: JSON.stringify(value),
      uri,
    }],
  }
}

export function createResources(store: ChessSessionStore): AgentResource[] {
  return [
    {
      description: 'The rules for playing and teaching chess with the person using Pinnoco.',
      mimeType: 'application/json',
      name: 'pinnoco_agent_guide',
      provide: async (uri) => {
        const state = store.getSnapshot().session
        return resourceContents(uri, {
          gameId: state.game.id,
          guide: getAgentGuide(),
          pageUrl: typeof window !== 'undefined' ? window.location.origin : null,
          revision: state.revision,
          schemaVersion: CONTRACT_SCHEMA_VERSION,
        })
      },
      uri: 'pinnoco://guide',
    },
    {
      description: 'The complete move-by-move history of the live game.',
      mimeType: 'application/json',
      name: 'pinnoco_game_history',
      provide: async (uri) => {
        const state = store.getSnapshot().session
        return resourceContents(uri, {
          gameId: state.game.id,
          moves: getGameHistory(state).slice(1),
          revision: state.revision,
          schemaVersion: CONTRACT_SCHEMA_VERSION,
        })
      },
      uri: 'pinnoco://game/history',
    },
    {
      description: 'The current live board, legal moves, participants, revision, and open scenario.',
      mimeType: 'application/json',
      name: 'pinnoco_game_state',
      provide: async (uri) => {
        const snapshot = store.getSnapshot().session
        const state = getGameState(snapshot, store.getRules())
        return resourceContents(uri, state.ok ? state.value : { error: state.error })
      },
      uri: 'pinnoco://game/current',
    },
    {
      description: 'The active hypothetical line and the live-game position where it began.',
      mimeType: 'application/json',
      name: 'pinnoco_scenario_state',
      provide: async (uri) => {
        const state = store.getSnapshot().session
        return resourceContents(uri, {
          gameId: state.game.id,
          revision: state.revision,
          scenario: getScenarioState(state),
          schemaVersion: CONTRACT_SCHEMA_VERSION,
        })
      },
      uri: 'pinnoco://scenario/current',
    },
  ]
}
