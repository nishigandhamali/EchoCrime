import { create } from 'zustand'
import caseData from '../data/case001.json'
import type { CaseFile } from '../types/case'
import { useEvidence } from './evidence'

const caseFile = caseData as CaseFile

export type MarkResult = 'clue' | 'known' | 'unexplained' | 'nothing'
export interface Mark { t: number; result: MarkResult; eventId?: string }

interface AudioState {
  labOpen: boolean
  /** Events the detective has actually listened to; their timeline time becomes known. */
  heard: Record<string, boolean>
  marks: Mark[]
  message: string
  /** Hypotheses the player has tried (never evidence). */
  hypotheses: { question: string; summary: string; changed: number }[]
  logHypothesis: (h: { question: string; summary: string; changed: number }) => void
  openLab: () => void
  closeLab: () => void
  markHeard: (eventId: string) => void
  /** Flag a suspicious timestamp. Finds the hidden clue only if it really is near the hidden sound. */
  markAt: (t: number) => Mark
  reset: () => void
}

const SLACK = 0.5 // seconds either side of an event that still counts as "on it"

export const useAudio = create<AudioState>((set) => ({
  labOpen: false,
  heard: {},
  marks: [],
  message: '',
  hypotheses: [],
  logHypothesis: (h) => set((s) => ({ hypotheses: [...s.hypotheses, h] })),
  openLab: () => set({ labOpen: true }),
  closeLab: () => set({ labOpen: false }),
  markHeard: (id) => set((s) => (s.heard[id] ? s : { heard: { ...s.heard, [id]: true } })),
  markAt: (t) => {
    const ev = caseFile.events.find((e) => t >= e.startSeconds - SLACK && t <= e.startSeconds + e.durationSeconds + SLACK)
    const evidence = useEvidence.getState()
    let mark: Mark = { t, result: 'nothing' }
    let message = `${fmt(t)}: only room tone here.`
    if (ev) {
      const needed = ev.unlockedBy[0]
      const status = evidence.status[needed]
      if (status === 'locked') {
        evidence.unlockAndDiscover(needed)
        mark = { t, result: 'clue', eventId: ev.id }
        message = `${fmt(t)}: you noticed something faint, "${ev.label.toLowerCase()}". New evidence.`
      } else if (status === 'discovered' || status === 'confirmed') {
        mark = { t, result: 'known', eventId: ev.id }
        message = `${fmt(t)}: that's the ${ev.label.toLowerCase()} you already have evidence for.`
      } else {
        mark = { t, result: 'unexplained' }
        message = `${fmt(t)}: a distinct sound, but nothing you've found explains it yet. Search the museum for what caused it.`
      }
    }
    set((s) => ({ marks: [...s.marks, mark], message }))
    return mark
  },
  reset: () => set({ labOpen: false, heard: {}, marks: [], message: '', hypotheses: [] }),
}))

export function fmt(t: number) {
  const m = Math.floor(t / 60), s = t - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}
