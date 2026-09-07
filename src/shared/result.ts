import type { DomainError } from './domain-error'

export type Result<T> =
  | { ok: true; value: T }
  | { error: DomainError; ok: false }

export function failure<T>(error: DomainError): Result<T> {
  return { error, ok: false }
}

export function success<T>(value: T): Result<T> {
  return { ok: true, value }
}
