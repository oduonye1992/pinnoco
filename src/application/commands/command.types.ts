import type { AnalysisWorkspace } from '../../domains/analysis/analysis.types'
import type { ChessMove, MoveActor, MoveInput, PieceColor } from '../../domains/game/game.types'
import type { ChessSessionState } from '../../domains/session/session.types'

export type CommandSource = 'agent' | 'human' | 'system'

interface MutationCommand {
  expectedRevision?: number
  source: CommandSource
}

export interface ClearScenarioCommand extends MutationCommand {
  type: 'clearScenario'
}

export interface PlayMoveCommand extends MutationCommand {
  actor: MoveActor
  move: MoveInput
  type: 'playMove'
}

export interface RestartGameCommand extends MutationCommand {
  type: 'restartGame'
}

export interface SetScenarioCommand extends MutationCommand {
  fen: string
  title: string
  turn: 'black' | 'white'
  type: 'setScenario'
}

export interface ShowScenarioCommand extends MutationCommand {
  line: string[]
  title: string
  type: 'showScenario'
}

export type SessionCommand =
  | ClearScenarioCommand
  | PlayMoveCommand
  | RestartGameCommand
  | SetScenarioCommand
  | ShowScenarioCommand

export type SessionCommandData =
  | { kind: 'gameRestarted' }
  | { kind: 'movePlayed'; move: ChessMove }
  | { kind: 'scenarioCleared' }
  | { kind: 'scenarioSet'; title: string; turn: PieceColor }
  | { analysis: AnalysisWorkspace; kind: 'scenarioShown' }

export interface SessionCommandOutcome {
  announcement: string
  data: SessionCommandData
  state: ChessSessionState
}
