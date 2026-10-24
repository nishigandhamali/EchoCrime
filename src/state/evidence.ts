import { create } from 'zustand'
import caseData from '../data/case001.json'
import type { CaseFile } from '../types/case'

const caseFile = caseData as CaseFile

/** locked: not obtainable yet. available: can be found. discovered: inspected. confirmed: collected into the inventory. */
export type EvidenceStatus = 'locked' | 'available' | 'discovered' | 'confirmed'

export interface Toast { id: number; kind: 'discovered' | 'collected' | 'timeline'; evidenceId: string; eventId?: string }

const initial = (): Record<string, EvidenceStatus> =>
  Object.fromEntries(caseFile.evidence.map((e) => [e.id, e.locked ? 'locked' : 'available']))

interface EvidenceState {
  status: Record<string, EvidenceStatus>
  toasts: Toast[]
  /** Inspecting an object discovers its evidence once; repeat inspections change nothing. Returns true on first discovery. */
  discover: (evidenceId: string | null) => boolean
  /** Makes a locked clue obtainable and discovers it (used when the player finds it on the recording). */
  unlockAndDiscover: (evidenceId: string) => boolean
  /** Collecting a discovered clue confirms it. Returns true if this call collected it. */
  collect: (evidenceId: string | null) => boolean
  dismissToast: (id: number) => void
  reset: () => void
}

let toastId = 0
const isKnown = (s?: EvidenceStatus) => s === 'discovered' || s === 'confirmed'

export const useEvidence = create<EvidenceState>((set, get) => ({
  status: initial(),
  toasts: [],
  discover: (id) => {
    if (!id || get().status[id] !== 'available') return false
    // events this evidence newly reveals on the timeline
    const unlocked = caseFile.events.filter((ev) => ev.unlockedBy.includes(id) && !ev.unlockedBy.some((u) => isKnown(get().status[u])))
    set((s) => ({
      status: { ...s.status, [id]: 'discovered' },
      toasts: [...s.toasts, { id: ++toastId, kind: 'discovered', evidenceId: id }, ...unlocked.map((ev) => ({ id: ++toastId, kind: 'timeline' as const, evidenceId: id, eventId: ev.id }))],
    }))
    return true
  },
  unlockAndDiscover: (id) => {
    if (get().status[id] !== 'locked') return false
    set((s) => ({ status: { ...s.status, [id]: 'available' } }))
    return get().discover(id)
  },
  collect: (id) => {
    if (!id || get().status[id] !== 'discovered') return false
    set((s) => ({ status: { ...s.status, [id]: 'confirmed' }, toasts: [...s.toasts, { id: ++toastId, kind: 'collected', evidenceId: id }] }))
    return true
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  reset: () => set({ status: initial(), toasts: [] }),
}))

export const eventById = (id: string) => caseFile.events.find((e) => e.id === id)
export const evidenceById = (id: string) => caseFile.evidence.find((e) => e.id === id)
