/**
 * Palm-joystick tuning. `fast` is the original behaviour; `slow` (the default) needs a bigger, steadier hand movement for
 * top speed, starts gently, caps below the keyboard walk speed, turns slower and smooths speed changes more.
 * dead/full: hand offset (camera-frame units) where moving starts / where full push is reached.
 */
export type HandSpeed = 'slow' | 'normal' | 'fast'
export interface HandCfg { dead: number; full: number; smooth: number; walk: number; jog: number; minFrac: number; turn: number; route: number; curve: number }
export const HAND_PROFILES: Record<HandSpeed, HandCfg> = {
  slow: { dead: 0.06, full: 0.26, smooth: 0.3, walk: 1.5, jog: 2.4, minFrac: 0.2, turn: 1.0, route: 1.8, curve: 1.6 },
  normal: { dead: 0.05, full: 0.21, smooth: 0.24, walk: 2.0, jog: 3.4, minFrac: 0.3, turn: 1.4, route: 2.2, curve: 1.3 },
  fast: { dead: 0.045, full: 0.17, smooth: 0.18, walk: 2.6, jog: 4.6, minFrac: 0.45, turn: 1.9, route: 2.6, curve: 1 },
}

/** Dead zone, then an ease curve so small hand movements give small speeds. Returns -1..1. */
export function shapeAxis(v: number, { dead, full, curve }: HandCfg) {
  return Math.sign(v) * Math.pow(Math.min(1, Math.max(0, (Math.abs(v) - dead) / (full - dead))), curve)
}

/** Walking speed (m/s) for a forward/back joystick value f in -1..1. */
export function driveSpeed(f: number, { walk, jog, minFrac }: HandCfg) {
  const a = Math.abs(f)
  return a > 0.95 ? jog : walk * Math.max(minFrac, a)
}
