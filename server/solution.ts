/**
 * THE HIDDEN SOLUTION. This file lives on the server only: it is never imported by the client bundle and no endpoint returns it
 * until a verdict allows the reveal.
 */
export const SOLUTION = {
  culprit: 'alex',
  motive: 'Alex Turner was passed over for head of facilities and is in debt. He planned to take the artifact and make it look like an outside break-in.',
  entry: 'Alex used his maintenance override on the staff door, which does not log a badge entry, and switched the cameras off from the shared Facilities admin login at 23:43.',
  escape: 'After staging a break-in by smashing the east window from inside, he ran back through the staff corridor, dropped his Facilities pry bar on the way, and left from the loading bay in his small car.',
  sequence: ['23:41 admin login, 23:43 cameras off', 'door opens (staff door, quiet)', 'window smashed from inside to fake a break-in', 'a Facilities radio chirps as he sets off', 'he runs for the staff corridor', 'the pry bar clangs to the floor', 'a small car starts at the loading bay'],
  truth: { alex: 'lies', morgan: 'truthful', jordan: 'truthful' } as Record<string, string>,
}

export type Relation = 'contradicts' | 'supports' | 'none'

/** Statement x evidence relationships the theory board can confirm. */
export const LINKS: Record<string, Record<string, { relation: Relation; note: string }>> = {
  'alex-1': {
    'ev-terminal': { relation: 'contradicts', note: 'No HVAC work order is open tonight, and the admin login that cut the cameras was a Facilities technician\'s. He was not in the basement on a job.' },
    'ev-hidden': { relation: 'contradicts', note: 'A Facilities radio chirped upstairs in the gallery at 23:47. Someone carrying Facilities gear was not in the basement.' },
  },
  'alex-2': {
    'ev-terminal': { relation: 'contradicts', note: 'The terminal logs no call to security tonight. He did not call anyone.' },
    'ev-window': { relation: 'contradicts', note: 'The glass lies inside the gallery. Whoever broke it was in the room, not hearing it from downstairs.' },
  },
  'jordan-1': {
    'ev-door': { relation: 'supports', note: 'The staff door was opened with an override that logs nothing. A contractor\'s deactivated key card could not have done that.' },
  },
  'jordan-2': {
    'ev-vehicle': { relation: 'supports', note: 'The tyre marks are from a small car, and the contractor\'s van has not moved from bay two.' },
  },
  'morgan-1': {
    'ev-case': { relation: 'supports', note: 'The alarm zone was disarmed from the security system; a curator has no access to it, and Morgan was gone by ten.' },
  },
}

/** Independent lines of evidence against the culprit. A well-supported accusation needs three, from at least two lines. */
export const CASE_AGAINST: Record<string, { line: 'access' | 'ownership' | 'presence' | 'elimination'; why: string }> = {
  'ev-door': { line: 'access', why: 'A staff door opened with a non-logging override points to someone with maintenance access.' },
  'ev-case': { line: 'access', why: 'The alarm zone was disarmed from the security system, which only Facilities admins can do.' },
  'ev-terminal': { line: 'presence', why: 'A shared Facilities admin login cut the cameras, with no work order to explain it.' },
  'ev-clang': { line: 'ownership', why: 'The dropped pry bar carries a Facilities tag stamped "A.T.".' },
  'ev-hidden': { line: 'presence', why: 'A Facilities radio was in the gallery at the moment of the theft.' },
  'ev-vehicle': { line: 'elimination', why: 'A small car, not the contractor\'s van, left from the loading bay.' },
}
export const MISLEADING = new Set(['ev-window', 'ev-steps'])
