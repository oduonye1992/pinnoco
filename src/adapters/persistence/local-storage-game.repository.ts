import type { LegacyBoardState } from '../../application/create-session'
import type { AnalysisWorkspace } from '../../domains/analysis/analysis.types'
import type {
  ChessMove,
  GameParticipants,
  GameSession,
  PositionNode,
} from '../../domains/game/game.types'
import { SESSION_SCHEMA_VERSION, type ChessSessionState } from '../../domains/session/session.types'
import type { ChessRulesPort } from '../../ports/chess-rules.port'
import type { GameRepository } from '../../ports/game-repository.port'
import { domainError } from '../../shared/domain-error'
import { failure, success, type Result } from '../../shared/result'

const CURRENT_STORAGE_KEY = 'pinnoco:document:v1'
const LEGACY_STORAGE_KEYS = ['pinnoco:board:v1', 'pinnoco:lesson:v2'] as const

type LegacyMigrator = (legacy: LegacyBoardState) => ChessSessionState | null

export interface StorageLike {
  getItem(key: string): string | null
  removeItem?(key: string): void
  setItem(key: string, value: string): void
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isChessMove(value: unknown): value is ChessMove {
  if (!isObject(value)) return false
  return (value.color === 'black' || value.color === 'white')
    && typeof value.from === 'string'
    && typeof value.san === 'string'
    && typeof value.to === 'string'
    && typeof value.uci === 'string'
}

function isParticipants(value: unknown): value is GameParticipants {
  if (!isObject(value)) return false
  return (value.agentColor === 'black' || value.agentColor === 'white')
    && (value.humanColor === 'black' || value.humanColor === 'white')
    && ['opponent', 'opponentAndTeacher', 'teacher'].includes(String(value.agentMode))
    && value.agentColor !== value.humanColor
}

function isPositionNode(
  value: unknown,
  rules: ChessRulesPort,
): value is PositionNode {
  if (!isObject(value)) return false
  return Array.isArray(value.children)
    && value.children.every((child) => typeof child === 'string')
    && rules.isValidFen(value.fen)
    && typeof value.id === 'string'
    && (value.move === null || isChessMove(value.move))
    && (value.parentId === null || typeof value.parentId === 'string')
    && Number.isInteger(value.ply)
    && Number(value.ply) >= 0
}

function isNodeCollection(
  value: unknown,
  rootNodeId: unknown,
  currentNodeId: unknown,
  rules: ChessRulesPort,
): value is Record<string, PositionNode> {
  if (!isObject(value) || typeof rootNodeId !== 'string' || typeof currentNodeId !== 'string') return false
  if (!value[rootNodeId] || !value[currentNodeId]) return false

  const entries = Object.entries(value)
  if (!entries.every(([id, node]) => isPositionNode(node, rules) && node.id === id)) return false

  const nodes = value as Record<string, PositionNode>
  const root = nodes[rootNodeId]
  if (root.move !== null || root.parentId !== null) return false
  if (Object.values(nodes).filter((node) => node.parentId === null).length !== 1) return false

  return Object.values(nodes).every((node) => {
    if (node.parentId !== null && !nodes[node.parentId]) return false
    if (node.parentId !== null) {
      if (!node.move) return false
      const parent = nodes[node.parentId]
      if (!parent.children.includes(node.id) || node.ply !== parent.ply + 1) return false
      // Valid FEN text is insufficient: each node must be reproducible from its parent.
      const replay = rules.play(parent.fen, node.move.uci)
      if (!replay.ok || replay.value.fen !== node.fen) return false
    }
    if (new Set(node.children).size !== node.children.length) return false
    return node.children.every((childId: string) => {
      const child = nodes[childId]
      return Boolean(child) && child.parentId === node.id
    })
  })
}

function isGameSession(value: unknown, rules: ChessRulesPort): value is GameSession {
  if (!isObject(value)) return false
  if (typeof value.currentNodeId !== 'string'
    || typeof value.id !== 'string'
    || typeof value.inCheck !== 'boolean'
    || !isParticipants(value.participants)
    || typeof value.rootNodeId !== 'string'
    || (value.scenarioTitle !== undefined && typeof value.scenarioTitle !== 'string')
    || !['active', 'checkmate', 'draw'].includes(String(value.status))
    || (value.turn !== 'black' && value.turn !== 'white')
    || !isNodeCollection(value.nodes, value.rootNodeId, value.currentNodeId, rules)
    || value.nodes[value.rootNodeId].ply !== 0) return false

  const current = rules.inspect(value.nodes[value.currentNodeId].fen)
  return current.ok
    && current.value.inCheck === value.inCheck
    && current.value.status === value.status
    && current.value.turn === value.turn
}

function isAnalysisWorkspace(value: unknown, rules: ChessRulesPort): value is AnalysisWorkspace {
  if (!isObject(value) || !isObject(value.tree)) return false
  return typeof value.id === 'string'
    && typeof value.sourceGameNodeId === 'string'
    && Number.isInteger(value.sourceMoveNumber)
    && typeof value.title === 'string'
    && typeof value.tree.currentNodeId === 'string'
    && typeof value.tree.rootNodeId === 'string'
    && isNodeCollection(value.tree.nodes, value.tree.rootNodeId, value.tree.currentNodeId, rules)
}

function isSessionState(value: unknown, rules: ChessRulesPort): value is ChessSessionState {
  if (!isObject(value)) return false
  if ((value.analysis !== null && !isAnalysisWorkspace(value.analysis, rules))
    || !isGameSession(value.game, rules)
    || !Number.isInteger(value.revision)
    || Number(value.revision) < 0
    || value.schemaVersion !== SESSION_SCHEMA_VERSION) return false

  if (value.analysis === null) return true

  const source = value.game.nodes[value.analysis.sourceGameNodeId]
  const root = value.analysis.tree.nodes[value.analysis.tree.rootNodeId]
  return Boolean(source)
    && root.fen === source.fen
    && root.ply === source.ply
    && value.analysis.sourceMoveNumber === source.ply
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function parseLegacy(value: unknown): LegacyBoardState | null {
  if (!isObject(value) || typeof value.liveFen !== 'string' || !Array.isArray(value.history)) return null
  if (!value.history.every((move) => typeof move === 'string')) return null

  let scenario: LegacyBoardState['scenario'] = null
  if (isObject(value.scenario) && Array.isArray(value.scenario.steps)) {
    const steps = value.scenario.steps
      .filter((step): step is Record<string, unknown> => isObject(step) && typeof step.san === 'string')
      .map((step) => ({ san: String(step.san) }))
    if (steps.length) {
      scenario = {
        steps,
        title: typeof value.scenario.title === 'string' ? value.scenario.title : 'Possible line',
      }
    }
  }

  return {
    history: value.history,
    liveFen: value.liveFen,
    scenario,
  }
}

export class LocalStorageGameRepository implements GameRepository {
  constructor(
    private readonly storage: StorageLike,
    private readonly rules: ChessRulesPort,
    private readonly migrateLegacy: LegacyMigrator,
  ) {}

  load(): ChessSessionState | null {
    try {
      const current = parseJson(this.storage.getItem(CURRENT_STORAGE_KEY))
      if (isSessionState(current, this.rules)) return current

      for (const key of LEGACY_STORAGE_KEYS) {
        const legacy = parseLegacy(parseJson(this.storage.getItem(key)))
        if (!legacy) continue
        const migrated = this.migrateLegacy(legacy)
        if (!migrated || !isSessionState(migrated, this.rules)) continue
        this.save(migrated)
        return migrated
      }
    } catch {
      return null
    }

    return null
  }

  clear(): void {
    try {
      this.storage.removeItem?.(CURRENT_STORAGE_KEY)
      LEGACY_STORAGE_KEYS.forEach((key) => this.storage.removeItem?.(key))
    } catch {
      // Reset remains safe when browser storage is unavailable.
    }
  }

  save(state: ChessSessionState): Result<void> {
    if (!isSessionState(state, this.rules)) {
      return failure(domainError('PERSISTENCE_ERROR', 'The session did not pass persistence validation.'))
    }

    try {
      this.storage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(state))
      return success(undefined)
    } catch {
      return failure(domainError('PERSISTENCE_ERROR', 'The session could not be saved.'))
    }
  }
}
