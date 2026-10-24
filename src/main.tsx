import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import GameShell from './components/GameShell'
import { useGame } from './state/game'
import { useEvidence } from './state/evidence'
import { useAudio } from './state/audio'
import { useMystery } from './state/mystery'

// dev-only: lets automated checks read game state
if (import.meta.env.DEV) (window as unknown as { __stores?: unknown }).__stores = { game: useGame, evidence: useEvidence, audio: useAudio, mystery: useMystery }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameShell />
  </StrictMode>,
)
