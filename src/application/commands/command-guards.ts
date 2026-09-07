import type { ChessSessionState } from '../../domains/session/session.types'
import { domainError } from '../../shared/domain-error'
import { failure, success, type Result } from '../../shared/result'
import type { CommandSource } from './command.types'

export function validateRevision(
  state: ChessSessionState,
  source: CommandSource,
  expectedRevision?: number,
): Result<void> {
  if (source === 'agent' && expectedRevision === undefined) {
    return failure(domainError('INVALID_INPUT', 'Agent mutations require expectedRevision. Read the game state first.'))
  }

  if (expectedRevision !== undefined && expectedRevision !== state.revision) {
    return failure(domainError(
      'STALE_REVISION',
      `The board changed. Expected revision ${expectedRevision}, but the current revision is ${state.revision}.`,
    ))
  }

  return success(undefined)
}
