import { useEvidence } from './evidence'
import { useGame } from './game'
import { useAudio } from './audio'
import caseData from '../data/case001.json'
import type { CaseFile } from '../types/case'

const caseFile = caseData as CaseFile
export const hotspotById = (id: string) => caseFile.hotspots.find((h) => h.id === id)

/** Press E: freeze movement, open the inspection, and discover the object's evidence (once). */
export function inspectHotspot(id: string) {
  const h = hotspotById(id)
  if (!h) return
  useGame.getState().inspect(id)
  useEvidence.getState().discover(h.evidenceId)
  if (h.kind === 'terminal') useAudio.getState().openLab()
}

export function collectInspected() {
  const id = useGame.getState().inspectingId
  const h = id ? hotspotById(id) : undefined
  return useEvidence.getState().collect(h?.evidenceId ?? null)
}

export function resetInvestigation() {
  useEvidence.getState().reset()
  useGame.getState().closeInspection()
  useGame.getState().toggleInventory(false)
  useGame.getState().resetProgress()
  useAudio.getState().reset()
}
