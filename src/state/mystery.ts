import { create } from 'zustand'
import { useGame } from './game'

export type Relation = 'contradicts' | 'supports' | 'none'
export interface Link { statementId: string; evidenceId: string; relation: Relation; note: string }
export interface Reveal { culprit: string; motive: string; entry: string; escape: string; sequence: string[]; truth: Record<string, string> }
export interface Verdict { verdict: 'solved' | 'partial' | 'wrong'; feedback: string[]; strongCount: number; lines: number; attemptsLeft: number; reveal: Reveal | null }

const NO_SERVER = 'Cannot reach the case server. Start it with "npm run dev" (or "npm run server") and try again.'

async function post<T>(url: string, body: unknown): Promise<T> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 8000)
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal })
    if (!res.ok) throw new Error(String(res.status))
    return (await res.json()) as T
  } finally { clearTimeout(timer) }
}

interface MysteryState {
  links: Link[]
  attempt: number
  verdict: Verdict | null
  accuseOpen: boolean
  /** The verdict/reveal screen is on screen (it can be dismissed without restarting). */
  verdictShown: boolean
  busy: boolean
  error: string
  testLink: (statementId: string, evidenceId: string) => Promise<Link | null>
  accuse: (a: { suspectId: string; evidenceIds: string[]; theory: string }) => Promise<Verdict | null>
  setAccuseOpen: (open: boolean) => void
  setVerdictShown: (shown: boolean) => void
  reset: () => void
}

export const useMystery = create<MysteryState>((set, get) => ({
  links: [], attempt: 0, verdict: null, accuseOpen: false, verdictShown: false, busy: false, error: '',
  testLink: async (statementId, evidenceId) => {
    const dup = get().links.find((l) => l.statementId === statementId && l.evidenceId === evidenceId)
    if (dup) return dup
    set({ busy: true, error: '' })
    try {
      const r = await post<{ relation: Relation; note: string }>('/api/check-link', { statementId, evidenceId })
      const link = { statementId, evidenceId, relation: r.relation, note: r.note }
      set((s) => ({ links: [...s.links, link] }))
      return link
    } catch { set({ error: NO_SERVER }); return null } finally { set({ busy: false }) }
  },
  accuse: async (a) => {
    const attempt = get().attempt + 1
    set({ busy: true, error: '' })
    try {
      const r = await post<Verdict & { ok: boolean }>('/api/accuse', { ...a, attempt })
      set({ attempt, verdict: r, verdictShown: !!r.reveal })
      return r
    } catch { set({ error: NO_SERVER }); return null } finally { set({ busy: false }) }
  },
  setAccuseOpen: (open) => {
    set({ accuseOpen: open, error: '' })
    useGame.getState().setFrozen(open)
  },
  setVerdictShown: (shown) => {
    set({ verdictShown: shown, accuseOpen: false })
    useGame.getState().setFrozen(shown)
  },
  reset: () => { set({ links: [], attempt: 0, verdict: null, accuseOpen: false, verdictShown: false, busy: false, error: '' }) },
}))
