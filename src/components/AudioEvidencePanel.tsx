import { useMemo } from 'react'
import { AlertTriangle, Pause, Play, Volume2, Wand2 } from 'lucide-react'
import type { CaseFile } from '../types/case'
import { formatTime } from '../lib/format'

interface Props {
  caseFile: CaseFile
}

const BAR_COUNT = 160

/** Bottom audio strip. Playback and reconstruction are placeholders until Phase D / Phase 2. */
export default function AudioEvidencePanel({ caseFile }: Props) {
  const { durationSeconds, label } = caseFile.recording
  // Fixed decorative bar heights. NOT derived from audio.
  const bars = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => 0.2 + 0.5 * Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.11)) + 0.12 * Math.abs(Math.sin(i * 1.9))),
    [],
  )

  return (
    <section className="glass flex items-stretch gap-5 rounded-xl px-5 py-3" aria-label="Audio evidence">
      <div className="flex w-64 shrink-0 flex-col justify-between">
        <div>
          <p className="eyebrow">Audio evidence</p>
          <h2 className="font-display text-lg font-semibold leading-tight">{label}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button disabled aria-disabled title="Playback arrives with the audio phase" className="btn-disabled flex h-10 w-10 items-center justify-center rounded-full border border-volt/40 bg-volt/10 text-volt">
            <Play className="h-4 w-4 translate-x-px" />
          </button>
          <button disabled aria-disabled title="Playback arrives with the audio phase" className="btn-disabled flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 text-slate-400">
            <Pause className="h-3.5 w-3.5" />
          </button>
          <span className="whitespace-nowrap font-mono text-xs text-slate-300">
            <span className="text-volt-glow">00:00</span> / {formatTime(durationSeconds)}
          </span>
          <Volume2 className="btn-disabled h-4 w-4 text-slate-400" />
        </div>
      </div>

      <div className="relative min-w-0 flex-1 rounded-lg border border-volt/15 bg-ink-950/80 px-3 py-2">
        <div className="flex h-full items-center gap-[2px]" aria-hidden>
          {bars.map((h, i) => (
            <span key={i} className="flex-1 rounded-full bg-gradient-to-b from-volt-glow/70 to-volt-dim" style={{ height: `${h * 100}%`, opacity: 0.3 }} />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-2 rounded-md border border-amber-400/30 bg-ink-950/90 px-3 py-1.5 text-xs text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            Recording locked · waveform is a placeholder. Playback unlocks in a later phase.
          </span>
        </div>
      </div>

      <div className="flex w-52 shrink-0 flex-col justify-center gap-2">
        <p className="eyebrow">Reconstruction</p>
        <button disabled aria-disabled className="btn-disabled flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300">
          <Wand2 className="h-3.5 w-3.5" /> What if? · locked
        </button>
      </div>
    </section>
  )
}
