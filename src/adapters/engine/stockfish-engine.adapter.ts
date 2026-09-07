import type { EngineLine, EnginePort } from '../../ports/engine.port'
import { domainError } from '../../shared/domain-error'
import { failure, success, type Result } from '../../shared/result'

interface PendingSearch {
  abort: () => void
  lines: Map<number, EngineLine>
  resolve: (result: Result<EngineLine[]>) => void
  timeout: ReturnType<typeof setTimeout>
}

const DEFAULT_TIME_MS = 750
const MAX_TIME_MS = 2_000

function engineFailure(message: string) {
  return failure<EngineLine[]>(domainError('ENGINE_UNAVAILABLE', message))
}

function parseInfoLine(line: string): { line: EngineLine; multipv: number } | null {
  const score = /\bscore\s+(cp|mate)\s+(-?\d+)/.exec(line)
  const principalVariation = /\bpv\s+(.+)$/.exec(line)
  if (!score || !principalVariation) return null

  const scoreType = score[1]
  const scoreValue = Number(score[2])
  const multipv = Number(/\bmultipv\s+(\d+)/.exec(line)?.[1] ?? 1)
  const evaluation = scoreType === 'cp'
    ? scoreValue / 100
    : scoreValue > 0
      ? 100_000 - scoreValue
      : -100_000 - scoreValue

  return {
    line: { evaluation, moves: principalVariation[1].trim().split(/\s+/) },
    multipv,
  }
}

export class StockfishEngineAdapter implements EnginePort {
  private pending: PendingSearch | null = null
  private ready: Promise<void> | null = null
  private rejectReady: ((reason: Error) => void) | null = null
  private resolveReady: (() => void) | null = null
  private worker: Worker | null = null

  constructor(private readonly workerUrl = '/stockfish/stockfish.wasm.js') {}

  analyze(
    fen: string,
    options: { lines: number; timeMs: number },
    signal: AbortSignal,
  ): Promise<Result<EngineLine[]>> {
    if (signal.aborted) return Promise.resolve(engineFailure('Engine analysis was cancelled.'))
    if (this.pending) return Promise.resolve(engineFailure('The chess engine is already thinking.'))

    return this.ensureReady()
      .then(() => signal.aborted
        ? engineFailure('Engine analysis was cancelled.')
        : this.startSearch(fen, options, signal))
      .catch((error: unknown) => engineFailure(error instanceof Error ? error.message : 'The chess engine could not start.'))
  }

  dispose(): void {
    this.pending?.abort()
    this.pending = null
    this.ready = null
    this.rejectReady = null
    this.resolveReady = null
    this.worker?.terminate()
    this.worker = null
  }

  private ensureReady(): Promise<void> {
    if (this.ready) return this.ready

    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve
      this.rejectReady = reject
      try {
        const worker = new Worker(this.workerUrl)
        worker.onmessage = (event) => this.handleMessage(String(event.data))
        worker.onerror = (event) => this.handleWorkerError(event.message || 'The chess engine worker failed.')
        this.worker = worker
        worker.postMessage('uci')
      } catch (error) {
        this.handleWorkerError(error instanceof Error ? error.message : 'The chess engine worker could not be created.')
      }
    })

    return this.ready
  }

  private startSearch(
    fen: string,
    options: { lines: number; timeMs: number },
    signal: AbortSignal,
  ): Promise<Result<EngineLine[]>> {
    const worker = this.worker
    if (!worker) return Promise.resolve(engineFailure('The chess engine worker is unavailable.'))
    if (signal.aborted) return Promise.resolve(engineFailure('Engine analysis was cancelled.'))

    const timeMs = Math.min(Math.max(options.timeMs || DEFAULT_TIME_MS, 100), MAX_TIME_MS)
    const lines = Math.min(Math.max(Math.trunc(options.lines) || 1, 1), 3)

    return new Promise((resolve) => {
      const abort = () => {
        if (!this.pending) return
        this.worker?.postMessage('stop')
        this.finishSearch(engineFailure('Engine analysis was cancelled.'))
      }

      this.pending = {
        abort,
        lines: new Map(),
        resolve,
        timeout: setTimeout(() => {
          this.worker?.postMessage('stop')
          this.finishSearch(engineFailure('The chess engine took too long to respond.'))
        }, timeMs + 1_000),
      }
      signal.addEventListener('abort', abort, { once: true })

      worker.postMessage(`setoption name MultiPV value ${lines}`)
      worker.postMessage('ucinewgame')
      worker.postMessage(`position fen ${fen}`)
      worker.postMessage(`go movetime ${timeMs}`)
    })
  }

  private handleMessage(line: string): void {
    if (line === 'uciok') {
      this.worker?.postMessage('isready')
      return
    }
    if (line === 'readyok') {
      this.resolveReady?.()
      this.resolveReady = null
      this.rejectReady = null
      return
    }

    const pending = this.pending
    if (!pending) return

    if (line.startsWith('info ')) {
      const parsed = parseInfoLine(line)
      if (parsed) pending.lines.set(parsed.multipv, parsed.line)
      return
    }

    const bestMove = /^bestmove\s+(\S+)/.exec(line)?.[1]
    if (!bestMove || bestMove === '(none)') {
      if (line.startsWith('bestmove')) this.finishSearch(engineFailure('The chess engine found no move.'))
      return
    }

    if (!pending.lines.size) pending.lines.set(1, { evaluation: 0, moves: [bestMove] })
    else {
      const topLine = pending.lines.get(1)
      if (!topLine?.moves.length) pending.lines.set(1, { evaluation: 0, moves: [bestMove] })
    }

    this.finishSearch(success([...pending.lines.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, lineValue]) => lineValue)))
  }

  private handleWorkerError(message: string): void {
    const error = new Error(message)
    this.rejectReady?.(error)
    this.rejectReady = null
    this.resolveReady = null
    if (this.pending) this.finishSearch(engineFailure(message))
    this.worker?.terminate()
    this.worker = null
    this.ready = null
  }

  private finishSearch(result: Result<EngineLine[]>): void {
    const pending = this.pending
    if (!pending) return
    clearTimeout(pending.timeout)
    this.pending = null
    pending.resolve(result)
  }
}
