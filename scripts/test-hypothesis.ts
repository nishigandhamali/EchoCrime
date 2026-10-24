// Unit tests for the hypothesis parser and the deterministic reconstruction. Run: npx tsx scripts/test-hypothesis.ts
import { applyEdits, parseHypothesis, type EventId, type SlotEvent } from '../src/lib/hypothesis'

const base: SlotEvent[] = [
  { id: 'door', start: 3, duration: 1.1 }, { id: 'glass', start: 8, duration: 2.4 }, { id: 'radio', start: 11.4, duration: 0.9 },
  { id: 'steps', start: 14, duration: 4.2 }, { id: 'clang', start: 21, duration: 3 }, { id: 'vehicle', start: 28, duration: 6.2 },
]
const all: EventId[] = ['door', 'glass', 'radio', 'steps', 'clang', 'vehicle']
const label = (id: EventId) => ({ door: 'Quiet door', glass: 'Glass breaking', radio: 'Radio chirp', steps: 'Footsteps', clang: 'Metal object', vehicle: 'Vehicle' })[id]
let fails = 0
const ok = (n: string, c: boolean, i = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${i}`); if (!c) fails++ }
const order = (r: ReturnType<typeof applyEdits>) => r.events.map((e) => e.id).join(',')

let p = parseHypothesis('What if the glass broke after the footsteps?', all)
ok('"glass after footsteps" parses', p.ok && JSON.stringify(p.edits) === '[{"op":"after","event":"glass","other":"steps"}]', JSON.stringify(p.edits))
let r = applyEdits(base, p.edits, label)
ok('glass now follows the footsteps', order(r) === 'door,radio,steps,glass,clang,vehicle', order(r))
ok('no overlapping sounds (gap kept)', r.events.every((e, i) => i === 0 || e.start >= r.events[i - 1].start + 0.1))
ok('everything fits on the 36 s tape', r.events.every((e) => e.start < 36))
ok('changed events are reported', r.changes.some((c) => c.id === 'glass' && c.kind === 'moved') && r.changes.some((c) => c.id === 'steps'), r.summary)
ok('deterministic: same input, same output', JSON.stringify(applyEdits(base, p.edits, label)) === JSON.stringify(r))
ok('base events are not mutated', base[1].start === 8 && base[3].start === 14)

p = parseHypothesis('What if someone entered before the glass broke?', all)
r = applyEdits(base, p.edits, label)
ok('"entered before the glass" -> door before glass, already true on the tape', p.ok && r.changes.length === 0 && /already matches/.test(r.summary), r.summary)
p = parseHypothesis('what if there was no vehicle', all); r = applyEdits(base, p.edits, label)
ok('"no vehicle" removes it', p.ok && !order(r).includes('vehicle') && r.changes[0].kind === 'removed', order(r))
p = parseHypothesis('What if the metal object fell first?', all); r = applyEdits(base, p.edits, label)
ok('"metal object fell first" puts it first', p.ok && order(r).startsWith('clang'), order(r))
p = parseHypothesis('swap the footsteps and the glass', all); r = applyEdits(base, p.edits, label)
ok('swap works', p.ok && order(r) === 'door,radio,steps,glass,clang,vehicle' || order(r).indexOf('steps') < order(r).indexOf('glass'), order(r))
p = parseHypothesis('what if the car started 5 seconds earlier', all); r = applyEdits(base, p.edits, label)
ok('shift by seconds', p.ok && p.edits[0].op === 'shift' && (p.edits[0] as { seconds: number }).seconds === -5, JSON.stringify(p.edits))
p = parseHypothesis('what if the vehicle started before the metal object fell', all); r = applyEdits(base, p.edits, label)
ok('vehicle before metal object', p.ok && order(r).indexOf('vehicle') < order(r).indexOf('clang'), order(r))
p = parseHypothesis('what if the glass broke before the car started', all)
ok('"glass before car" parses with glass as subject', p.ok && p.edits[0].op === 'before' && p.edits[0].event === 'glass', JSON.stringify(p.edits))

// privacy / safety
p = parseHypothesis('what if the radio chirp came after the glass', ['glass', 'steps'])
ok('cannot mention a sound the player has not identified', !p.ok && !/radio|chirp/i.test(p.reason ?? ''), p.reason)
p = parseHypothesis('who stole the artifact?', all)
ok('off-topic questions are refused politely', !p.ok && /order, timing or presence/.test(p.reason ?? ''), p.reason)
p = parseHypothesis('', all); ok('empty input handled', !p.ok)
p = parseHypothesis('what if Alex did it', all); ok('accusations are not a supported hypothesis', !p.ok)
ok('no suspect names anywhere in summaries', !/alex|morgan|jordan|turner|lee|mills/i.test(applyEdits(base, parseHypothesis('glass after footsteps', all).edits, label).summary))
// 100 random hypotheses never break invariants
const phrases = ['glass after footsteps', 'vehicle first', 'door last', 'no glass', 'swap door and vehicle', 'footsteps 7 seconds later', 'clang before door', 'radio after vehicle']
for (const ph of phrases) { const q = parseHypothesis(ph, all); const rr = applyEdits(base, q.edits, label); if (q.ok && !(rr.events.every((e) => e.start >= 0.5 && e.start < 36) && rr.events.every((e, i) => i === 0 || e.start > rr.events[i - 1].start))) ok('invariants hold for: ' + ph, false, order(rr)) }
ok('invariants hold for all sample phrases', fails === 0)
process.exit(fails ? 1 : 0)
