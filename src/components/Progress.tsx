import { AnimatePresence, motion } from 'framer-motion'
import { Check, Circle, Clock, HelpCircle, Target, X } from 'lucide-react'
import { useGame } from '../state/game'
import { useEvidence, evidenceById } from '../state/evidence'
import { fmt, useAudio } from '../state/audio'
import { roomProgress, useObjectives, useProgress, useTimeline } from '../state/progress'
import { playerSave } from '../scene/sceneRefs'
import caseData from '../data/case001.json'
import type { CaseFile } from '../types/case'

const caseFile = caseData as CaseFile

/** Current objective, its hint, and the progress bar. */
export function ObjectiveCard() {
  const { list, current } = useObjectives()
  const p = useProgress()
  const done = list.filter((o) => o.complete).length
  return (
    <div className="glass rounded-xl p-4" data-testid="objectives">
      <div className="flex items-center justify-between">
        <p className="eyebrow flex items-center gap-2"><Target className="h-3 w-3" /> Objective</p>
        <span className="font-mono text-[11px] text-slate-400" data-testid="objective-count">{done} / {list.length}</span>
      </div>
      {current ? (
        <>
          <p className="mt-2 text-sm font-medium leading-snug text-paper" data-testid="objective-current">{current.text}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{current.hint}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-paper">Every lead so far is followed up. Keep searching and piece the night together.</p>
      )}
      <ul className="mt-3 space-y-1">
        {list.map((o) => (
          <li key={o.id} className={`flex items-center gap-2 text-[11px] ${o.complete ? 'text-emerald-200/80' : o === current ? 'text-paper' : 'text-slate-500'}`}>
            {o.complete ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            <span className={o.complete ? 'line-through decoration-emerald-200/30' : ''}>{o.text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-slate-700/50 pt-3" data-testid="evidence-count">
        <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
          <span>Investigation</span><span className="text-paper" data-testid="progress-pct">{p.pct}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded bg-slate-800">
          <motion.div className="h-full rounded bg-gradient-to-r from-amber-300 to-emerald-300" animate={{ width: `${p.pct}%` }} transition={{ duration: 0.5 }} />
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-slate-500">Found {p.found}/{p.total} · Collected {p.collected}/{p.total}</p>
      </div>
    </div>
  )
}


/** Timeline of the night. Unrevealed events are unlabelled placeholders; revealed ones list their supporting evidence. */
export function TimelinePanel() {
  const entries = useTimeline()
  const heard = useAudio((s) => s.heard)
  const revealed = entries.filter((e) => e.revealed).length
  return (
    <div className="mt-3" data-testid="timeline">
      <p className="text-[11px] leading-relaxed text-slate-500">Events appear as you find evidence. Each entry is what the evidence suggests, not proof.</p>
      <ol className="relative mt-3 space-y-2 border-l border-slate-700/60 pl-4">
        {entries.map(({ event, revealed: on, basedOn }, i) => (
          <li key={event.id} data-testid={on ? 'timeline-known' : 'timeline-unknown'} className={`relative rounded-lg border p-2.5 ${on ? 'border-amber-300/30 bg-amber-300/5' : 'border-dashed border-slate-700/70 bg-ink-900/50'}`}>
            <span className={`absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full border ${on ? 'border-amber-200 bg-amber-300' : 'border-slate-600 bg-ink-900'}`} />
            {on ? (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-base leading-tight">{event.label}</span>
                  {heard[event.id]
                    ? <span className="flex items-center gap-1 font-mono text-[10px] text-sky-200" data-testid="timeline-time"><Clock className="h-3 w-3" /> {fmt(event.startSeconds)} on tape</span>
                    : <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-slate-500"><Clock className="h-3 w-3" /> time unconfirmed</span>}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{event.description}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-amber-200/70">Evidence: {basedOn.map((id) => evidenceById(id)?.name).join(', ')}</p>
              </motion.div>
            ) : (
              <span className="flex items-center gap-2 text-sm text-slate-500"><HelpCircle className="h-3.5 w-3.5" /> {event.unknownLabel} <span className="ml-auto font-mono text-[9px] text-slate-600">#{i + 1}</span></span>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 font-mono text-[10px] text-slate-500" data-testid="timeline-count">{revealed} of {entries.length} events revealed</p>
    </div>
  )
}

/** Floor plan (M): room investigation status and the detective's position. */
export function MapOverlay() {
  const open = useGame((s) => s.mapOpen)
  const close = useGame((s) => s.toggleMap)
  const visited = useGame((s) => s.visited)
  const current = useGame((s) => s.currentRoomId)
  const status = useEvidence((s) => s.status)
  const X0 = -7.5, Z0 = -8.5, W = 18.5, H = 15.5, S = 34
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          className="glass absolute left-1/2 top-1/2 w-[760px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-xl p-5" data-testid="map">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Riverside Museum · floor plan</p>
            <button onClick={() => close(false)} aria-label="Close map" className="text-slate-500 hover:text-slate-200"><X className="h-4 w-4" /></button>
          </div>
          <svg viewBox={`0 0 ${W * S} ${H * S}`} className="mt-3 w-full rounded-lg border border-slate-700/50 bg-ink-950/80">
            {caseFile.rooms.map((r) => {
              const [x0, x1, z0, z1] = r.bounds
              const pr = roomProgress(r.id, status)
              const seen = visited[r.id]
              const full = pr.total > 0 && pr.found === pr.total
              return (
                <g key={r.id} data-testid={`map-room-${r.id}`} data-visited={seen ? '1' : '0'} data-found={pr.found}>
                  <rect x={(x0 - X0) * S} y={(z0 - Z0) * S} width={(x1 - x0) * S} height={(z1 - z0) * S}
                    fill={full ? 'rgba(110,231,183,0.16)' : seen ? 'rgba(56,189,248,0.12)' : 'rgba(30,41,59,0.5)'}
                    stroke={r.id === current ? '#7dd3fc' : '#475569'} strokeWidth={r.id === current ? 3 : 1.5} />
                  <text x={((x0 + x1) / 2 - X0) * S} y={((z0 + z1) / 2 - Z0) * S - 6} textAnchor="middle" fill="#e8e4d8" fontSize="15" fontFamily="Georgia, serif">{r.name}</text>
                  <text x={((x0 + x1) / 2 - X0) * S} y={((z0 + z1) / 2 - Z0) * S + 14} textAnchor="middle" fill={full ? '#6ee7b7' : '#94a3b8'} fontSize="11" fontFamily="monospace">
                    {seen ? (pr.total ? `${pr.found}/${pr.total} clues` : 'visited') : 'unexplored'}
                  </text>
                </g>
              )
            })}
            <circle cx={(playerSave.x - X0) * S} cy={(playerSave.z - Z0) * S} r="7" fill="#fde68a" stroke="#000" strokeWidth="2" data-testid="map-player" />
          </svg>
          <p className="mt-2 font-mono text-[10px] text-slate-500">Cyan outline: you are here · green: every clue in the room found · <kbd className="rounded border border-slate-600 px-1">M</kbd> to close</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
