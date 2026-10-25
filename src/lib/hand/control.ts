import { create } from 'zustand'
import { HandTracker, type Gesture, type HandFrame, type TrackerStatus } from './tracker'
import { beyond, doorForSwipe, doorsOf, findRoute, otherSide, roomName, type Pt } from './nav'
import { playerSave } from '../../scene/sceneRefs'
import { useGame } from '../../state/game'
import { useAudio } from '../../state/audio'
import { collectInspected, hotspotById, inspectHotspot } from '../../state/actions'
import { isTypingTarget } from '../input'

import { HAND_PROFILES, shapeAxis, type HandCfg, type HandSpeed } from './profile'
export { HAND_PROFILES, type HandCfg, type HandSpeed }
const SPEED_KEY = 'echocrime.handSpeed'
function loadSpeed(): HandSpeed {
  try { const v = localStorage.getItem(SPEED_KEY); if (v === 'slow' || v === 'normal' || v === 'fast') return v } catch { /* storage unavailable */ }
  return 'slow'
}
const CALIBRATE_MS = 700
const LOST_RESET_MS = 1200
// Hands travel less up/down than sideways in a webcam frame, so vertical swipes need less distance.
const SWIPE_WINDOW_MS = 260, SWIPE_DIST_X = 0.2, SWIPE_DIST_Y = 0.15, SWIPE_COOLDOWN_MS = 1200, SWIPE_SUPPRESS_MS = 900
const COLLECT_HOLD_MS = 800, FIST_HOLD_MS = 400

/** stuckFor counts game time (clamped frame dt), so a rendering hitch never looks like being blocked. */
export interface Route { points: Pt[]; idx: number; to: string; bestDist: number; stuckFor: number }

/** Per-frame values the Player reads inside useFrame. Kept out of React so nothing re-renders at camera rate. */
export const hand = {
  enabled: false,
  forward: 0, // -1 back .. 1 forward
  turn: 0, // -1 left .. 1 right
  frame: null as HandFrame | null,
  neutral: null as { x: number; y: number } | null,
  route: null as Route | null,
  holdProgress: 0, // pinch-to-collect ring, 0..1
  cfg: HAND_PROFILES[loadSpeed()] as HandCfg,
}

interface HandUI {
  enabled: boolean
  status: TrackerStatus
  error: string
  message: string
  messageAt: number
  calibrated: boolean
  gesture: Gesture | null
  walkingTo: string | null
  speed: HandSpeed
}
export const useHand = create<HandUI>(() => ({ enabled: false, status: 'off', error: '', message: '', messageAt: 0, calibrated: false, gesture: null, walkingTo: null, speed: loadSpeed() }))
export function setHandSpeed(speed: HandSpeed) {
  hand.cfg = HAND_PROFILES[speed]
  useHand.setState({ speed })
  try { localStorage.setItem(SPEED_KEY, speed) } catch { /* storage unavailable */ }
}
if (import.meta.env.DEV) Object.assign(window, { __handSpeed: { hand, setHandSpeed } })
export const say = (message: string) => useHand.setState({ message, messageAt: performance.now() })

/** Dead zone, then an ease curve so small hand movements give small speeds. */
const shape = (v: number) => shapeAxis(v, hand.cfg)

let lostSince = 0, lastT = 0, suppressUntil = 0, swipeReadyAt = 0
let calib: HandFrame[] = []
let history: HandFrame[] = []
let stable: Gesture | null = null, candidate: Gesture | null = null, candidateCount = 0
let pinchStart = 0, pinchUsed = false, fistStart = 0, fistUsed = false

function blocked() {
  const g = useGame.getState()
  return g.viewMode !== 'explore' || isTypingTarget(document.activeElement)
}

function zeroAxes() { hand.forward = 0; hand.turn = 0 }

export function cancelRoute(message?: string) {
  if (!hand.route) return
  hand.route = null
  useHand.setState({ walkingTo: null })
  if (message) say(message)
}

function startRoute(sx: number, sy: number) {
  const g = useGame.getState()
  if (g.frozen) return say('Close the open panel first (make a fist), then swipe.')
  const p = { x: playerSave.x, z: playerSave.z }
  const pick = doorForSwipe(p, playerSave.camYaw, sx, sy, g.currentRoomId)
  if (!pick) {
    const exits = g.currentRoomId ? doorsOf(g.currentRoomId).map((d) => roomName(otherSide(d, g.currentRoomId!))).join(', ') : ''
    return say(exits ? `No doorway that way. From here you can reach ${exits}.` : 'No doorway that way.')
  }
  const to = otherSide(pick.door, pick.from)
  const points = findRoute(p, beyond(pick.door, pick.from))
  if (!points?.length) return say(`Couldn’t find a way to the ${roomName(to)}. Walk a little closer and swipe again.`)
  hand.route = { points, idx: 0, to, bestDist: Infinity, stuckFor: 0 }
  useHand.setState({ walkingTo: to })
  say(`Walking to the ${roomName(to)}. Make a fist to stop.`)
}

function onSwipe(now: number) {
  if (now < swipeReadyAt || hand.neutral === null) return
  const win = history.filter((h) => now - h.t <= SWIPE_WINDOW_MS)
  const then = win[0], cur = win[win.length - 1]
  if (!then || !cur || then === cur || cur.gesture !== 'open') return
  // a fast swipe blurs the hand, so ask for an open hand in most of the window rather than every frame
  if (win.filter((h) => h.gesture === 'open').length < win.length / 2) return
  const dx = cur.x - then.x, dy = cur.y - then.y
  const horizontal = Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) >= SWIPE_DIST_X
  const vertical = Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dy) >= SWIPE_DIST_Y
  if (!horizontal && !vertical) return
  swipeReadyAt = now + SWIPE_COOLDOWN_MS
  suppressUntil = now + SWIPE_SUPPRESS_MS
  zeroAxes()
  if (horizontal) startRoute(Math.sign(dx), 0)
  else startRoute(0, -Math.sign(dy)) // hand moving up the image = forward
}

function onPinch(now: number, rising: boolean) {
  const g = useGame.getState()
  if (rising) { pinchStart = now; pinchUsed = false }
  if (pinchUsed) return
  if (g.inspectingId) {
    const h = hotspotById(g.inspectingId)
    if (!h?.evidenceId || rising) { hand.holdProgress = 0; return }
    hand.holdProgress = Math.min(1, (now - pinchStart) / COLLECT_HOLD_MS)
    if (hand.holdProgress >= 1) { pinchUsed = true; hand.holdProgress = 0; collectInspected() }
  } else if (rising && !g.frozen && g.nearbyId) {
    pinchUsed = true
    cancelRoute()
    inspectHotspot(g.nearbyId)
    if (hotspotById(g.nearbyId)?.evidenceId) say('Hold a pinch to collect it. Make a fist to close.')
  }
}

function onFist(now: number, rising: boolean) {
  if (rising) { fistStart = now; fistUsed = false }
  if (fistUsed || now - fistStart < FIST_HOLD_MS) return
  fistUsed = true
  const g = useGame.getState(), audio = useAudio.getState()
  if (hand.route) cancelRoute('Stopped.')
  else if (audio.labOpen) { audio.closeLab(); g.closeInspection() }
  else if (g.inspectingId) g.closeInspection()
  else if (g.mapOpen) g.toggleMap(false)
  else if (g.inventoryOpen) g.toggleInventory(false)
  else if (g.panel) g.setPanel(null)
}

/** Feed one frame of hand data (from the camera, or a test). */
export function feed(f: HandFrame | null) {
  const now = f?.t ?? performance.now()
  const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 1 / 30
  lastT = now
  hand.frame = f
  if (!f || blocked()) {
    zeroAxes(); hand.holdProgress = 0
    if (!f) {
      lostSince ||= now
      if (now - lostSince > LOST_RESET_MS && hand.neutral) { hand.neutral = null; calib = []; useHand.setState({ calibrated: false }) }
      stable = null; candidate = null
      if (useHand.getState().gesture !== null) useHand.setState({ gesture: null })
    }
    return
  }
  lostSince = 0
  history.push(f)
  while (history.length && now - history[0].t > 400) history.shift()

  // A gesture must hold for three frames before it counts, so a blur mid-movement can't fire an action.
  if (f.gesture === candidate) candidateCount++
  else { candidate = f.gesture; candidateCount = 1 }
  const prev = stable
  if (candidateCount >= 3) stable = candidate
  if (stable !== useHand.getState().gesture) useHand.setState({ gesture: stable })

  // Centre: wherever the hand rests still when it first appears.
  if (!hand.neutral) {
    calib.push(f)
    calib = calib.filter((c) => now - c.t <= CALIBRATE_MS + 100)
    const mx = calib.reduce((a, c) => a + c.x, 0) / calib.length, my = calib.reduce((a, c) => a + c.y, 0) / calib.length
    const spread = Math.max(...calib.map((c) => Math.hypot(c.x - mx, c.y - my)))
    if (spread > 0.035) calib = [f]
    else if (now - calib[0].t >= CALIBRATE_MS) {
      hand.neutral = { x: mx, y: my }
      useHand.setState({ calibrated: true })
      say('Centre set. Move your hand up to walk, left or right to turn.')
    }
    zeroAxes()
    return
  }

  onSwipe(now)
  if (stable === 'pinch') onPinch(now, prev !== 'pinch'); else hand.holdProgress = 0
  if (stable === 'fist') onFist(now, prev !== 'fist')

  let tf = 0, tt = 0
  if (stable !== 'pinch' && stable !== 'fist' && now >= suppressUntil && !hand.route) {
    tt = shape(f.x - hand.neutral.x)
    tf = shape(hand.neutral.y - f.y)
  }
  const k = 1 - Math.exp(-dt / hand.cfg.smooth)
  hand.forward += (tf - hand.forward) * k
  hand.turn += (tt - hand.turn) * k
  if (Math.abs(hand.forward) < 0.02) hand.forward = 0
  if (Math.abs(hand.turn) < 0.02) hand.turn = 0
}

export function recalibrate() {
  hand.neutral = null; calib = []; zeroAxes()
  useHand.setState({ calibrated: false })
  say('Hold your hand still for a moment to set the centre.')
}

let tracker: HandTracker | null = null
const getTracker = () => (tracker ??= new HandTracker(feed, () => useHand.setState({ status: tracker!.status, error: tracker!.error })))
export const trackerVideo = () => tracker?.video ?? null

export function enableHand() {
  hand.enabled = true
  useHand.setState({ enabled: true })
  recalibrate()
  void getTracker().start()
  try { localStorage.setItem('echocrime-hand', '1') } catch { /* storage unavailable */ }
}
export function disableHand() {
  hand.enabled = false
  cancelRoute()
  zeroAxes()
  tracker?.stop()
  useHand.setState({ enabled: false, calibrated: false, gesture: null, message: '' })
  try { localStorage.removeItem('echocrime-hand') } catch { /* storage unavailable */ }
}
export function handWasEnabled() {
  try { return localStorage.getItem('echocrime-hand') === '1' } catch { return false }
}

// Dev-only hook: lets automated checks drive the controller with simulated hand frames.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__hand = {
    state: hand,
    feed,
    simulate: () => { hand.enabled = true; useHand.setState({ enabled: true, status: 'ready' }); recalibrate() },
  }
}
