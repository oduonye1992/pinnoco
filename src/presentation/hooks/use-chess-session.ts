import { useSyncExternalStore } from 'react'
import type { ChessSessionStore } from '../../application/chess-session.store'

export function useChessSession(store: ChessSessionStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
