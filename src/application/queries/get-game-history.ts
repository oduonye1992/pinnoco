import { getGamePath } from '../../domains/game/game.model'
import type { ChessSessionState } from '../../domains/session/session.types'

export function getGameHistory(state: ChessSessionState) {
  return getGamePath(state.game)
}
