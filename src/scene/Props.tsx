import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Loads, Model } from './Model'
import { Column } from './Column'
import { Plinth } from './GalleryProps'

export type V3 = [number, number, number]

interface BProps {
  p: V3
  s: V3
  c?: string
  r?: number
  m?: number
  e?: string
  ei?: number
  rot?: V3
  op?: number
}

/** Plain box — the one primitive all placeholder furniture is built from. */
export function B({ p, s, c = '#888', r = 0.7, m = 0.1, e, ei = 1, rot, op }: BProps) {
  return (
    <mesh position={p} rotation={rot}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ?? '#000'} emissiveIntensity={e ? ei : 0} transparent={op !== undefined} opacity={op ?? 1} />
    </mesh>
  )
}

export function Cyl({ p, r, h, c = '#888', rough = 0.6, m = 0.1, e, rot }: { p: V3; r: number; h: number; c?: string; rough?: number; m?: number; e?: string; rot?: V3 }) {
  return (
    <mesh position={p} rotation={rot}>
      <cylinderGeometry args={[r, r, h, 20]} />
      <meshStandardMaterial color={c} roughness={rough} metalness={m} emissive={e ?? '#000'} emissiveIntensity={e ? 1 : 0} />
    </mesh>
  )
}

function Group({ at, rot, children }: { at: V3; rot?: V3; children: ReactNode }) {
  return <group position={at} rotation={rot}>{children}</group>
}

export function mulberry(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}


/* ------------------------------------------------------------------ outside */
export function Outside() {
  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, -0.04, -0.5]}><planeGeometry args={[90, 70]} /><meshStandardMaterial color="#17223d" roughness={1} /></mesh>
      {/* river behind the north wall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, -0.02, -16]}><planeGeometry args={[90, 14]} /><meshStandardMaterial color="#1b3f6e" roughness={0.2} metalness={0.4} emissive="#0b2a4d" emissiveIntensity={0.6} /></mesh>
      {/* road south of the loading bay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, -0.01, 11]}><planeGeometry args={[34, 6]} /><meshStandardMaterial color="#2a3248" roughness={0.9} /></mesh>
      {[-10, -5, 0, 5, 10, 15].map((x) => <B key={x} p={[x, 0, 11]} s={[2, 0.01, 0.15]} c="#e8d98a" r={0.9} />)}
      {/* moon */}
      <mesh position={[12, 14, -30]}><circleGeometry args={[1.6, 32]} /><meshBasicMaterial color="#dcecff" /></mesh>
    </group>
  )
}

/* ------------------------------------------------------------ east gallery */
export function EastGalleryProps() {
  const shards = useMemo(() => {
    const rnd = mulberry(7)
    return Array.from({ length: 34 }, () => ({
      pos: [6.5 + (rnd() - 0.5) * 3.2, 0.03, -7.5 + rnd() * 2.6] as V3,
      rot: [rnd() * 3, rnd() * 3, rnd() * 3] as V3,
      s: 0.04 + rnd() * 0.1,
    }))
  }, [])
  const scuffs = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ x: 6.6 + i * 0.22, z: -6.8 + i * 0.6, r: 0.35 - i * 0.03 })), [])
  return (
    <group>
      {/* window frame, jagged teeth, moon glow */}
      <B p={[6.5, 0.58, -7.9]} s={[2.4, 0.08, 0.34]} c="#4a3426" />
      <B p={[6.5, 1.78, -7.9]} s={[2.4, 0.08, 0.34]} c="#4a3426" />
      {[5.3, 7.7].map((x) => <B key={x} p={[x, 1.18, -7.9]} s={[0.08, 1.2, 0.34]} c="#4a3426" />)}
      {[[5.5, 0.64, 0], [5.9, 0.64, 0.1], [7.4, 0.64, 0.05], [7.6, 1.72, 3.14], [5.7, 1.72, 3.14], [6.6, 1.72, 3.14]].map(([x, y, r], i) => (
        <mesh key={i} position={[x, y, -7.9]} rotation={[0, 0, r]}>
          <coneGeometry args={[0.09, 0.45, 3]} />
          <meshStandardMaterial color="#aee0ff" transparent opacity={0.7} emissive="#2a6a99" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* scattered glass */}
      {shards.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={s.rot} scale={s.s}>
          <tetrahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#c6ebff" transparent opacity={0.8} roughness={0.05} metalness={0.3} emissive="#2a6a99" emissiveIntensity={0.7} />
        </mesh>
      ))}
      {/* scuff marks from the window toward the staff door */}
      {scuffs.map((m, i) => (
        <mesh key={i} position={[m.x, 0.014, m.z]} rotation={[-Math.PI / 2, 0, m.r]}>
          <planeGeometry args={[0.42, 0.14]} /><meshBasicMaterial color="#000" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
      {/* dropped pry bar */}
      <Group at={[5, 0.07, -3]} rot={[0, 0.7, 0]}>
        <Cyl p={[0, 0, 0]} r={0.04} h={0.9} c="#aab4c6" m={0.95} rough={0.25} rot={[0, 0, Math.PI / 2]} />
        <B p={[0.46, 0.02, 0]} s={[0.2, 0.05, 0.07]} c="#aab4c6" m={0.95} r={0.25} rot={[0, 0, -0.9]} />
        <B p={[-0.46, 0.02, 0]} s={[0.2, 0.05, 0.07]} c="#aab4c6" m={0.95} r={0.25} rot={[0, 0, 0.9]} />
      </Group>
      {/* wall art, bench, an empty plinth */}
      {[-6.2, -3.6].map((z) => (
        <group key={z} position={[9.85, 1.4, z]} rotation={[0, -Math.PI / 2, 0]}>
          <B p={[0, 0, 0]} s={[1.3, 0.95, 0.08]} c="#3a2d26" />
          <B p={[0, 0, 0.05]} s={[1.1, 0.75, 0.02]} c={z < -5 ? '#2b5a73' : '#73482b'} r={0.9} />
        </group>
      ))}
      <Loads>
        <Model name="gallery/Ottoman_01" at={[8.64, 0, -5.4]} fit={{ width: 1.1 }} />
        <Model name="gallery/potted_plant_04" at={[9.4, 0, -7.4]} fit={{ height: 1.3 }} />
      </Loads>
      <Column x={3.6} z={-1.7} />
      <Column x={9.4} z={-1.7} />
      <Plinth x={4.1} z={-6.8} h={0.9}><Loads><Model name="gallery/horse_statue_01" at={[0, 0, 0]} fit={{ height: 0.55 }} yaw={0.8} /></Loads></Plinth>
    </group>
  )
}

/* ------------------------------------------------------------ security room */
export function SecurityProps() {
  const screens = [[-1, 1.5], [0, 1.5], [1, 1.5], [-1, 0.8], [0, 0.8], [1, 0.8]]
  return (
    <group>
      {/* CCTV wall on the west wall; the two lower-right screens are dead */}
      <B p={[-6.82, 1.15, 1.5]} s={[0.12, 1.9, 3.4]} c="#161b2a" />
      {screens.map(([dz, y], i) => {
        const dead = i === 4 || i === 5
        return <B key={i} p={[-6.72, y, 1.5 + dz * 1.05]} s={[0.05, 0.6, 0.95]} c={dead ? '#3a0f1a' : '#0d2a40'} e={dead ? '#8a1530' : '#2a8fd0'} ei={dead ? 0.6 : 0.9} r={0.3} />
      })}
      {/* security desk, chair, desk monitors */}
      <Loads>
        <Model name="rooms/metal_office_desk" at={[-5.5, 0, 3.3]} fit={{ width: 1.6 }} yaw={Math.PI} />
        <Model name="rooms/metal_office_desk" at={[-3.9, 0, 3.3]} fit={{ width: 1.6 }} yaw={Math.PI} />
        <Model name="rooms/classic_laptop" at={[-5.4, 0.76, 3.3]} fit={{ width: 0.42 }} yaw={Math.PI} />
        <Model name="rooms/modern_arm_chair_01" at={[-4.6, 0, 2.2]} fit={{ height: 1.0 }} yaw={0.2} />
        <Model name="rooms/security_camera_01" at={[-6.0, 2.55, -0.74]} fit={{ width: 0.45 }} />
        <Model name="gallery/potted_plant_04" at={[-6.45, 0, 3.55]} fit={{ height: 1.1 }} />
      </Loads>
      {/* recording racks with status LEDs */}
      {[1.4, 2.2].map((z, i) => (
        <group key={z}>
          <B p={[-2.65, 0.8, z + 0.9]} s={[0.7, 1.6, 0.6]} c="#10141f" r={0.5} m={0.5} />
          {[0.4, 0.8, 1.2, 1.5].map((y, k) => <B key={y} p={[-2.98, y, z + 0.9]} s={[0.02, 0.05, 0.3]} c={k === 1 && i === 0 ? '#ff3b5c' : '#35e08a'} e={k === 1 && i === 0 ? '#ff3b5c' : '#35e08a'} />)}
        </group>
      ))}
    </group>
  )
}

/* ----------------------------------------------------------- staff corridor */
export function CorridorProps() {
  const scuffs = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ x: 8 - i * 0.55, z: -0.4 + i * 0.1, r: 0.15 })), [])
  return (
    <group>
      {/* hazard stripe */}
      <B p={[4, 0.012, 0.25]} s={[11.6, 0.01, 0.12]} c="#e8c43a" r={0.8} />
      {/* restricted door leaf (ajar) in the east gallery doorway, sign and access panel */}
      <Group at={[7.4, 0, -0.9]} rot={[0, 0.9, 0]}>
        <B p={[0.55, 0.8, 0]} s={[1.1, 1.6, 0.06]} c="#2c3550" m={0.5} r={0.5} />
      </Group>
      <B p={[8, 1.0, -0.88]} s={[0.9, 0.18, 0.02]} c="#8a1530" e="#ff3b5c" ei={0.5} />
      <B p={[9.0, 0.85, -0.88]} s={[0.22, 0.34, 0.06]} c="#10141f" m={0.5} />
      <B p={[9.0, 0.95, -0.84]} s={[0.1, 0.06, 0.02]} c="#ff3b5c" e="#ff3b5c" ei={1.2} />
      {/* lockers, cart, extinguisher */}
      {[-0.6, 0.0, 0.6, 1.2].map((x) => <B key={x} p={[x + 1, 0.55, 1.2]} s={[0.55, 1.1, 0.4]} c="#4b5670" m={0.4} r={0.5} />)}
      <B p={[4.2, 0.35, 1.15]} s={[0.9, 0.5, 0.45]} c="#5c6578" m={0.3} />
      <Cyl p={[-1.5, 0.35, 1.1]} r={0.12} h={0.7} c="#b3202e" />
      <Loads>
        <Model name="rooms/korean_fire_extinguisher_01" at={[-1.55, 0, 1.3]} fit={{ height: 0.55 }} />
        <Model name="rooms/steel_frame_shelves_01" at={[9.4, 0, 0.3]} fit={{ height: 1.9 }} yaw={-Math.PI / 2} />
      </Loads>
      {/* footprints/scuffs heading toward the loading bay door */}
      {scuffs.map((m, i) => (
        <mesh key={i} position={[m.x, 0.014, m.z]} rotation={[-Math.PI / 2, 0, m.r]}>
          <planeGeometry args={[0.36, 0.13]} /><meshBasicMaterial color="#000" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/* -------------------------------------------------------------- loading bay */
export function LoadingBayProps() {
  return (
    <group>
      {/* hazard line at the service entrance and parking bay lines */}
      <B p={[5, 0.012, 6.6]} s={[4, 0.01, 0.2]} c="#e8c43a" r={0.8} />
      {[3, 7].map((x) => <B key={x} p={[x, 0.012, 4.6]} s={[0.1, 0.01, 4]} c="#e8e8e8" r={0.8} />)}
      {/* rolled-up shutter above the vehicle exit */}
      <B p={[5, 1.95, 6.9]} s={[4, 0.22, 0.3]} c="#555d6e" m={0.7} r={0.4} />
      {/* delivery crates and pallets */}
      <Loads>
        <Model name="rooms/old_military_crate" at={[-1.1, 0, 6.1]} fit={{ width: 1.0 }} yaw={0.15} />
        <Model name="rooms/wooden_crate_01" at={[0.1, 0, 6.2]} fit={{ width: 0.95 }} yaw={-0.1} />
        <Model name="rooms/cardboard_box_01" at={[7.9, 0, 5.7]} fit={{ width: 0.95 }} yaw={0.3} />
        <Model name="rooms/old_military_crate" at={[7.9, 0, 4.3]} fit={{ width: 1.0 }} yaw={-0.2} />
        <Model name="rooms/hand_truck" at={[2.2, 0, 6.3]} fit={{ height: 1.2 }} yaw={0.4} />
        <Model name="rooms/cardboard_box_01" at={[0.9, 0.16, 2.9]} fit={{ width: 0.8 }} yaw={0.4} />
      </Loads>
      <B p={[0.9, 0.08, 2.9]} s={[1.2, 0.16, 1.2]} c="#6a5133" r={0.9} />
      {[9.0, 9.5].map((x, i) => <Cyl key={x} p={[x, 0.45, 2.5 + i * 0.1]} r={0.28} h={0.9} c="#2f6a8c" m={0.4} />)}
      {/* escape vehicle on the road outside, tail lights glowing */}
      <Group at={[5, 0, 9.3]}>
        <B p={[0, 0.85, 0]} s={[2.2, 1.3, 3.8]} c="#d9dde6" r={0.35} m={0.3} />
        <B p={[0, 0.7, -2.2]} s={[2.1, 0.9, 1.0]} c="#c3c8d3" r={0.35} m={0.3} />
        <B p={[0, 1.3, -2.45]} s={[1.8, 0.45, 0.06]} c="#0d1a2b" r={0.1} m={0.6} />
        {[-0.9, 0.9].map((x) => <B key={x} p={[x, 0.95, 1.92]} s={[0.22, 0.4, 0.04]} c="#ff3b5c" e="#ff3b5c" ei={1.5} />)}
        {[[-1.1, -1.4], [1.1, -1.4], [-1.1, 1.3], [1.1, 1.3]].map(([x, z], i) => <Cyl key={i} p={[x, 0.32, z]} r={0.32} h={0.25} c="#10141f" rot={[0, 0, Math.PI / 2]} />)}
      </Group>
    </group>
  )
}
