import { editSchema, parseHypothesis, type Edit, type EventId } from './hypothesis'
import { z } from 'zod'

const reply = z.object({ ok: z.boolean(), edits: z.array(editSchema).default([]), reason: z.string().optional(), source: z.enum(['llm', 'rules']) })
export interface HypothesisResponse { ok: boolean; edits: Edit[]; reason?: string; source: 'llm' | 'rules' | 'offline-rules' }

/**
 * Asks the server to turn the player's sentence into structured edits (LLM when an API key is configured there, rules otherwise).
 * If the server is unreachable, slow or returns something invalid, the same deterministic rules run in the browser instead.
 */
export async function askHypothesis(text: string, known: EventId[]): Promise<HypothesisResponse> {
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 6000)
    const res = await fetch('/api/hypothesis', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, known }), signal: ctl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`server ${res.status}`)
    return reply.parse(await res.json())
  } catch {
    const local = parseHypothesis(text, known)
    return { ok: local.ok, edits: local.edits, reason: local.reason, source: 'offline-rules' }
  }
}
