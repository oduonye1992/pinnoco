import { clearScenario } from './commands/clear-scenario'
import type { SessionCommand, SessionCommandOutcome } from './commands/command.types'
import { playMove } from './commands/play-move'
import { restartGame } from './commands/restart-game'
import { setScenario } from './commands/set-scenario'
import { showScenario } from './commands/show-scenario'
import { createInitialSession } from './create-session'
import type { BoardPiece, ChessMove } from '../domains/game/game.types'
import type { ChessSessionState } from '../domains/session/session.types'
import type { ChessRulesPort } from '../ports/chess-rules.port'
import type { GameRepository } from '../ports/game-repository.port'
import type { IdFactory } from '../shared/identifiers'
import { domainError } from '../shared/domain-error'
import { failure, success, type Result } from '../shared/result'

export interface ChessSessionSnapshot {
  lastAnnouncement: string
  session: ChessSessionState
}

export interface HumanMoveNotice {
  move: ChessMove
  revision: number
  state: ChessSessionState
}

type Listener = () => void
type HumanMoveListener = (notice: HumanMoveNotice) => void

export class ChessSessionStore {
  private listeners = new Set<Listener>()
  private humanMoveListeners = new Set<HumanMoveListener>()
  private humanMoveNotices: HumanMoveNotice[] = []
  private queue: Promise<void> = Promise.resolve()
  private snapshot: ChessSessionSnapshot

  constructor(
    initialState: ChessSessionState,
    private readonly repository: GameRepository,
    private readonly rules: ChessRulesPort,
    private readonly createIdentifier: IdFactory,
  ) {
    this.snapshot = {
      lastAnnouncement: 'The board is ready.',
      session: initialState,
    }
  }

  dispatch(command: SessionCommand): Promise<Result<SessionCommandOutcome>> {
    // Human and agent commands share one queue so revision checks see a stable state.
    const execution = this.queue.then(() => this.execute(command))
    this.queue = execution.then(() => undefined, () => undefined)
    return execution
  }

  reset(expectedRevision?: number): Promise<Result<void>> {
    const execution = this.queue.then(() => this.resetSession(expectedRevision))
    this.queue = execution.then(() => undefined, () => undefined)
    return execution
  }

  getBoard(fen: string): BoardPiece[] {
    const position = this.rules.inspect(fen)
    return position.ok ? position.value.pieces : []
  }

  getRules(): ChessRulesPort {
    return this.rules
  }

  getSnapshot = (): ChessSessionSnapshot => this.snapshot

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  subscribeToHumanMoves = (listener: HumanMoveListener): (() => void) => {
    this.humanMoveListeners.add(listener)
    return () => this.humanMoveListeners.delete(listener)
  }

  waitForHumanMove(afterRevision: number, timeoutMs: number): Promise<HumanMoveNotice | null> {
    const existing = this.humanMoveNotices.find((notice) => notice.revision > afterRevision)
    if (existing) return Promise.resolve(existing)

    return new Promise((resolve) => {
      let settled = false
      let unsubscribe: () => void = () => undefined
      const finish = (notice: HumanMoveNotice | null) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        unsubscribe()
        resolve(notice)
      }
      const timer = setTimeout(() => finish(null), timeoutMs)
      unsubscribe = this.subscribeToHumanMoves((notice) => {
        if (notice.revision > afterRevision) finish(notice)
      })
    })
  }

  private execute(command: SessionCommand): Result<SessionCommandOutcome> {
    const current = this.snapshot.session
    const result = command.type === 'clearScenario'
      ? clearScenario(current, command)
      : command.type === 'playMove'
        ? playMove(current, command, this.rules, this.createIdentifier)
      : command.type === 'restartGame'
        ? restartGame(current, command, this.rules, this.createIdentifier)
        : command.type === 'setScenario'
          ? setScenario(current, command, this.rules, this.createIdentifier)
          : showScenario(current, command, this.rules, this.createIdentifier)

    if (!result.ok) {
      this.snapshot = {
        lastAnnouncement: result.error.message,
        session: current,
      }
      this.listeners.forEach((listener) => listener())
      return result
    }

    // Publish only after the complete replacement document reaches persistence.
    const persisted = this.repository.save(result.value.state)
    if (!persisted.ok) {
      this.snapshot = {
        lastAnnouncement: persisted.error.message,
        session: current,
      }
      this.listeners.forEach((listener) => listener())
      return failure(persisted.error)
    }
    this.snapshot = {
      lastAnnouncement: result.value.announcement,
      session: result.value.state,
    }
    this.listeners.forEach((listener) => listener())

    if (command.type === 'playMove' && command.actor === 'human' && result.value.data.kind === 'movePlayed') {
      const notice: HumanMoveNotice = {
        move: result.value.data.move,
        revision: result.value.state.revision,
        state: result.value.state,
      }
      this.humanMoveNotices = [...this.humanMoveNotices, notice].slice(-64)
      this.humanMoveListeners.forEach((listener) => listener(notice))
    }

    return result
  }

  private resetSession(expectedRevision?: number): Result<void> {
    const current = this.snapshot.session
    if (expectedRevision !== undefined && expectedRevision !== current.revision) {
      return failure(domainError('STALE_REVISION', 'The reset was based on an older game state.'))
    }

    const state = createInitialSession(this.rules, this.createIdentifier, current.game.participants)
    this.repository.clear()

    this.snapshot = {
      lastAnnouncement: 'Welcome back. Start a new game.',
      session: state,
    }
    this.humanMoveNotices = []
    this.listeners.forEach((listener) => listener())

    return success(undefined)
  }
}
