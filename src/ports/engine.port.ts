import type { Result } from '../shared/result'

export interface EngineLine {
  evaluation: number
  moves: string[]
}

export interface EnginePort {
  analyze(fen: string, options: { lines: number; timeMs: number }, signal: AbortSignal): Promise<Result<EngineLine[]>>
  dispose?(): void
}
