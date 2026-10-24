import { WALLS, wallPieces } from './layout'

type V3 = [number, number, number]

/** Axis-aligned box: centre (x, z), footprint (w along x, d along z), height h from the floor. */
export interface BoxCollider { kind: 'box'; x: number; z: number; w: number; d: number; h: number }
export interface CylCollider { kind: 'cyl'; x: number; z: number; r: number; h: number }
export type Collider = BoxCollider | CylCollider

const box = (x: number, z: number, w: number, d: number, h = 1.2): BoxCollider => ({ kind: 'box', x, z, w, d, h })
const cyl = (x: number, z: number, r: number, h = 1.2): CylCollider => ({ kind: 'cyl', x, z, r, h })

/** Furniture footprints, matched by hand to the props in Props.tsx. Walls are generated from layout.ts. */
export const FURNITURE: Collider[] = [
  // main gallery
  cyl(-2, -4.5, 1.6, 1.4), // dais + pedestal + display case
  box(-2, -5.75, 2.5, 0.1, 1), box(-2, -3.25, 2.5, 0.1, 1), box(-3.25, -4.5, 0.1, 2.5, 1), box(-0.75, -4.5, 0.1, 2.5, 1), // rope
  box(-5.0, -4.5, 0.7, 1.05, 0.7), box(1.0, -4.5, 0.7, 1.05, 0.7), // ottomans
  box(2.58, -6.4, 0.65, 1.5, 0.95), // console under the mirror
  box(-5.6, -2.8, 0.7, 0.7, 2), box(1.6, -2.8, 0.7, 0.7, 2), box(-5.6, -6.4, 0.7, 0.7, 2), box(1.6, -6.4, 0.7, 0.7, 2), // sculpture plinths
  cyl(-6.3, -1.6, 0.4, 3), cyl(-6.3, -7.4, 0.4, 3), cyl(2.4, -1.6, 0.4, 3), cyl(2.4, -7.4, 0.4, 3), // columns
  cyl(-6.35, -3.9, 0.4), cyl(2.45, -4.6, 0.4),
  // east gallery
  box(8.64, -5.42, 0.95, 0.55, 1), cyl(3.6, -1.7, 0.4, 3), cyl(9.4, -1.7, 0.4, 3), cyl(9.4, -7.4, 0.3), cyl(4.0, -4.2, 0.2), box(4.1, -6.8, 0.7, 0.7, 1),
  // security room
  box(-6.75, 1.5, 0.5, 3.4, 2), // CCTV wall
  box(-4.79, 3.27, 3.2, 1.25, 1), // two desks
  box(-2.65, 2.7, 0.7, 1.7, 1.6), // recording racks
  cyl(-4.4, 2.2, 0.3), cyl(-6.5, 3.5, 0.25), cyl(-3.0, 0.1, 0.2),
  // staff corridor
  box(1.3, 1.2, 2.4, 0.5, 1.1), box(4.2, 1.15, 0.9, 0.45, 0.6), cyl(-1.5, 1.1, 0.14), cyl(9.3, 1.0, 0.25),
  // loading bay
  box(-1.1, 6.1, 1, 1, 1), box(0.0, 6.2, 1, 1, 1), box(7.9, 5.7, 1, 1, 1), box(7.9, 4.3, 1, 1, 1), box(0.9, 2.9, 1.2, 1.2, 1), cyl(9.0, 2.5, 0.28, 0.9), cyl(9.5, 2.6, 0.28, 0.9),
  // the vehicle exit is a closed shutter: the detective can't wander out onto the road
  box(5, 7.15, 4, 0.3, 3),
]

export interface WallBox { id: string; pos: V3; size: V3 }

/** Solid boxes for every wall section, full height regardless of the visual wall-drop effect. */
export function wallBoxes(): WallBox[] {
  const T = 0.25
  const out: WallBox[] = []
  for (const w of WALLS) {
    wallPieces(w).forEach((p, i) => {
      const len = p.b - p.a
      const mid = (p.a + p.b) / 2
      const h = p.y1 - p.y0
      out.push({
        id: `${w.id}-${i}`,
        pos: w.axis === 'x' ? [mid, p.y0 + h / 2, w.fixed] : [w.fixed, p.y0 + h / 2, mid],
        size: w.axis === 'x' ? [len, h, T] : [T, h, len],
      })
    })
  }
  return out
}

/** Where the detective appears when entering a room (x, z) and the yaw to face into it. */
export const SPAWNS: Record<string, { x: number; z: number; yaw: number }> = {
  'main-gallery': { x: -4.5, z: -2.3, yaw: 0 },
  'east-gallery': { x: 7.5, z: -2.6, yaw: 0 },
  'security-room': { x: -4.5, z: 0.4, yaw: 0 },
  'staff-corridor': { x: 2.5, z: 0.25, yaw: -Math.PI / 2 },
  'loading-bay': { x: 5, z: 4.2, yaw: Math.PI },
}
