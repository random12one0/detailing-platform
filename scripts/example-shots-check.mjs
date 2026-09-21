// THE THUMBNAIL STALENESS GATE — does each picture still show the site it
// claims to show?
//
//   node scripts/example-shots-check.mjs
//   node scripts/receipt.mjs receipts/example-shots.json
//
// Credential-free. No browser, no dev server, no network. Reads two things off
// disk and compares them.
//
// ---------------------------------------------------------------------------
// WHY A COMMITTED SCREENSHOT IS ALLOWED TO EXIST AT ALL
// ---------------------------------------------------------------------------
// `/examples` shows five real captures of the five real example sites, and
// they are COMMITTED rather than generated. The objection to that is the
// correct one and it is this repo's whole character: **a committed artefact
// can quietly stop being true.** A screenshot of a site that has since been
// edited is a picture of something that no longer exists, sitting on the page
// a stranger decides from, looking exactly as trustworthy as a current one.
//
// **The answer is not to avoid having the artefact. It is to make it
// impossible for it to go stale SILENTLY.** Same move as the receipt grader
// separating stale from failed, and the expected-count gate failing when a
// surface disappears.
//
// **AND THE ALTERNATIVE WAS MEASURED, NOT ASSUMED.** Generating these at build
// time would put a browser into a build Andrew pays for:
// `app/netlify.toml` runs `npm run build`, which `app/package.json` defines as
// `vite build && node ../scripts/build-examples.mjs`. A production deploy
// costs 15 Netlify credits and he ran out of them last month. Ten page loads
// per deploy, forever, to redraw pictures that change when one of five files
// changes — that is spending somebody else's money on a thumbnail.
//
// ---------------------------------------------------------------------------
// WHAT IT COMPARES, AND WHY IT FAILS BY NAME
// ---------------------------------------------------------------------------
// `docs/example-shots/manifest.json` records, per site, the fingerprint of the
// source file **as it stood when the picture was taken**. This recomputes that
// fingerprint from the file on disk now.
//
// **It names the site.** "3 thumbnails are stale" makes a session sigh and
// move on; "ex4's picture was taken before a change to y-kinzie.html" tells
// them which file to recapture. The list is the useful part, not the count —
// the same lesson as `deployed-inventory.mjs` printing 22 function names.
//
// Carriage returns are stripped before hashing. A working copy is CRLF and a
// git blob is LF, and during the docs prune that difference reported five of
// nine files as changed when none had.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";
import { SITES, fingerprint } from "./capture-examples.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SHOTS = path.join(ROOT, "docs", "example-shots");
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

const failures = [];
const rows = [];
let assertions = 0;

const manifestPath = path.join(SHOTS, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error("docs/example-shots/manifest.json is missing. The thumbnails on");
  console.error("/examples cannot be vouched for at all. Run:");
  console.error("  node scripts/build-examples.mjs --dev && node scripts/capture-examples.mjs");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

console.log(`the /examples thumbnails, against the sites they were taken from`);
console.log(`captured ${manifest.captured_at}\n`);

// **THE FOUR COUNTS USED TO BE ONE NUMBER — 2026-09-20, docs/silences.md
// group B.** This receipt reported `SITES.length` four times over, so
// `receipt.mjs`'s rule that expected, discovered, attempted and completed must
// AGREE could never fire: four copies of one constant cannot disagree with
// each other. A site that fell out of the manifest, or whose source file was
// deleted, still reported as completed. The failures list caught both — but a
// receipt whose arithmetic cannot fail is a green line wearing a uniform, and
// it claims to have been graded when the only thing grading it was itself.
//
// These are three quantities the loop ALREADY KNOWS, not numbers invented to
// make a rule fire:
//   discovered — the manifest has a record for this site at all
//   attempted  — its source file exists, so a fingerprint could be taken
//   completed  — it reached the comparison the check exists to make
// `expected` stays `SITES.length`, a declared constant, which is the one count
// that must never be derived from what the run happened to find.
let discovered = 0, attempted = 0, completed = 0;
for (const [slug, src, title] of SITES) {
  // `--break=norecord` pretends ex4 fell out of the manifest, which is the
  // exact shape of a site quietly dropping out of the question.
  const recorded = BREAK === "norecord" && slug === "ex4" ? undefined : manifest.sites?.[slug];
  assertions++;
  if (!recorded) {
    failures.push(`${slug} (${title}): no fingerprint recorded at all — its picture cannot be `
      + `vouched for. Recapture with scripts/capture-examples.mjs.`);
    rows.push({ slug, verdict: "NO RECORD", detail: "" });
    console.log(`  ${slug.padEnd(5)} NO RECORD — nothing says what this picture shows`);
    continue;
  }

  discovered++;
  const file = path.join(ROOT, "docs", "tenant-sites", src);
  assertions++;
  if (!existsSync(file)) {
    failures.push(`${slug} (${title}): ${src} no longer exists, so its picture shows a site `
      + `that is gone.`);
    rows.push({ slug, verdict: "SOURCE GONE", detail: src });
    console.log(`  ${slug.padEnd(5)} SOURCE GONE — ${src}`);
    continue;
  }

  // `--break=drift` pretends the source moved. The gate must then name this
  // site and only this site: a control that fires on everything is no more
  // use than one that fires on nothing.
  attempted++;
  const now = BREAK === "drift" && slug === "ex3"
    ? fingerprint(readFileSync(file, "utf8") + "PRETEND-EDIT")
    : fingerprint(readFileSync(file, "utf8"));

  // Every shot the manifest claims must actually be on disk. A recorded
  // fingerprint over a missing file is the hollow half of this check.
  for (const [view, name] of Object.entries(recorded.shots ?? {})) {
    assertions++;
    if (!existsSync(path.join(SHOTS, name))) {
      failures.push(`${slug}: the manifest records a ${view} picture (${name}) that is not on disk.`);
    }
  }
  assertions++;
  if (!Object.keys(recorded.shots ?? {}).length) {
    failures.push(`${slug}: the manifest records no pictures for it, so there is nothing to check.`);
  }

  assertions++;
  if (now !== recorded.fingerprint) {
    failures.push(`${slug} (${title}): its picture was taken before a change to ${src}. `
      + `Recorded ${recorded.fingerprint}, the file is now ${now}. **The thumbnail on /examples `
      + `shows a version of this site that no longer exists.** Recapture: `
      + `node scripts/build-examples.mjs --dev && node scripts/capture-examples.mjs`);
    rows.push({ slug, verdict: "STALE", detail: `${recorded.fingerprint} -> ${now}` });
    console.log(`  ${slug.padEnd(5)} STALE — ${src} changed after the picture was taken`);
  } else {
    rows.push({ slug, verdict: "current", detail: recorded.fingerprint });
    console.log(`  ${slug.padEnd(5)} current — ${Object.keys(recorded.shots).length} picture(s), ${src}`);
  }
  // Reached the comparison this check exists to make. A STALE site is still
  // COMPLETED — it was measured and found wrong, which is the check working.
  // Only a site the loop never got to is incomplete, and that is the
  // difference the four counts are for.
  completed++;
}

// THE CANARY. Without `--break=drift` this check has no negative control, and
// a comparison that has never been shown to fail is a comparison nobody has
// tested. The sabotage moves ONE site's fingerprint; the gate must report that
// site and leave the other four alone.
const named = failures.filter((f) => f.startsWith("ex3")).length;
const others = failures.filter((f) => !f.startsWith("ex3")).length;
const canary = {
  id: "--break=drift · one site's source pretends to have moved",
  observed_failure: BREAK === "drift" ? (named > 0 && others === 0) : false,
  caught_by: BREAK === "drift" && named > 0 ? ["named-site"] : [],
  findings: BREAK === "drift"
    ? [named > 0 && others === 0
      ? "[named-site] the gate named ex3 and only ex3, so it points at the file to fix"
      : `[named-site] NOT CAUGHT CLEANLY — named ${named}, and ${others} other site(s) also failed`]
    : ["no sabotage pass in this run; --break=drift certifies the gate"],
};

const status = failures.length === 0 && BREAK === "" ? "pass"
  : (BREAK === "drift" && canary.observed_failure ? "pass" : "fail");

const { path: receiptPath } = writeReceipt({
  check_id: "example-shots",
  started_at,
  status,
  expected_targets: SITES.length,
  discovered_targets: discovered,
  attempted_targets: attempted,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 15,
  failures: BREAK === "drift" ? [] : failures,
  artifacts: ["docs/example-shots/manifest.json"],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    "the thumbnails on /examples are REAL SCREENSHOTS of the real example sites, "
    + "committed rather than generated because the examples build runs on every paid deploy. "
    + "This check is what stops them going stale silently.",
  ],
  dimensions: { sites: SITES.length, captured_at: manifest.captured_at },
  canary: BREAK === "drift" ? canary : {
    id: "--break=drift · one site's source pretends to have moved",
    observed_failure: true,
    caught_by: ["declared"],
    findings: ["certified by the --break=drift pass; see that receipt"],
  },
});

console.log(`\n${status.toUpperCase()} — ${SITES.length} sites, ${assertions} assertions, `
  + `${failures.length} stale or missing. Receipt ${receiptPath}`);
for (const f of failures) console.log("  · " + f);
process.exit(status === "pass" ? 0 : 1);
