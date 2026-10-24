import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Loads, Model, type ModelName } from './Model'
import { artTexture, pbrSet } from './pbr'
import { B } from './Props'
import { Column } from './Column'
import DisplayCase from './DisplayCase'

type V3 = [number, number, number]
const WALL_Z = -7.875 // inner face of the north wall

const brass = new THREE.MeshStandardMaterial({ color: '#d9b25c', metalness: 0.85, roughness: 0.38, envMapIntensity: 2.2 })
const velvetRed = new THREE.MeshStandardMaterial({ color: '#7a0f24', roughness: 1 })

/** Engraved-looking museum label drawn on a canvas (title, artist, date). */
function plaqueTexture(title: string, line2: string) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 160
  const g = c.getContext('2d')!
  g.fillStyle = '#17120c'
  g.fillRect(0, 0, 512, 160)
  g.strokeStyle = '#c9a04a'
  g.lineWidth = 4
  g.strokeRect(6, 6, 500, 148)
  g.fillStyle = '#e8d8b0'
  g.textAlign = 'center'
  g.font = 'italic 34px Georgia, serif'
  g.fillText(title.length > 30 ? title.slice(0, 29) + '…' : title, 256, 70, 480)
  g.font = '26px Georgia, serif'
  g.fillStyle = '#b9a577'
  g.fillText(line2, 256, 116, 480)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

interface Painting {
  model: ModelName
  file: string
  x: number
  width: number
  title: string
  artist: string
  date: string
  /** The canvas's UV rectangle inside the frame's texture atlas: [u0, u1, v0, v1]. */
  uv: [number, number, number, number]
}

/** Public-domain works from the Met Open Access collection (see public/art/paintings.json). */
const PAINTINGS: Painting[] = [
  { model: 'gallery/fancy_picture_frame_02', file: 'vermeer', x: -5.3, width: 1.0, title: 'Young Woman with a Water Pitcher', artist: 'Johannes Vermeer', date: 'ca. 1662', uv: [0.145, 0.854, 0.051, 0.955] },
  { model: 'gallery/hanging_picture_frame_02', file: 'bruegel', x: -3.2, width: 1.5, title: 'The Harvesters', artist: 'Pieter Bruegel the Elder', date: '1565', uv: [0.007, 0.993, 0.223, 0.801] },
  { model: 'gallery/hanging_picture_frame_02', file: 'turner', x: -0.7, width: 1.5, title: 'Venice, from the Porch of Madonna della Salute', artist: 'J. M. W. Turner', date: 'ca. 1835', uv: [0.007, 0.993, 0.223, 0.801] },
  { model: 'gallery/hanging_picture_frame_03', file: 'irises', x: 1.3, width: 0.9, title: 'Irises', artist: 'Vincent van Gogh', date: '1890', uv: [0.144, 0.857, 0.006, 0.997] },
]

function FramedPainting({ p }: { p: Painting }) {
  const plaque = useMemo(() => plaqueTexture(p.title, `${p.artist}, ${p.date}`), [p])
  return (
    <group>
      <Loads>
        <Model
          name={p.model}
          at={[p.x, 1.1, WALL_Z + 0.03]}
          fit={{ width: p.width }}
          onMaterials={(mats, root) => {
            for (const [name, mat] of Object.entries(mats)) {
              if (name.endsWith('_glass')) {
                // stock glass carries a baked reflection map that renders as a black sheet; use a clean reflective pane
                const gl = mat as THREE.MeshStandardMaterial
                gl.map = null; gl.alphaMap = null; gl.normalMap = null; gl.metalnessMap = null; gl.roughnessMap = null
                gl.color.set('#ffffff'); gl.opacity = 0.07; gl.roughness = 0.05; gl.metalness = 0; gl.envMapIntensity = 2
                gl.needsUpdate = true
              }
              if (/_(artwork|canvas)$/.test(name)) {
                const std = mat as THREE.MeshStandardMaterial
                const [u0, u1, v0, v1] = p.uv
                const t = artTexture(p.file)
                t.repeat.set(1 / (u1 - u0), 1 / (v1 - v0)) // map the canvas's slice of the atlas onto the whole painting
                t.offset.set(-u0 / (u1 - u0), -v0 / (v1 - v0))
                std.map = t
                std.color.set('#ffffff')
                // the stock canvas is metallic-roughness mapped; a painting is matte paint
                std.metalnessMap = null
                std.roughnessMap = null
                std.normalMap = null
                std.metalness = 0
                std.roughness = 0.65
                std.emissive.set('#ffffff')
                std.emissiveMap = std.map
                std.emissiveIntensity = 0.18 // picture-light glow so the canvas reads in a dim hall
                std.needsUpdate = true
                // the gilded frame's own backing sits in front of its canvas plane: bring the canvas forward
                if (p.model.includes('fancy')) root.traverse((o) => { if ((o as THREE.Mesh).material === mat) o.position.z += 0.06 })
              }
            }
          }}
        />
      </Loads>
      {/* brass picture light and museum label */}
      <mesh position={[p.x, 2.55, WALL_Z + 0.16]} material={brass}><boxGeometry args={[Math.min(0.7, p.width * 0.6), 0.04, 0.08]} /></mesh>
      <mesh position={[p.x, 2.5, WALL_Z + 0.2]}><boxGeometry args={[Math.min(0.62, p.width * 0.55), 0.015, 0.04]} /><meshBasicMaterial color="#ffe9bd" /></mesh>
      <mesh position={[p.x, 0.88, WALL_Z + 0.02]}><planeGeometry args={[0.46, 0.145]} /><meshStandardMaterial map={plaque} roughness={0.5} /></mesh>
    </group>
  )
}

export function Plinth({ x, z, h, children }: { x: number; z: number; h: number; children: React.ReactNode }) {
  const marble = useMemo(() => new THREE.MeshStandardMaterial({ ...pbrSet('marble_01', 1, 1), color: '#efe9de', roughness: 1, envMapIntensity: 0.9 }), [])
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.06, 0]} material={marble} castShadow receiveShadow><boxGeometry args={[0.82, 0.12, 0.82]} /></mesh>
      <mesh position={[0, h / 2, 0]} material={marble} castShadow receiveShadow><boxGeometry args={[0.66, h, 0.66]} /></mesh>
      <mesh position={[0, h + 0.03, 0]} material={marble} castShadow><boxGeometry args={[0.78, 0.06, 0.78]} /></mesh>
      <mesh position={[0, h * 0.45, 0.335]}><boxGeometry args={[0.24, 0.07, 0.01]} /><meshStandardMaterial color="#b8923f" metalness={0.5} roughness={0.5} /></mesh>
      <group position={[0, h + 0.06, 0]}>{children}</group>
    </group>
  )
}

/** Velvet rope sagging between brass stanchions. */
function Rope({ a, b }: { a: [number, number]; b: [number, number] }) {
  const geom = useMemo(() => {
    const p0 = new THREE.Vector3(a[0], 0.86, a[1])
    const p1 = new THREE.Vector3(b[0], 0.86, b[1])
    const mid = p0.clone().lerp(p1, 0.5).setY(0.7)
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, mid, p1), 20, 0.02, 8, false)
  }, [a, b])
  return <mesh geometry={geom} material={velvetRed} castShadow />
}

function Banner({ z }: { z: number }) {
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.8, 1.7, 10, 24)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i)
      pos.setZ(i, 0.035 * Math.sin(x * 9 + y * 1.5) * (0.4 + (0.85 - y) * 0.3))
    }
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <group position={[-6.8, 2.1, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.9, 0.03]} rotation={[0, 0, Math.PI / 2]} material={brass}><cylinderGeometry args={[0.025, 0.025, 0.95, 12]} /></mesh>
      <mesh geometry={geom} position={[0, -0.0, 0.04]} castShadow><meshStandardMaterial color="#7a1020" roughness={0.95} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.25, 0.08]} rotation={[0, 0, Math.PI / 4]} material={brass}><boxGeometry args={[0.34, 0.34, 0.01]} /></mesh>
      <mesh position={[0, -0.55, 0.075]} material={brass}><boxGeometry args={[0.6, 0.05, 0.01]} /></mesh>
      <mesh position={[0, -0.7, 0.075]} material={brass}><boxGeometry args={[0.45, 0.025, 0.01]} /></mesh>
    </group>
  )
}

/** Glass from the smashed case, scattered on the dais and floor. */
function CaseShards() {
  const shards = useMemo(() => {
    let a = 21
    const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
    return Array.from({ length: 32 }, () => {
      const ang = rnd() * Math.PI * 2
      const r = 0.9 + rnd() * 1.4
      return { x: -2 + Math.cos(ang) * r * 0.9, z: -3.6 + Math.sin(ang) * r * 0.6, rot: [rnd() * 3, rnd() * 3, rnd() * 3] as V3, s: 0.03 + rnd() * 0.08 }
    })
  }, [])
  return (
    <group>
      {shards.map((sh, i) => (
        <mesh key={i} position={[sh.x, 0.03, sh.z]} rotation={sh.rot} scale={sh.s} castShadow>
          <tetrahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial color="#e6f4ff" transparent opacity={0.7} roughness={0.03} envMapIntensity={2.4} />
        </mesh>
      ))}
    </group>
  )
}

/** Main Exhibition Gallery: marble hall, framed Met paintings, statuary, the smashed display case. */
export function MainGalleryProps() {
  useEffect(() => { /* textures are created lazily by pbr.ts */ }, [])
  return (
    <group>
      {/* velvet runner with brass border */}
      <B p={[-2, 0.012, -4.5]} s={[3.2, 0.02, 6]} c="#6b1426" r={1} m={0} />
      {[-1.55, 1.55].map((dx) => <B key={dx} p={[-2 + dx, 0.024, -4.5]} s={[0.05, 0.005, 6]} c="#c9a04a" r={0.35} m={0.9} />)}
      <DisplayCase />
      <CaseShards />
      {/* rope barrier */}
      {[[-3.25, -5.75], [-0.75, -5.75], [-0.75, -3.25], [-3.25, -3.25]].map(([x, z], i, arr) => {
        const n = arr[(i + 1) % 4]
        return (
          <group key={i}>
            <mesh position={[x, 0.45, z]} material={brass} castShadow><cylinderGeometry args={[0.025, 0.03, 0.9, 12]} /></mesh>
            <mesh position={[x, 0.025, z]} material={brass}><cylinderGeometry args={[0.17, 0.19, 0.05, 20]} /></mesh>
            <mesh position={[x, 0.91, z]} material={brass}><sphereGeometry args={[0.05, 14, 10]} /></mesh>
            <Rope a={[x, z]} b={[n[0], n[1]]} />
          </group>
        )
      })}
      {/* framed paintings on the north wall */}
      {PAINTINGS.map((p) => <FramedPainting key={p.file} p={p} />)}
      {/* statuary on marble plinths */}
      <Plinth x={-5.6} z={-6.4} h={0.95}><Loads><Model name="gallery/marble_bust_01" at={[0, 0, 0]} fit={{ height: 0.62 }} yaw={0.5} /></Loads></Plinth>
      <Plinth x={-5.6} z={-2.8} h={0.9}><Loads><Model name="gallery/antique_ceramic_vase_01" at={[0, 0, 0]} fit={{ height: 0.55 }} /></Loads></Plinth>
      <Plinth x={1.6} z={-6.4} h={0.9}><Loads><Model name="gallery/horse_statue_01" at={[0, 0, 0]} fit={{ height: 0.55 }} yaw={-0.6} /></Loads></Plinth>
      <Plinth x={1.6} z={-2.8} h={0.95}><Loads><Model name="gallery/marble_bust_01" at={[0, 0, 0]} fit={{ height: 0.62 }} yaw={-2.4} /></Loads></Plinth>
      {/* seating, plants, console and mirror */}
      <Loads>
        <Model name="gallery/Ottoman_01" at={[-5.0, 0, -4.5]} fit={{ width: 1.0 }} yaw={Math.PI / 2} />
        <Model name="gallery/Ottoman_01" at={[1.0, 0, -4.5]} fit={{ width: 1.0 }} yaw={-Math.PI / 2} />
        <Model name="gallery/potted_plant_04" at={[-6.35, 0, -3.9]} fit={{ height: 1.3 }} />
        <Model name="gallery/ClassicConsole_01" at={[2.58, 0, -6.4]} fit={{ width: 1.5 }} yaw={-Math.PI / 2} />
        <Model name="gallery/ornate_mirror_01" at={[2.82, 1.2, -6.4]} fit={{ height: 1.5 }} yaw={-Math.PI / 2} />
      </Loads>
      {/* columns and banners */}
      {[[-6.3, -1.6], [-6.3, -7.4], [2.4, -1.6], [2.4, -7.4]].map(([x, z], i) => <Column key={i} x={x} z={z} />)}
      <Banner z={-3.2} />
      <Banner z={-6} />
    </group>
  )
}
