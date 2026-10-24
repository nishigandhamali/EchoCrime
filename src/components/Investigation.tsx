import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Fingerprint, Lock, Search, X } from 'lucide-react'
import { useGame } from '../state/game'
import { eventById, evidenceById, useEvidence, type EvidenceStatus } from '../state/evidence'
import { collectInspected, hotspotById, inspectHotspot } from '../state/actions'
import { isTypingTarget } from '../lib/input'
import { useAudio } from '../state/audio'
import { useMystery } from '../state/mystery'
import caseData from '../data/case001.json'
import type { CaseFile } from '../types/case'

const caseFile = caseData as CaseFile

/** E inspects the nearby object, Enter collects it, Esc closes, Tab toggles the inventory. Ignored while typing. */
export function useInvestigationKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.repeat) return
      const g = useGame.getState()
      if (g.viewMode !== 'explore') return
      if (e.code === 'KeyE' && !g.frozen && g.nearbyId) inspectHotspot(g.nearbyId)
      else if (e.code === 'Enter' && g.inspectingId) collectInspected()
      else if (e.code === 'Escape' && useMystery.getState().verdictShown) useMystery.getState().setVerdictShown(false)
      else if (e.code === 'Escape' && useMystery.getState().accuseOpen && !useMystery.getState().verdict?.reveal) useMystery.getState().setAccuseOpen(false)
      else if (e.code === 'Escape') { if (useAudio.getState().labOpen) { useAudio.getState().closeLab(); g.closeInspection() } else if (g.inspectingId) g.closeInspection(); else if (g.mapOpen) g.toggleMap(false); else if (g.inventoryOpen) g.toggleInventory(false); else if (g.panel) g.setPanel(null) }
      else if (e.code === 'Tab') { e.preventDefault(); if (!g.inspectingId) g.toggleInventory() }
      else if (e.code === 'KeyM' && !g.inspectingId) g.toggleMap()
      else if (e.code === 'KeyT' && !g.inspectingId) g.setPanel(g.panel === 'timeline' ? null : 'timeline')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export function InteractionPrompt() {
  const nearbyId = useGame((s) => s.nearbyId)
  const frozen = useGame((s) => s.frozen)
  const h = nearbyId ? hotspotById(nearbyId) : undefined
  return (
    <AnimatePresence>
      {h && !frozen && (
        <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.16 }}
          className="pointer-events-none absolute left-1/2 top-[62%] -translate-x-1/2" data-testid="prompt">
          <div className="glass flex items-center gap-3 rounded-lg border-amber-200/30 px-4 py-2.5 shadow-[0_0_30px_-6px_rgba(255,210,122,0.5)]">
            <Search className="h-4 w-4 text-amber-200" />
            <kbd className="rounded border border-amber-200/60 bg-ink-800 px-2 py-0.5 font-mono text-xs text-amber-100">E</kbd>
            <span className="text-sm"><span className="text-slate-400">Inspect</span> <span className="font-medium text-paper">{h.name}</span></span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const badge: Record<EvidenceStatus, { label: string; cls: string }> = {
  locked: { label: 'Locked', cls: 'border-slate-600 text-slate-500' },
  available: { label: 'Undiscovered', cls: 'border-slate-600 text-slate-500' },
  discovered: { label: 'Discovered', cls: 'border-amber-300/60 text-amber-200' },
  confirmed: { label: 'Collected', cls: 'border-emerald-300/60 text-emerald-200' },
}

export function InspectionPanel() {
  const labOpen = useAudio((s) => s.labOpen)
  const id = useGame((s) => s.inspectingId)
  const close = useGame((s) => s.closeInspection)
  const h = id ? hotspotById(id) : undefined
  const ev = h?.evidenceId ? evidenceById(h.evidenceId) : undefined
  const status = useEvidence((s) => (ev ? s.status[ev.id] : null))
  return (
    <AnimatePresence>
      {h && !labOpen && (
        <motion.div key={h.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="glass absolute right-6 top-24 w-[400px] rounded-xl border-amber-200/25 p-5" data-testid="inspection">
          <button onClick={close} aria-label="Close inspection" className="absolute right-3 top-3 text-slate-500 hover:text-slate-200"><X className="h-4 w-4" /></button>
          <p className="eyebrow flex items-center gap-2"><Fingerprint className="h-3 w-3" /> Inspecting</p>
          <h2 className="mt-1 font-display text-3xl font-semibold leading-tight">{h.name}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{h.inspection}</p>
          {ev && status && (
            <div className="mt-4 rounded-lg border border-slate-700/60 bg-ink-900/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-lg leading-tight">{ev.name}</p>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${badge[status].cls}`}>{badge[status].label}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{ev.description}</p>
              <div className="mt-3 flex items-center gap-3">
                {status === 'confirmed' ? (
                  <span className="flex items-center gap-2 text-sm text-emerald-200"><Check className="h-4 w-4" /> In your evidence inventory</span>
                ) : (
                  <button onClick={collectInspected} data-testid="collect" className="flex items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-200/10 px-3.5 py-1.5 text-sm text-amber-100 transition-colors hover:bg-amber-200/20">
                    <Fingerprint className="h-4 w-4" /> Collect evidence <kbd className="ml-1 rounded border border-amber-200/40 px-1 font-mono text-[10px]">Enter</kbd>
                  </button>
                )}
                <button onClick={close} className="ml-auto text-xs text-slate-400 hover:text-slate-100">Close <kbd className="ml-1 rounded border border-slate-600 px-1 font-mono text-[10px]">Esc</kbd></button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Cinematic banner for discoveries, collections and timeline updates; shown one at a time, oldest first. */
export function EvidenceToasts() {
  const toasts = useEvidence((s) => s.toasts)
  const dismiss = useEvidence((s) => s.dismissToast)
  const t = toasts[0]
  useEffect(() => {
    if (!t) return
    const timer = setTimeout(() => dismiss(t.id), t.kind === 'timeline' ? 2600 : 2400)
    return () => clearTimeout(timer)
  }, [t, dismiss])
  const ev = t ? evidenceById(t.evidenceId) : undefined
  const event = t?.eventId ? eventById(t.eventId) : undefined
  const style = { discovered: ['New evidence discovered', 'text-amber-200', 'via-amber-200'], collected: ['Evidence collected', 'text-emerald-200', 'via-emerald-200'], timeline: ['Timeline updated', 'text-sky-200', 'via-sky-200'] } as const
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[17%] flex justify-center">
      <AnimatePresence mode="wait">
        {t && ev && (
          <motion.div key={t.id} initial={{ opacity: 0, scale: 0.92, letterSpacing: '0.1em' }} animate={{ opacity: 1, scale: 1, letterSpacing: '0.35em' }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center" data-testid="toast" data-kind={t.kind}>
            <p className={`font-mono text-xs uppercase drop-shadow-[0_0_14px_rgba(0,0,0,0.9)] ${style[t.kind][1]}`}>{style[t.kind][0]}</p>
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className={`mx-auto mt-2 h-px w-72 bg-gradient-to-r from-transparent ${style[t.kind][2]} to-transparent`} />
            <p className="mt-3 font-display text-4xl font-semibold tracking-wide text-paper drop-shadow-[0_2px_18px_rgba(0,0,0,0.95)]">{t.kind === 'timeline' && event ? event.label : ev.name}</p>
            {t.kind === 'timeline' && <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.25em] text-slate-300">a new event joins the timeline · press T</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function InventoryPanel() {
  const open = useGame((s) => s.inventoryOpen)
  const close = useGame((s) => s.toggleInventory)
  const status = useEvidence((s) => s.status)
  const collected = caseFile.evidence.filter((e) => status[e.id] === 'confirmed').length
  return (
    <AnimatePresence>
      {open && (
        <motion.aside initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}
          className="glass absolute bottom-20 left-4 top-60 w-80 overflow-y-auto rounded-xl p-4" data-testid="inventory">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Evidence inventory</p>
            <span className="font-mono text-[11px] text-slate-400">{collected} / {caseFile.evidence.length} collected</span>
          </div>
          <ul className="mt-3 space-y-2">
            {caseFile.evidence.map((e, i) => {
              const st = status[e.id]
              const known = st === 'discovered' || st === 'confirmed'
              return (
                <li key={e.id} className={`rounded-lg border p-2.5 ${st === 'confirmed' ? 'border-emerald-300/30 bg-emerald-300/5' : known ? 'border-amber-300/30 bg-amber-300/5' : 'border-dashed border-slate-700/70 bg-ink-900/50'}`}>
                  {known ? (
                    <>
                      <div className="flex items-center justify-between gap-2"><span className="font-display text-base leading-tight">{e.name}</span><span className={`rounded-full border px-1.5 py-px font-mono text-[8px] uppercase tracking-widest ${badge[st].cls}`}>{badge[st].label}</span></div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{e.description}</p>
                    </>
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-slate-500"><Lock className="h-3.5 w-3.5" /> {st === 'locked' ? 'Hidden evidence' : `Unknown clue ${i + 1}`}</span>
                  )}
                </li>
              )
            })}
          </ul>
          <button onClick={() => close(false)} className="mt-3 text-xs text-slate-400 hover:text-slate-100">Close <kbd className="ml-1 rounded border border-slate-600 px-1 font-mono text-[10px]">Tab</kbd></button>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
