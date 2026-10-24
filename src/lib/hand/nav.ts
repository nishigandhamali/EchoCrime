import caseData from '../../data/case001.json'
import type { CaseFile } from '../../types/case'
import { WALLS } from '../../scene/layout'
import { FURNITURE, wallBoxes } from '../../scene/colliders'

const rooms = (caseData as CaseFile).rooms

export interface Door { id: string; x: number; z: number; nx: number; nz: number; a: string; b: string }
export interface Pt { x: number; z: number }

export const roomAt = (x: number, z: number) => rooms.find((r) => x >= r.bounds[0] && x <= r.bounds[1] && z >= r.bounds[2] && z <= r.bounds[3])?.id ?? null
export const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id
export const roomShort = (id: string) => rooms.find((r) => r.id === id)?.short ?? id

/** Every walk-through doorway in the floor plan that joins two rooms (windows and the closed vehicle exit are skipped). */
export const DOORS: Door[] = WALLS.flatMap((w) => w.openings
  .filter((o) => !((o.bottom ?? 0) > 0))
  .flatMap((o, i) => {
    const x = w.axis === 'x' ? o.c : w.fixed, z = w.axis === 'x' ? w.fixed : o.c
    const nx = w.axis === 'x' ? 0 : 1, nz = w.axis === 'x' ? 1 : 0
    const a = roomAt(x - nx * 0.9, z - nz * 0.9), b = roomAt(x + nx * 0.9, z + nz * 0.9)
    return a && b && a !== b ? [{ id: `${w.id}-${i}`, x, z, nx, nz, a, b }] : []
  }))

export const doorsOf = (room: string) => DOORS.filter((d) => d.a === room || d.b === room)
export const otherSide = (d: Door, room: string) => (d.a === room ? d.b : d.a)

// Walkable grid over the museum, obstacles grown by the detective's radius plus a little clearance.
const CELL = 0.25, X0 = -7.5, Z0 = -8.5, NX = 74, NZ = 66, GROW = 0.36
let blocked: Uint8Array | null = null
function grid() {
  if (blocked) return blocked
  blocked = new Uint8Array(NX * NZ)
  const walls = wallBoxes().filter((w) => w.pos[1] - w.size[1] / 2 < 1.6) // pieces above head height don't block
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL
    let hit = !roomAt(x, z)
    for (const w of walls) if (!hit && Math.abs(x - w.pos[0]) < w.size[0] / 2 + GROW && Math.abs(z - w.pos[2]) < w.size[2] / 2 + GROW) hit = true
    for (const f of FURNITURE) {
      if (hit) break
      if (f.kind === 'box') hit = Math.abs(x - f.x) < f.w / 2 + GROW && Math.abs(z - f.z) < f.d / 2 + GROW
      else hit = Math.hypot(x - f.x, z - f.z) < f.r + GROW
    }
    blocked[j * NX + i] = hit ? 1 : 0
  }
  return blocked
}
const cellOf = (p: Pt) => ({ i: Math.floor((p.x - X0) / CELL), j: Math.floor((p.z - Z0) / CELL) })
const free = (i: number, j: number) => i >= 0 && j >= 0 && i < NX && j < NZ && !grid()[j * NX + i]
const centre = (i: number, j: number): Pt => ({ x: X0 + (i + 0.5) * CELL, z: Z0 + (j + 0.5) * CELL })

function nearestFree(p: Pt) {
  const c = cellOf(p)
  for (let r = 0; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (free(c.i + di, c.j + dj)) return { i: c.i + di, j: c.j + dj }
  return null
}
function clearLine(a: Pt, b: Pt) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1)
  for (let s = 1; s < n; s++) { const c = cellOf({ x: a.x + (b.x - a.x) * s / n, z: a.z + (b.z - a.z) * s / n }); if (!free(c.i, c.j)) return false }
  return true
}

/** A* over the floor grid, then string-pulled to a few straight legs. Returns waypoints after `from`, or null. */
export function findRoute(from: Pt, to: Pt): Pt[] | null {
  const s = nearestFree(from), g = nearestFree(to)
  if (!s || !g) return null
  const N = NX * NZ, key = (i: number, j: number) => j * NX + i
  const gScore = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), closed = new Uint8Array(N)
  const open: number[] = [key(s.i, s.j)]
  gScore[open[0]] = 0
  const h = (k: number) => { const di = Math.abs((k % NX) - g.i), dj = Math.abs(Math.floor(k / NX) - g.j); return Math.max(di, dj) + 0.414 * Math.min(di, dj) }
  const goal = key(g.i, g.j)
  while (open.length) {
    let bi = 0
    for (let q = 1; q < open.length; q++) if (gScore[open[q]] + h(open[q]) < gScore[open[bi]] + h(open[bi])) bi = q
    const k = open.splice(bi, 1)[0]
    if (k === goal) break
    if (closed[k]) continue
    closed[k] = 1
    const ci = k % NX, cj = Math.floor(k / NX)
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue
      const ni = ci + di, nj = cj + dj
      // no corner cutting through blocked diagonals
      if (!free(ni, nj) || (di && dj && (!free(ci + di, cj) || !free(ci, cj + dj)))) continue
      const nk = key(ni, nj), cost = gScore[k] + (di && dj ? 1.414 : 1)
      if (cost < gScore[nk]) { gScore[nk] = cost; prev[nk] = k; open.push(nk) }
    }
  }
  if (prev[goal] === -1 && goal !== key(s.i, s.j)) return null
  const cells: Pt[] = []
  for (let k = goal; k !== -1; k = prev[k]) cells.unshift(centre(k % NX, Math.floor(k / NX)))
  cells.push(to)
  const out: Pt[] = []
  let anchor = from, idx = 0
  while (idx < cells.length - 1) {
    let far = idx + 1
    while (far + 1 < cells.length && clearLine(anchor, cells[far + 1])) far++
    out.push(cells[far]); anchor = cells[far]; idx = far
  }
  return out
}

/** Walk-through target for a doorway: a point well inside the room on the far side. */
export function beyond(d: Door, fromRoom: string): Pt {
  const sign = d.a === fromRoom ? 1 : -1
  return { x: d.x + d.nx * 1.6 * sign, z: d.z + d.nz * 1.6 * sign }
}

/** Doorway in the direction of a swipe, relative to where the camera faces. sx: right +, sy: forward +. */
export function doorForSwipe(p: Pt, camYaw: number, sx: number, sy: number, room: string | null) {
  const r = room ?? roomAt(p.x, p.z)
  const candidates = r ? doorsOf(r) : DOORS.filter((d) => Math.hypot(d.x - p.x, d.z - p.z) < 3)
  const sin = Math.sin(camYaw), cos = Math.cos(camYaw)
  let best: { door: Door; angle: number } | null = null
  for (const d of candidates) {
    const vx = d.x - p.x, vz = d.z - p.z
    // camera forward is -(sin, cos), right is (cos, -sin)
    const right = vx * cos - vz * sin, fwd = -vx * sin - vz * cos
    const angle = Math.abs(Math.atan2(right * sy - fwd * sx, right * sx + fwd * sy))
    if (angle < (70 * Math.PI) / 180 && (!best || angle < best.angle)) best = { door: d, angle }
  }
  return best ? { door: best.door, from: r ?? (roomAt(p.x - best.door.nx, p.z - best.door.nz) ?? best.door.a) } : null
}

/** Screen-relative arrow for a doorway from the player's position: ↑ ahead, ← left, → right, ↓ behind. */
export function arrowFor(p: Pt, camYaw: number, d: Door) {
  const vx = d.x - p.x, vz = d.z - p.z, sin = Math.sin(camYaw), cos = Math.cos(camYaw)
  const right = vx * cos - vz * sin, fwd = -vx * sin - vz * cos
  const a = Math.atan2(right, fwd)
  return Math.abs(a) < Math.PI / 4 ? '↑' : Math.abs(a) > (3 * Math.PI) / 4 ? '↓' : a > 0 ? '→' : '←'
}
