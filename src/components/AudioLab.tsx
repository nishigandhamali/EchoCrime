import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Flag, Pause, Play, Volume2, X } from 'lucide-react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { fmt, useAudio } from '../state/audio'
import { useGame } from '../state/game'
import { useEvidence, evidenceById } from '../state/evidence'
import { collectInspected } from '../state/actions'
import { useTimeline } from '../state/progress'
import { Check, Fingerprint } from 'lucide-react'
import WhatIf from './WhatIf'

const SRC = `${import.meta.env.BASE_URL}audio/gallery_mic_3.wav`

/** Security-room audio lab: real waveform of the real recording file, seek, volume, bookmarks, replay of discovered events. */
export default function AudioLab() {
  const open = useAudio((s) => s.labOpen)
  return <AnimatePresence>{open && <Lab key="lab" />}</AnimatePresence>
}

function Lab() {
  const container = useRef<HTMLDivElement>(null)
  const ws = useRef<WaveSurfer | null>(null)
  const regions = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'tape' | 'whatif'>('tape')
  const timeline = useTimeline()
  const marks = useAudio((s) => s.marks)
  const message = useAudio((s) => s.message)
  const close = useAudio((s) => s.closeLab)
  const markHeard = useAudio((s) => s.markHeard)
  const revealed = useMemo(() => timeline.filter((t) => t.revealed), [timeline])
  const segEnd = useRef<number | null>(null)
  const revealedRef = useRef(revealed)
  revealedRef.current = revealed
  const inspecting = useGame((s) => s.inspectingId)
  const status = useEvidence((s) => s.status['ev-terminal'])
  const log = evidenceById('ev-terminal')

  useEffect(() => {
    const rg = RegionsPlugin.create()
    regions.current = rg
    const w = WaveSurfer.create({
      container: container.current!, url: SRC, height: 120, waveColor: '#38bdf8', progressColor: '#fbbf24', cursorColor: '#fde68a',
      barWidth: 2, barGap: 1, barRadius: 1, normalize: false, plugins: [rg],
    })
    ws.current = w
    if (import.meta.env.DEV) Object.assign(window, { __ws: w, __regions: () => rg.getRegions().map((r) => ({ start: r.start, label: r.content?.textContent ?? '' })) })
    w.on('ready', (d) => { setReady(true); setDuration(d) })
    w.on('error', (e) => setError(String(e)))
    w.on('play', () => setPlaying(true))
    w.on('pause', () => setPlaying(false))
    w.on('timeupdate', (t) => {
      setTime(t)
      if (segEnd.current !== null && t >= segEnd.current) { segEnd.current = null; w.pause() } // segment playback stops where the event ends
      for (const { event } of revealedRef.current) if (t >= event.startSeconds + 0.4 && t <= event.startSeconds + event.durationSeconds) markHeard(event.id)
    })
    w.setVolume(0.8)
    return () => { w.destroy(); ws.current = null }
  }, [markHeard])

  // evidence-backed markers only: revealed events get a labelled region; hidden ones stay unlabelled
  useEffect(() => {
    const rg = regions.current
    if (!rg || !ready) return
    rg.clearRegions()
    for (const { event } of revealed) rg.addRegion({ start: event.startSeconds, end: event.startSeconds + event.durationSeconds, color: 'rgba(251,191,36,0.16)', content: event.label, drag: false, resize: false })
    for (const m of marks) rg.addRegion({ start: m.t, color: m.result === 'clue' ? '#6ee7b7' : '#fde68a', content: '⚑', drag: false, resize: false })
  }, [revealed, marks, ready])

  const toggle = () => { segEnd.current = null; ws.current?.playPause() }
  const playSegment = (start: number, end: number) => { const w = ws.current; if (!w) return; segEnd.current = end; w.setTime(start); w.play() }

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 240, damping: 28 }}
      className="glass absolute inset-x-6 bottom-6 mx-auto max-w-5xl rounded-xl border-sky-300/25 p-5" data-testid="audio-lab">
      <button onClick={close} aria-label="Close audio lab" className="absolute right-3 top-3 text-slate-500 hover:text-slate-200"><X className="h-4 w-4" /></button>
      <div className="flex flex-wrap items-baseline justify-between gap-2 pr-8">
        <div>
          <p className="eyebrow">Audio forensics lab</p>
          <h2 className="font-display text-2xl font-semibold leading-tight">Gallery Mic 3 · 23:47:00</h2>
        </div>
        <p className="max-w-md text-right font-mono text-[10px] leading-relaxed text-slate-500">Stand-in recording synthesised with DSP for this game (not a real event). The waveform below is drawn from that file's samples.</p>
      </div>

      <div className="mt-3 flex gap-1 border-b border-slate-700/50" role="tablist">
        {([['tape', 'Original tape'], ['whatif', 'What if? · reconstruct']] as const).map(([id, name]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} data-testid={`tab-${id}`} className={`rounded-t-lg px-4 py-1.5 text-xs transition-colors ${tab === id ? 'border-b-2 border-sky-300 text-sky-100' : 'text-slate-500 hover:text-slate-200'}`}>{name}</button>
        ))}
      </div>
      {tab === 'whatif' && <div className="max-h-[46vh] overflow-y-auto pr-1"><WhatIf /></div>}
      <div className={tab === 'tape' ? '' : 'hidden'}>
      <div className="mt-3 rounded-lg border border-sky-300/15 bg-ink-950/80 px-3 py-2">
        <div ref={container} data-testid="waveform" />
        {!ready && !error && <p className="py-6 text-center font-mono text-xs text-slate-500">Decoding recording…</p>}
        {error && <p className="py-6 text-center font-mono text-xs text-red-300">Could not load the recording: {error}</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={toggle} disabled={!ready} data-testid="play" aria-label={playing ? 'Pause' : 'Play'} className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-300/50 bg-sky-300/10 text-sky-200 transition-colors hover:bg-sky-300/20 disabled:opacity-40">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
        </button>
        <span className="font-mono text-sm text-slate-300" data-testid="clock"><span className="text-amber-200">{fmt(time)}</span> / {fmt(duration)}</span>
        <label className="ml-2 flex items-center gap-2 text-slate-400"><Volume2 className="h-4 w-4" />
          <input type="range" min={0} max={1} step={0.05} value={volume} data-testid="volume" aria-label="Volume" onChange={(e) => { const v = Number(e.target.value); setVolume(v); ws.current?.setVolume(v) }} className="w-28 accent-amber-300" />
        </label>
        <button onClick={() => useAudio.getState().markAt(ws.current?.getCurrentTime() ?? 0)} disabled={!ready} data-testid="mark" className="ml-auto flex items-center gap-2 rounded-lg border border-amber-200/50 bg-amber-200/10 px-3.5 py-1.5 text-sm text-amber-100 transition-colors hover:bg-amber-200/20 disabled:opacity-40">
          <Flag className="h-4 w-4" /> Mark this moment
        </button>
      </div>
      <p className="mt-2 min-h-[1.25rem] text-xs text-slate-300" data-testid="mark-message" aria-live="polite">{message || 'Click the waveform to seek, play, and mark any sound you think matters.'}</p>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_320px]">
        <div>
          <p className="eyebrow">Discovered segments</p>
          {revealed.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">Nothing identified yet. Evidence from around the museum unlocks labelled segments here.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2" data-testid="segments">
              {revealed.map(({ event }) => (
                <li key={event.id}>
                  <button onClick={() => playSegment(event.startSeconds, event.startSeconds + event.durationSeconds)} data-testid={`segment-${event.id}`} className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/5 px-3 py-1.5 text-xs hover:bg-amber-300/10">
                    <Play className="h-3 w-3 text-amber-200" /> {event.label} <span className="font-mono text-[10px] text-slate-500">{fmt(event.startSeconds)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {log && status && inspecting === 'hs-terminal' && (
          <div className="rounded-lg border border-slate-700/60 bg-ink-900/70 p-3">
            <p className="font-display text-base leading-tight">{log.name}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{log.description}</p>
            {status === 'confirmed' ? (
              <p className="mt-2 flex items-center gap-2 text-xs text-emerald-200"><Check className="h-3.5 w-3.5" /> In your evidence inventory</p>
            ) : (
              <button onClick={collectInspected} data-testid="collect" className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-200/10 px-3 py-1 text-xs text-amber-100 hover:bg-amber-200/20"><Fingerprint className="h-3.5 w-3.5" /> Collect log <kbd className="rounded border border-amber-200/40 px-1 font-mono text-[10px]">Enter</kbd></button>
            )}
          </div>
        )}
      </div>
      </div>
    </motion.div>
  )
}
