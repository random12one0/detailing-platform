// THE LOGIC OF scripts/shared-resources-guard.mjs, kept free of I/O so a test can
// aim a sabotage at THIS code rather than at a copy (docs/gotchas.md 95).
// ROADMAP 14.17. The page it serves is docs/shared-resources.md.
//
// A snapshot is a flat map  { counterName: number|string }  where the name says
// which shared resource it belongs to:
//   rate_hits/<bucket>/<key-hash>/<window_start>   hits in one fixed window
//   email/<utc-day>/<field>                        platform_email_days
//   demo/<table>                                   rows with the demo business_id
//   demo/bookings.status                           fingerprint of id:status
//
// WHAT THIS CAN NEVER BE ALLOWED TO DO is print a verdict without BLIND beside
// it. `render` takes no path that omits it: docs/silences.md is the standard.

/** Resources no counter reaches. Printed in the same breath as every verdict. */
export const BLIND = [
  "the platform ceiling ABOVE address-suggest (ROADMAP 14.15). No counter exists for it. A real-browser repro on 2026-10-10 saw no refusal from there in 370 calls; that is one IP and one evening, not proof it is absent.",
  "Geoapify's own credit count. rate_hits holds the product's two limits, not what the provider has billed against the 2,400-a-day ceiling.",
  "Resend's account-wide daily usage. The account also sends andrewsdetail.com's mail, and platform_email_days counts only what send-email claimed.",
  "demo rows in tables with no business_id column (children keyed by booking_id and the like), and edits that change a row without changing a count or a booking's status.",
  "receipts/ overwritten by another session (docs/shared-resources.md § 7). Check `git status --porcelain receipts/` by hand.",
  "Andrew's browser window and .manager-shots/ (§ 6, § 8). Neither is a database.",
];

/** Movement with a known cause that is not a session. Named, never hidden. */
export const BACKGROUND = [
  [/^rate_hits\/available-slots:no-address\//, "probably the probe-live-site cron, about 12 an hour once 14.18 is published (shared-resources § 1)"],
];

/** `mine` entries are prefixes: "demo/bookings" covers demo/bookings and demo/bookings.status. */
const claimed = (name, mine) => mine.some((m) => name.startsWith(m));

export function diffSnapshots(before, after, mine = []) {
  const names = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const moved = [];
  for (const name of names) {
    const a = before[name], b = after[name];
    if (a === b) continue;
    const kind = a === undefined ? "appeared" : b === undefined ? "gone" : "changed";
    const delta = typeof a === "number" && typeof b === "number" ? b - a : null;
    const bg = BACKGROUND.find(([re]) => re.test(name));
    moved.push({ name, kind, before: a, after: b, delta,
      mine: claimed(name, mine), background: bg ? bg[1] : null });
  }
  const unclaimed = moved.filter((m) => !m.mine);
  return { counters: names.length, moved, unclaimed,
    unexplained: unclaimed.filter((m) => !m.background) };
}

export function render(d, mine = []) {
  const line = (m) => `  ${m.name}: ${m.kind === "appeared" ? "appeared at " + m.after
    : m.kind === "gone" ? "was " + m.before + ", now GONE (deleted or pruned)"
    : m.delta !== null ? `${m.before} -> ${m.after} (${m.delta > 0 ? "+" : ""}${m.delta})`
    : "changed"}${m.background ? "  [" + m.background + "]" : ""}`;
  const out = [];
  out.push(`counters compared: ${d.counters}; moved: ${d.moved.length}; this session declared: ${mine.length ? mine.join(", ") : "NOTHING (everything that moved is somebody else's)"}`);
  if (d.unexplained.length) {
    out.push(`MOVED, AND NOT BY THIS SESSION (${d.unexplained.length}):`, ...d.unexplained.map(line));
  }
  const bg = d.unclaimed.filter((m) => m.background);
  if (bg.length) out.push(`moved with a known background cause (${bg.length}):`, ...bg.map(line));
  const own = d.moved.filter((m) => m.mine);
  if (own.length) out.push(`moved, declared as this session's (${own.length}):`, ...own.map(line));
  out.push(
    d.unexplained.length
      ? `VERDICT: COLLISION POSSIBLE — ${d.unexplained.length} counter(s) moved that this session did not declare. Ask what else was running before believing your numbers.`
      : `VERDICT: NOTHING UNDECLARED MOVED among the ${d.counters} counters this guard can read. That is NOT "no collision": it is blind to the ${BLIND.length} resources below.`,
    "CANNOT SEE:", ...BLIND.map((b, i) => `  ${i + 1}. ${b}`));
  return out.join("\n");
}
