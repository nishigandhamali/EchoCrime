/**
 * "What if?" hypotheses as structured, validated edits to the order, timing or presence of the sounds on the tape.
 * Shared by the browser and the Express server. The rule-based parser is deterministic and always available; the server
 * can optionally ask an LLM to produce the same edit structure, which is validated against the same schema.
 */
import { z } from 'zod'

export const EVENT_IDS = ['door', 'glass', 'radio', 'steps', 'clang', 'vehicle'] as const
export type EventId = (typeof EVENT_IDS)[number]
const eventId = z.enum(EVENT_IDS)

export const editSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('before'), event: eventId, other: eventId }),
  z.object({ op: z.literal('after'), event: eventId, other: eventId }),
  z.object({ op: z.literal('first'), event: eventId }),
  z.object({ op: z.literal('last'), event: eventId }),
  z.object({ op: z.literal('remove'), event: eventId }),
  z.object({ op: z.literal('swap'), event: eventId, other: eventId }),
  z.object({ op: z.literal('shift'), event: eventId, seconds: z.number().min(-20).max(20) }),
])
export type Edit = z.infer<typeof editSchema>
export const hypothesisSchema = z.object({ edits: z.array(editSchema).min(1).max(3) })

const WORDS: Record<EventId, RegExp> = {
  door: /\b(door|doors|entered|enter|enters|entering|came in|come in|latch|let in|walked in|slipped in)\b/,
  glass: /\b(glass|window|shatter\w*|smash\w*|broke|break|breaking|broken)\b/,
  radio: /\b(radio|chirp|walkie|beep|signal|tone)\b/,
  steps: /\b(foot\w*|steps?|running|ran|runs|run|sprint\w*|fled|footfall)\b/,
  clang: /\b(metal\w*|clang\w*|crowbar|pry|bar|tool|dropped|drop|fell|falling|clatter\w*)\b/,
  vehicle: /\b(car|vehicle|engine|van|drove|drive|driving|started|motor)\b/,
}

/** First event each word group refers to, in the order mentioned. A word like "broke" binds to glass only when no clearer match overlaps. */
function mentions(text: string): { id: EventId; at: number }[] {
  const out: { id: EventId; at: number }[] = []
  for (const id of EVENT_IDS) {
    const m = WORDS[id].exec(text)
    if (m) out.push({ id, at: m.index })
  }
  return out.sort((a, b) => a.at - b.at)
}

export interface ParseResult {
  ok: boolean
  edits: Edit[]
  /** Human-readable reason when not ok (never mentions anything the player hasn't identified). */
  reason?: string
}

/**
 * @param known events the player has identified; hypotheses may only mention these, so asking never leaks the existence of a sound they haven't found.
 */
export function parseHypothesis(input: string, known: readonly EventId[]): ParseResult {
  const text = input.toLowerCase().replace(/[?.!,]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return { ok: false, edits: [], reason: 'Type a "what if" about the order of sounds, or pick a suggestion.' }
  const found = mentions(text)
  const outsider = found.find((m) => !known.includes(m.id))
  if (outsider) return { ok: false, edits: [], reason: "That mentions a sound you haven't identified yet. Find more evidence first." }
  if (found.length === 0) return { ok: false, edits: [], reason: 'I can only test changes to the order, timing or presence of the sounds you have identified (glass, footsteps, door, metal object, vehicle).' }

  const rel = /\b(after|before|then|earlier than|later than|followed by|prior to)\b/.exec(text)
  const swap = /\b(swap|switch|swapped|switched|exchange)\b/.test(text)
  const remove = /\b(no|without|never|didn t|did not|didn't|wasn t|was not|removed?|silent|missing)\b/.test(text)
  const first = /\b(first|earliest|opening|started the night|before anything)\b/.test(text)
  const last = /\b(last|final|finally|at the end|latest)\b/.test(text)
  const shift = /(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds?)\b.*\b(earlier|sooner|before|later|after|delay\w*)\b|\b(earlier|sooner|later|delay\w*)\b.*?(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds?)\b/.exec(text)

  if (swap && found.length >= 2) return { ok: true, edits: [{ op: 'swap', event: found[0].id, other: found[1].id }] }
  if (shift) {
    const n = Number(shift[1] ?? shift[4])
    const dir = (shift[2] ?? shift[3] ?? '').startsWith('later') || /after|delay/.test(shift[2] ?? shift[3] ?? '') ? 1 : -1
    return { ok: true, edits: [{ op: 'shift', event: found[0].id, seconds: dir * n }] }
  }
  if (rel && found.length >= 2) {
    const word = rel[1]
    // "A after B" -> A after B; "B before A"-style phrasing is symmetric, so the first-mentioned event is the subject
    const afterish = /after|then|later than|followed by/.test(word)
    const [a, b] = [found[0].id, found[1].id]
    if (a === b) return { ok: false, edits: [], reason: 'Name two different sounds to reorder.' }
    return { ok: true, edits: [{ op: afterish ? 'after' : 'before', event: a, other: b }] }
  }
  if (remove && found.length >= 1 && !rel) return { ok: true, edits: [{ op: 'remove', event: found[0].id }] }
  if (first) return { ok: true, edits: [{ op: 'first', event: found[0].id }] }
  if (last) return { ok: true, edits: [{ op: 'last', event: found[0].id }] }
  return { ok: false, edits: [], reason: 'Try phrasing it as "What if the glass broke after the footsteps?", "What if there was no vehicle?" or "What if the metal object fell first?"' }
}

// ---------------------------------------------------------------- reconstruction (pure, deterministic)

export interface SlotEvent { id: EventId; start: number; duration: number }
export interface Change { id: EventId; kind: 'moved' | 'removed'; from: number; to?: number }
export interface Reconstruction { events: SlotEvent[]; changes: Change[]; summary: string }

const GAP = 0.6 // seconds of room tone kept between re-ordered sounds
export const TAPE_SECONDS = 36

export function applyEdits(base: SlotEvent[], edits: Edit[], label: (id: EventId) => string): Reconstruction {
  let order = [...base].sort((a, b) => a.start - b.start).map((e) => e.id)
  const dur = new Map(base.map((e) => [e.id, e.duration]))
  const shifts = new Map<EventId, number>()
  const removed = new Set<EventId>()
  const move = (id: EventId, to: number) => { order = order.filter((x) => x !== id); order.splice(Math.max(0, Math.min(order.length, to)), 0, id) }
  for (const e of edits) {
    if (e.op === 'remove') { removed.add(e.event); continue }
    if (e.op === 'shift') { shifts.set(e.event, (shifts.get(e.event) ?? 0) + e.seconds); continue }
    if (e.op === 'first') { move(e.event, 0); continue }
    if (e.op === 'last') { move(e.event, order.length); continue }
    if (e.op === 'swap') { const i = order.indexOf(e.event), j = order.indexOf(e.other); [order[i], order[j]] = [order[j], order[i]]; continue }
    const without = order.filter((x) => x !== e.event)
    const at = without.indexOf(e.other)
    move(e.event, e.op === 'before' ? at : at + 1)
  }
  order = order.filter((id) => !removed.has(id))
  // keep the original slot times in order; push later sounds back only when needed so nothing overlaps
  const slots = [...base].sort((a, b) => a.start - b.start).filter((e) => !removed.has(e.id)).map((e) => e.start)
  const events: SlotEvent[] = []
  let prevEnd = -Infinity
  order.forEach((id, i) => {
    const d = dur.get(id)!
    let start = Math.max(slots[i] + (shifts.get(id) ?? 0), prevEnd + GAP, 0.5)
    start = Math.min(start, TAPE_SECONDS - Math.min(d, 2))
    events.push({ id, start: +start.toFixed(2), duration: d })
    prevEnd = start + d * (id === 'vehicle' || id === 'steps' ? 0.5 : 0.8) // tails may ring over the next sound
  })
  const changes: Change[] = []
  for (const b of base) {
    const a = events.find((e) => e.id === b.id)
    if (!a) changes.push({ id: b.id, kind: 'removed', from: b.start })
    else if (Math.abs(a.start - b.start) > 0.3) changes.push({ id: b.id, kind: 'moved', from: b.start, to: a.start })
  }
  const summary = changes.length === 0
    ? 'This already matches the order on the recording; nothing changes.'
    : changes.map((c) => (c.kind === 'removed' ? `${label(c.id)} removed` : `${label(c.id)} moves from ${t(c.from)} to ${t(c.to!)}`)).join('; ')
  return { events, changes, summary }
}
const t = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`
