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
import { injectedFor } from "./build-examples.mjs";

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
let injectedSeen = 0, sourceStale = 0;
// WHICH SITES THE SABOTAGE ACTUALLY ALTERED, measured rather than assumed.
const sabotageTouched = new Set();
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
  const clean = fingerprint(readFileSync(file, "utf8"));
  const now = BREAK === "drift" && slug === "ex3"
    ? fingerprint(readFileSync(file, "utf8") + "PRETEND-EDIT")
    : clean;
  if (now !== clean) sabotageTouched.add(slug);

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
    sourceStale++;
  } else {
    rows.push({ slug, verdict: "current", detail: recorded.fingerprint });
    console.log(`  ${slug.padEnd(5)} current — ${Object.keys(recorded.shots).length} picture(s), ${src}`);
  }

  // -----------------------------------------------------------------------
  // THE INJECTED BLOCK — the half that was in the picture and in nothing the
  // gate looked at. ROADMAP's spec for this gate, 2026-09-21.
  // -----------------------------------------------------------------------
  // `build-examples.mjs` puts a paint switcher into ex3 and only ex3, at
  // build time. The comparison above hashes `docs/tenant-sites/<src>` — the
  // site's own source and nothing else — so a change INSIDE the switcher
  // changed what the thumbnail should show and this gate kept saying
  // `current`. It was caught only because ex3 happened to be re-shot for an
  // unrelated reason.
  const inj = injectedFor(slug);
  if (inj) {
    injectedSeen++;
    assertions++;
    const cleanInj = fingerprint(inj);
    const nowInj = BREAK === "inject" && slug === "ex3"
      ? fingerprint(inj + "PRETEND-EDIT")
      : cleanInj;
    if (nowInj !== cleanInj) sabotageTouched.add(slug);
    // **"NEVER RECORDED" IS ITS OWN ANSWER, NOT A PASS.** A manifest written
    // before 2026-09-21 has no `injected_fingerprint` at all, and treating a
    // missing field as "it matches" is the precise fault this whole gate is
    // being repaired for, one field down.
    if (recorded.injected_fingerprint == null) {
      failures.push(`${slug} (${title}): its picture contains an injected block and the manifest `
        + `records no fingerprint for it, so nothing can say whether the block in the picture is `
        + `the block in the repo. Recapture this site.`);
      console.log(`  ${slug.padEnd(5)} INJECTED BLOCK NEVER RECORDED`);
    } else if (nowInj !== recorded.injected_fingerprint) {
      failures.push(`${slug} (${title}): its picture was taken before a change to the block `
        + `build-examples.mjs injects into it. Recorded ${recorded.injected_fingerprint}, the block `
        + `is now ${nowInj}. **The thumbnail shows a control that no longer looks like that.**`);
      console.log(`  ${slug.padEnd(5)} INJECTED BLOCK STALE — the switcher changed after the picture`);
    } else {
      console.log(`  ${slug.padEnd(5)} injected block current — ${recorded.injected_fingerprint}`);
    }
  } else if (recorded.injected_fingerprint != null) {
    // The reverse drift: the manifest vouches for a block this site no longer
    // gets. Green forever over a measurement of nothing is shape 3 in the spec.
    assertions++;
    failures.push(`${slug} (${title}): the manifest records an injected fingerprint but `
      + `build-examples.mjs injects nothing into this site any more.`);
  }
  // Reached the comparison this check exists to make. A STALE site is still
  // COMPLETED — it was measured and found wrong, which is the check working.
  // Only a site the loop never got to is incomplete, and that is the
  // difference the four counts are for.
  completed++;
}

// -------------------------------------------------------------------------
// **PRINT HOW MANY SITES AND HOW MANY INJECTED BLOCKS WERE FINGERPRINTED, AND
// MAKE ZERO BLOCKS A FAILURE** — ROADMAP's spec, and the reason is that the
// whole fix can rot back out the day somebody renames `PAINTS`.
// -------------------------------------------------------------------------
// `injectedFor()` would quietly start returning `null` for every site, this
// check would compare five sources and nothing else, and it would print the
// same green it prints today. That is the state it was in before this change:
// green, and measuring one thing fewer than it claimed.
console.log(`
${discovered} site(s) fingerprinted, ${injectedSeen} injected block(s) fingerprinted`);
if (injectedSeen === 0) {
  failures.push("ZERO INJECTED BLOCKS FINGERPRINTED. build-examples.mjs injects a block into at "
    + "least one site, so finding none means `injectedFor()` stopped matching and this gate is "
    + "back to comparing sources only — green over the exact hole it was built to close.");
  console.log("  ZERO INJECTED BLOCKS — this run does not close the hole it claims to");
}

// THE CANARY. Without `--break=drift` this check has no negative control, and
// a comparison that has never been shown to fail is a comparison nobody has
// tested. The sabotage moves ONE site's fingerprint; the gate must report that
// site and leave the other four alone.
const named = failures.filter((f) => f.startsWith("ex3")).length;
const others = failures.filter((f) => !f.startsWith("ex3")).length;
// **"AND ONLY ex3" HAS TO BE MEASURED, NOT READ OFF THE FAILURE LIST.** The
// first version asserted `others === 0`, which works only while every other
// site is passing. `ex4` is genuinely STALE today — a real finding that needs
// a build this session must not run — so a canary keyed to the failure list
// would report NOT CAUGHT CLEANLY because of a defect it did not cause, and
// the next session would go looking for a broken canary instead of a stale
// thumbnail. What the canary actually needs to know is which sites the
// SWITCH altered, and that is now recorded as it happens.
const touched = [...sabotageTouched].sort();
const confined = touched.length === 1 && touched[0] === "ex3";
const preexisting = others;
// **TWO SABOTAGES, AND THE SECOND IS THE ONE THAT PROVES THE HOLE IS CLOSED
// RATHER THAN DESCRIBED.** `--break=drift` pretends the SOURCE moved; a gate
// without this change catches it. `--break=inject` pretends the INJECTED
// block moved, and **a gate without this change passes it**, which is the
// single assertion separating the fix from a paragraph about the fix.
const SABOTAGE = BREAK === "drift" || BREAK === "inject";
const canary = {
  id: SABOTAGE
    ? `--break=${BREAK} · one site's ${BREAK === "inject" ? "INJECTED BLOCK" : "source"} pretends to have moved`
    : "--break=drift · one site's source pretends to have moved",
  observed_failure: SABOTAGE ? (named > 0 && confined) : false,
  caught_by: SABOTAGE && named > 0 && confined ? ["named-site"] : [],
  findings: SABOTAGE
    ? [named > 0 && confined
      ? `[named-site] the switch altered ${touched.join(", ") || "nothing"} and the gate named ex3, `
        + `so it points at the file to fix`
        + (preexisting ? ` (${preexisting} unrelated failure(s) on other sites are pre-existing and `
          + `were not caused by this switch)` : "")
      : `[named-site] NOT CAUGHT CLEANLY — named ${named}, switch altered ${touched.join(", ") || "nothing"}`]
    : ["no sabotage pass in this run; --break=drift and --break=inject certify the gate"],
};

const status = failures.length === 0 && BREAK === "" ? "pass"
  : (SABOTAGE && canary.observed_failure ? "pass" : "fail");

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
  failures: SABOTAGE ? [] : failures,
  artifacts: ["docs/example-shots/manifest.json"],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    "the thumbnails on /examples are REAL SCREENSHOTS of the real example sites, "
    + "committed rather than generated because the examples build runs on every paid deploy. "
    + "This check is what stops them going stale silently.",
  ],
  dimensions: { sites: SITES.length, injected_blocks: injectedSeen, source_stale: sourceStale, captured_at: manifest.captured_at },
  canary: SABOTAGE ? canary : {
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
