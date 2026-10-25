// Unit test for the palm-joystick speed profiles. Run: npx tsx scripts/test-hand-speed.ts
import { HAND_PROFILES, driveSpeed, shapeAxis } from '../src/lib/hand/profile'
let fails = 0
const ok = (n: string, c: boolean, i = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${c ? '' : i}`); if (!c) fails++ }
const { slow, normal, fast } = HAND_PROFILES
const KEYBOARD_WALK = 2.6
for (const off of [0.1, 0.15, 0.2, 0.3]) console.log(`offset ${off}: slow ${driveSpeed(shapeAxis(off, slow), slow).toFixed(2)} m/s, normal ${driveSpeed(shapeAxis(off, normal), normal).toFixed(2)}, fast ${driveSpeed(shapeAxis(off, fast), fast).toFixed(2)}`)
ok('no movement inside the dead zone', shapeAxis(0.05, slow) === 0 && shapeAxis(-0.05, slow) === 0)
ok('slow is slower than fast at every hand offset', [0.08, 0.1, 0.15, 0.2, 0.3].every((o) => driveSpeed(shapeAxis(o, slow), slow) <= driveSpeed(shapeAxis(o, fast), fast) + 1e-9))
ok('slow top speed is below the keyboard walk speed', driveSpeed(1, slow) < KEYBOARD_WALK, String(driveSpeed(1, slow)))
ok('fast keeps the original top speed (4.6 m/s)', driveSpeed(1, fast) === 4.6)
ok('slow first-step speed is gentle (< 0.5 m/s) vs fast (> 1 m/s)', driveSpeed(shapeAxis(0.075, slow), slow) < 0.5 && driveSpeed(shapeAxis(0.06, fast), fast) > 1, `${driveSpeed(shapeAxis(0.075, slow), slow)} / ${driveSpeed(shapeAxis(0.06, fast), fast)}`)
ok('needs a bigger hand movement for full speed in slow (full push at 0.26 vs 0.17)', shapeAxis(0.17, slow) < 0.7 && shapeAxis(0.17, fast) === 1)
ok('speed rises smoothly (monotonic) in every profile', (['slow', 'normal', 'fast'] as const).every((k) => { let prev = -1; for (let o = 0; o <= 0.4; o += 0.01) { const s = driveSpeed(shapeAxis(o, HAND_PROFILES[k]), HAND_PROFILES[k]); if (s < prev - 1e-9 && s !== 0) return false; prev = Math.max(prev, s) } return true }))
ok('turn rate and route speed are lower in slow', slow.turn < fast.turn && slow.route < fast.route && slow.smooth > fast.smooth)
ok('profiles ordered slow < normal < fast', slow.walk < normal.walk && normal.walk < fast.walk && slow.jog < normal.jog && normal.jog < fast.jog)
ok('left and right are symmetric', shapeAxis(-0.2, slow) === -shapeAxis(0.2, slow))
process.exit(fails ? 1 : 0)
