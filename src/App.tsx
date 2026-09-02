import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import { ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react'

interface ScenarioStep {
  san: string
  fen: string
  from: Square
  to: Square
}

interface Scenario {
  title: string
  steps: ScenarioStep[]
}

interface StoredBoard {
  version: 1
  liveFen: string
  history: string[]
  scenario: Scenario | null
  scenarioStep: number
  mainStep: number
}

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'] as const
const pieces: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
}

const initialFen = new Chess().fen()
const STORAGE_KEY = 'pinnoco:board:v1'
const OLD_STORAGE_KEY = 'pinnoco:lesson:v2'
const toolResult = (text: string) => ({ content: [{ type: 'text' as const, text }] })

function isValidFen(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    new Chess(value)
    return true
  } catch {
    return false
  }
}

function loadBoard(): StoredBoard | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<StoredBoard>
      if (saved.version === 1 && isValidFen(saved.liveFen) && Array.isArray(saved.history)) {
        const savedHistory = saved.history.filter((move): move is string => typeof move === 'string')
        return {
          version: 1,
          liveFen: saved.liveFen,
          history: savedHistory,
          scenario: saved.scenario?.steps?.every((step) => isValidFen(step.fen)) ? saved.scenario : null,
          scenarioStep: typeof saved.scenarioStep === 'number' ? saved.scenarioStep : 0,
          mainStep: typeof saved.mainStep === 'number' ? saved.mainStep : savedHistory.length,
        }
      }
    }

    const oldRaw = localStorage.getItem(OLD_STORAGE_KEY)
    if (!oldRaw) return null
    const old = JSON.parse(oldRaw) as { liveFen?: unknown; history?: unknown }
    if (!isValidFen(old.liveFen)) return null
    return {
      version: 1,
      liveFen: old.liveFen,
      history: Array.isArray(old.history) ? old.history.filter((move): move is string => typeof move === 'string') : [],
      scenario: null,
      scenarioStep: 0,
      mainStep: Array.isArray(old.history) ? old.history.length : 0,
    }
  } catch {
    return null
  }
}

function saveBoard(board: StoredBoard) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
  } catch {
    // The board still works when storage is unavailable.
  }
}

function playMove(game: Chess, input: string | { from: string; to: string; promotion?: string }): Move {
  try {
    const move = game.move(input as Parameters<Chess['move']>[0], { strict: false })
    if (!move) throw new Error()
    return move
  } catch {
    throw new Error('That move is not legal in this position.')
  }
}

function buildTimeline(history: string[]): ScenarioStep[] {
  const game = new Chess()
  const steps: ScenarioStep[] = []

  for (const san of history) {
    try {
      const move = playMove(game, san)
      steps.push({ san: move.san, fen: game.fen(), from: move.from, to: move.to })
    } catch {
      break
    }
  }

  return steps
}

function TimelineControls({
  steps,
  current,
  onChange,
  label,
}: {
  steps: ScenarioStep[]
  current: number
  onChange: (step: number) => void
  label: string
}) {
  const moveName = current === 0 ? 'Start' : steps[current - 1]?.san || 'Start'

  return (
    <div className="timeline-controls" aria-label={label}>
      <button type="button" onClick={() => onChange(current - 1)} disabled={current === 0} aria-label="Previous move"><ChevronLeft size={19} /></button>
      <div className="timeline-position" aria-live="polite"><strong>{moveName}</strong><span>{current} of {steps.length}</span></div>
      <button type="button" onClick={() => onChange(current + 1)} disabled={current === steps.length} aria-label="Next move"><ChevronRight size={19} /></button>
    </div>
  )
}

function ChessBoard({
  fen,
  selected,
  lastMove,
  interactive = false,
  scenario = false,
  onSquare,
  label,
}: {
  fen: string
  selected?: Square | null
  lastMove?: { from: Square; to: Square } | null
  interactive?: boolean
  scenario?: boolean
  onSquare?: (square: Square) => void
  label: string
}) {
  const game = useMemo(() => new Chess(fen), [fen])

  return (
    <div className={`chess-board ${interactive ? 'interactive' : ''} ${scenario ? 'scenario-board' : ''}`} role="grid" aria-label={label}>
      {ranks.flatMap((rank, rankIndex) => files.map((file, fileIndex) => {
        const square = `${file}${rank}` as Square
        const piece = game.get(square)
        const active = selected === square
        const moveFrom = lastMove?.from === square
        const moveTo = lastMove?.to === square

        return (
          <button
            type="button"
            role="gridcell"
            key={square}
            className={`square ${(rankIndex + fileIndex) % 2 === 0 ? 'light' : 'dark'} ${active ? 'selected' : ''} ${moveFrom ? 'move-from' : ''} ${moveTo ? 'move-to' : ''}`}
            onClick={() => interactive && onSquare?.(square)}
            disabled={!interactive}
            aria-label={`${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ', empty'}`}
          >
            {fileIndex === 0 ? <span className="rank-label">{rank}</span> : null}
            {rankIndex === 7 ? <span className="file-label">{file}</span> : null}
            {piece ? <span className={`piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`} aria-hidden="true">{pieces[piece.color][piece.type]}</span> : null}
          </button>
        )
      }))}
    </div>
  )
}

function App() {
  const saved = useRef(loadBoard()).current
  const [liveFen, setLiveFen] = useState(saved?.liveFen || initialFen)
  const [history, setHistory] = useState(saved?.history || [])
  const [scenario, setScenario] = useState<Scenario | null>(saved?.scenario || null)
  const [scenarioStep, setScenarioStep] = useState(saved?.scenarioStep || 0)
  const [mainStep, setMainStep] = useState(saved?.mainStep ?? saved?.history.length ?? 0)
  const [selected, setSelected] = useState<Square | null>(null)
  const [lastAction, setLastAction] = useState('The board is ready.')

  const liveFenRef = useRef(liveFen)
  const historyRef = useRef(history)
  const scenarioRef = useRef(scenario)

  useEffect(() => { liveFenRef.current = liveFen }, [liveFen])
  useEffect(() => { historyRef.current = history }, [history])
  useEffect(() => { scenarioRef.current = scenario }, [scenario])

  useEffect(() => {
    saveBoard({ version: 1, liveFen, history, scenario, scenarioStep, mainStep })
  }, [history, liveFen, mainStep, scenario, scenarioStep])

  const clearScenario = useCallback(() => {
    setScenario(null)
    setScenarioStep(0)
  }, [])

  const commitMove = useCallback((input: { move?: string; from?: string; to?: string; promotion?: string }) => {
    const game = new Chess(liveFenRef.current)
    const requestedMove = input.move || (input.from && input.to
      ? { from: input.from, to: input.to, promotion: input.promotion || 'q' }
      : null)
    if (!requestedMove) throw new Error('Give a move, or give both a start and end square.')

    const move = playMove(game, requestedMove)
    const nextHistory = [...historyRef.current, move.san]
    liveFenRef.current = game.fen()
    historyRef.current = nextHistory
    scenarioRef.current = null
    setLiveFen(game.fen())
    setHistory(nextHistory)
    setMainStep(nextHistory.length)
    setSelected(null)
    clearScenario()

    const turn = game.turn() === 'w' ? 'White' : 'Black'
    setLastAction(`${move.san} was played. ${game.isGameOver() ? 'The game is over.' : `${turn} to move.`}`)
    window.dispatchEvent(new CustomEvent('pinnoco:move', { detail: { san: move.san, fen: game.fen(), turn: game.turn() } }))

    return { move, fen: game.fen(), gameOver: game.isGameOver() }
  }, [clearScenario])

  const showScenario = useCallback((input: { line?: unknown; title?: unknown }) => {
    if (!Array.isArray(input.line)) throw new Error('Give a list of moves to show.')
    const requestedMoves = input.line
      .filter((move): move is string => typeof move === 'string' && Boolean(move.trim()))
      .slice(0, 8)
    if (!requestedMoves.length) throw new Error('Give at least one move to show.')

    const game = new Chess(liveFenRef.current)
    const steps = requestedMoves.map((requestedMove) => {
      const move = playMove(game, requestedMove)
      return { san: move.san, fen: game.fen(), from: move.from, to: move.to }
    })
    const nextScenario = {
      title: typeof input.title === 'string' && input.title.trim() ? input.title.trim() : 'Possible line',
      steps,
    }
    scenarioRef.current = nextScenario
    setScenario(nextScenario)
    setScenarioStep(steps.length)
    setLastAction(`A scenario with ${steps.length} ${steps.length === 1 ? 'move' : 'moves'} is open.`)
    return nextScenario
  }, [])

  const restartGame = useCallback(() => {
    liveFenRef.current = initialFen
    historyRef.current = []
    scenarioRef.current = null
    setLiveFen(initialFen)
    setHistory([])
    setMainStep(0)
    setSelected(null)
    clearScenario()
    setLastAction('A new game is ready. White to move.')
    window.dispatchEvent(new CustomEvent('pinnoco:restart'))
  }, [clearScenario])

  const handleSquare = (square: Square) => {
    const game = new Chess(liveFen)
    if (game.isGameOver() || mainStep !== history.length) return
    const piece = game.get(square)

    if (!selected) {
      if (piece?.color === game.turn()) setSelected(square)
      return
    }

    try {
      commitMove({ from: selected, to: square, promotion: 'q' })
    } catch {
      setSelected(piece?.color === game.turn() ? square : null)
    }
  }

  useEffect(() => {
    const agentGuide = {
      app: 'Pinnoco',
      purpose: 'Help the player get better at chess by playing, talking through ideas, and showing possible lines.',
      firstStep: 'Read pinnoco://game/current or call pinnoco_get_game_state before you talk about the position.',
      rules: [
        'Talk with the player in Codex. The page is only for the boards and move history.',
        'Treat the Game board as the real game.',
        'Treat the Scenario board as a possible line. Scenario moves never change the real game.',
        'Read the latest game state before giving advice about the position.',
        'Do not play a move on the Game board until the player clearly asks you to play it.',
        'Use the Scenario board when the player asks to see how an idea could play out.',
        'Explain plans and choices in short, clear language.',
      ],
      greeting: 'I can see your board. What would you like to talk about?',
    }
    const getGameState = () => {
      const game = new Chess(liveFenRef.current)
      return {
        fen: game.fen(),
        turn: game.turn() === 'w' ? 'white' : 'black',
        history: historyRef.current,
        legalMoves: game.moves(),
        inCheck: game.inCheck(),
        gameOver: game.isGameOver(),
        scenario: scenarioRef.current,
      }
    }
    const tools: WebMCPTool[] = [
      {
        name: 'pinnoco_get_started',
        title: 'Learn how Pinnoco works',
        description: 'Read the short guide for working with the player in Pinnoco. Call this once before using the chess tools.',
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => toolResult(JSON.stringify(agentGuide)),
      },
      {
        name: 'pinnoco_get_game_state',
        title: 'Read the chess board',
        description: 'Read the live chess position, move history, legal moves, turn, and any open scenario.',
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => toolResult(JSON.stringify(getGameState())),
      },
      {
        name: 'pinnoco_play_move',
        title: 'Play a move',
        description: 'Play one legal move on the live board. Use SAN, or a start and end square.',
        inputSchema: {
          type: 'object',
          properties: {
            move: { type: 'string', description: 'A move in SAN, such as Nf3.' },
            from: { type: 'string', description: 'The start square, such as g8.' },
            to: { type: 'string', description: 'The end square, such as f6.' },
            promotion: { type: 'string', description: 'The piece to use for promotion.' },
          },
        },
        execute: async (args) => {
          const result = commitMove(args as Parameters<typeof commitMove>[0])
          return toolResult(`${result.move.san} was played. The live board is updated.`)
        },
      },
      {
        name: 'pinnoco_show_scenario',
        title: 'Show a possible line',
        description: 'Open a second board with up to eight possible moves. The live game does not change.',
        inputSchema: {
          type: 'object',
          properties: {
            line: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8, description: 'Legal moves in order, written in SAN.' },
            title: { type: 'string', description: 'A short name for this line.' },
          },
          required: ['line'],
        },
        execute: async (args) => {
          const result = showScenario(args as Parameters<typeof showScenario>[0])
          return toolResult(`The scenario board now shows ${result.steps.map((step) => step.san).join(' → ')}.`)
        },
      },
      {
        name: 'pinnoco_clear_scenario',
        title: 'Close the scenario',
        description: 'Close the scenario board without changing the live game.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          clearScenario()
          setLastAction('The scenario is closed.')
          return toolResult('The scenario board is closed.')
        },
      },
      {
        name: 'pinnoco_restart_game',
        title: 'Restart the game',
        description: 'Start the live chess game again from the opening position.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          restartGame()
          return toolResult('A new game is ready. White moves first.')
        },
      },
    ]

    const LegacyWebMCP = window.WebMCP
    if (LegacyWebMCP) {
      const legacyContext = window.webMCP ?? new LegacyWebMCP({ color: '#e4ad4f', size: '30px', padding: '16px' })
      window.webMCP = legacyContext
      tools.forEach((tool) => legacyContext.registerTool(tool.name, tool.description, tool.inputSchema || { type: 'object', properties: {} }, tool.execute))
      legacyContext.registerPrompt(
        'pinnoco_start_lesson',
        'Start a chess strategy lesson using the live Pinnoco board.',
        [],
        async () => ({
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Help me study the chess game open in Pinnoco. Read pinnoco://game/current first. Follow this guide: ${JSON.stringify(agentGuide)}`,
            },
          }],
        }),
      )
      legacyContext.registerResource(
        'pinnoco_game_state',
        'The current live board, move history, legal moves, and open scenario.',
        { uri: 'pinnoco://game/current', mimeType: 'application/json' },
        async (uri) => ({ contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(getGameState()) }] }),
      )
      legacyContext.registerResource(
        'pinnoco_agent_guide',
        'The short guide for playing and teaching chess with the person using Pinnoco.',
        { uri: 'pinnoco://guide', mimeType: 'application/json' },
        async (uri) => ({ contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(agentGuide) }] }),
      )
      document.documentElement.dataset.webmcpBridge = legacyContext.isConnected ? 'connected' : 'ready'
    } else {
      document.documentElement.dataset.webmcpBridge = 'unavailable'
    }

    const context = document.modelContext ?? navigator.modelContext
    if (!context) {
      document.documentElement.dataset.webmcpStatus = LegacyWebMCP ? 'bridge-ready' : 'unavailable'
      return
    }

    const controller = new AbortController()
    const options = { signal: controller.signal }
    document.documentElement.dataset.webmcpStatus = 'registering'

    Promise.all(tools.map((tool) => context.registerTool(tool, options))).then(() => {
      document.documentElement.dataset.webmcpStatus = 'registered'
    }).catch((error: unknown) => {
      document.documentElement.dataset.webmcpStatus = 'failed'
      document.documentElement.dataset.webmcpError = error instanceof Error ? error.name : 'RegistrationError'
    })

    return () => {
      controller.abort()
      delete document.documentElement.dataset.webmcpStatus
      delete document.documentElement.dataset.webmcpError
      delete document.documentElement.dataset.webmcpBridge
    }
  }, [clearScenario, commitMove, restartGame, showScenario])

  const game = useMemo(() => new Chess(liveFen), [liveFen])
  const gameTimeline = useMemo(() => buildTimeline(history), [history])
  const activeMainStep = Math.min(Math.max(mainStep, 0), gameTimeline.length)
  const displayedGameFen = activeMainStep === gameTimeline.length ? liveFen : activeMainStep === 0 ? initialFen : gameTimeline[activeMainStep - 1].fen
  const displayedGameMove = activeMainStep === 0 ? null : gameTimeline[activeMainStep - 1]
  const status = activeMainStep !== gameTimeline.length
    ? `Move ${activeMainStep} of ${gameTimeline.length}`
    : game.isCheckmate()
    ? 'Checkmate'
    : game.isDraw()
      ? 'Draw'
      : `${game.turn() === 'w' ? 'White' : 'Black'} to move`
  const activeScenarioStep = scenario ? Math.min(Math.max(scenarioStep, 0), scenario.steps.length) : 0
  const scenarioFen = activeScenarioStep === 0 ? liveFen : scenario?.steps[activeScenarioStep - 1]?.fen || liveFen
  const scenarioMove = activeScenarioStep === 0 || !scenario ? null : scenario.steps[activeScenarioStep - 1]

  return (
    <main className={`app-shell ${scenario ? 'has-scenario' : ''}`}>
      <header className="topbar">
        <div className="brand" aria-label="Pinnoco"><span className="brand-mark" aria-hidden="true" />pinnoco</div>
        <div className="game-status">{status}</div>
        <button className="restart-button" type="button" onClick={restartGame}><RotateCcw size={16} /> Restart</button>
      </header>

      <section className="boards" aria-label="Chess boards">
        <section className="board-panel live-panel" aria-labelledby="game-label">
          <div className="game-heading"><h1 id="game-label">Game</h1>{activeMainStep !== gameTimeline.length ? <p>Looking back</p> : null}</div>
          <ChessBoard fen={displayedGameFen} selected={selected} lastMove={displayedGameMove ? { from: displayedGameMove.from, to: displayedGameMove.to } : null} interactive={activeMainStep === gameTimeline.length} onSquare={handleSquare} label="Live chess board" />
          <TimelineControls steps={gameTimeline} current={activeMainStep} onChange={(step) => { setMainStep(Math.min(Math.max(step, 0), gameTimeline.length)); setSelected(null) }} label="Game history" />
        </section>

        {scenario ? (
          <section className="board-panel scenario-panel" aria-labelledby="scenario-label">
            <div className="scenario-heading">
              <div><h2 id="scenario-label">Scenario</h2><p>{scenario.title}</p></div>
              <button className="icon-button" type="button" onClick={() => { clearScenario(); setLastAction('The scenario is closed.') }} aria-label="Close scenario"><X size={18} /></button>
            </div>
            <ChessBoard fen={scenarioFen} lastMove={scenarioMove ? { from: scenarioMove.from, to: scenarioMove.to } : null} scenario label="Scenario chess board" />
            <TimelineControls steps={scenario.steps} current={activeScenarioStep} onChange={(step) => setScenarioStep(Math.min(Math.max(step, 0), scenario.steps.length))} label="Scenario history" />
          </section>
        ) : null}
      </section>

      <output className="sr-only" aria-live="polite" data-fen={liveFen} data-turn={game.turn()} data-history={history.join(' ')}>{lastAction}</output>
    </main>
  )
}

export default App
