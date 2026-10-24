import * as THREE from 'three'

/** An opening in a wall: a doorway (bottom 0) or a window (bottom > 0). */
export interface Opening {
  c: number
  w: number
  bottom?: number
  top?: number
}

export interface WallDef {
  id: string
  /** 'x': runs along X at z = fixed. 'z': runs along Z at x = fixed. */
  axis: 'x' | 'z'
  fixed: number
  from: number
  to: number
  height: number
  openings: Opening[]
  /** Exterior walls drop low when the camera is on their side so the dollhouse stays visible. */
  outward?: [number, number]
}

/** Full wall heights. Walls between the camera and what it is looking at drop low (see Museum.tsx). */
export const OUTER_H = 3.6
export const INNER_H = 3.2

/*
 * Floor plan (x east, z south), metres:
 *
 *   x: -7        3          10
 * z=-8 +---------+----------+
 *      |  MAIN   |   EAST   |   window in the north wall of the East Gallery
 *      | GALLERY |  GALLERY |
 * z=-1 +--door----+---door---+   <- staff door into the East Gallery at x=8
 *      |SECURITY |  STAFF CORRIDOR (x -2..10, z -1..1.5)
 *      |  ROOM   +---door----+
 * z=4  +---------+  LOADING BAY (x -2..10, z 1.5..7), vehicle exit at x=5
 */
export const WALLS: WallDef[] = [
  { id: 'north', axis: 'x', fixed: -8, from: -7, to: 10, height: OUTER_H, outward: [0, -1], openings: [{ c: 6.5, w: 2.2, bottom: 0.55, top: 2.25 }] },
  { id: 'mid-z', axis: 'x', fixed: -1, from: -7, to: 10, height: INNER_H, openings: [{ c: -4.5, w: 1.4 }, { c: 8, w: 1.2 }] },
  { id: 'corridor-south', axis: 'x', fixed: 1.5, from: -2, to: 10, height: INNER_H, openings: [{ c: 7, w: 1.6 }] },
  { id: 'security-south', axis: 'x', fixed: 4, from: -7, to: -2, height: OUTER_H, outward: [0, 1], openings: [] },
  { id: 'south', axis: 'x', fixed: 7, from: -2, to: 10, height: OUTER_H, outward: [0, 1], openings: [{ c: 5, w: 4 }] },
  { id: 'west', axis: 'z', fixed: -7, from: -8, to: 4, height: OUTER_H, outward: [-1, 0], openings: [] },
  { id: 'gallery-divider', axis: 'z', fixed: 3, from: -8, to: -1, height: INNER_H, openings: [{ c: -4.5, w: 1.6 }] },
  { id: 'security-east', axis: 'z', fixed: -2, from: -1, to: 4, height: INNER_H, openings: [{ c: 0.25, w: 1.2 }] },
  { id: 'bay-west', axis: 'z', fixed: -2, from: 4, to: 7, height: OUTER_H, outward: [-1, 0], openings: [] },
  { id: 'east', axis: 'z', fixed: 10, from: -8, to: 7, height: OUTER_H, outward: [1, 0], openings: [] },
]

export const MUSEUM_CENTER = new THREE.Vector3(1.5, 0, -0.5)
export const OVERVIEW_TARGET = new THREE.Vector3(1.5, 0, -0.5)
export const OVERVIEW_CAMERA = new THREE.Vector3(1.5, 24, 21)
/** Panning is clamped so the player can never lose the museum. */
export const TARGET_MIN = new THREE.Vector3(-8, 0, -9)
export const TARGET_MAX = new THREE.Vector3(11, 2, 8)

/** Camera goal for focusing a room: an interior three-quarter view from the south side, looking in. */
export function roomView(bounds: [number, number, number, number]) {
  const [x0, x1, z0, z1] = bounds
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const w = x1 - x0
  const d = z1 - z0
  const target = new THREE.Vector3(cx, 0.9, cz - d * 0.08)
  const pos = new THREE.Vector3(cx + w * 0.1, 5 + Math.max(w, d) * 0.55, cz + d * 0.5 + 6.5 + w * 0.2)
  return { target, pos }
}

export interface Piece { a: number; b: number; y0: number; y1: number }

export function wallPieces(w: WallDef): Piece[] {
  const out: Piece[] = []
  let cur = w.from
  const sorted = [...w.openings].sort((p, q) => p.c - q.c)
  for (const o of sorted) {
    const lo = o.c - o.w / 2
    const hi = o.c + o.w / 2
    if (lo > cur) out.push({ a: cur, b: lo, y0: 0, y1: w.height })
    if ((o.bottom ?? 0) > 0) out.push({ a: lo, b: hi, y0: 0, y1: o.bottom! })
    if ((o.top ?? w.height) < w.height) out.push({ a: lo, b: hi, y0: o.top!, y1: w.height })
    cur = hi
  }
  if (w.to > cur) out.push({ a: cur, b: w.to, y0: 0, y1: w.height })
  return out
}

