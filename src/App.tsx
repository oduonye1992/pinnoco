import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ChessSessionStore } from './application/chess-session.store'
import { getGameHistory } from './application/queries/get-game-history'
import type { PositionNode } from './domains/game/game.types'
import { GameBoard } from './presentation/components/GameBoard'
import { Onboarding } from './presentation/components/Onboarding'
import { ScenarioBoard } from './presentation/components/ScenarioBoard'
import { useChessSession } from './presentation/hooks/use-chess-session'

interface AppProps {
  onboarding: {
    complete(): void
    hasCompleted(): boolean
    reset(): void
  }
  store: ChessSessionStore
}

function App({ onboarding, store }: AppProps) {
  const [showOnboarding, setShowOnboarding] = useState(() => !onboarding.hasCompleted())
  const [previewPosition, setPreviewPosition] = useState<PositionNode | null>(null)
  const snapshot = useChessSession(store)
  const { analysis, game } = snapshot.session
  const history = getGameHistory(snapshot.session)

  useEffect(() => {
    if (!analysis) setPreviewPosition(null)
  }, [analysis])

  useEffect(() => {
    const handleReset = () => {
      onboarding.reset()
      setShowOnboarding(true)
    }
    window.addEventListener('pinnoco:reset', handleReset)
    return () => window.removeEventListener('pinnoco:reset', handleReset)
  }, [onboarding])

  useEffect(() => {
    const handleStart = () => {
      onboarding.complete()
      setShowOnboarding(false)
    }
    window.addEventListener('pinnoco:start', handleStart)
    return () => window.removeEventListener('pinnoco:start', handleStart)
  }, [onboarding])

  const reset = () => {
    onboarding.reset()
    setShowOnboarding(true)
    void store.reset()
  }

  const start = () => {
    onboarding.complete()
    setShowOnboarding(false)
  }

  return (
    <main className={`app-shell ${analysis ? 'has-scenario' : ''}`}>
      <header className="topbar">
        <div className="brand" aria-label="Pinnoco chess study">
          <span className="brand-name">pinnoco</span>
        </div>
        <button aria-label="Reset Pinnoco" className="restart-button" type="button" onClick={reset}><RotateCcw size={16} /> Reset</button>
      </header>

      <section className="boards" aria-label="Chess boards">
        <GameBoard game={game} previewPosition={previewPosition} store={store} />
        {analysis ? <ScenarioBoard analysis={analysis} currentGamePly={history.length - 1} key={analysis.id} onPreview={setPreviewPosition} store={store} /> : null}
      </section>

      <output
        className="sr-only"
        aria-live="polite"
        data-fen={game.nodes[game.currentNodeId].fen}
        data-history={history.slice(1).map((node) => node.move?.san).filter(Boolean).join(' ')}
        data-revision={snapshot.session.revision}
        data-turn={game.turn}
      >
        {snapshot.lastAnnouncement}
      </output>
      {showOnboarding ? <Onboarding onStart={start} /> : null}
    </main>
  )
}

export default App
