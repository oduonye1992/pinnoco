import type { ChessSessionStore } from '../../application/chess-session.store'
import { getAgentGuide } from '../../application/queries/get-agent-guide'
import { getGameState } from '../../application/queries/get-game-state'
import { getScenarioPreset, type ScenarioTopic } from '../../application/queries/get-scenario-presets'
import type { BoardSquare, PromotionPiece } from '../../domains/game/game.types'
import type { EngineLine, EnginePort } from '../../ports/engine.port'
import { CONTRACT_SCHEMA_VERSION } from '../../shared/contract-metadata'
import { domainError } from '../../shared/domain-error'
import { errorToolResult, textToolResult } from './agent-results'
import type { AgentTool } from './capability.types'

function readExpectedRevision(input: Record<string, unknown>) {
  return typeof input.expectedRevision === 'number' && Number.isInteger(input.expectedRevision)
    ? input.expectedRevision
    : undefined
}

function readPromotion(value: unknown): PromotionPiece {
  return value === 'b' || value === 'n' || value === 'r' ? value : 'q'
}

function sessionMetadata(store: ChessSessionStore) {
  const session = store.getSnapshot().session
  return {
    gameId: session.game.id,
    revision: session.revision,
    schemaVersion: CONTRACT_SCHEMA_VERSION,
  }
}

function readWaitTimeout(input: Record<string, unknown>) {
  if (typeof input.timeoutMs !== 'number' || !Number.isInteger(input.timeoutMs)) return 25_000
  return Math.min(Math.max(input.timeoutMs, 500), 25_000)
}

function readAnalysisLines(input: Record<string, unknown>) {
  if (typeof input.lines !== 'number' || !Number.isInteger(input.lines)) return 2
  return Math.min(Math.max(input.lines, 1), 3)
}

function readAnalysisTime(input: Record<string, unknown>) {
  if (typeof input.timeMs !== 'number' || !Number.isInteger(input.timeMs)) return 750
  return Math.min(Math.max(input.timeMs, 100), 2_000)
}

function readUciMove(value: string) {
  if (!/^[a-h][1-8][a-h][1-8][bnqr]?$/.test(value)) return null
  return {
    from: value.slice(0, 2) as BoardSquare,
    ...(value.length === 5 ? { promotion: value[4] as PromotionPiece } : {}),
    to: value.slice(2, 4) as BoardSquare,
  }
}

function toSanLine(fen: string, line: EngineLine, store: ChessSessionStore) {
  let currentFen = fen
  const sanMoves: string[] = []

  for (const uciMove of line.moves) {
    const move = readUciMove(uciMove)
    if (!move) return null
    const transition = store.getRules().play(currentFen, move)
    if (!transition.ok) return null
    sanMoves.push(transition.value.move.san)
    currentFen = transition.value.fen
  }

  return sanMoves
}

function readScenarioTopic(value: unknown): ScenarioTopic | undefined {
  return value === 'opening' || value === 'middlegame' || value === 'endgame' ? value : undefined
}

function readScenarioTurn(value: unknown, store: ChessSessionStore) {
  const participants = store.getSnapshot().session.game.participants
  if (value === 'human') return participants.humanColor
  if (value === 'agent') return participants.agentColor
  return undefined
}

function setFenTurn(fen: string, turn: 'black' | 'white') {
  const fields = fen.trim().split(/\s+/)
  if (fields.length !== 6 || (fields[1] !== 'w' && fields[1] !== 'b')) return null
  fields[1] = turn === 'white' ? 'w' : 'b'
  return fields.join(' ')
}

export function createTools(store: ChessSessionStore, engine?: EnginePort): AgentTool[] {
  return [
    {
      annotations: { readOnlyHint: true },
      description: 'Privately analyze the current position with Stockfish and return candidate lines without changing the live game.',
      execute: async (input) => {
        const expectedRevision = readExpectedRevision(input)
        if (expectedRevision === undefined) {
          return errorToolResult(domainError('INVALID_INPUT', 'Give expectedRevision from the latest game-state read.'), sessionMetadata(store))
        }

        const snapshot = store.getSnapshot()
        if (expectedRevision !== snapshot.session.revision) {
          return errorToolResult(domainError('STALE_REVISION', 'Read the latest game state before analyzing Pinnoco.'), sessionMetadata(store))
        }
        if (!engine) {
          return errorToolResult(domainError('ENGINE_UNAVAILABLE', 'Stockfish analysis is unavailable. Codex can still choose a legal move.'), sessionMetadata(store))
        }

        const position = snapshot.session.game.nodes[snapshot.session.game.currentNodeId]
        const result = await engine.analyze(
          position.fen,
          { lines: readAnalysisLines(input), timeMs: readAnalysisTime(input) },
          new AbortController().signal,
        )
        if (!result.ok) return errorToolResult(result.error, sessionMetadata(store))

        const current = store.getSnapshot().session
        if (current.revision !== expectedRevision) {
          return errorToolResult(domainError('STALE_REVISION', 'The board changed while analysis was running. Read the latest game state.'), sessionMetadata(store))
        }

        const lines = result.value.flatMap((line) => {
          const san = toSanLine(position.fen, line, store)
          return san?.length ? [{ evaluation: line.evaluation, moves: san, uci: line.moves }] : []
        })
        if (!lines.length) {
          return errorToolResult(domainError('ENGINE_UNAVAILABLE', 'Stockfish returned no usable candidate line.'), sessionMetadata(store))
        }

        return textToolResult({
          fen: position.fen,
          lines,
          turn: current.game.turn,
          ...sessionMetadata(store),
        })
      },
      inputSchema: {
        additionalProperties: false,
        properties: {
          expectedRevision: { description: 'The revision returned by the latest game-state read.', type: 'integer' },
          lines: { description: 'Number of candidate lines to return.', maximum: 3, minimum: 1, type: 'integer' },
          timeMs: { description: 'Maximum analysis time in milliseconds.', maximum: 2_000, minimum: 100, type: 'integer' },
        },
        required: ['expectedRevision'],
        type: 'object',
      },
      name: 'pinnoco_analyze_position',
      title: 'Analyze the position',
    },
    {
      description: 'Close the scenario board without changing the live game.',
      execute: async (input) => {
        const result = await store.dispatch({
          expectedRevision: readExpectedRevision(input),
          source: 'agent',
          type: 'clearScenario',
        })
        return result.ok
          ? textToolResult({ message: result.value.announcement, ...sessionMetadata(store) })
          : errorToolResult(result.error, sessionMetadata(store))
      },
      inputSchema: {
        additionalProperties: false,
        properties: { expectedRevision: { description: 'The revision returned by the latest game-state read.', type: 'integer' } },
        required: ['expectedRevision'],
        type: 'object',
      },
      name: 'pinnoco_clear_scenario',
      title: 'Close the scenario',
    },
    {
      annotations: { readOnlyHint: true },
      description: 'Read the live chess position, move history, legal moves, participants, revision, and any open scenario.',
      execute: async () => {
        const state = getGameState(store.getSnapshot().session, store.getRules())
        return state.ok ? textToolResult(state.value) : errorToolResult(state.error, sessionMetadata(store))
      },
      inputSchema: { additionalProperties: false, properties: {}, type: 'object' },
      name: 'pinnoco_get_game_state',
      title: 'Read the chess board',
    },
    {
      annotations: { readOnlyHint: true },
      description: 'Read the short guide for working with the player in Pinnoco.',
      execute: async () => textToolResult({
        guide: getAgentGuide(),
        pageUrl: typeof window !== 'undefined' ? window.location.origin : null,
        ...sessionMetadata(store),
      }),
      inputSchema: { additionalProperties: false, properties: {}, type: 'object' },
      name: 'pinnoco_get_started',
      title: 'Learn how Pinnoco works',
    },
    {
      description: 'Play one legal move on the live board. Read the game state first and use its revision.',
      execute: async (input) => {
        const move = typeof input.move === 'string'
          ? input.move
          : typeof input.from === 'string' && typeof input.to === 'string'
            ? { from: input.from, promotion: readPromotion(input.promotion), to: input.to }
            : null
        if (!move) return errorToolResult(domainError('INVALID_INPUT', 'Give a move, or give both from and to squares.'), sessionMetadata(store))

        const result = await store.dispatch({
          actor: input.playAs === 'human' ? 'human' : 'agent',
          expectedRevision: readExpectedRevision(input),
          move,
          source: 'agent',
          type: 'playMove',
        })
        if (!result.ok) return errorToolResult(result.error, sessionMetadata(store))
        if (typeof window !== 'undefined' && result.value.data.kind === 'movePlayed') {
          window.dispatchEvent(new CustomEvent('pinnoco:move', {
            detail: { actor: 'agent', move: result.value.data.move, revision: result.value.state.revision },
          }))
        }
        return textToolResult({ message: result.value.announcement, ...sessionMetadata(store) })
      },
      inputSchema: {
        additionalProperties: false,
        properties: {
          expectedRevision: { description: 'The revision returned by the latest game-state read.', type: 'integer' },
          from: { description: 'The start square, such as g8.', type: 'string' },
          move: { description: 'A move in SAN, such as Nf6.', type: 'string' },
          playAs: { description: 'Use human only when the player asks you to play that exact move for them.', enum: ['agent', 'human'], type: 'string' },
          promotion: { description: 'The promotion piece.', enum: ['b', 'n', 'q', 'r'], type: 'string' },
          to: { description: 'The end square, such as f6.', type: 'string' },
        },
        required: ['expectedRevision'],
        type: 'object',
      },
      name: 'pinnoco_play_move',
      title: 'Play a move',
    },
    {
      description: 'Clear the saved game and onboarding state, then return Pinnoco to its welcome screen.',
      execute: async (input) => {
        const revision = readExpectedRevision(input)
        if (revision === undefined) {
          return errorToolResult(domainError('INVALID_INPUT', 'Give expectedRevision from the latest game-state read.'), sessionMetadata(store))
        }
        if (revision !== store.getSnapshot().session.revision) {
          return errorToolResult(domainError('STALE_REVISION', 'Read the latest game state before resetting Pinnoco.'), sessionMetadata(store))
        }

        const result = await store.reset(revision)
        if (!result.ok) return errorToolResult(result.error, sessionMetadata(store))
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pinnoco:reset'))
        }
        return textToolResult({ message: 'Pinnoco was reset. Onboarding is ready.', ...sessionMetadata(store) })
      },
      inputSchema: {
        additionalProperties: false,
        properties: { expectedRevision: { description: 'The revision returned by the latest game-state read.', type: 'integer' } },
        required: ['expectedRevision'],
        type: 'object',
      },
      name: 'pinnoco_reset_app',
      title: 'Reset Pinnoco',
    },
    {
      description: 'Start the live chess game again from the opening position.',
      execute: async (input) => {
        const result = await store.dispatch({
          expectedRevision: readExpectedRevision(input),
          source: 'agent',
          type: 'restartGame',
        })
        if (!result.ok) return errorToolResult(result.error, sessionMetadata(store))
        window.dispatchEvent(new CustomEvent('pinnoco:restart', { detail: { revision: result.value.state.revision } }))
        return textToolResult({ message: result.value.announcement, ...sessionMetadata(store) })
      },
      inputSchema: {
        additionalProperties: false,
        properties: { expectedRevision: { description: 'The revision returned by the latest game-state read.', type: 'integer' } },
        required: ['expectedRevision'],
        type: 'object',
      },
      name: 'pinnoco_restart_game',
      title: 'Restart the game',
    },
    {
      description: 'Set a new chess starting position for an opening, middlegame, or endgame and choose who moves first.',
      execute: async (input) => {
        const expectedRevision = readExpectedRevision(input)
        const turn = readScenarioTurn(input.turn, store)
        const topic = readScenarioTopic(input.topic)
        const preset = topic ? getScenarioPreset(topic) : undefined
        const requestedFen = typeof input.fen === 'string' ? input.fen : preset?.fen
        if (expectedRevision === undefined) {
          return errorToolResult(domainError('INVALID_INPUT', 'Give expectedRevision from the latest game-state read.'), sessionMetadata(store))
        }
        if (!turn) {
          return errorToolResult(domainError('INVALID_INPUT', 'Choose whose turn it is: human or agent.'), sessionMetadata(store))
        }
        if (!requestedFen) {
          return errorToolResult(domainError('INVALID_INPUT', 'Give a topic or a valid FEN position.'), sessionMetadata(store))
        }

        const fen = setFenTurn(requestedFen, turn)
        if (!fen) {
          return errorToolResult(domainError('INVALID_INPUT', 'Give a complete six-part FEN position.'), sessionMetadata(store))
        }
        const title = typeof input.title === 'string' && input.title.trim()
          ? input.title.trim()
          : preset?.title ?? 'Chess scenario'
        const result = await store.dispatch({
          expectedRevision,
          fen,
          source: 'agent',
          title,
          turn,
          type: 'setScenario',
        })
        if (!result.ok) return errorToolResult(result.error, sessionMetadata(store))
        const state = getGameState(result.value.state, store.getRules())
        return state.ok
          ? textToolResult({
              ...state.value,
              message: result.value.announcement,
              scenarioTopic: topic ?? null,
            })
          : errorToolResult(state.error, sessionMetadata(store))
      },
      inputSchema: {
        additionalProperties: false,
        properties: {
          expectedRevision: { description: 'The revision returned by the latest game-state read.', type: 'integer' },
          fen: { description: 'Optional six-part FEN for a custom starting position. Use topic for a ready-made position.', type: 'string' },
          title: { description: 'Optional short name for the starting scenario.', type: 'string' },
          topic: { description: 'A ready-made chess topic.', enum: ['opening', 'middlegame', 'endgame'], type: 'string' },
          turn: { description: 'Who moves first in the scenario.', enum: ['agent', 'human'], type: 'string' },
        },
        required: ['expectedRevision', 'turn'],
        type: 'object',
      },
      name: 'pinnoco_set_scenario',
      title: 'Set a starting scenario',
    },
    {
      description: 'Open a scenario rooted at the current live position with up to eight possible moves.',
      execute: async (input) => {
        if (!Array.isArray(input.line) || !input.line.every((move) => typeof move === 'string')) {
          return errorToolResult(domainError('INVALID_INPUT', 'Give a list of moves to show.'), sessionMetadata(store))
        }
        const result = await store.dispatch({
          expectedRevision: readExpectedRevision(input),
          line: input.line,
          source: 'agent',
          title: typeof input.title === 'string' ? input.title : 'Possible line',
          type: 'showScenario',
        })
        return result.ok
          ? textToolResult({ message: result.value.announcement, ...sessionMetadata(store) })
          : errorToolResult(result.error, sessionMetadata(store))
      },
      inputSchema: {
        additionalProperties: false,
        properties: {
          expectedRevision: { description: 'The revision returned by the latest game-state read.', type: 'integer' },
          line: { description: 'Legal moves in order, written in SAN.', items: { type: 'string' }, maxItems: 8, minItems: 1, type: 'array' },
          title: { description: 'A short name for this line.', type: 'string' },
        },
        required: ['expectedRevision', 'line'],
        type: 'object',
      },
      name: 'pinnoco_show_scenario',
      title: 'Show a possible line',
    },
    {
      description: 'Open the live Pinnoco board after the player gives permission. This does not make a move.',
      execute: async (input) => {
        const expectedRevision = readExpectedRevision(input)
        if (expectedRevision === undefined) {
          return errorToolResult(domainError('INVALID_INPUT', 'Give expectedRevision from the latest game-state read.'), sessionMetadata(store))
        }
        if (expectedRevision !== store.getSnapshot().session.revision) {
          return errorToolResult(domainError('STALE_REVISION', 'Read the latest game state before starting Pinnoco.'), sessionMetadata(store))
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pinnoco:start'))
        }
        return textToolResult({ message: 'Pinnoco is open. Make your move when you are ready.', started: true, ...sessionMetadata(store) })
      },
      inputSchema: {
        additionalProperties: false,
        properties: { expectedRevision: { description: 'The revision returned by the latest game-state read.', type: 'integer' } },
        required: ['expectedRevision'],
        type: 'object',
      },
      name: 'pinnoco_start_game',
      title: 'Start Pinnoco',
    },
    {
      annotations: { readOnlyHint: true },
      description: 'Wait for the player to make their next live move. This lets you notice the move without the player describing it in Codex.',
      execute: async (input) => {
        const afterRevision = readExpectedRevision({ expectedRevision: input.afterRevision })
        if (afterRevision === undefined) {
          return errorToolResult(
            domainError('INVALID_INPUT', 'Give afterRevision from the latest game-state read.'),
            sessionMetadata(store),
          )
        }

        const notice = await store.waitForHumanMove(afterRevision, readWaitTimeout(input))
        if (!notice) {
          return textToolResult({
            afterRevision,
            ...sessionMetadata(store),
            timedOut: true,
            waiting: true,
          })
        }

        const state = getGameState(notice.state, store.getRules())
        return state.ok
          ? textToolResult({ event: 'humanMove', move: notice.move, ...state.value })
          : errorToolResult(state.error, {
              gameId: notice.state.game.id,
              revision: notice.revision,
              schemaVersion: CONTRACT_SCHEMA_VERSION,
            })
      },
      inputSchema: {
        additionalProperties: false,
        properties: {
          afterRevision: { description: 'Wait for a human move after this revision.', type: 'integer' },
          timeoutMs: { description: 'How long to wait, from 500 to 25000 milliseconds.', maximum: 25000, minimum: 500, type: 'integer' },
        },
        required: ['afterRevision'],
        type: 'object',
      },
      name: 'pinnoco_wait_for_human_move',
      title: 'Wait for the player',
    },
  ]
}
