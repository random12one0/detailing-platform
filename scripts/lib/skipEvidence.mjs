// A SKIP CARRIES THE EVIDENCE THAT THE SURFACE WAS REACHED AND REFUSED, OR IT IS
// NOT A SKIP. ROADMAP 14.11, first half: the FIELD. The grader rule that fails a
// receipt whose skips have none is the second half and is deliberately not here,
// because it would turn every receipt on disk red before any issuer supplied one.
//
// The evidence is an ACT, never a state. "It was not there when I looked" is the
// sentence a dead walk also produces, so the two builders below each describe a
// thing the run DID: asked a probe, or pressed and waited the full bound.
//
// `addSkip` is the only way into a skip list, and it THROWS on an entry with no
// evidence. A throw mid-sweep fails the run loudly; a bare `list.push` is how the
// walk accounting issued skips nobody could refuse for weeks.

export function addSkip(list, entry) {
  if (typeof entry?.evidence !== "string" || !entry.evidence.trim()) {
    throw new Error(`skip "${entry?.label}" carries no evidence that the surface was reached and refused`);
  }
  list.push(entry);
  return entry;
}

/** `declareSkip` asks `reachable()` again at the moment of the skip and only gets here when it found nothing. */
export const probeEvidence = (found) =>
  `probe re-asked at the moment of the skip and found ${found}; a surface that was there would have refused the skip`;

/** A walk's end is a press whose full bounded wait came back empty, never a card that was already gone. */
export const pressEvidence = (ms, boundMs) =>
  `pressed the primary button and waited ${ms}ms (bound ${boundMs}ms) and no new card came`;
