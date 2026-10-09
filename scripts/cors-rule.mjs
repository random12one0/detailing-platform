// THE CORS RULE ANDREW PASTES IS DERIVED FROM THE PRODUCT, NOT REMEMBERED —
// ROADMAP 0.11c, criterion 1.
//
//   node scripts/cors-rule.mjs            # judge, and print the paste-ready rule
//   node scripts/cors-rule.mjs --break=drop-www
//
// Credential-free. No network, no database, no Cloudflare call. Six filesystem
// reads and nothing else.
//
// ---------------------------------------------------------------------------
// WHY IT EXISTS
// ---------------------------------------------------------------------------
// Criterion 1 of 0.11c is *"the job-photos bucket CORS permits the production
// app, localhost development and applicable preview origins to GET and PUT
// with Content-Type"*. `scripts/photo-release-order.mjs` reports that rule as
// **UNJUDGEABLE** and always will: reading Cloudflare's CORS rules needs a
// credential this repo does not have, and the two private buckets cannot be
// probed anonymously. That is honest about the half of criterion 1 that lives
// in Cloudflare.
//
// **It leaves the other half unchecked, and that half is a document.** The
// only thing that decides what reaches Cloudflare is the sentence Andrew
// executes — `FOR-ANDREW.md` step 9a1. If that sentence names the wrong
// origins, Cloudflare is configured exactly as asked and uploads are still
// blocked, with a correct program and nothing anywhere to say why. So the
// executable question is: **does step 9a1 name every origin, method and header
// the product actually uses?**
//
// It did not. Measured 2026-10-09, before the edit this file justifies:
//   * it said *"your website's address"*, which reads as the apex alone —
//     `https://www.detailingplatform.com` is a SEPARATE ORIGIN and the product
//     treats it as one of ours (`app/src/lib/host.js`), so a detailer who
//     landed on `www.` had every upload blocked;
//   * it said *"any preview address you use"*, which is not executable — a
//     person cannot type a hostname Netlify has not generated yet. The product
//     answers it: `.netlify.app` and `.netlify.live`;
//   * it named the three buckets and the two methods only in prose, so nothing
//     could tell a complete paste from a partial one.
//
// ---------------------------------------------------------------------------
// EVERYTHING IT REQUIRES IS READ OUT OF THE PRODUCT
// ---------------------------------------------------------------------------
// Nothing in this file states an origin, a method, a header or a bucket of its
// own. That is deliberate, and it is `label-guard.mjs`'s failure avoided by
// not holding a spelling at all:
//
//   origins  `app/src/lib/host.js` — `PLATFORM_HOSTS` and `PLATFORM_SUFFIXES`
//            are the product's own answer to "is this browser on one of ours",
//            so they are the origin list by construction. The dev port comes
//            from `CLAUDE.md`'s own `dev server on :5173` line.
//   methods  the three `fetch(…, { method: "PUT", headers: { "Content-Type" } })`
//            call sites, and `photos.js`' `fetch(read)` of a signed GET url —
//            `publishToGallery`, which reads a private job photo in the browser
//            so it can copy it into the public bucket. **That one fetch is the
//            whole reason criterion 1 says GET**: every other read of a photo
//            is an `<img src>`, which needs no CORS rule at all.
//   headers  the same three call sites: `Content-Type`, and nothing else.
//            `Content-Length` is a forbidden header name — the browser sets it
//            from the body — so the media store's signed length needs no rule.
//   buckets  `STORES` in `supabase/functions/_shared/photoDoor.ts`, resolved
//            through its two bucket constants.
//
// A parse that finds nothing is a FAILURE, never a pass: rules 1 to 3 fail
// loudly when the product stops declaring what they read.
//
// ---------------------------------------------------------------------------
// WHAT IT STILL CANNOT SEE
// ---------------------------------------------------------------------------
// **Whether the rule is actually set in Cloudflare.** This judges the
// instruction, not the dashboard. The dashboard stays `photo-release-order`'s
// UNJUDGEABLE `bucket-cors`, and the proof is 0.11d's first browser upload,
// where a missing rule shows as a blocked preflight. A green here means
// *"doing exactly what the document says is now enough"* — which is the thing
// that was not true this morning.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt, REPO } from "./receipt.mjs";

const read = (rel) => readFileSync(path.join(REPO, rel), "utf8");

/** Every rule, in judging order. */
export const RULES = [
  "product-declares-origins",
  "product-needs-put",
  "product-needs-get",
  "step-names-three-buckets",
  "step-names-both-methods",
  "step-names-content-type",
  "step-names-every-origin",
  "step-forbids-wildcard-origin",
];

// ── READING THE PRODUCT ─────────────────────────────────────────────────────

/**
 * The platform's own origins, from `host.js` plus the documented dev port.
 *
 * **THE FIRST VERSION OF THIS PARSE TRUNCATED ITS OWN LIST AND SAID NOTHING.**
 * It bounded the Set with `[^\]]*`, and `"[::1]"` contains a `]`, so it read
 * four hosts out of five and every rule downstream reported cleanly on the
 * four. The boundary is now the literal `])` that closes the Set.
 *
 * `[::1]` is then excluded from the paste list ON PURPOSE and in the open:
 * it is an IPv6 loopback literal nobody types into an address bar, and asking
 * Andrew to paste an origin a dashboard may refuse is a dead end handed to the
 * one person who cannot debug it. `excluded` carries it so the exclusion is
 * visible in the report rather than being a parse that quietly dropped it.
 */
export function originsFrom(hostSrc, claudeMd) {
  const block = (name, close) => {
    const m = hostSrc.match(new RegExp(name + "\\s*=\\s*(?:new Set\\()?\\[([\\s\\S]*?)\\]" + close));
    return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  };
  const hosts = block("PLATFORM_HOSTS", "\\)");
  const suffixes = block("PLATFORM_SUFFIXES", ";");
  const port = (claudeMd.match(/dev server on :(\d+)/) || [])[1] ?? null;
  const excluded = hosts.filter((h) => h.startsWith("["));
  const usable = hosts.filter((h) => !h.startsWith("["));
  if (!usable.length || !suffixes.length || !port) {
    return { hosts, suffixes, excluded, port, origins: [] };
  }
  // A local host is http and carries the dev port; ours are https on 443.
  const local = (h) => h === "localhost" || h === "127.0.0.1";
  return {
    hosts, suffixes, excluded, port,
    origins: [
      ...usable.map((h) => (local(h) ? "http://" + h + ":" + port : "https://" + h)),
      ...suffixes.map((s) => "https://*" + s),
    ],
  };
}

/**
 * The buckets the door writes to, resolved through its bucket constants.
 *
 * **THE FIRST VERSION RESOLVED CONSTANTS IN `photoDoor.ts` ALONE, FOUND TWO OF
 * THREE, AND PRINTED "names all 2 buckets" AS A PASS.** `TENANT_PUBLIC_BUCKET`
 * is declared in `photoKey.ts` and imported, so `business-media` — the bucket
 * whose CORS rule step 9a1 only learned about on 2026-10-08 — resolved to
 * `null` and was filtered out of its own check. It returns `{ buckets,
 * declared }` now: `declared` is how many `bucket:` entries the STORES table
 * has, so a name that fails to resolve reddens instead of shrinking the
 * population (`docs/gotchas.md` 89 — the wrong population, not the wrong
 * verdict).
 */
export function bucketsFrom(sources) {
  const all = Object.values(sources).join("\n");
  const stores = all.match(/export const STORES[^{]*\{([\s\S]*?)\n\};/);
  if (!stores) return { buckets: [], declared: 0 };
  const names = [...stores[1].matchAll(/bucket:\s*([A-Za-z_"][^,]*)/g)].map((m) => m[1].trim());
  const buckets = names.map((n) => {
    if (n.startsWith('"')) return n.replace(/"/g, "");
    const c = all.match(new RegExp(n + '\\s*=\\s*"([^"]+)"'));
    return c ? c[1] : null;
  }).filter(Boolean);
  return { buckets, declared: names.length };
}

/** Every browser request the buckets must answer, with the line that makes it. */
export function transportFrom(files) {
  const put = [], get = [];
  for (const [rel, src] of Object.entries(files)) {
    src.split("\n").forEach((line, i) => {
      if (/method:\s*"PUT"/.test(line) && /"Content-Type"/.test(line)) put.push(rel + ":" + (i + 1));
      // The one cross-origin GET in the product: `publishToGallery` downloads a
      // signed job photo in the browser to copy it into the public bucket.
      if (/await fetch\(read\)/.test(line)) get.push(rel + ":" + (i + 1));
    });
  }
  return { put, get };
}

/** Step 9a1's text, bounded by its own heading and the next one. */
export function stepText(forAndrew) {
  const m = forAndrew.match(/\*\*a1 · The CORS rule[\s\S]*?(?=\n\*\*a2 ·)/);
  if (!m) throw new Error("FOR-ANDREW.md: step 9a1's block was not found — the heading moved");
  if (m[0].split("\n").length < 5) throw new Error("FOR-ANDREW.md: step 9a1's block is too short to be it");
  return m[0];
}

export function observe() {
  const host = originsFrom(read("app/src/lib/host.js"), read("CLAUDE.md"));
  return {
    ...host,
    ...bucketsFrom({
      "photoDoor.ts": read("supabase/functions/_shared/photoDoor.ts"),
      "photoKey.ts": read("supabase/functions/_shared/photoKey.ts"),
    }),
    transport: transportFrom({
      "app/src/lib/photos.js": read("app/src/lib/photos.js"),
      "app/src/lib/receipts.js": read("app/src/lib/receipts.js"),
      "app/src/lib/upload.js": read("app/src/lib/upload.js"),
    }),
    step: stepText(read("FOR-ANDREW.md")),
  };
}

// ── THE RULES, AS A PURE FUNCTION OF AN OBSERVED WORLD ──────────────────────
// `judge` never reads a file, so `tests/cors-rule.test.mjs` can drive it over
// the worlds this repo is not in — a step 9a1 missing one origin, a product
// that has stopped declaring its hosts — and see each rule bite.
export function judge(w) {
  const out = [];
  const add = (rule, verdict, asked, says) => out.push({ rule, verdict, asked, says });
  const says = (s) => w.step.includes(s);

  // 1 · THE PRODUCT MUST STILL DECLARE ITS OWN ORIGINS. Zero found is a
  //     failure, not an empty requirement: it means the parse stopped matching
  //     and every origin rule below would pass by asking nothing.
  if (!w.origins.length) {
    add("product-declares-origins", "fail", 1,
      "host.js yielded " + w.hosts.length + " hosts and " + w.suffixes.length + " suffixes, and "
      + "CLAUDE.md's dev port read as " + w.port + " — the origin list cannot be derived, so nothing "
      + "below was really asked");
  } else {
    add("product-declares-origins", "pass", 1,
      w.origins.length + " origins derived from host.js (" + w.hosts.length + " hosts, "
      + w.suffixes.length + " suffixes) and the documented dev port " + w.port);
  }

  // 2 · PUT IS REQUIRED BY THE PRODUCT, not by this file.
  if (!w.transport.put.length) {
    add("product-needs-put", "fail", 1,
      'no `method: "PUT"` upload with a Content-Type header was found in photos.js, receipts.js or '
      + "upload.js — the transport moved, so the rule being asked for may be the wrong one");
  } else {
    add("product-needs-put", "pass", 1,
      w.transport.put.length + " PUT-with-Content-Type upload call sites: " + w.transport.put.join(", "));
  }

  // 3 · AND SO IS GET, BY EXACTLY ONE CALLER.
  if (!w.transport.get.length) {
    add("product-needs-get", "fail", 1,
      "no browser fetch of a signed read url was found — criterion 1 asks for GET, and the one caller "
      + "that needed it (publishToGallery) is gone; either the criterion or the code has moved");
  } else {
    add("product-needs-get", "pass", 1,
      "GET is required by " + w.transport.get.join(", ") + " — publishToGallery reads a private job "
      + "photo in the browser to copy it into the public bucket");
  }

  // 4 · THE DOCUMENT NAMES EVERY BUCKET THE DOOR WRITES TO. A bucket left out
  //     is a working program answering every upload with a blocked preflight.
  if (!w.buckets.length || w.buckets.length !== w.declared) {
    add("step-names-three-buckets", "fail", 1,
      "the STORES table declares " + w.declared + " buckets and only " + w.buckets.length
      + " resolved to a name — the population is wrong, so a document missing a bucket would "
      + "have been reported as naming them all");
  } else {
    const missing = w.buckets.filter((b) => !says(b));
    add("step-names-three-buckets", missing.length ? "fail" : "pass", w.buckets.length,
      missing.length
        ? "step 9a1 does not name " + missing.join(", ") + " — the door writes to it and its uploads "
          + "would be blocked"
        : "step 9a1 names all " + w.buckets.length + " buckets the door writes to: " + w.buckets.join(", "));
  }

  // 5 · BOTH METHODS, IN THOSE WORDS.
  const methods = ["GET", "PUT"].filter((m) => !says(m));
  add("step-names-both-methods", methods.length ? "fail" : "pass", 2,
    methods.length
      ? "step 9a1 does not name " + methods.join(" or ") + " — the product makes both kinds of request"
      : "step 9a1 names GET and PUT, the two methods the product makes");

  // 6 · THE ONE HEADER. Without it every upload fails at the preflight.
  add("step-names-content-type", says("Content-Type") ? "pass" : "fail", 1,
    says("Content-Type")
      ? "step 9a1 names the Content-Type header"
      : "step 9a1 does not name Content-Type — every upload is a non-simple request and its preflight fails");

  // 7 · EVERY ORIGIN, VERBATIM. **This is the rule the www omission lived in**,
  //     and it is the canary, because it is the one this item's own edit
  //     satisfies — the rule most likely to be decoration.
  if (!w.origins.length) {
    add("step-names-every-origin", "unjudgeable", 0,
      "the origin list could not be derived from the product, so the document cannot be held against it");
  } else {
    const missing = w.origins.filter((o) => !says(o));
    add("step-names-every-origin", missing.length ? "fail" : "pass", w.origins.length,
      missing.length
        ? "step 9a1 does not name " + missing.length + " of " + w.origins.length + " platform origins: "
          + missing.join(", ") + " — the product treats each as one of ours, so uploads from it are blocked"
        : "step 9a1 names all " + w.origins.length + " origins host.js calls ours: " + w.origins.join(", "));
  }

  // 8 · AND IT MUST NOT REACH FOR `*`. This item is tagged security: these
  //     buckets take PUTs, and a rule any page may preflight turns a leaked
  //     one-hour upload url into something any website can spend.
  const wild = /AllowedOrigins[^\n]*"\*"|allow (?:any|all) (?:address|origin)/i.test(w.step);
  add("step-forbids-wildcard-origin", wild ? "fail" : "pass", 1,
    wild
      ? "step 9a1 appears to tell him to allow any origin — these buckets take PUTs, and a wildcard "
        + "lets any website spend a leaked upload url"
      : "step 9a1 does not ask for a wildcard origin");

  return out;
}

/** The rule, ready to paste. Derived, so it cannot drift from the product. */
export function corsJson(w) {
  return JSON.stringify([{
    AllowedOrigins: w.origins,
    AllowedMethods: ["GET", "PUT"],
    AllowedHeaders: ["Content-Type"],
    MaxAgeSeconds: 3600,
  }], null, 2);
}

// ── BROKEN ON PURPOSE ───────────────────────────────────────────────────────
// Each switch corrupts the OBSERVED world and names the one rule that must
// turn red. The verdict before the edit is printed, so a colour is only
// believed once the edit is seen to have landed (`docs/gotchas.md` 102).
export const BREAKS = {
  "drop-www": [(w) => { w.step = w.step.replace("https://www.detailingplatform.com", "x"); },
    "step-names-every-origin"],
  "drop-bucket": [(w) => { w.step = w.step.replaceAll("expense-receipts", "x"); },
    "step-names-three-buckets"],
  "drop-method": [(w) => { w.step = w.step.replaceAll("GET", "fetch"); },
    "step-names-both-methods"],
  "drop-header": [(w) => { w.step = w.step.replaceAll("Content-Type", "the file type"); },
    "step-names-content-type"],
  "wildcard": [(w) => { w.step += '\n  "AllowedOrigins": ["*"],\n'; },
    "step-forbids-wildcard-origin"],
  "no-put-callsite": [(w) => { w.transport = { ...w.transport, put: [] }; }, "product-needs-put"],
  "no-get-callsite": [(w) => { w.transport = { ...w.transport, get: [] }; }, "product-needs-get"],
  "no-origins": [(w) => { w.origins = []; w.hosts = []; }, "product-declares-origins"],
};

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const started = new Date().toISOString();
  const brk = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
  if (brk && !BREAKS[brk]) {
    console.error("unknown --break=" + brk + "; the switches are: " + Object.keys(BREAKS).join(", "));
    process.exit(1);
  }

  const w = observe();
  console.log("derived from the product: " + w.origins.length + " origins · " + w.buckets.length
    + " buckets · " + w.transport.put.length + " PUT call sites · " + w.transport.get.length
    + " signed-GET call site\n");

  if (brk) {
    const before = judge(w).find((r) => r.rule === BREAKS[brk][1]).verdict;
    BREAKS[brk][0](w);
    console.log("--break=" + brk + ": the observed world was corrupted in memory; \""
      + BREAKS[brk][1] + "\" was " + before + " before the edit\n");
  }

  const results = judge(w);
  if (results.length !== RULES.length) {
    console.error("judge() returned " + results.length + " rules against " + RULES.length + " declared");
    process.exit(1);
  }
  for (const r of results) {
    const mark = r.verdict === "pass" ? "ok  " : r.verdict === "fail" ? "FAIL" : "????";
    console.log(mark + "  " + r.rule + "\n      " + r.says);
  }

  // THE CANARY. `step-names-every-origin` is the rule this item's own edit to
  // FOR-ANDREW.md satisfies, so a run that only ever sees it pass cannot say
  // whether it works. Re-judged every run against a world with `www` removed —
  // the exact omission that was live this morning.
  const canaryWorld = structuredClone(w);
  canaryWorld.step = canaryWorld.step.replace("https://www.detailingplatform.com", "x");
  const originCanary = judge(canaryWorld).find((r) => r.rule === "step-names-every-origin");

  // AND A SECOND ONE, BECAUSE THE FIRST SABOTAGE OF THIS FILE PROVED THE
  // POPULATION GUARD WAS DECORATION TODAY. `step-names-three-buckets` fails
  // when a `bucket:` entry does not resolve to a name — which is the bug this
  // script shipped with for one run — and that branch cannot fire while the
  // repo is healthy, so nothing would notice it being removed. Re-judged every
  // run against a world where one of the three went unresolved.
  const popWorld = structuredClone(w);
  popWorld.buckets = popWorld.buckets.slice(0, -1);
  const popCanary = judge(popWorld).find((r) => r.rule === "step-names-three-buckets");

  const canaryCaught = originCanary.verdict === "fail" && popCanary.verdict === "fail";

  const failures = results.filter((r) => r.verdict === "fail");
  const unjudgeable = results.filter((r) => r.verdict === "unjudgeable");
  const assertions = results.reduce((n, r) => n + r.asked, 0) + 1; // +1 for the canary

  console.log('\ncanary "www-origin-dropped": a step 9a1 missing the www origin was '
    + (originCanary.verdict === "fail" ? "CAUGHT" : "NOT caught"));
  console.log('canary "bucket-unresolved": a world where one of the three buckets did not '
    + "resolve was " + (popCanary.verdict === "fail" ? "CAUGHT" : "NOT caught"));
  console.log("\n" + results.length + " rules · " + failures.length + " failed · "
    + unjudgeable.length + " unjudgeable · " + assertions + " assertions");
  console.log("\nthe rule, derived and ready to paste on all " + w.buckets.length + " buckets ("
    + w.buckets.join(", ") + "):\n" + corsJson(w));

  const report = path.join(REPO, "receipts", "cors-rule.txt");
  mkdirSync(path.dirname(report), { recursive: true });
  writeFileSync(report, [
    "cors rule · " + started,
    "origins derived: " + w.origins.join(" "),
    "buckets derived: " + w.buckets.join(" "),
    "PUT call sites: " + w.transport.put.join(" "),
    "signed-GET call sites: " + w.transport.get.join(" "),
    "broken on purpose: " + (brk || "no"),
    "",
    ...results.map((r) => r.verdict.toUpperCase() + "  " + r.rule + "\n    " + r.says),
    "",
    "canary www-origin-dropped caught: " + (originCanary.verdict === "fail"),
    "canary bucket-unresolved caught: " + (popCanary.verdict === "fail"),
    "",
    corsJson(w),
  ].join("\n") + "\n");

  const { path: rp, receipt } = writeReceipt({
    check_id: "cors-rule",
    started_at: started,
    status: failures.length === 0 && canaryCaught ? "pass" : "fail",
    expected_targets: RULES.length,
    discovered_targets: results.length,
    attempted_targets: results.length,
    completed_targets: results.length,
    skipped_targets: 0,
    assertions_executed: assertions,
    // A FLOOR, so a rule that quietly stops asking its questions reddens
    // rather than printing a smaller number nobody reads.
    min_assertions: 14,
    failures: failures.map((r) => r.rule + ": " + r.says),
    warnings: unjudgeable.map((r) => "UNJUDGEABLE " + r.rule + ": " + r.says),
    artifacts: ["receipts/cors-rule.txt"],
    dimensions: {
      rules: results.length,
      origins_derived: w.origins.length,
      buckets_derived: w.buckets.length,
      put_call_sites: w.transport.put.length,
      get_call_sites: w.transport.get.length,
      broken_on_purpose: brk || null,
    },
    canary: {
      id: "www-origin-dropped + bucket-unresolved",
      observed_failure: canaryCaught,
      www_origin_dropped: originCanary.verdict === "fail",
      bucket_unresolved: popCanary.verdict === "fail",
    },
  });
  console.log("\nreceipt: " + path.relative(REPO, rp) + " (" + receipt.status + ")");
  process.exit(failures.length === 0 && canaryCaught ? 0 : 1);
}
