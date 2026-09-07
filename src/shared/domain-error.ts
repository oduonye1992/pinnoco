export type DomainErrorCode =
  | 'ENGINE_UNAVAILABLE'
  | 'ILLEGAL_MOVE'
  | 'INVALID_INPUT'
  | 'INVALID_POSITION'
  | 'NOT_AUTHORIZED'
  | 'NOT_LIVE_POSITION'
  | 'PERSISTENCE_ERROR'
  | 'STALE_REVISION'
  | 'WRONG_TURN'

export interface DomainError {
  code: DomainErrorCode
  message: string
}

export function domainError(code: DomainErrorCode, message: string): DomainError {
  return { code, message }
}
