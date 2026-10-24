import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Gavel, ListTree, Map as MapIcon, Footprints, Landmark, MapPin, Notebook, Pin, RotateCcw, Search, Users, X } from 'lucide-react'
import caseData from '../data/case001.json'
import type { CaseFile } from '../types/case'
import CrimeScene from '../scene/CrimeScene'
import { useGame, type PanelId } from '../state/game'
import AudioLab from './AudioLab'
import { AccusationModal, SuspectsPanel, TheoryBoard } from './Mystery'
import { useMystery } from '../state/mystery'
import { MapOverlay, ObjectiveCard, TimelinePanel } from './Progress'
import { resetInvestigation } from '../state/actions'
import { EvidenceToasts, InspectionPanel, InteractionPrompt, InventoryPanel, useInvestigationKeys } from './Investigation'
import HandControl from './HandControl'

const caseFile = caseData as CaseFile
type Panel = PanelId

const panels: { id: Panel; label: string; icon: typeof Search }[] = [
  { id: 'timeline', label: 'Timeline', icon: ListTree },
  { id: 'suspects', label: 'Suspects', icon: Users },
  { id: 'notes', label: 'Notes', icon: Notebook },
  { id: 'theory', label: 'Theory', icon: Pin },
]

function Key({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-slate-500/60 bg-ink-800/90 px-1.5 py-0.5 font-mono text-[10px] text-paper shadow-[0_2px_0_rgba(0,0,0,0.5)]">{children}</kbd>
}

export default function GameShell() {
  const viewMode = useGame((s) => s.viewMode)
  const currentRoomId = useGame((s) => s.currentRoomId)
  const setViewMode = useGame((s) => s.setViewMode)
  const teleportToRoom = useGame((s) => s.teleportToRoom)

  const [overviewRoomId, setOverviewRoomId] = useState<string | null>(null)
  const panel = useGame((s) => s.panel)
  const setPanel = useGame((s) => s.setPanel)
  const toggleMap = useGame((s) => s.toggleMap)
  const [notes, setNotes] = useState('')
  const [resetSignal, setResetSignal] = useState(0)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const on = () => setLocked(!!document.pointerLockElement)
    document.addEventListener('pointerlockchange', on)
    return () => document.removeEventListener('pointerlockchange', on)
  }, [])

  useInvestigationKeys()
  const inspecting = useGame((s) => s.inspectingId !== null)
  const explore = viewMode === 'explore'
  const shownRoomId = explore ? currentRoomId : overviewRoomId
  const room = caseFile.rooms.find((r) => r.id === shownRoomId) ?? null

  const goRoom = (id: string) => {
    if (explore) teleportToRoom(id)
    else setOverviewRoomId(id)
  }
  const toOverview = () => { setViewMode('overview'); setOverviewRoomId(null); setResetSignal((n) => n + 1) }
  const toExplore = () => setViewMode('explore')
  const reset = () => { resetInvestigation(); setOverviewRoomId(null); setPanel(null); teleportToRoom('main-gallery'); setResetSignal((n) => n + 1) }

  const chip = (active: boolean) => `rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur transition-colors ${active ? 'border-volt/70 bg-volt/20 text-volt-glow' : 'border-slate-600/50 bg-ink-950/70 text-slate-300 hover:border-volt/50'}`

  return (
    <div className="noir-bg relative h-full w-full overflow-hidden text-paper">
      <CrimeScene
        rooms={caseFile.rooms}
        hotspots={caseFile.hotspots}
        mode={viewMode}
        focusRoomId={overviewRoomId}
        resetSignal={resetSignal}
        onSelectRoom={(id) => setOverviewRoomId(id)}
      />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.65)]" />

      {/* top-left: case title + objective */}
      <div className="pointer-events-none absolute left-4 top-4 w-72 space-y-3">
        <div className="glass rounded-xl px-4 py-2.5">
          <p className="eyebrow !text-[9px]">{caseFile.number} · {caseFile.location}</p>
          <h1 className="font-display text-xl font-semibold leading-tight">Echo<span className="text-blood-glow">Crime</span> <span className="text-slate-400">·</span> {caseFile.title}</h1>
        </div>
        <ObjectiveCard />
        <p className="glass flex items-center gap-2 rounded-xl px-4 py-2 text-xs text-slate-300" data-testid="location">
          <MapPin className="h-3.5 w-3.5 text-volt" />
          {room ? <span className="text-paper">{room.name}</span> : <span className="text-slate-500">{explore ? 'Between rooms' : 'Museum overview'}</span>}
        </p>
      </div>

      {/* top-centre: room navigation */}
      <nav aria-label="Museum rooms" className="absolute left-1/2 top-[4.25rem] flex max-w-[44%] -translate-x-1/2 flex-wrap justify-center gap-1.5">
        <button onClick={explore ? toOverview : toExplore} className={`flex items-center gap-1.5 ${chip(!explore)}`} data-testid="mode-toggle">
          {explore ? <><Landmark className="h-3 w-3" /> Overview</> : <><Footprints className="h-3 w-3" /> Walk</>}
        </button>
        <span className="mx-1 w-px self-stretch bg-slate-600/50" />
        {caseFile.rooms.map((r) => (
          <button key={r.id} onClick={() => goRoom(r.id)} aria-pressed={shownRoomId === r.id} className={chip(shownRoomId === r.id)}>{r.short}</button>
        ))}
      </nav>

      {/* top-right: case-file panels */}
      <div className="absolute right-4 top-4 flex flex-col items-end gap-3">
        <div className="flex items-center gap-1.5">
          {!explore && (
            <button onClick={() => setResetSignal((n) => n + 1)} className={`flex items-center gap-1.5 ${chip(false)}`}><Camera className="h-3 w-3" /> Reset camera</button>
          )}
          {panels.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setPanel(panel === id ? null : id)} aria-pressed={panel === id} className={`flex items-center gap-1.5 ${chip(panel === id)}`}><Icon className="h-3 w-3" /> {label}</button>
          ))}
          <button onClick={() => toggleMap()} className={`flex items-center gap-1.5 ${chip(false)}`}><MapIcon className="h-3 w-3" /> Map</button>
          <button onClick={() => { const m = useMystery.getState(); if (m.verdict?.reveal) m.setVerdictShown(true); else m.setAccuseOpen(true) }} data-testid="open-accuse" className={`flex items-center gap-1.5 ${chip(false)} !border-red-300/50 !text-red-200`}><Gavel className="h-3 w-3" /> Accuse</button>
          <button onClick={reset} className={`flex items-center gap-1.5 ${chip(false)}`}><RotateCcw className="h-3 w-3" /> Reset</button>
        </div>
        <AnimatePresence>
          {panel && (
            <motion.aside key={panel} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="glass w-80 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="eyebrow">{panel === 'notes' ? 'Detective notes' : panel === 'theory' ? 'Theory board' : panel === 'timeline' ? 'Timeline of the night' : 'Suspects'}</p>
                <button onClick={() => setPanel(null)} aria-label="Close panel" className="text-slate-500 hover:text-slate-200"><X className="h-4 w-4" /></button>
              </div>
              {panel === 'suspects' && <SuspectsPanel />}
              {panel === 'timeline' && <TimelinePanel />}
              {panel === 'notes' && (
                <div className="mt-3">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Jot down your thoughts. W, A, S, D won't move you while you type here."
                    rows={7}
                    data-testid="notes"
                    className="w-full resize-none rounded-lg border border-slate-700/60 bg-ink-900/70 p-3 text-sm text-paper placeholder:text-slate-600 focus:border-volt/60 focus:outline-none"
                  />
                </div>
              )}
              {panel === 'theory' && <TheoryBoard />}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <MapOverlay />
      <AudioLab />
      <AccusationModal />
      <InteractionPrompt />
      <InspectionPanel />
      <InventoryPanel />
      <EvidenceToasts />
      <HandControl />

      {/* bottom: controls guide */}
      <div className={`pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 transition-opacity ${inspecting ? 'opacity-0' : ''}`}>
        <div className="glass flex items-center gap-5 rounded-xl px-5 py-2.5 text-xs text-slate-300" data-testid="controls-guide">
          {explore ? (
            <>
              <span className="flex items-center gap-1.5"><Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key> Move</span>
              <span className="flex items-center gap-1.5"><Key>Shift</Key> Run</span>
              <span className="flex items-center gap-1.5"><Key>Mouse</Key> Look</span>
              <span className="flex items-center gap-1.5"><Key>Esc</Key> Free cursor</span>
              <span className="flex items-center gap-1.5"><Key>E</Key> Inspect</span>
              <span className="flex items-center gap-1.5"><Key>Tab</Key> Evidence</span>
              <span className="flex items-center gap-1.5"><Key>T</Key> Timeline</span>
              <span className="flex items-center gap-1.5"><Key>M</Key> Map</span>
            </>
          ) : (
            <span>Drag to orbit · scroll to zoom · right-drag to pan · click a room</span>
          )}
        </div>
        {explore && !locked && (
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-volt-glow/80 drop-shadow">Click the scene to capture the mouse and look around</p>
        )}
      </div>
    </div>
  )
}
