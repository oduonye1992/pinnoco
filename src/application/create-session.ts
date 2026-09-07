import { createAnalysisWorkspace } from '../domains/analysis/analysis.model'
import { appendGameTransition, createGameSession } from '../domains/game/game.model'
import type { GameParticipants } from '../domains/game/game.types'
import { SESSION_SCHEMA_VERSION, type ChessSessionState } from '../domains/session/session.types'
import type { ChessRulesPort } from '../ports/chess-rules.port'
import type { IdFactory } from '../shared/identifiers'

export const DEFAULT_PARTICIPANTS: GameParticipants = {
  agentColor: 'black',
  agentMode: 'opponentAndTeacher',
  humanColor: 'white',
}

export interface LegacyBoardState {
  history: string[]
  liveFen: string
  scenario?: { steps: Array<{ san: string }>; title: string } | null
}

export function createInitialSession(
  rules: ChessRulesPort,
  createIdentifier: IdFactory,
  participants: GameParticipants = DEFAULT_PARTICIPANTS,
): ChessSessionState {
  return {
    analysis: null,
    game: createGameSession(rules.initialFen(), participants, 'white', createIdentifier),
    revision: 0,
    schemaVersion: SESSION_SCHEMA_VERSION,
  }
}

export function migrateLegacySession(
  legacy: LegacyBoardState,
  rules: ChessRulesPort,
  createIdentifier: IdFactory,
): ChessSessionState | null {
  let state = createInitialSession(rules, createIdentifier)

  for (const move of legacy.history) {
    const current = state.game.nodes[state.game.currentNodeId]
    const transition = rules.play(current.fen, move)
    if (!transition.ok) return null
    state = {
      ...state,
      game: appendGameTransition(state.game, transition.value, createIdentifier),
      revision: state.revision + 1,
    }
  }

  const current = state.game.nodes[state.game.currentNodeId]
  if (!rules.isValidFen(legacy.liveFen) || current.fen !== legacy.liveFen) return null

  if (legacy.scenario?.steps.length) {
    const transitions = []
    let fen = current.fen
    for (const step of legacy.scenario.steps.slice(0, 8)) {
      const transition = rules.play(fen, step.san)
      if (!transition.ok) return null
      transitions.push(transition.value)
      fen = transition.value.fen
    }
    state = {
      ...state,
      analysis: createAnalysisWorkspace(
        current.fen,
        current.id,
        current.ply,
        legacy.scenario.title || 'Possible line',
        transitions,
        createIdentifier,
      ),
      revision: state.revision + 1,
    }
  }

  return state
}
