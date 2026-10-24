import { useMemo } from 'react'
import caseData from '../data/case001.json'
import type { CaseFile, CaseEvent, Objective, ObjectiveRule } from '../types/case'
import { useEvidence, type EvidenceStatus } from './evidence'
import { useGame } from './game'

const caseFile = caseData as CaseFile
const known = (s?: EvidenceStatus) => s === 'discovered' || s === 'confirmed'

/** Every evidence item, including the one hidden in the recording. */
export const OBTAINABLE = caseFile.evidence.length

export interface TimelineEntry { event: CaseEvent; revealed: boolean; basedOn: string[] }

/** One entry per event, in time order. Hidden entries carry no label, time or description. */
export function buildTimeline(status: Record<string, EvidenceStatus>): TimelineEntry[] {
  return [...caseFile.events].sort((a, b) => a.startSeconds - b.startSeconds).map((event) => {
    const basedOn = event.unlockedBy.filter((id) => known(status[id]))
    return { event, revealed: basedOn.length > 0, basedOn }
  })
}

export function useTimeline() {
  const status = useEvidence((s) => s.status)
  return useMemo(() => buildTimeline(status), [status])
}

function ruleDone(rule: ObjectiveRule, status: Record<string, EvidenceStatus>, visited: Record<string, boolean>): boolean {
  if ('visitRoom' in rule) return !!visited[rule.visitRoom]
  if ('evidence' in rule) return known(status[rule.evidence])
  if ('evidenceAny' in rule) return rule.evidenceAny.some((id) => known(status[id]))
  if ('collected' in rule) return Object.values(status).filter((s) => s === 'confirmed').length >= rule.collected
  return buildTimeline(status).filter((t) => t.revealed).length >= rule.timelineEvents
}

export interface ObjectiveState extends Objective { complete: boolean }

export function useObjectives() {
  const status = useEvidence((s) => s.status)
  const visited = useGame((s) => s.visited)
  return useMemo(() => {
    const list: ObjectiveState[] = caseFile.objectives.map((o) => ({ ...o, complete: ruleDone(o.done, status, visited) }))
    return { list, current: list.find((o) => !o.complete) ?? null }
  }, [status, visited])
}

/** Share of the obtainable evidence the detective has found, and the share collected. */
export function useProgress() {
  const status = useEvidence((s) => s.status)
  return useMemo(() => {
    const vals = Object.values(status)
    const found = vals.filter(known).length
    const collected = vals.filter((v) => v === 'confirmed').length
    return { found, collected, total: OBTAINABLE, pct: Math.round((found / OBTAINABLE) * 100) }
  }, [status])
}

/** Evidence-per-room status for the map. */
export function roomProgress(roomId: string, status: Record<string, EvidenceStatus>) {
  const inRoom = caseFile.hotspots.filter((h) => h.roomId === roomId && h.evidenceId)
  const found = inRoom.filter((h) => known(status[h.evidenceId!])).length
  return { found, total: inRoom.length }
}
