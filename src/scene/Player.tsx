import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { Hotspot, Room } from '../types/case'
import Character, { type CharacterHandle } from './Character'
import { SPAWNS } from './colliders'
import { playerSave, viewTarget } from './sceneRefs'
import { clearInput, installInput, isDown } from '../lib/input'
import { cancelRoute, hand } from '../lib/hand/control'
import { roomName } from '../lib/hand/nav'
import { useGame } from '../state/game'

const RADIUS = 0.3
const HALF = 0.6 // capsule half-height; total height = 2*HALF + 2*RADIUS = 1.8
const CENTER_Y = HALF + RADIUS
const WALK = 2.6
const RUN = 4.6
const GRAVITY = 18
const CAM_DIST = 4.6
const CAM_MIN_PITCH = 0.12
const CAM_MAX_PITCH = 1.1
/** Hand joystick: how fast a full left/right offset turns the camera (rad/s). */
const HAND_TURN = 1.9

export interface PlayerDebug { x: number; y: number; z: number; yaw: number; camYaw: number; grounded: boolean; gait: string; room: string | null; cam: [number, number, number] }

interface Props { rooms: Room[]; hotspots: Hotspot[] }

/** Third-person detective: kinematic Rapier capsule, camera-relative WASD, mouse-look, smoothed follow camera. */
export default function Player({ rooms, hotspots }: Props) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const char = useRef<CharacterHandle>(null)
  const { world } = useRapier()
  const { gl, camera } = useThree()
  const nonce = useGame((s) => s.teleportNonce)

  const st = useRef({ vy: 0, camYaw: 0, camPitch: 0.42, faceYaw: 0, grounded: false, gait: 'idle' as 'idle' | 'walk' | 'run' })
  const lookAt = useMemo(() => new THREE.Vector3(), [])
  const camGoal = useMemo(() => new THREE.Vector3(), [])

  // created in an effect (not useMemo) so StrictMode's mount/unmount/mount cycle never leaves a freed controller behind
  const controllerRef = useRef<ReturnType<ReturnType<typeof useRapier>['world']['createCharacterController']> | null>(null)
  useEffect(() => {
    const c = world.createCharacterController(0.02)
    c.setUp({ x: 0, y: 1, z: 0 })
    c.enableAutostep(0.25, 0.1, true)
    c.enableSnapToGround(0.25)
    c.setSlideEnabled(true)
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180)
    controllerRef.current = c
    return () => { controllerRef.current = null; world.removeCharacterController(c) }
  }, [world])

  // input + mouse look
  useEffect(() => {
    installInput()
    const canvas = gl.domElement
    const look = (dx: number, dy: number) => {
      const s = st.current
      s.camYaw -= dx * 0.0032
      s.camPitch = THREE.MathUtils.clamp(s.camPitch + dy * 0.0028, CAM_MIN_PITCH, CAM_MAX_PITCH)
    }
    const onMove = (e: MouseEvent) => {
      if (useGame.getState().frozen) return
      if (document.pointerLockElement === canvas || e.buttons & 3) look(e.movementX, e.movementY)
    }
    const onClick = () => {
      if (!useGame.getState().frozen && document.pointerLockElement !== canvas) canvas.requestPointerLock?.()
    }
    window.addEventListener('mousemove', onMove)
    canvas.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('click', onClick)
      if (document.pointerLockElement === canvas) document.exitPointerLock()
      clearInput()
    }
  }, [gl])

  // release the mouse whenever the game takes input focus away
  useEffect(() => useGame.subscribe((s, p) => {
    if (s.frozen && !p.frozen && document.pointerLockElement) document.exitPointerLock()
  }), [])

  // teleport (initial spawn + room buttons)
  useEffect(() => {
    const b = body.current
    if (!b) return
    const resume = playerSave.valid && playerSave.nonce === nonce
    const sp = resume ? { x: playerSave.x, z: playerSave.z, yaw: st.current.camYaw } : SPAWNS[useGame.getState().spawnRoomId] ?? SPAWNS['main-gallery']
    playerSave.nonce = nonce
    b.setTranslation({ x: sp.x, y: CENTER_Y + 0.02, z: sp.z }, true)
    b.setNextKinematicTranslation({ x: sp.x, y: CENTER_Y + 0.02, z: sp.z })
    st.current.vy = 0
    st.current.camYaw = sp.yaw
    st.current.faceYaw = sp.yaw + Math.PI
    cancelRoute()
    camera.position.set(sp.x + Math.sin(sp.yaw) * CAM_DIST, CENTER_Y + 2.5, sp.z + Math.cos(sp.yaw) * CAM_DIST)
  }, [nonce, camera])

  // dev-only hook so automated checks can place the detective next to a wall
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __teleport?: (x: number, z: number) => void }).__teleport = (x, z) => {
      body.current?.setTranslation({ x, y: CENTER_Y + 0.02, z }, true)
      body.current?.setNextKinematicTranslation({ x, y: CENTER_Y + 0.02, z })
    }
  }, [])

  useFrame((_, rawDt) => {
    const b = body.current
    const controller = controllerRef.current
    if (!b || !controller) return
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const frozen = useGame.getState().frozen

    // desired planar velocity, relative to the camera
    let ix = 0, iz = 0
    if (!frozen) {
      if (isDown('KeyW', 'ArrowUp')) iz += 1
      if (isDown('KeyS', 'ArrowDown')) iz -= 1
      if (isDown('KeyD', 'ArrowRight')) ix += 1
      if (isDown('KeyA', 'ArrowLeft')) ix -= 1
    }
    const sin = Math.sin(s.camYaw), cos = Math.cos(s.camYaw)
    // camera sits at +(sin, cos)*dist, so forward = -(sin, cos) and right = (cos, -sin)
    let wx = -sin * iz + cos * ix
    let wz = -cos * iz - sin * ix
    let len = Math.hypot(wx, wz)
    let speed = len > 0.001 ? (isDown('ShiftLeft', 'ShiftRight') ? RUN : WALK) : 0
    const t0 = b.translation()

    // Hand control: keys always win. Otherwise follow a swipe route, or use the palm as a joystick.
    if (hand.enabled && !frozen) {
      if (len > 0.001) cancelRoute()
      else if (hand.route) {
        const r = hand.route
        let wp = r.points[r.idx]
        let d = Math.hypot(wp.x - t0.x, wp.z - t0.z)
        if (d < 0.35 && r.idx < r.points.length - 1) { r.idx++; wp = r.points[r.idx]; d = Math.hypot(wp.x - t0.x, wp.z - t0.z); r.bestDist = Infinity }
        if (d < r.bestDist - 0.1) { r.bestDist = d; r.stuckFor = 0 } else r.stuckFor += dt
        if (r.idx === r.points.length - 1 && d < 0.35) cancelRoute(`You’re in the ${roomName(r.to)}.`)
        else if (r.stuckFor > 1.5) cancelRoute('Something is in the way. Steer around it and swipe again.')
        else {
          wx = (wp.x - t0.x) / d; wz = (wp.z - t0.z) / d; len = 1; speed = WALK
          // swing the camera round behind the detective so the next room comes into view
          let dy = Math.atan2(-wx, -wz) - s.camYaw
          dy = Math.atan2(Math.sin(dy), Math.cos(dy))
          s.camYaw += dy * (1 - Math.exp(-dt * 3))
        }
      } else {
        s.camYaw -= hand.turn * HAND_TURN * dt
        if (Math.abs(hand.forward) > 0.001) {
          const f = hand.forward
          wx = -sin * f; wz = -cos * f; len = Math.abs(f)
          speed = Math.abs(f) > 0.9 ? RUN : WALK * Math.max(0.45, Math.abs(f) / 0.9)
        }
      }
    } else if (hand.route && frozen) cancelRoute()
    const moving = len > 0.001
    if (moving) { wx = (wx / len) * speed; wz = (wz / len) * speed }
    s.gait = !moving ? 'idle' : speed === RUN ? 'run' : 'walk'
    char.current?.setGait(s.gait)

    s.vy = s.grounded ? -1 : s.vy - GRAVITY * dt
    const col = b.collider(0)
    controller.computeColliderMovement(col, { x: wx * dt, y: s.vy * dt, z: wz * dt })
    const mv = controller.computedMovement()
    s.grounded = controller.computedGrounded()
    const t = b.translation()
    playerSave.x = t.x; playerSave.z = t.z; playerSave.valid = true; playerSave.camYaw = s.camYaw
    const next = { x: t.x + mv.x, y: Math.max(t.y + mv.y, CENTER_Y - 0.05), z: t.z + mv.z }
    b.setNextKinematicTranslation(next)

    if (moving) {
      const target = Math.atan2(wx, wz)
      let d = target - s.faceYaw
      d = Math.atan2(Math.sin(d), Math.cos(d))
      s.faceYaw += d * (1 - Math.exp(-dt * 14))
    }
    if (visual.current) {
      visual.current.position.set(t.x, t.y - CENTER_Y, t.z)
      visual.current.rotation.y = s.faceYaw
    }

    // camera: follow the detective, or move in on the object being inspected
    const game = useGame.getState()
    const target = game.inspectingId ? hotspots.find((h) => h.id === game.inspectingId) : undefined
    if (target) {
      const [hx, hy, hz] = target.position
      let ox = t.x - hx, oz = t.z - hz
      const ol = Math.hypot(ox, oz) || 1
      ox /= ol; oz /= ol
      camGoal.set(hx + ox * 3.2, Math.max(hy + 0.7, 1.6), hz + oz * 3.2)
      camera.position.lerp(camGoal, 1 - Math.exp(-dt * 5))
      lookAt.set(hx, hy, hz)
      camera.lookAt(lookAt)
    } else {
      const cp = s.camPitch
      camGoal.set(t.x + Math.sin(s.camYaw) * Math.cos(cp) * CAM_DIST, t.y + 0.9 + Math.sin(cp) * CAM_DIST, t.z + Math.cos(s.camYaw) * Math.cos(cp) * CAM_DIST)
      camera.position.lerp(camGoal, 1 - Math.exp(-dt * 9))
      lookAt.set(t.x, t.y + 0.55, t.z)
      camera.lookAt(lookAt)
    }
    viewTarget.set(t.x, 0, t.z)

    // closest inspectable object within its reach (plan distance): drives the Press E prompt
    if (!game.frozen) {
      let best: string | null = null
      let bestD = Infinity
      for (const h of hotspots) {
        const d = Math.hypot(t.x - h.position[0], t.z - h.position[2])
        if (d <= (h.reach ?? 2.2) && d < bestD) { best = h.id; bestD = d }
      }
      game.setNearby(best)
    }

    // which room are we in?
    const room = rooms.find((r) => t.x >= r.bounds[0] && t.x <= r.bounds[1] && t.z >= r.bounds[2] && t.z <= r.bounds[3])
    useGame.getState().setCurrentRoom(room?.id ?? null)

    if (import.meta.env.DEV) {
      ;(window as unknown as { __player?: PlayerDebug }).__player = { x: t.x, y: t.y - CENTER_Y, z: t.z, yaw: s.faceYaw, camYaw: s.camYaw, grounded: s.grounded, gait: s.gait, room: room?.id ?? null, cam: [camera.position.x, camera.position.y, camera.position.z] }
    }
  })

  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[0, CENTER_Y, 0]}>
        <CapsuleCollider args={[HALF, RADIUS]} />
      </RigidBody>
      <group ref={visual}>
        <Suspense fallback={null}>
          <Character ref={char} />
        </Suspense>
      </group>
    </>
  )
}
