import { AgentIntegrations } from '../adapters/agent/agent-integrations'
import { JasonWebMcpAdapter } from '../adapters/agent/jason-webmcp.adapter'
import { NativeWebMcpAdapter } from '../adapters/agent/native-webmcp.adapter'
import { StockfishEngineAdapter } from '../adapters/engine/stockfish-engine.adapter'
import { createPrompts } from '../adapters/agent/prompts'
import { createResources } from '../adapters/agent/resources'
import { createTools } from '../adapters/agent/tools'
import { ChessJsRulesAdapter } from '../adapters/chess/chessjs-rules.adapter'
import { LocalStorageGameRepository } from '../adapters/persistence/local-storage-game.repository'
import { OnboardingPreferencesRepository } from '../adapters/persistence/onboarding.repository'
import { ResilientGameRepository } from '../adapters/persistence/resilient-game.repository'
import { ChessSessionStore } from '../application/chess-session.store'
import { createInitialSession, migrateLegacySession } from '../application/create-session'
import type { OnboardingRepository } from '../ports/onboarding-repository.port'
import { createId } from '../shared/identifiers'

export interface PinnocoApplication {
  dispose(): void
  onboarding: OnboardingRepository
  store: ChessSessionStore
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function bootstrapPinnoco(): PinnocoApplication {
  const rules = new ChessJsRulesAdapter()
  const storage = getLocalStorage()
  const localRepository = storage
    ? new LocalStorageGameRepository(storage, rules, (legacy) => migrateLegacySession(legacy, rules, createId))
    : null
  const repository = new ResilientGameRepository(localRepository)
  const initialState = repository.load() ?? createInitialSession(rules, createId)
  repository.save(initialState)

  const store = new ChessSessionStore(initialState, repository, rules, createId)
  const engine = new StockfishEngineAdapter()
  const prompts = createPrompts()
  const resources = createResources(store)
  const tools = createTools(store, engine)
  const agents = new AgentIntegrations([
    new JasonWebMcpAdapter(prompts, resources, tools),
    new NativeWebMcpAdapter(tools),
  ])
  agents.start()

  return {
    dispose: () => {
      agents.stop()
      engine.dispose()
    },
    onboarding: new OnboardingPreferencesRepository(storage),
    store,
  }
}
