#!/usr/bin/env node
// ARE THE TWO PHOTO-STORE SWITCHES ON THE PUBLISHED WEBSITE? (ROADMAP 0.11c / 0.11cc)
//
// `photo-release-order.mjs` reads `RECEIPTS_VIA_DOOR` and `MEDIA_VIA_DOOR` from
// the SOURCE, where both have been `true` since b92bdb21. The source cannot say
// whether the website people load carries them: that is a question about the
// published bundle. Until this file the answer was a hand probe written into
// the roadmap and never committed (0.11c, 2026-10-17), so nobody could re-take it.
//
// HOW IT JUDGES, WITHOUT HOLDING A SPELLING OF ITS OWN ANSWER. It builds this
// checkout four times into out/ — every combination of the two switches — with
// a build-time rewrite of the `export const ... = true;` lines, so the source
// file is never edited (a reload or a kill mid-run cannot leave it flipped;
// docs/gotchas.md 90). The live bundle takes a build's switch states only when
// it matches that build on EVERY candidate marker. Matching no build, or two
// builds that disagree on a switch, is UNJUDGEABLE for that switch.
//
// WHY EVERY MARKER, NOT THE ONES A SWITCH ALONE MOVES (0.11c review, 2026-10-25).
// The first version judged each switch on the markers only it moves. For media
// that was one count, `business-media`, which also moves with unrelated code:
// the bundle measured OFF on 2026-10-17 (`index-CT8xjH8F.js`) has the same
// `business-media` count as today's ON build, so that version printed
// "MEDIA_VIA_DOOR is ON" over it. `--break=stale-off` replays exactly those
// recorded counts, and the canary judges them on every run.
//
// Credential-free: one public GET of the website and four local builds.
//
//   node scripts/live-bundle-switches.mjs
//   node scripts/live-bundle-switches.mjs --break=media-off     # live := media-off build, must red `media-live`
//   node scripts/live-bundle-switches.mjs --break=receipts-off  # live := receipts-off build, must red `receipts-live`
//   node scripts/live-bundle-switches.mjs --break=stale-off     # live := the 2026-10-17 OFF bundle's counts, must red `media-live`
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, writeReceipt, receiptFile } from "./receipt.mjs";

const SITE = "https://detailingplatform.com";
const DOOR_FILE = join(REPO, "app/src/lib/photo-door.js");
const SWITCHES = { receipts: "RECEIPTS_VIA_DOOR", media: "MEDIA_VIA_DOOR" };
// Candidates, not answers: their counts in each build are measured per run.
const CANDIDATES = ["business-media", "expense-receipts", 'action:"start"', "createSignedUrls", "expense_id"];
const BREAKS = ["media-off", "receipts-off", "stale-off"];
// Counts measured in the published bundle on 2026-10-17 (ROADMAP 0.11c), when both
// switches were measured OFF. A recorded fact about a real bundle.
const STALE_OFF_2026_10_17 = { "business-media": 3, "expense-receipts": 1, 'action:"start"': 1, createSignedUrls: 2, expense_id: 0 };
const fromVector = (v) => Object.entries(v).map(([m, n]) => (m + " ").repeat(n)).join("");

const brkArg = process.argv.find((a) => a.startsWith("--break="));
const brk = brkArg ? brkArg.slice(8) : null;
if (brk !== null && !BREAKS.includes(brk)) {
  console.error(`unknown --break=${brk}; known: ${BREAKS.join(", ")}. No receipt written.`);
  process.exit(1);
}

const started = new Date().toISOString();
const count = (s, m) => s.split(m).length - 1;
const vector = (s) => Object.fromEntries(CANDIDATES.map((m) => [m, count(s, m)]));

// The source must still declare both switches as `true`, or the "on" build is
// not this checkout's release and the comparison means nothing.
const src = readFileSync(DOOR_FILE, "utf8");
for (const name of Object.values(SWITCHES)) {
  if (!new RegExp(`export const ${name} = true;`).test(src)) {
    throw new Error(`${name} is not declared \`= true;\` in photo-door.js; this check compares against that release`);
  }
}

const { build } = await import(pathToFileURL(join(REPO, "app/node_modules/vite/dist/node/index.js")).href);
async function buildVariant(variant, offs) {
  const outDir = join(REPO, "out/live-bundle-switches", variant);
  await build({
    root: join(REPO, "app"),
    configFile: join(REPO, "app/vite.config.js"),
    logLevel: "silent",
    build: { outDir, emptyOutDir: true },
    plugins: [{
      name: "switch-off",
      enforce: "pre",
      transform(code, id) {
        if (!offs.length || !id.replace(/\\/g, "/").endsWith("src/lib/photo-door.js")) return null;
        for (const off of offs) {
          const line = `export const ${off} = true;`;
          if (!code.includes(line)) throw new Error(`rewrite target missing: ${line}`);
          code = code.replace(line, `export const ${off} = false;`);
        }
        return code;
      },
    }],
  });
  const js = readdirSync(join(outDir, "assets")).filter((f) => f.endsWith(".js"));
  if (js.length !== 1) throw new Error(`${variant}: expected one JS file, found ${js.length}`);
  return readFileSync(join(outDir, "assets", js[0]), "utf8");
}

// Each build and the switch states it is built with.
const STATES = {
  on: { receipts: true, media: true },
  "receipts-off": { receipts: false, media: true },
  "media-off": { receipts: true, media: false },
  "both-off": { receipts: false, media: false },
};
const builds = {};
for (const [k, st] of Object.entries(STATES)) {
  builds[k] = await buildVariant(k, Object.keys(SWITCHES).filter((s) => !st[s]).map((s) => SWITCHES[s]));
}

// The live bundle. `_redirects` answers 200 with the SPA shell for anything,
// so a short body is refused rather than read as "no markers".
let live = null, liveAsset = null, liveBytes = 0, liveChars = 0, liveNote = null;
try {
  const html = await (await fetch(SITE + "/")).text();
  const assets = [...new Set(html.match(/assets\/index-[A-Za-z0-9_-]+\.js/g) || [])];
  if (assets.length !== 1) liveNote = `home page names ${assets.length} index bundles`;
  else {
    liveAsset = assets[0];
    // Bytes are the decoded body as downloaded; characters are the JS string length. They differ (UTF-8).
    const raw = Buffer.from(await (await fetch(`${SITE}/${liveAsset}`)).arrayBuffer());
    const body = raw.toString("utf8");
    liveBytes = raw.length;
    liveChars = body.length;
    if (raw.length < 100000) liveNote = `bundle is ${raw.length} bytes, under 100,000; not a real bundle`;
    else live = body;
  }
} catch (e) {
  liveNote = "fetch failed: " + e.message;
}
if (brk === "stale-off") live = fromVector(STALE_OFF_2026_10_17);
else if (brk) live = builds[brk];

function judgeSwitch(key, liveBody) {
  if (liveBody === null) return { verdict: "unjudgeable", says: liveNote, matches: [] };
  const lv = vector(liveBody);
  const matches = Object.keys(builds).filter((k) => CANDIDATES.every((m) => vector(builds[k])[m] === lv[m]));
  if (!matches.length) return { verdict: "unjudgeable", says: `live bundle matches no build of this checkout on all ${CANDIDATES.length} markers`, matches, live: lv };
  const states = new Set(matches.map((k) => STATES[k][key]));
  if (states.size > 1) return { verdict: "unjudgeable", says: `builds ${matches.join(" and ")} cannot be told apart and disagree on ${SWITCHES[key]}`, matches, live: lv };
  return { verdict: states.has(true) ? "on" : "off", matches, live: lv };
}

const results = [];
let assertions = 0;
for (const key of Object.keys(SWITCHES)) {
  const j = judgeSwitch(key, live);
  assertions += CANDIDATES.length + 1;
  const rule = key + "-live";
  const verdict = j.verdict === "on" ? "pass" : j.verdict === "off" ? "fail" : "unjudgeable";
  const says = j.verdict === "on"
    ? `${SWITCHES[key]} is ON in the published website (matches build ${j.matches.join(", ")} on all ${CANDIDATES.length} markers)`
    : j.verdict === "off"
      ? `${SWITCHES[key]} is OFF in the published website (matches build ${j.matches.join(", ")} on all ${CANDIDATES.length} markers); the website publish carrying it has not happened`
      : j.says;
  results.push({ rule, verdict, says, matched_builds: j.matches, live: j.live || null });
}

// CANARY: each off build, judged as though it were live, must read "off"; and the
// recorded 2026-10-17 OFF bundle must never read "on" for either switch.
const stale = fromVector(STALE_OFF_2026_10_17);
const canary = {
  receipts: judgeSwitch("receipts", builds["receipts-off"]).verdict === "off",
  media: judgeSwitch("media", builds["media-off"]).verdict === "off",
  stale_not_on: Object.keys(SWITCHES).every((k) => judgeSwitch(k, stale).verdict !== "on"),
};
assertions += 3;
const canaryCaught = canary.receipts && canary.media && canary.stale_not_on;

const failures = results.filter((r) => r.verdict === "fail");
const unjudgeable = results.filter((r) => r.verdict === "unjudgeable");
const lines = [
  `live bundle: ${liveAsset || "(none)"} ${liveBytes} bytes (${liveChars} characters)${brk ? `  [BROKEN ON PURPOSE: live := ${brk} build]` : ""}`,
  ...Object.entries(builds).map(([k, b]) => `build ${k}: ${JSON.stringify(vector(b))}`),
  `live:          ${live ? JSON.stringify(vector(live)) : "(unread)"}`,
  ...results.map((r) => `${r.verdict.toUpperCase().padEnd(11)} ${r.rule}: ${r.says}`),
  `canary (each off build judged off; the 2026-10-17 off bundle never on): receipts ${canary.receipts}, media ${canary.media}, stale ${canary.stale_not_on}`,
  `${results.length} rules, ${failures.length} failed, ${unjudgeable.length} unjudgeable, ${assertions} assertions`,
];
console.log(lines.join("\n"));
const txt = receiptFile(brk ? `live-bundle-switches.sabotage-${brk}.txt` : "live-bundle-switches.txt");
writeFileSync(join(REPO, txt), lines.join("\n") + "\n");

const { path: rp } = writeReceipt({
  check_id: "live-bundle-switches",
  started_at: started,
  status: failures.length === 0 && unjudgeable.length === 0 && canaryCaught ? "pass" : "fail",
  expected_targets: Object.keys(SWITCHES).length,
  discovered_targets: results.length,
  attempted_targets: results.length,
  completed_targets: results.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 15,
  assertion_floor: "structural: 2 switches x (5 marker comparisons + 1 verdict) + 3 canaries; the count is fixed by the candidate list, and a missing build or fetch throws or reads unjudgeable rather than running fewer",
  failures: [...failures, ...unjudgeable].map((r) => r.rule + ": " + r.says),
  warnings: [],
  artifacts: [txt],
  dimensions: {
    live_asset: liveAsset,
    live_bytes: liveBytes,
    live_chars: liveChars,
    builds: Object.fromEntries(Object.entries(builds).map(([k, b]) => [k, vector(b)])),
    break: brk,
  },
  canary: { id: "off-builds-judged-off", observed_failure: canaryCaught, ...canary },
});
console.log("receipt: " + rp);
process.exit(failures.length || unjudgeable.length || !canaryCaught ? 1 : 0);
