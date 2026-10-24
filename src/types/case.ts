export type EventType = 'radio_chirp' | 'door_open' | 'glass_break' | 'footsteps' | 'metallic_clang' | 'vehicle'

export interface CaseEvent {
  id: string
  type: EventType
  label: string
  startSeconds: number
  durationSeconds: number
  description: string
  /** Shown in the timeline until one of these evidence items is discovered. */
  unknownLabel: string
  unlockedBy: string[]
}

export interface Evidence {
  id: string
  name: string
  description: string
  source: string
  eventId: string | null
  locked: boolean
  lockedHint?: string
}

export interface Suspect {
  id: string
  name: string
  role: string
  age: number
  background: string
  statement: string
  initials: string
}

export type HotspotKind = 'window' | 'case' | 'scuffs' | 'metal' | 'door' | 'exit' | 'terminal'

export type FloorKind = 'marble' | 'wood' | 'tile' | 'concrete' | 'dock'

export interface Room {
  id: string
  name: string
  short: string
  objective: string
  floor: FloorKind
  /** [minX, maxX, minZ, maxZ] in world units */
  bounds: [number, number, number, number]
}

export interface Hotspot {
  id: string
  roomId: string
  name: string
  kind: HotspotKind
  position: [number, number, number]
  evidenceId: string | null
  eventId: string | null
  inspection: string
  /** How close (metres, in plan) the detective must stand to inspect it. Defaults to 2.2. */
  reach?: number
}

export type ObjectiveRule =
  | { visitRoom: string }
  | { evidence: string }
  | { evidenceAny: string[] }
  | { collected: number }
  | { timelineEvents: number }

export interface Objective { id: string; text: string; hint: string; done: ObjectiveRule }

export interface CaseFile {
  id: string
  number: string
  title: string
  location: string
  incidentTime: string
  summary: string
  scenario: string
  recording: { label: string; durationSeconds: number }
  events: CaseEvent[]
  evidence: Evidence[]
  suspects: Suspect[]
  hotspots: Hotspot[]
  rooms: Room[]
  objectives: Objective[]
}

