import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Pause, Play, Sparkles } from 'lucide-react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { applyEdits, type EventId, type Reconstruction, type SlotEvent } from '../lib/hypothesis'
import { askHypothesis } from '../lib/api'
import { renderReconstruction, type RenderedTape } from '../lib/reconstruct'
import { useAudio } from '../state/audio'
import { useTimeline } from '../state/progress'
import caseData from '../data/case001.json'
import type { CaseFile } from '../types/case'

const caseFile = caseData as CaseFile
const ORIGINAL = `${import.meta.env.BASE_URL}audio/gallery_mic_3.wav`
const BASE: SlotEvent[] = caseFile.events.map((e) => ({ id: e.id as EventId, start: e.startSeconds, duration: e.durationSeconds }))

/** One waveform row with its own transport; optionally highlights regions. */
function Row({ title, url, tag, regions, testid }: { title: string; url: string | null; tag: string; regions: { start: number; end: number; color: string; label: string }[]; testid: string }) {
  const box = useRef<HTMLDivElement>(null)
  const ws = useRef<WaveSurfer | null>(null)
  const rg = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!url) return
    setReady(false)
    const plugin = RegionsPlugin.create()
    rg.current = plugin
    const w = WaveSurfer.create({ container: box.current!, url, height: 64, waveColor: '#38bdf8', progressColor: '#fbbf24', cursorColor: '#fde68a', barWidth: 2, barGap: 1, barRadius: 1, normalize: false, plugins: [plugin] })
    ws.current = w
    w.on('ready', () => setReady(true))
    w.on('play', () => setPlaying(true)); w.on('pause', () => setPlaying(false)); w.on('finish', () => setPlaying(false))
    if (import.meta.env.DEV) Object.assign(window, { [`__ws_${testid}`]: w })
    return () => { w.destroy(); ws.current = null }
  }, [url, testid])
  useEffect(() => {
    if (!ready || !rg.current) return
    rg.current.clearRegions()
    for (const r of regions) rg.current.addRegion({ start: r.start, end: r.end, color: r.color, content: r.label, drag: false, resize: false })
  }, [ready, regions])
  return (
    <div className="rounded-lg border border-sky-300/15 bg-ink-950/80 px-3 py-2" data-testid={testid}>
      <div className="flex items-center gap-2">
        <button onClick={() => ws.current?.playPause()} disabled={!ready} aria-label={`Play ${title}`} data-testid={`${testid}-play`} className="flex h-7 w-7 items-center justify-center rounded-full border border-sky-300/50 text-sky-200 hover:bg-sky-300/10 disabled:opacity-40">
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 translate-x-px" />}
        </button>
        <span className="font-display text-base">{title}</span>
        <span className="rounded-full border border-slate-600 px-2 py-px font-mono text-[9px] uppercase tracking-widest text-slate-400">{tag}</span>
      </div>
      <div ref={box} className="mt-1" />
      {!ready && url && <p className="py-3 text-center font-mono text-[10px] text-slate-500">Loading…</p>}
    </div>
  )
}

/** "What if?": turn a sentence into structured edits, assemble the alternative tape, and compare it with the original. */
export default function WhatIf() {
  const timeline = useTimeline()
  const revealed = useMemo(() => timeline.filter((t) => t.revealed).map((t) => t.event), [timeline])
  const known = revealed.map((e) => e.id as EventId)
  const knownRef = useRef(known)
  knownRef.current = known
  const log = useAudio((s) => s.hypotheses)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ recon: Reconstruction; tape: RenderedTape; source: string; question: string } | null>(null)

  const label = (id: EventId) => (known.includes(id) ? caseFile.events.find((e) => e.id === id)!.label : 'an unidentified sound')
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.tape.url) }, [result])

  const suggestions = useMemo(() => {
    const has = (id: string) => known.includes(id as EventId)
    const out: string[] = []
    if (has('glass') && has('steps')) out.push('What if the glass broke after the footsteps?')
    if (has('clang') && has('glass')) out.push('What if the metal object fell before the glass broke?')
    if (has('vehicle')) out.push('What if there was no vehicle?')
    if (has('door') && has('steps')) out.push('What if the footsteps came before the door opened?')
    if (has('door') && has('glass')) out.push('What if someone entered before the glass broke?')
    if (has('vehicle') && has('clang')) out.push('What if the vehicle started before the metal object fell?')
    return out.slice(0, 4)
  }, [known])

  async function run(q: string) {
    setError(''); setBusy(true)
    try {
      const parsed = await askHypothesis(q, knownRef.current)
      if (!parsed.ok) { setError(parsed.reason ?? 'That is not a hypothesis I can test.'); return }
      const recon = applyEdits(BASE, parsed.edits, label)
      const tape = await renderReconstruction(recon)
      setResult((old) => { if (old) URL.revokeObjectURL(old.tape.url); return { recon, tape, source: parsed.source, question: q } })
      useAudio.getState().logHypothesis({ question: q, summary: recon.summary, changed: recon.changes.length })
    } catch (e) {
      setError(`Could not build the reconstruction: ${(e as Error).message}`)
    } finally { setBusy(false) }
  }

  const origRegions = useMemo(() => (result?.recon.changes ?? []).map((c) => ({ start: c.from, end: c.from + BASE.find((b) => b.id === c.id)!.duration, color: 'rgba(248,113,113,0.28)', label: c.kind === 'removed' ? `${label(c.id)} (removed)` : label(c.id) })), [result]) // eslint-disable-line react-hooks/exhaustive-deps
  const altRegions = useMemo(() => (result?.recon.changes ?? []).filter((c) => c.kind === 'moved').map((c) => ({ start: c.to!, end: c.to! + BASE.find((b) => b.id === c.id)!.duration, color: 'rgba(251,191,36,0.3)', label: label(c.id) })), [result]) // eslint-disable-line react-hooks/exhaustive-deps
  const sourceNote: Record<string, string> = { llm: 'Sentence interpreted by an LLM on the server; sounds assembled from the bundled clips.', rules: 'Sentence interpreted by the server\'s rule parser; sounds assembled from the bundled clips.', 'offline-rules': 'Server unreachable: interpreted by the in-browser rule parser; sounds assembled from the bundled clips.' }

  return (
    <div className="mt-3" data-testid="whatif">
      <div className="flex items-start gap-2 rounded-lg border border-amber-300/30 bg-amber-300/5 p-2.5 text-[11px] leading-relaxed text-amber-100/90" data-testid="whatif-disclaimer">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span><strong>Hypothetical reconstruction, not evidence.</strong> It re-assembles the same sounds in a different order so you can hear it. It cannot show what actually happened, and nothing in your evidence changes.</span>
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim() && !busy) run(text.trim()) }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="What if the glass broke after the footsteps?" maxLength={200} data-testid="whatif-input" aria-label="What if question"
          className="min-w-0 flex-1 rounded-lg border border-slate-700/60 bg-ink-900/70 px-3 py-2 text-sm text-paper placeholder:text-slate-600 focus:border-sky-300/60 focus:outline-none" />
        <button type="submit" disabled={busy || !text.trim()} data-testid="whatif-go" className="flex items-center gap-2 rounded-lg border border-sky-300/60 bg-sky-300/10 px-4 py-2 text-sm text-sky-100 transition-colors hover:bg-sky-300/20 disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" data-testid="whatif-spinner" /> : <Sparkles className="h-4 w-4" />} Reconstruct
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="suggestions">
          {suggestions.map((s) => <button key={s} onClick={() => { setText(s); run(s) }} disabled={busy} className="rounded-full border border-slate-600/70 px-3 py-1 text-[11px] text-slate-300 hover:border-sky-300/60 hover:text-sky-100 disabled:opacity-40">{s}</button>)}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-300" data-testid="whatif-error" role="alert">{error}</p>}
      {known.length < 2 && <p className="mt-2 text-xs text-slate-500">Identify at least two sounds with evidence first; hypotheses can only use sounds you have found.</p>}

      {result && (
        <div className="mt-3 space-y-2" data-testid="whatif-result">
          <p className="text-xs text-slate-200"><span className="font-mono text-[10px] uppercase tracking-widest text-amber-200">Changes</span> <span data-testid="whatif-summary">{result.recon.summary}</span></p>
          <Row title="Original recording" url={ORIGINAL} tag="evidence" regions={origRegions} testid="row-original" />
          <Row title="Alternative (hypothetical)" url={result.tape.url} tag="what if" regions={altRegions} testid="row-alt" />
          <p className="font-mono text-[10px] text-slate-500" data-testid="whatif-source">{sourceNote[result.source]} AI sound generation is not configured, so no new sounds were created.</p>
        </div>
      )}
      {log.length > 0 && <p className="mt-2 font-mono text-[10px] text-slate-600" data-testid="whatif-count">{log.length} hypothes{log.length === 1 ? 'is' : 'es'} tested this session</p>}
    </div>
  )
}
