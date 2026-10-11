// ROADMAP 0.4 — DID THE RELAY HAND THIS EMAIL TO THE PROVIDER, OR ONLY SAY OK?
//
// `send-email` answers `200 { success: true, skipped: ... }` for two sends it
// never makes: an address on a reserved domain (`.test`, `example.com`), and a
// missing provider key. That is deliberate — it is the fixture mail sink
// (`tests/_mail.mjs`), and every flow is meant to carry on as if the mail went.
//
// ONE FLOW MUST NOT. `platform-admin`'s `build_start` records the day a build
// fee stops being refundable, and the terms promise the detailer is TOLD that
// day. Read as "sent", a skip records the date with nobody told — the exact
// defect the button exists to remove. So that caller asks this instead of `ok`.
//
// Its own module, with no imports, so `tests/build-start-notice.test.mjs` runs
// the production function in node rather than a copy of it.
export function reachedProvider(ok: boolean, answer: unknown): boolean {
  const a = (answer ?? {}) as { success?: unknown; skipped?: unknown };
  return ok && a.success === true && !a.skipped;
}
