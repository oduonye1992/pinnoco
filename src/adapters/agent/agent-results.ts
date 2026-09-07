import type { DomainError } from '../../shared/domain-error'
import type { AgentToolResult } from './capability.types'

export function errorToolResult(error: DomainError, metadata?: Record<string, unknown>): AgentToolResult {
  return {
    content: [{ text: JSON.stringify({ error, ...metadata }), type: 'text' }],
    isError: true,
  }
}

export function textToolResult(value: unknown): AgentToolResult {
  return {
    content: [{ text: typeof value === 'string' ? value : JSON.stringify(value), type: 'text' }],
  }
}
