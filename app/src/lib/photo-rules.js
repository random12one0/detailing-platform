// The two rules behind job photos: how big a photo is allowed to be, and how
// much of a detailer's allowance is gone.
//
// IN ITS OWN FILE FOR THE REASON `client-list.js`, `setup.js` and
// `accountant-export.js` ARE: `photos.js` imports the Supabase client, so a
// test that imported it would need a browser and an environment. Everything
// here that could be WRONG rather than merely broken is pure, and
// `tests/job-photos.test.mjs` runs it with neither.

// ---------------------------------------------------------------------------
// THE RESIZE IS THIS FEATURE'S ECONOMICS, not a nicety.
//
// A modern phone photo is 3-5 MB. Supabase's free plan is 1 GB in total,
// across every tenant — so uploading what the camera produced fills the whole
// plan in about 250 photos, and the failure lands on a detailer standing in
// somebody's driveway. At 1600px and JPEG 0.8 the same photo is 200-400 KB:
// **a 10x multiplier on every limit below, for free, before any storage
// provider is chosen.**
//
// 1600 is picked against what the photo is FOR — a before/after pair judged on
// a phone, and a gallery image on a booking page. Neither is ever displayed
// above about 800 CSS pixels, so 1600 is already twice what a 2x screen needs.
// Higher costs storage and buys nothing anybody looks at.
export const MAX_EDGE = 1600;
export const QUALITY = 0.8;

// The size to draw at. **It never ENLARGES** — a photo smaller than the cap is
// left alone, because upscaling adds bytes and no detail. Aspect ratio is kept
// to the pixel, since a stretched before-photo is worse than none.
export function fit(w, h, maxEdge = MAX_EDGE) {
  const longest = Math.max(w, h);
  if (!longest || longest <= maxEdge) return { width: w, height: h };
  const k = maxEdge / longest;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

// ---------------------------------------------------------------------------
// THE BUDGET, in words rather than bytes. The owner's condition on this whole
// feature was "implement it without going over our limit".
//
// The screen must be able to say "you are nearly out" long BEFORE it says no,
// which is why `job_photo_budget()` returns numbers and this decides what they
// mean. Three states, and deliberately not a percentage on a bar: a detailer
// does not want a meter, they want to know whether to stop.
// ---------------------------------------------------------------------------
export const WARN_AT = 0.8;

export function budgetState(b) {
  // **NULL IS NOT THE SAME AS UNDEFINED and a default parameter only catches
  // the second.** The screen holds `budget` as null until the read comes
  // back, so `= {}` never fired and destructuring null threw — which React
  // turned into the whole job record disappearing behind the error boundary.
  // Found 2026-09-06 by opening the screen, not by the test: the test asked
  // `budgetState({})` and never `budgetState(null)`.
  const { used_bytes = 0, cap_bytes = 0 } = b ?? {};
  // NO CAP MEANS NO OPINION, and it is not the same as empty. A missing row or
  // a failed read must never draw "0% full" — a reassuring number invented
  // from an error is the class of statement this repo refuses everywhere.
  if (!cap_bytes || cap_bytes <= 0) return { state: "unknown", share: 0 };
  const share = used_bytes / cap_bytes;
  if (share >= 1) return { state: "full", share };
  if (share >= WARN_AT) return { state: "near", share };
  return { state: "ok", share };
}

// Null when there is nothing worth saying. An empty section is not drawn
// (screen designs §1a), and "you have used 3% of your photos" is noise.
export function budgetWords(b) {
  const { state, share } = budgetState(b);
  if (state === "full") return "Photo storage is full — remove some to add more.";
  if (state === "near") return `Photo storage is ${Math.round(share * 100)}% full.`;
  return null;
}

// Is there room for one more of roughly this size?
export function roomFor(bytes, b) {
  const { cap_bytes = 0, used_bytes = 0 } = b ?? {};
  if (!cap_bytes || cap_bytes <= 0) return true;   // no opinion, do not block
  return used_bytes + bytes <= cap_bytes;
}

export const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// The three kinds, in the order a job happens. `damage` is not a nicety:
// "that scratch was already there" is the conversation this feature exists to
// end, and a detailer has to be able to find that photo later without
// scrolling a whole job.
export const KINDS = [
  ["before", "Before"],
  ["after", "After"],
  ["damage", "Damage"],
];
