// ROADMAP 0.11ba — IS THERE A PUBLIC ADDRESS ON `business-media`, AND DOES IT
// LET A STRANGER READ WHILE LETTING ONLY OUR PAGES WRITE?
//
//   node scripts/r2-public-base.mjs
//   node scripts/r2-public-base.mjs --base=https://media.detailingplatform.com
//   node scripts/r2-public-base.mjs --base=... --key=<business>/branding/x.webp
//   node scripts/r2-public-base.mjs --break=accept-get-only
//
// **CREDENTIAL-FREE, AND THAT IS THE FINDING THIS FILE EXISTS ON.** It reads;
// it binds nothing, sets no CORS rule, deploys nothing, uploads nothing and
// touches no key. It needs no `.env` at all.
//
// ---------------------------------------------------------------------------
// WHY IT EXISTS — A RECORDED "UNJUDGEABLE" THAT WAS HALF WRONG
// ---------------------------------------------------------------------------
// `scripts/photo-release-order.mjs` reports the Cloudflare CORS rules as
// UNJUDGEABLE on every run and says why: *"Reading them needs a Cloudflare
// credential this program does not have and must not acquire."*
//
// **That is true of the Cloudflare API and false of the thing itself.** A
// public bucket address answers the public internet, so the two criteria that
// sounded like account questions are both answerable by anyone with an HTTP
// client:
//
//   * *"An unauthenticated request can read an object"* is a plain GET.
//   * *"CORS permits the browser upload flow"* is a preflight — `OPTIONS` with
//     `Origin` and `Access-Control-Request-Method: PUT`. A browser asks the
//     bucket exactly this before every upload, and the bucket answers it to
//     anybody who asks.
//
// So what made those two unjudgeable was never the missing credential. **It is
// that nobody has bound an address yet**, which is 0.11ba itself — and that is
// a different sentence, because one of them ends when Andrew spends two minutes
// in his dashboard and the other never ends.
//
// ---------------------------------------------------------------------------
// THE SIX QUESTIONS, AGAINST 0.11ba'S FOUR CRITERIA
// ---------------------------------------------------------------------------
//   1 base-configured        criteria 1 + 2: is an address available to this
//                            checkout at all, under the name the door reads?
//   2 base-usable            the REAL `mediaBase()` from `_shared/r2.ts`
//                            accepts it. Not restated here — stripped and
//                            imported, so a change to the door's own rule
//                            moves this check with it.
//   3 base-not-dev-address   not `*.r2.dev`. Andrew's step 9a2 recommends his
//                            own domain and the reason is permanence: the host
//                            is written into `gallery_images.image_url` one row
//                            per photograph and changing it later breaks them.
//   4 anonymous-read         criterion 4: a stranger GETs an object and is
//                            handed an IMAGE. Not just a 200 — a parked domain
//                            and a Cloudflare error page are both 200s.
//   5 cors-allows-our-pages  criterion 3: the preflight allows PUT **with
//                            `Content-Type`** from each host this app serves
//                            from. GET-only is the common mistake and it looks
//                            configured.
//   6 cors-refuses-a-stranger  the case that must be REFUSED. `*` on PUT lets
//                            any page on the internet spend a presigned URL.
//
// Rules 5 and 6 take their origins from `app/src/lib/host.js` — `isPlatformHost`
// is imported and every declared origin is asserted to be one of ours, so
// renaming the platform's domain reddens this instead of silently probing a
// host we no longer use.
//
// ---------------------------------------------------------------------------
// WHAT MAKES A GREEN MEAN ANYTHING — A STAND-IN, NOT AN ASSERTION
// ---------------------------------------------------------------------------
// Today rules 4, 5 and 6 have **no subject**: there is no address to probe, so
// three of the six questions would be answered by a probe nobody has ever seen
// work. That is this repo's single most repeated failure wearing a new hat.
//
// So every run first stands up a loopback HTTP server and aims the same three
// probe functions at it in **seven** named modes — one correct, six broken in
// the six ways that matter (no object, a parked HTML page, no CORS at all,
// GET-only CORS, CORS without `Content-Type`, and `*`). Each broken mode must
// be CAUGHT. A probe that has stopped looking shows up as a mode that passed,
// named in the output and in the receipt's canary.
//
// `mediaBase()` is https-only, so the stand-in cannot test rule 2 (no cert on
// loopback). Rule 2's control is therefore the pure function: an `http://` base
// and a blank one must both come back missing.
//
// SABOTAGE, and the output to certify on is the CANARIES CAUGHT line, never the
// verdict word (`docs/gotchas.md` 105):
//   --break=accept-missing-base   rule 1 believes an absent address is fine
//   --break=accept-http           rule 2 drops the https requirement
//   --break=accept-dev-address    rule 3 accepts r2.dev
//   --break=accept-any-type       rule 4 accepts the parked HTML page
//   --break=accept-get-only       rule 5 accepts GET-only CORS
//   --break=accept-wildcard       rule 6 accepts `*` on PUT

import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt, REPO } from "./receipt.mjs";
import { isPlatformHost } from "../app/src/lib/host.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const STARTED = new Date().toISOString();
const argv = process.argv.slice(2);
const arg = (n) => {
  const hit = argv.find((a) => a.startsWith("--" + n + "="));
  return hit ? hit.slice(n.length + 3) : null;
};
const BREAK = arg("break") || "";

// The door's own derivation, imported rather than described. A flag cannot be
// passed through `node --test` and this is not a test file for exactly that
// reason (`docs/gotchas.md` 104). `stripTypeScriptTypes` is the parser that
// actually throws (`docs/gotchas.md` 101), so a broken `r2.ts` fails here
// loudly instead of being read as "no base configured".
const r2src = readFileSync(resolve(HERE, "../supabase/functions/_shared/r2.ts"), "utf8");
const r2mod = await import(
  "data:text/javascript;base64," +
    Buffer.from(stripTypeScriptTypes(r2src, { mode: "strip" })).toString("base64")
);
const { mediaBase, publicUrl, R2_PUBLIC_ENV } = r2mod;

// The hosts this app serves from, asserted to be ours by `host.js` itself.
const OUR_ORIGINS = [
  "https://detailingplatform.com",
  "https://www.detailingplatform.com",
  "http://localhost:5173",
];
const STRANGER = "https://not-ours.example";

const lines = [];
const say = (s = "") => {
  lines.push(s);
  console.log(s);
};
let assertions = 0;
const asked = () => {
  assertions++;
};

// ---------------------------------------------------------------------------
// THE THREE NETWORK PROBES. One definition, aimed at the stand-in and at the
// real address, so what is proved on loopback is what runs against Cloudflare.
// ---------------------------------------------------------------------------

/** Rule 4. A stranger reads one object and is handed an image. */
async function probeRead(base, key) {
  const url = publicUrl(base, key);
  let res;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (err) {
    return { ok: false, why: "GET " + url + " did not connect: " + err.message };
  }
  const type = (res.headers.get("content-type") || "").toLowerCase();
  if (res.status !== 200) {
    return { ok: false, why: "GET returned " + res.status + ", not 200 — no readable object at " + key };
  }
  // A parked domain, a Cloudflare error page and an R2 "bucket not found" are
  // all 200 text/html. A 200 is not a photograph.
  const isImage = type.startsWith("image/");
  if (!isImage && BREAK !== "accept-any-type") {
    return { ok: false, why: 'GET returned 200 but content-type is "' + (type || "(none)") + '", not an image' };
  }
  return { ok: true, why: "GET 200 " + (type || "(no type)") + (isImage ? "" : " — ACCEPTED BY SABOTAGE") };
}

/** One preflight, exactly as a browser sends it before a PUT. */
async function preflight(base, origin) {
  let res;
  try {
    res = await fetch(base + "/preflight-probe", {
      method: "OPTIONS",
      headers: {
        origin,
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
    });
  } catch (err) {
    return { reached: false, why: "OPTIONS did not connect: " + err.message };
  }
  const h = (n) => (res.headers.get(n) || "").toLowerCase();
  return {
    reached: true,
    status: res.status,
    allowOrigin: h("access-control-allow-origin"),
    allowMethods: h("access-control-allow-methods"),
    allowHeaders: h("access-control-allow-headers"),
  };
}

/** Rule 5. Every one of our pages may PUT with a Content-Type. */
async function probeCorsAllows(base) {
  const bad = [];
  for (const origin of OUR_ORIGINS) {
    const p = await preflight(base, origin);
    if (!p.reached) {
      bad.push(origin + ": " + p.why);
      continue;
    }
    if (!isPlatformHost(new URL(origin).hostname)) {
      bad.push(origin + ": host.js does not call this one of ours — the origin list here is stale");
    }
    const originOk = p.allowOrigin === "*" || p.allowOrigin === origin.toLowerCase();
    const methodOk = p.allowMethods.includes("put")
      || (BREAK === "accept-get-only" && p.allowMethods.includes("get"));
    const headerOk = p.allowHeaders.includes("content-type") || p.allowHeaders === "*";
    if (!originOk) {
      bad.push(origin + ': allow-origin is "' + (p.allowOrigin || "(none)") + '" — this page is not permitted');
    } else if (!methodOk) {
      bad.push(origin + ': allow-methods is "' + (p.allowMethods || "(none)") + '" — PUT is not permitted');
    } else if (!headerOk) {
      bad.push(origin + ': allow-headers is "' + (p.allowHeaders || "(none)") + '" — Content-Type is not permitted');
    }
  }
  return bad.length
    ? { ok: false, why: bad.join("; ") }
    : { ok: true, why: "PUT with Content-Type allowed from all " + OUR_ORIGINS.length + " of our origins" };
}

/** Rule 6. A page that is not ours may NOT PUT. */
async function probeCorsRefuses(base) {
  const p = await preflight(base, STRANGER);
  if (!p.reached) return { ok: false, why: p.why };
  if (isPlatformHost(new URL(STRANGER).hostname)) {
    return { ok: false, why: "the stranger origin is in host.js — pick one that is not ours" };
  }
  const permitted = p.allowOrigin === "*" || p.allowOrigin === STRANGER.toLowerCase();
  if (permitted && BREAK !== "accept-wildcard") {
    return {
      ok: false,
      why: 'allow-origin is "' + p.allowOrigin + '" — any page on the internet may PUT with a presigned URL',
    };
  }
  return {
    ok: true,
    why: permitted
      ? 'allow-origin "' + p.allowOrigin + '" — ACCEPTED BY SABOTAGE'
      : 'refused (allow-origin "' + (p.allowOrigin || "(none)") + '")',
  };
}

// ---------------------------------------------------------------------------
// THE STAND-IN. Seven modes; six of them must be caught.
// ---------------------------------------------------------------------------
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489",
  "hex",
);
const KEY = "biz/branding/logo.webp";
const FULL = { "access-control-allow-methods": "GET, PUT", "access-control-allow-headers": "content-type" };

function corsFor(mode, origin, ours) {
  if (mode === "no-cors") return {};
  if (mode === "cors-wildcard") {
    return { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, PUT", "access-control-allow-headers": "*" };
  }
  if (!ours) return {};
  if (mode === "cors-get-only") {
    return { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, HEAD" };
  }
  if (mode === "cors-no-content-type") {
    return { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, PUT", "access-control-allow-headers": "x-amz-meta-x" };
  }
  return { "access-control-allow-origin": origin, ...FULL };
}

function standIn(mode) {
  return new Promise((ok) => {
    const srv = createServer((req, res) => {
      const origin = req.headers.origin || "";
      const ours = OUR_ORIGINS.includes(origin);
      if (req.method === "OPTIONS") {
        res.writeHead(204, corsFor(mode, origin, ours));
        return res.end();
      }
      if (mode === "no-object") {
        res.writeHead(404, { "content-type": "application/xml" });
        return res.end("<Error/>");
      }
      if (mode === "parked-page") {
        res.writeHead(200, { "content-type": "text/html" });
        return res.end("<html>buy this domain</html>");
      }
      res.writeHead(200, { "content-type": "image/webp" });
      res.end(PNG);
    });
    srv.listen(0, "127.0.0.1", () =>
      ok({ base: "http://127.0.0.1:" + srv.address().port, close: () => srv.close() }),
    );
  });
}

// Each mode names the RULE that must catch it, so a mode that goes quiet is
// reported against a question rather than as a bare count.
const MODES = [
  { mode: "ok", rule: null },
  { mode: "no-object", rule: "anonymous-read" },
  { mode: "parked-page", rule: "anonymous-read" },
  { mode: "no-cors", rule: "cors-allows-our-pages" },
  { mode: "cors-get-only", rule: "cors-allows-our-pages" },
  { mode: "cors-no-content-type", rule: "cors-allows-our-pages" },
  { mode: "cors-wildcard", rule: "cors-refuses-a-stranger" },
];

async function runStandIns() {
  const missed = [];
  let caught = 0;
  say("THE STAND-IN — the three network probes against a loopback bucket, seven modes.");
  for (const { mode, rule } of MODES) {
    const s = await standIn(mode);
    try {
      const results = {
        "anonymous-read": await probeRead(s.base, KEY),
        "cors-allows-our-pages": await probeCorsAllows(s.base),
        "cors-refuses-a-stranger": await probeCorsRefuses(s.base),
      };
      asked();
      asked();
      asked();
      if (rule === null) {
        const broke = Object.entries(results).filter(([, r]) => !r.ok);
        if (broke.length) {
          missed.push('mode "ok": ' + broke.map(([k, r]) => k + " failed (" + r.why + ")").join("; "));
          say("  " + "ok".padEnd(21) + " FALSE DEFECT — " + broke.map(([k]) => k).join(", "));
        } else {
          say("  " + "ok".padEnd(21) + " all three probes pass, as they must");
        }
      } else if (results[rule].ok) {
        missed.push('mode "' + mode + '" went UNNOTICED by ' + rule);
        say("  " + mode.padEnd(21) + " NOT CAUGHT by " + rule + " — the probe is not looking");
      } else {
        caught++;
        say("  " + mode.padEnd(21) + " caught by " + rule + ": " + results[rule].why);
      }
    } finally {
      s.close();
    }
  }
  // Rule 2 has no stand-in (no cert on loopback), so its control is the pure
  // function the door really uses.
  const pure = [["", "a blank base"], ["http://media.example.com", "an http base"]];
  for (const [value, label] of pure) {
    asked();
    const { base, missing } = mediaBase(() => value);
    if (base === null && missing.includes(R2_PUBLIC_ENV)) {
      caught++;
      say("  " + label.padEnd(21) + " caught by base-usable: reported " + R2_PUBLIC_ENV + " missing");
    } else {
      missed.push(label + " was ACCEPTED by mediaBase()");
      say("  " + label.padEnd(21) + " NOT CAUGHT by base-usable");
    }
  }
  return { caught, missed };
}

// ---------------------------------------------------------------------------
// THE REAL ADDRESS
// ---------------------------------------------------------------------------
const CRITERIA = {
  "base-configured": "0.11ba criteria 1+2 — a public address is bound and its value is available for R2_MEDIA_BASE",
  "base-usable": "0.11ba criterion 2 — the value is one the door's own mediaBase() accepts",
  "base-not-dev-address": "0.11ba criterion 1 — the bound address is not the rate-limited r2.dev development host",
  "anonymous-read": "0.11ba criterion 4 — an unauthenticated request reads an object through the address",
  "cors-allows-our-pages": "0.11ba criterion 3 — CORS permits the browser upload flow",
  "cors-refuses-a-stranger": "0.11ba criterion 3 — and permits it to nobody else",
};

async function runReal() {
  const out = [];
  const add = (id, ok, why, unjudgeable = false) => {
    asked();
    out.push({ id, ok, why, unjudgeable });
  };

  const given = arg("base");
  const envBase = process.env[R2_PUBLIC_ENV] || "";
  const raw = given ?? envBase;
  const source = given != null ? "--base=" : envBase ? R2_PUBLIC_ENV + " in the environment" : "nowhere";

  if (!raw) {
    if (BREAK === "accept-missing-base") {
      add("base-configured", true, "no address anywhere — ACCEPTED BY SABOTAGE");
    } else {
      add(
        "base-configured",
        false,
        "no public address for business-media: " + R2_PUBLIC_ENV + " is unset here and no --base= was given. "
          + "Nobody has bound one in Cloudflare (ROADMAP 0.11ba, FOR-ANDREW step 9a2).",
      );
    }
  } else {
    add("base-configured", true, "address available from " + source + ": " + raw);
  }

  const { base, missing } = raw ? mediaBase(() => raw) : { base: null, missing: [R2_PUBLIC_ENV] };
  const usable = base !== null || (BREAK === "accept-http" && /^https?:\/\//.test(raw));
  const effective = base ?? (usable ? raw.replace(/\/+$/, "") : null);

  if (!raw) add("base-usable", false, "nothing to judge: no address was supplied", true);
  else if (usable) {
    add("base-usable", true, "mediaBase() accepts it" + (base === null ? " — ACCEPTED BY SABOTAGE (http)" : "") + ": " + effective);
  } else {
    add("base-usable", false, "mediaBase() refuses it, missing " + missing.join(", ") + " — it must be an absolute https address");
  }

  if (!effective) add("base-not-dev-address", false, "nothing to judge: no usable address", true);
  else {
    const host = new URL(effective).hostname.toLowerCase();
    const dev = host === "r2.dev" || host.endsWith(".r2.dev");
    if (dev && BREAK !== "accept-dev-address") {
      add(
        "base-not-dev-address",
        false,
        host + " is Cloudflare's development host: rate-limited, and it gets written into every "
          + "gallery_images row made after the switch (FOR-ANDREW step 9a2 recommends a custom domain)",
      );
    } else {
      add("base-not-dev-address", true, dev ? host + " is r2.dev — ACCEPTED BY SABOTAGE" : host + " is not an r2.dev development host");
    }
  }

  if (!effective) {
    add("anonymous-read", false, "nothing to judge: no address to GET through", true);
    add("cors-allows-our-pages", false, "nothing to judge: no address to send a preflight to", true);
    add("cors-refuses-a-stranger", false, "nothing to judge: no address to send a preflight to", true);
  } else {
    const key = arg("key");
    if (!key) {
      add(
        "anonymous-read",
        false,
        "UNJUDGEABLE: no object named. Re-run with --key=<business>/branding/<file>.webp once one logo "
          + "has been uploaded — criterion 4 is about reading a real object, and inventing a key proves "
          + "only that the host answers.",
        true,
      );
    } else {
      const r = await probeRead(effective, key);
      add("anonymous-read", r.ok, key + ": " + r.why);
    }
    const a = await probeCorsAllows(effective);
    add("cors-allows-our-pages", a.ok, a.why);
    const d = await probeCorsRefuses(effective);
    add("cors-refuses-a-stranger", d.ok, d.why);
  }
  return out;
}

// ---------------------------------------------------------------------------

const { caught, missed } = await runStandIns();
say("");
say(
  "CANARIES CAUGHT: " + caught + " of " + (MODES.length - 1 + 2) + " handed-over defects."
    + (missed.length ? " " + missed.length + " MISSED: " + missed.join(" | ") : " None missed."),
);
say("");

const rules = await runReal();
say("THE REAL ADDRESS — 0.11ba's four criteria, asked of business-media's public base.");
for (const r of rules) {
  say("  " + (r.ok ? "PASS" : r.unjudgeable ? "UNJU" : "FAIL") + "  " + r.id.padEnd(24) + " " + r.why);
  say("        " + CRITERIA[r.id]);
}

const failures = rules.filter((r) => !r.ok && !r.unjudgeable).map((r) => r.id + ": " + r.why);
const unjudgeable = rules.filter((r) => !r.ok && r.unjudgeable).map((r) => r.id + ": " + r.why);
const canaryOk = missed.length === 0;

say("");
say(
  rules.length + " rules asked, " + failures.length + " failed, " + unjudgeable.length
    + " UNJUDGEABLE, " + assertions + " assertions.",
);
if (unjudgeable.length) {
  say("UNJUDGEABLE, by name — not folded into the pass:");
  for (const u of unjudgeable) say("  " + u);
}
if (failures.length) {
  say("FAILED:");
  for (const f of failures) say("  " + f);
}

const status = canaryOk && failures.length === 0 && unjudgeable.length === 0 ? "pass" : "fail";
say("");
say(
  status === "pass"
    ? "PASS"
    : "FAIL — " + failures.length + " failed, " + unjudgeable.length + " unjudgeable, " + missed.length + " canaries missed.",
);

const log = resolve(REPO, "receipts/r2-public-base.log");
writeFileSync(log, lines.join("\n") + "\n");

writeReceipt({
  check_id: "r2-public-base",
  started_at: STARTED,
  status,
  expected_targets: Object.keys(CRITERIA).length,
  discovered_targets: rules.length,
  attempted_targets: rules.length,
  completed_targets: rules.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 24,
  failures,
  warnings: unjudgeable,
  artifacts: ["receipts/r2-public-base.log"],
  // THE NEGATIVE CONTROL IS THE WHOLE STAND-IN RUN, not one handed-over
  // defect. Eight are handed over on every run and all eight must be caught:
  // six broken buckets on loopback, and the two bases `mediaBase()` must
  // refuse. `observed_failure` is false the moment ONE of them goes unnoticed,
  // which is the only state in which a green here would be worthless.
  canary: {
    id: "eight-handed-over-defects",
    observed_failure: canaryOk,
    detail: "caught " + caught + " of " + (MODES.length - 1 + 2)
      + (missed.length ? "; MISSED " + missed.join(" | ") : "; none missed"),
  },
  dimensions: {
    break: BREAK || null,
    unjudgeable: unjudgeable.length,
    canaries_caught: caught,
    canaries_missed: missed,
    origins: OUR_ORIGINS,
    base_source: arg("base") != null ? "--base=" : process.env[R2_PUBLIC_ENV] ? R2_PUBLIC_ENV : "none",
  },
});

process.exit(status === "pass" ? 0 : 1);
