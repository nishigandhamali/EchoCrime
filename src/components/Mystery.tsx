import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Gavel, Link2, Loader2, MessageSquareQuote, X } from 'lucide-react'
import caseData from '../data/case001.json'
import type { CaseFile } from '../types/case'
import { useEvidence } from '../state/evidence'
import { useMystery, type Link } from '../state/mystery'
import { resetInvestigation } from '../state/actions'

const caseFile = caseData as CaseFile
const known = (s?: string) => s === 'discovered' || s === 'confirmed'

function statementState(links: Link[], id: string) {
  const mine = links.filter((l) => l.statementId === id)
  if (mine.some((l) => l.relation === 'contradicts')) return 'contradicted' as const
  if (mine.some((l) => l.relation === 'supports')) return 'holds' as const
  return mine.length ? ('untested' as const) : ('untested' as const)
}
const badge = { contradicted: 'border-red-400/60 text-red-300', holds: 'border-emerald-300/50 text-emerald-200', untested: 'border-slate-600 text-slate-500' }
const label = { contradicted: 'Contradicted', holds: 'Holds up', untested: 'Untested' }

/** Suspect profiles: motive, background and each statement with what the theory board has established about it. */
export function SuspectsPanel() {
  const links = useMystery((s) => s.links)
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="mt-3 space-y-2" data-testid="suspects">
      {caseFile.suspects.map((s) => (
        <div key={s.id} className={`rounded-lg border ${open === s.id ? 'border-blood/60 bg-blood/5' : 'border-slate-700/50 bg-ink-800/50'}`}>
          <button onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id} className="flex w-full items-center gap-3 p-2.5 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-slate-600 font-display text-base text-slate-300">{s.initials}</span>
            <span><span className="block font-display text-base leading-tight">{s.name}</span><span className="block text-[11px] text-slate-400">{s.role}</span></span>
          </button>
          {open === s.id && (
            <div className="space-y-2 border-t border-slate-700/40 p-3">
              <p className="text-xs leading-relaxed text-slate-300">{s.background}</p>
              <p className="text-xs leading-relaxed text-slate-400"><span className="eyebrow !text-[9px]">Possible motive</span><br />{s.motive}</p>
              <p className="eyebrow flex items-center gap-1.5"><MessageSquareQuote className="h-3 w-3" /> Statements</p>
              {s.statements.map((st) => { const state = statementState(links, st.id); return (
                <div key={st.id} className="border-l-2 border-blood pl-3">
                  <p className="font-display text-sm italic leading-snug">"{st.text}"</p>
                  <span className={`mt-1 inline-block rounded-full border px-2 py-px font-mono text-[9px] uppercase tracking-widest ${badge[state]}`} data-testid={`status-${st.id}`}>{label[state]}</span>
                </div>
              ) })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/** Theory board: test a piece of evidence against a statement. The server judges the link; results mark the statement. */
export function TheoryBoard() {
  const status = useEvidence((s) => s.status)
  const { links, busy, error, testLink } = useMystery()
  const [stmt, setStmt] = useState<string | null>(null)
  const [ev, setEv] = useState<string | null>(null)
  const [last, setLast] = useState<Link | null>(null)
  const found = caseFile.evidence.filter((e) => known(status[e.id]))
  const statements = caseFile.suspects.flatMap((s) => s.statements.map((st) => ({ ...st, who: s.name })))
  const contradictions = links.filter((l) => l.relation === 'contradicts').length
  return (
    <div className="mt-3" data-testid="theory-board">
      <p className="text-[11px] leading-relaxed text-slate-500">Pick a suspect's statement and a clue you found, then test whether they connect.</p>
      <p className="eyebrow mt-3">1 · Statement</p>
      <div className="mt-1 space-y-1">
        {statements.map((st) => (
          <button key={st.id} onClick={() => setStmt(st.id)} aria-pressed={stmt === st.id} data-testid={`pick-${st.id}`} className={`w-full rounded-md border px-2 py-1.5 text-left text-[11px] leading-snug ${stmt === st.id ? 'border-sky-300/60 bg-sky-300/10' : 'border-slate-700/50 hover:border-slate-500'}`}>
            <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">{st.who}</span><br />"{st.text}"
          </button>
        ))}
      </div>
      <p className="eyebrow mt-3">2 · Evidence</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {found.length === 0 && <span className="text-xs text-slate-500">Find evidence first.</span>}
        {found.map((e) => (
          <button key={e.id} onClick={() => setEv(e.id)} aria-pressed={ev === e.id} data-testid={`pick-${e.id}`} className={`rounded-full border px-2.5 py-1 text-[11px] ${ev === e.id ? 'border-amber-300/70 bg-amber-300/10 text-amber-100' : 'border-slate-600 text-slate-300 hover:border-slate-400'}`}>{e.name}</button>
        ))}
      </div>
      <button disabled={!stmt || !ev || busy} onClick={async () => { const r = await testLink(stmt!, ev!); if (r) setLast(r) }} data-testid="test-link" className="mt-3 flex items-center gap-2 rounded-lg border border-sky-300/60 bg-sky-300/10 px-3.5 py-1.5 text-sm text-sky-100 hover:bg-sky-300/20 disabled:opacity-40">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Test link
      </button>
      {error && <p className="mt-2 text-xs text-red-300" role="alert" data-testid="theory-error">{error}</p>}
      {last && (
        <div className={`mt-3 rounded-lg border p-2.5 text-xs leading-relaxed ${last.relation === 'contradicts' ? 'border-red-400/50 bg-red-400/5 text-red-100' : last.relation === 'supports' ? 'border-emerald-300/40 bg-emerald-300/5 text-emerald-100' : 'border-slate-700 text-slate-300'}`} data-testid="link-result" data-relation={last.relation}>
          <strong className="font-mono text-[10px] uppercase tracking-widest">{last.relation === 'contradicts' ? 'Contradiction' : last.relation === 'supports' ? 'Statement holds up' : 'No connection'}</strong><br />{last.note}
        </div>
      )}
      <p className="mt-3 font-mono text-[10px] text-slate-500" data-testid="link-count">{links.length} link{links.length === 1 ? '' : 's'} tested · {contradictions} contradiction{contradictions === 1 ? '' : 's'} found</p>
    </div>
  )
}

/** Final accusation: suspect, supporting evidence, written theory; the server compares it with the hidden solution. */
export function AccusationModal() {
  const { accuseOpen, setAccuseOpen, accuse, busy, error, verdict, attempt } = useMystery()
  const status = useEvidence((s) => s.status)
  const [suspect, setSuspect] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [theory, setTheory] = useState('')
  const found = caseFile.evidence.filter((e) => known(status[e.id]))
  const finished = !!verdict?.reveal
  return (
    <AnimatePresence>
      {accuseOpen && !finished && (
        <motion.div key="accuse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4" data-testid="accuse">
          <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} className="glass max-h-[92vh] w-[640px] max-w-full overflow-y-auto rounded-xl border-red-300/25 p-6">
            <div className="flex items-center justify-between"><p className="eyebrow flex items-center gap-2 !text-red-300"><Gavel className="h-3.5 w-3.5" /> Final accusation · attempt {attempt + 1} of 3</p>
              <button onClick={() => setAccuseOpen(false)} aria-label="Close" className="text-slate-500 hover:text-slate-200"><X className="h-4 w-4" /></button></div>
            <h2 className="mt-1 font-display text-3xl">Who took the artifact?</h2>
            <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Suspect">
              {caseFile.suspects.map((s) => (
                <button key={s.id} role="radio" aria-checked={suspect === s.id} onClick={() => setSuspect(s.id)} data-testid={`suspect-${s.id}`} className={`rounded-lg border-2 p-3 text-left transition-colors ${suspect === s.id ? 'border-red-400 bg-red-500/25 shadow-[0_0_24px_-6px_#f87171]' : 'border-slate-700/60 hover:border-slate-500'}`}>
                  <span className="font-display text-lg leading-tight">{s.name}</span><span className="block text-[11px] text-slate-400">{s.role}</span>
                  {suspect === s.id && <span className="mt-1 inline-block font-mono text-[10px] uppercase tracking-widest text-red-200">✓ Selected</span>}
                </button>
              ))}
            </div>
            <p className="eyebrow mt-4">Supporting evidence ({picked.length} chosen)</p>
            <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
              {found.map((e) => (
                <label key={e.id} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-xs ${picked.includes(e.id) ? 'border-amber-300/60 bg-amber-300/5' : 'border-slate-700/50'}`}>
                  <input type="checkbox" checked={picked.includes(e.id)} data-testid={`ev-${e.id}`} onChange={() => setPicked((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))} className="mt-0.5 accent-amber-300" />
                  <span><span className="font-display text-sm">{e.name}</span></span>
                </label>
              ))}
              {found.length === 0 && <p className="text-xs text-slate-500">You have no evidence yet.</p>}
            </div>
            <p className="eyebrow mt-4">Your theory</p>
            <textarea value={theory} onChange={(e) => setTheory(e.target.value)} rows={4} maxLength={1000} data-testid="theory-text" placeholder="Explain how it happened and why the evidence points at your suspect." className="mt-1 w-full resize-none rounded-lg border border-slate-700/60 bg-ink-900/70 p-3 text-sm text-paper placeholder:text-slate-600 focus:border-red-300/60 focus:outline-none" />
            {error && <p className="mt-2 text-xs text-red-300" role="alert" data-testid="accuse-error">{error}</p>}
            {verdict && !verdict.reveal && (
              <div className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100" data-testid="verdict-feedback" data-verdict={verdict.verdict}>
                <strong className="font-mono text-[10px] uppercase tracking-widest">{verdict.verdict === 'partial' ? 'Right suspect, weak case' : 'Not convinced'} · {verdict.attemptsLeft} attempt{verdict.attemptsLeft === 1 ? '' : 's'} left</strong>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">{verdict.feedback.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              {(!suspect || picked.length === 0) && <span className="mr-auto text-xs text-amber-200" data-testid="accuse-hint">{!suspect ? 'Step 1: click a suspect above to turn the Accuse button on.' : 'Step 2: tick at least one clue.'}</span>}
              <button onClick={() => setAccuseOpen(false)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-400">Keep investigating</button>
              <button disabled={!suspect || picked.length === 0 || busy} onClick={() => accuse({ suspectId: suspect!, evidenceIds: picked, theory })} data-testid="submit-accusation" className="flex items-center gap-2 rounded-lg border border-red-300/70 bg-red-300/10 px-4 py-2 text-sm text-red-100 hover:bg-red-300/20 disabled:opacity-40">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />} Accuse
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      {verdict?.reveal && (
        <motion.div key="verdict" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4" data-testid="verdict-screen" data-verdict={verdict.verdict}>
          <div className="glass max-h-[94vh] w-[760px] max-w-full overflow-y-auto rounded-xl p-7">
            <p className={`font-mono text-xs uppercase tracking-[0.35em] ${verdict.verdict === 'solved' ? 'text-emerald-300' : 'text-red-300'}`}>{verdict.verdict === 'solved' ? 'Case closed' : 'Case unsolved'}</p>
            <h2 className="mt-1 font-display text-4xl">{verdict.verdict === 'solved' ? `It was ${caseFile.suspects.find((s) => s.id === verdict.reveal!.culprit)?.name}.` : 'The thief got away with it.'}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">{verdict.feedback.map((f) => <li key={f}>{f}</li>)}</ul>
            <p className="eyebrow mt-5">What really happened</p>
            <div className="mt-1 space-y-2 text-sm leading-relaxed text-slate-200" data-testid="reveal">
              <p><strong>Culprit:</strong> {caseFile.suspects.find((s) => s.id === verdict.reveal!.culprit)?.name}. {verdict.reveal.motive}</p>
              <p><strong>Entry:</strong> {verdict.reveal.entry}</p>
              <p><strong>Escape:</strong> {verdict.reveal.escape}</p>
              <ol className="list-decimal space-y-0.5 pl-5 text-xs text-slate-400">{verdict.reveal.sequence.map((s) => <li key={s}>{s}</li>)}</ol>
              <p className="text-xs text-slate-400">{caseFile.suspects.map((s) => `${s.name}: ${verdict.reveal!.truth[s.id] === 'lies' ? 'lied' : 'told the truth'}`).join(' · ')}</p>
            </div>
            <button onClick={() => { resetInvestigation(); useMystery.getState().reset(); useMystery.getState().setAccuseOpen(false) }} data-testid="restart" className="mt-5 flex items-center gap-2 rounded-lg border border-sky-300/60 bg-sky-300/10 px-4 py-2 text-sm text-sky-100 hover:bg-sky-300/20"><Check className="h-4 w-4" /> Restart the investigation</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
