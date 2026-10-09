// ROADMAP 0.11bb — IS THE PHOTO DOOR PUBLISHED, AND DOES THE PUBLISHED ONE DO
// WHAT THE ITEM SAYS IT MUST?
//
//   set -a; . ./.env; set +a
//   node scripts/photo-door-deployed.mjs
//   node scripts/photo-door-deployed.mjs --base=https://media.detailingplatform.com
//   node scripts/photo-door-deployed.mjs --break=accept-missing-door
//
// **IT READS. It deploys nothing, publishes nothing, applies nothing, flips no
// flag, writes no row, writes no R2 object and touches no secret VALUE.** The
// one thing it creates is a session for the seeded demo owner, which is what
// every end-to-end script here already does, and it creates it only when the
// door is actually deployed — today there is nothing to call, so no sign-in is
// attempted at all.
//
// ---------------------------------------------------------------------------
// WHY IT EXISTS
// ---------------------------------------------------------------------------
// All four of 0.11bb's criteria contain the word DEPLOYED:
//
//   1 · photo-door is published successfully.
//   2 · The deployed function has the configured R2_MEDIA_BASE value.
//   3 · A deployed-door request mints a caller-business-scoped media key.
//   4 · The deployed door returns public URLs derived from the configured
//       public R2 address.
//
// **Publishing is Andrew's** (CLAUDE.md: "DO NOT DEPLOY TO MAKE IT GREEN"), so
// no session can satisfy any of them. What a session CAN build is the thing
// none of them had: a command that tells done from forgotten the minute he
// presses publish. Without it, criterion 3 and criterion 4 are judged by
// reading the source of a function nobody has started — which is the one kind
// of evidence this repo has decided means nothing (`docs/silences.md`).
//
// **AND THE DOOR'S LOGIC IS ALREADY PROVED. THAT IS NOT THE SAME CLAIM.**
// `tests/photo-door-media.test.mjs` runs `handlePhotoDoor` in memory and
// asserts the key shape, the isolation guard and the public-url derivation —
// 17 tests with a sabotage pass. Every one of those is a statement about THIS
// CHECKOUT. 22 of 39 edge functions were once running something else
// (ROADMAP 0.6), so "the source mints a scoped key" and "the thing answering
// on the internet mints a scoped key" are two different sentences, and only
// the second is what 0.11bb asks for.
//
// ---------------------------------------------------------------------------
// WHAT IT DELIBERATELY DOES NOT DO: CONTENT DRIFT
// ---------------------------------------------------------------------------
// *"Published successfully"* here means the slug exists, is ACTIVE, keeps
// `verify_jwt` on, and answers. **Whether the deployed bundle IS this checkout
// is `scripts/deployed-inventory.mjs`'s question** — it fetches every bundle
// and compares by content, and CLAUDE.md's verification table already requires
// it before you finish. Re-implementing that comparison here would be a second
// copy of a rule that can disagree with the first, which is this repo's most
// repeated failure. Run both; this one names the behaviour, that one names the
// drift.
//
// ---------------------------------------------------------------------------
// HOW THE REFUSALS AND THE PASS PATH WERE OBSERVED RATHER THAN INFERRED
// ---------------------------------------------------------------------------
// `judge()` is a PURE function of an observed world, so the same six rules are
// aimed at two subjects:
//
//   · THE LIVE PROJECT — the Management API's function listing and secret
//     NAMES, plus real HTTP calls to the deployed door.
//   · A LOOPBACK STAND-IN (`--door=` is set internally) — the REAL
//     `handlePhotoDoor` from `supabase/functions/_shared/photoDoor.ts`, served
//     over `node:http` with in-memory deps, in one correct mode and seven
//     broken ones; plus four fabricated account worlds for the two rules
//     loopback cannot have an opinion about.
//
// **Eleven handed-over defects on every run.** The receipt's `observed_failure`
// goes false the moment one of them goes unnoticed, and the missed mode is
// named against the rule that should have caught it — never folded into a
// count. `docs/gotchas.md` 102 is why each stand-in is interrogated for its
// own identity before any colour is believed: three broken stand-ins once
// failed to bind and the correct one from the previous run answered all three
// probes, printing PASS over three deliberate defects.
//
// **The `ok` mode is the production handler, not a copy of it** — `docs/gotchas.md`
// 95: a canary aimed at a copy of the rule cannot see the rule change.
//
// ---------------------------------------------------------------------------
// WHAT IT CANNOT SEE, SAID HERE RATHER THAN LEFT TO BE FOUND
// ---------------------------------------------------------------------------
// **The secret's VALUE.** Criterion 2 is in two halves and this asks both the
// only ways they can be asked without reading a credential: the NAME is in the
// function's secret listing (`.name` is taken on the line that receives it, so
// no value is ever bound), and the live door's own answer is not the
// "Public image storage is not set up on the server yet." 503, which is the
// only thing that can distinguish a name with a usable value from a name with
// a broken one.
//
// **Whether the configured base is the RIGHT address** — that is 0.11ba's
// question and `scripts/r2-public-base.mjs` is its command. This one asks only
// that the url the door hands back is derived from the base it was told about.
//
// **No browser.** There is no page in this product that publishes a function.
// The browser proof of this path is 0.11bc's first real upload.
//
// ---------------------------------------------------------------------------
// THE STAND-IN'S PLATFORM GATE IS MEASURED, NOT IMAGINED
// ---------------------------------------------------------------------------
// The loopback door answers a tokenless POST `401 {"message":"Missing
// authorization header"}` before the handler is reached, because that is what
// Supabase does. **Measured 2026-10-09 against a function that IS deployed**:
// 17 of this project's 39 functions carry `verify_jwt`, and a tokenless POST
// to one of them returned `401 UNAUTHORIZED_NO_AUTH_HEADER / "Missing
// authorization header"`. So `door-published`'s no-auth half is aimed at a
// refusal this platform really produces, rather than at one invented here.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import * as door from "../supabase/functions/_shared/photoDoor.ts";
import { businessOwnsKey } from "../supabase/functions/_shared/photoKey.ts";
import { mediaBase, publicUrl, R2_PUBLIC_ENV } from "../supabase/functions/_shared/r2.ts";
import { writeReceipt, REPO } from "./receipt.mjs";

const STARTED = new Date().toISOString();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n) => {
  const hit = argv.find((a) => a.startsWith("--" + n + "="));
  return hit ? hit.slice(n.length + 3) : null;
};
const BREAK = arg("break") || "";
const KNOWN_BREAKS = [
  "accept-missing-door", "accept-open-door", "accept-missing-secret",
  "accept-unscoped-key", "accept-stranger", "accept-foreign-url",
];
if (BREAK && !KNOWN_BREAKS.includes(BREAK)) {
  console.error(`Unknown --break=${BREAK}. Known: ${KNOWN_BREAKS.join(", ")}.`);
  console.error("NOTHING ran and NO receipt was written. This is not a pass.");
  process.exit(2);
}

const lines = [];
const say = (s = "") => { lines.push(s); console.log(s); };
let assertions = 0;
const asked = () => { assertions++; };

const CALLER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const STAND_IN_BASE = "https://media.stand-in.test";

// ---------------------------------------------------------------------------
// THE SIX RULES. A PURE FUNCTION OF AN OBSERVED WORLD.
// ---------------------------------------------------------------------------
const CRITERIA = {
  "door-published": "0.11bb criterion 1 — photo-door is published, ACTIVE, and refuses an unauthenticated caller",
  "secret-name-present": "0.11bb criterion 2 — R2_MEDIA_BASE is on the function (by NAME; no value is read)",
  "base-live-on-door": "0.11bb criterion 2 — and the deployed door's own answer proves the value is usable",
  "caller-scoped-key": "0.11bb criterion 3 — the minted key is under the CALLER's business, not the body's",
  "refuses-another-business": "0.11bb criterion 3 — another tenant's business and another tenant's key are both refused",
  "public-url-from-base": "0.11bb criterion 4 — public_url is the configured address applied to that key",
};

/**
 * `world` is everything observed; nothing here fetches, reads a file or looks
 * at `process.env`. `ok: false, unjudgeable: true` is "asked and unanswerable",
 * which is never folded into the pass.
 */
export function judge(world, brk = "") {
  const out = [];
  const add = (id, ok, why, unjudgeable = false) => out.push({ id, ok, why, unjudgeable });

  // ------------------------------------------------------------ criterion 1
  const { listed, status, verifyJwt, noAuthStatus } = world;
  if (listed === null) {
    add("door-published", false, "the function listing could not be read, so publication is unknown", true);
  } else if (!listed) {
    if (brk === "accept-missing-door") {
      add("door-published", true, "photo-door is NOT deployed — ACCEPTED BY SABOTAGE");
    } else {
      add("door-published", false,
        "photo-door is not deployed on this project. Publishing is Andrew's: FOR-ANDREW.md step 9 "
        + "(`node scripts/deploy-functions.mjs photo-door`). Nothing below can be judged until it is.");
    }
  } else if (status && status !== "ACTIVE") {
    add("door-published", false, `photo-door is deployed but its status is ${status}, not ACTIVE`);
  } else if (verifyJwt === false) {
    add("door-published", false,
      "photo-door is deployed with verify_jwt OFF. Its own header says verify_jwt STAYS ON: every action "
      + "needs the owner's or a team member's session, and it is deliberately not in PUBLIC_FUNCTIONS.");
  } else if (noAuthStatus !== null && noAuthStatus !== 401 && brk !== "accept-open-door") {
    add("door-published", false,
      `an unauthenticated POST was answered ${noAuthStatus}, not 401 — the door is open to anybody`);
  } else {
    add("door-published", true,
      `deployed${status ? ", " + status : ""}, verify_jwt ${verifyJwt === null ? "unread" : verifyJwt}`
      + (noAuthStatus === null ? ", no-auth probe not run"
        : noAuthStatus === 401 ? ", an unauthenticated POST is 401"
          : `, unauthenticated POST answered ${noAuthStatus} — ACCEPTED BY SABOTAGE`));
  }

  // ------------------------------------------------------------ criterion 2
  if (world.secretNames === null) {
    add("secret-name-present", false,
      "the function's secret names were not listed, so " + R2_PUBLIC_ENV + "'s presence is unknown", true);
  } else if (!world.secretNames.includes(R2_PUBLIC_ENV)) {
    if (brk === "accept-missing-secret") {
      add("secret-name-present", true, R2_PUBLIC_ENV + " is NOT set — ACCEPTED BY SABOTAGE");
    } else {
      add("secret-name-present", false,
        R2_PUBLIC_ENV + " is not among this project's function secrets. It is the public address for "
        + "business-media, it has no default, and it cannot exist until 0.11ba binds one in Cloudflare.");
    }
  } else {
    add("secret-name-present", true, R2_PUBLIC_ENV + " is present (name only; no value was read)");
  }

  const start = world.start;
  if (!start) {
    add("base-live-on-door", false, "nothing to judge: the deployed door was never called", true);
  } else if (start.status === 503 && /not set up on the server yet/i.test(start.body?.error || "")) {
    add("base-live-on-door", false,
      `the deployed door answered 503 "${start.body.error}" — the name may be set but the running function `
      + "has no usable public base");
  } else if (start.status !== 200) {
    add("base-live-on-door", false,
      `the deployed door answered ${start.status}: ${JSON.stringify(start.body).slice(0, 200)}`);
  } else {
    add("base-live-on-door", true, "the deployed door signed a media upload, so its base is usable");
  }

  // ------------------------------------------------------------ criterion 3
  const key = start?.status === 200 ? start.body?.key : null;
  if (!key) {
    add("caller-scoped-key", false, "nothing to judge: the door minted no key", true);
  } else {
    const mine = businessOwnsKey(world.callerBusinessId, key, "media");
    const theirs = businessOwnsKey(world.otherBusinessId, key, "media");
    const scoped = mine && !theirs && key.startsWith(world.callerBusinessId + "/");
    if (scoped || brk === "accept-unscoped-key") {
      add("caller-scoped-key", scoped || brk === "accept-unscoped-key",
        scoped ? `${key} parses as the caller's own and as nobody else's`
          : `${key} is NOT the caller's — ACCEPTED BY SABOTAGE`);
    } else {
      add("caller-scoped-key", false,
        `${key} is not scoped to the caller ${world.callerBusinessId}: businessOwnsKey says caller=${mine}, `
        + `other tenant=${theirs}. The first path segment must be the CALLER's business, minted from the `
        + "session and never from the request body.");
    }
  }

  const os = world.otherStart;
  const orm = world.otherRemove;
  if (!os && !orm) {
    add("refuses-another-business", false, "nothing to judge: neither refusal was attempted", true);
  } else {
    const startRefused = !os || os.status === 401 || os.status === 403;
    const removeRefused = !orm || orm.status === 404;
    if ((startRefused && removeRefused) || brk === "accept-stranger") {
      const real = startRefused && removeRefused;
      add("refuses-another-business", real || brk === "accept-stranger",
        real
          ? `start for another business ${os ? os.status : "n/a"}, remove of another business's key `
            + `${orm ? orm.status : "n/a"} — both refused`
          : "a stranger was SERVED — ACCEPTED BY SABOTAGE");
    } else {
      const why = [];
      if (!startRefused) {
        why.push(`start for business ${world.otherBusinessId} was answered ${os.status}, not 401/403`);
      }
      if (!removeRefused) {
        why.push(`remove of ${world.otherKey} was answered ${orm.status}, not 404 `
          + `(${JSON.stringify(orm.body).slice(0, 120)})`);
      }
      add("refuses-another-business", false, why.join("; "));
    }
  }

  // ------------------------------------------------------------ criterion 4
  const url = start?.status === 200 ? start.body?.public_url : null;
  if (!world.base) {
    add("public-url-from-base", false,
      "UNJUDGEABLE: no configured address to compare against. Re-run with --base=<the address bound in "
      + "Cloudflare>, or with " + R2_PUBLIC_ENV + " exported. Criterion 4 is that the url is DERIVED from "
      + "the configured address, and reading the host out of the answer would be the answer marking its own work.",
      true);
  } else if (!key || !url) {
    add("public-url-from-base", false, "nothing to judge: the door returned no public_url", true);
  } else {
    const want = publicUrl(world.base, key);
    const host = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ""; } })();
    const dev = host === "r2.dev" || host.endsWith(".r2.dev");
    const https = url.startsWith("https://");
    const matches = url === want;
    if ((matches && https && !dev) || brk === "accept-foreign-url") {
      add("public-url-from-base", matches && https && !dev || brk === "accept-foreign-url",
        matches && https && !dev
          ? `${url} is exactly publicUrl(base, key)`
          : `${url} is not derived from ${world.base} — ACCEPTED BY SABOTAGE`);
    } else {
      const why = [];
      if (!matches) why.push(`the door answered ${url}; the configured address gives ${want}`);
      if (!https) why.push("it is not https, so every logo would be blocked as mixed content");
      if (dev) why.push(`${host} is Cloudflare's rate-limited r2.dev development host`);
      add("public-url-from-base", false, why.join("; "));
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// THE STAND-IN. The real handler, served over loopback, plus wrong doors.
// ---------------------------------------------------------------------------
const MEMBER = { userId: "u1", businessId: CALLER, role: "owner", permissions: ["settings"] };
const FAKE_PUT = (bucket, key) => `https://r2.test/${bucket}/${key}?put`;

function realDeps(over = {}) {
  return {
    requireMember: async (req, biz) => {
      const t = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
      // The platform refuses a tokenless call before the function runs; here the
      // handler stands in for both, so no token is no member.
      if (!t) return null;
      return biz === CALLER ? MEMBER : null;
    },
    can: (m, p) => m.role === "owner" || m.permissions.includes(p),
    withinLimits: async () => true,
    limit: { windowSeconds: 3600, limit: 600 },
    bookingBelongs: async () => false,
    budget: async () => null,
    getPhoto: async () => null,
    insertPhoto: async (row) => row,
    deletePhoto: async () => {},
    mediaUrl: (key) => publicUrl(STAND_IN_BASE, key),
    r2: { putUrl: async (b, k) => FAKE_PUT(b, k), getUrl: async () => "", head: async () => ({ exists: false, bytes: null }), del: async () => {} },
    log: () => {},
    ...over,
  };
}

const HTTP_MODES = [
  { mode: "ok", rule: null },
  { mode: "no-base", rule: "base-live-on-door" },
  { mode: "open-door", rule: "door-published" },
  { mode: "unscoped-key", rule: "caller-scoped-key" },
  { mode: "serves-stranger-start", rule: "refuses-another-business" },
  { mode: "serves-stranger-remove", rule: "refuses-another-business" },
  { mode: "foreign-url", rule: "public-url-from-base" },
  { mode: "r2dev-url", rule: "public-url-from-base" },
];

/**
 * One loopback door. `ok` and `no-base` run the PRODUCTION handler; the others
 * are deliberately wrong doors, because the subject of this gate is how a
 * DEPLOYED function behaves and a wrong deployment is not a wrong source file.
 * Every server answers `GET /whoami` with its own mode, so a stand-in that
 * failed to bind can never be mistaken for the previous one (`docs/gotchas.md` 102).
 */
async function standIn(mode) {
  const server = http.createServer(async (req, res) => {
    if (req.url === "/whoami") {
      res.writeHead(200, { "content-type": "text/plain" });
      return res.end(mode);
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    const auth = req.headers.authorization || "";
    const body = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
    const reply = (status, obj) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(obj));
    };

    // THE PLATFORM'S OWN GATE, which `verify_jwt` does before the function is
    // reached. `open-door` is a deployment with it switched off.
    if (!auth && mode !== "open-door") return reply(401, { message: "Missing authorization header" });

    if (mode === "ok" || mode === "no-base") {
      const deps = mode === "no-base" ? realDeps({ mediaUrl: undefined }) : realDeps();
      // The auth header is passed through UNCHANGED. Substituting a token here
      // made the no-auth probe answer 400 on a missing field instead of 401,
      // so the `open-door` mode was "caught" by an incidental status rather
      // than by the thing it is named for — `docs/gotchas.md` 105.
      const out = await door.handlePhotoDoor(
        new Request("http://x.test/functions/v1/photo-door", {
          method: "POST",
          headers: { ...(auth ? { Authorization: auth } : {}), "Content-Type": "application/json" },
          body: raw,
        }),
        deps,
      );
      res.writeHead(out.status, { "content-type": "application/json" });
      return res.end(await out.text());
    }

    // The wrong doors. Each answers the way a bad deployment would. `open-door`
    // is one that serves a caller with NO session at all, which is the only
    // failure a no-auth probe can actually see: a function deployed with
    // `verify_jwt` off still refuses an unauthenticated caller 401 of its own
    // accord, so that state is caught from the LISTING and not from a probe.
    const key = `${body.business_id === OTHER ? OTHER : CALLER}/${body.folder}/${body.file_id}.jpg`;
    if (body.action === "remove") {
      if (mode === "serves-stranger-remove") return reply(200, { removed: true });
      return reply(404, { error: "Image not found" });
    }
    if (body.business_id === OTHER && mode !== "serves-stranger-start") return reply(401, { error: "Unauthorized" });
    const mintedKey = mode === "unscoped-key" ? `${OTHER}/${body.folder}/${body.file_id}.jpg` : key;
    const base = mode === "foreign-url" ? "https://someone-elses-bucket.example"
      : mode === "r2dev-url" ? "https://pub-deadbeef.r2.dev"
        : STAND_IN_BASE;
    return reply(200, {
      upload_url: FAKE_PUT("business-media", mintedKey),
      key: mintedKey,
      public_url: publicUrl(base, mintedKey),
      expires_in: 600,
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  // INTERROGATE IT BEFORE BELIEVING ANY COLOUR IT PRODUCES.
  const who = await fetch(origin + "/whoami").then((r) => r.text()).catch(() => "");
  if (who !== mode) {
    server.close();
    throw new Error(`stand-in "${mode}" did not come up (it said "${who}") — no colour from it is worth anything`);
  }
  return { origin, close: () => server.close() };
}

/** The same three calls the live path makes, against any door URL. */
async function callDoor(origin, token) {
  const post = async (body, auth = token) => {
    const res = await fetch(origin, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const fileId = randomUUID();
  const otherKey = `${OTHER}/branding/${randomUUID()}.jpg`;
  return {
    noAuthStatus: (await post({
      action: "start", store: "media", business_id: CALLER,
      folder: "branding", file_id: randomUUID(), content_type: "image/png", claimed_bytes: 40_000,
    }, null)).status,
    start: await post({
      action: "start", store: "media", business_id: CALLER,
      folder: "branding", file_id: fileId, content_type: "image/png", claimed_bytes: 40_000,
    }),
    otherStart: await post({
      action: "start", store: "media", business_id: OTHER,
      folder: "branding", file_id: randomUUID(), content_type: "image/png", claimed_bytes: 40_000,
    }),
    otherRemove: await post({ action: "remove", store: "media", business_id: CALLER, key: otherKey }),
    otherKey,
  };
}

/** Four account worlds loopback cannot have an opinion about: rules 1 and 2. */
const ACCOUNT_WORLDS = [
  ["not deployed", { listed: false }, "door-published"],
  ["deployed but INACTIVE", { status: "REMOVED" }, "door-published"],
  ["deployed with verify_jwt off", { verifyJwt: false }, "door-published"],
  ["no " + R2_PUBLIC_ENV + " secret", { secretNames: ["R2_ACCOUNT_ID"] }, "secret-name-present"],
];

async function runStandIns() {
  const missed = [];
  let caught = 0;
  say("THE STAND-IN — the six rules against a loopback door, eight modes.");
  for (const { mode, rule } of HTTP_MODES) {
    const s = await standIn(mode);
    try {
      const calls = await callDoor(s.origin, "stand-in-token");
      const world = {
        listed: true, status: "ACTIVE", verifyJwt: true,
        noAuthStatus: calls.noAuthStatus,
        secretNames: [R2_PUBLIC_ENV, "R2_ACCOUNT_ID"],
        base: STAND_IN_BASE,
        callerBusinessId: CALLER, otherBusinessId: OTHER, otherKey: calls.otherKey,
        start: calls.start, otherStart: calls.otherStart, otherRemove: calls.otherRemove,
      };
      // THE SABOTAGE IS AIMED HERE TOO, NOT ONLY AT THE LIVE WORLD. Four of the
      // six rules are UNJUDGEABLE against today's project (no door to call), so
      // a `--break=` that only reached the live half would be switched off for
      // four of the six and would print the colour of one that landed —
      // `docs/gotchas.md` 102. With it aimed at the stand-in, each sabotage
      // moves its own mode from CAUGHT to MISSED and the count says so.
      const rules = judge(world, BREAK);
      asked();
      const bad = rules.filter((r) => !r.ok);
      if (rule === null) {
        if (bad.length) {
          missed.push('mode "ok": ' + bad.map((r) => r.id + " (" + r.why + ")").join("; "));
          say("  " + mode.padEnd(23) + " FALSE DEFECT — " + bad.map((r) => r.id).join(", "));
        } else {
          say("  " + mode.padEnd(23) + " all six rules pass against the production handler, as they must");
        }
      } else {
        const hit = rules.find((r) => r.id === rule);
        if (hit.ok) {
          missed.push(`mode "${mode}" went UNNOTICED by ${rule}`);
          say("  " + mode.padEnd(23) + " NOT CAUGHT by " + rule + " — the rule is not looking");
        } else {
          caught++;
          say("  " + mode.padEnd(23) + " caught by " + rule + ": " + hit.why.slice(0, 120));
        }
      }
    } finally {
      s.close();
    }
  }

  say("  — four account worlds, judged through the same six rules:");
  for (const [label, over, rule] of ACCOUNT_WORLDS) {
    asked();
    const world = {
      listed: true, status: "ACTIVE", verifyJwt: true, noAuthStatus: 401,
      secretNames: [R2_PUBLIC_ENV, "R2_ACCOUNT_ID"], base: STAND_IN_BASE,
      callerBusinessId: CALLER, otherBusinessId: OTHER, otherKey: `${OTHER}/branding/x.jpg`,
      start: null, otherStart: null, otherRemove: null, ...over,
    };
    const hit = judge(world, BREAK).find((r) => r.id === rule);
    if (hit.ok) {
      missed.push(`world "${label}" went UNNOTICED by ${rule}`);
      say("  " + label.padEnd(23) + " NOT CAUGHT by " + rule);
    } else {
      caught++;
      say("  " + label.padEnd(23) + " caught by " + rule + ": " + hit.why.slice(0, 90));
    }
  }
  return { caught, missed, handed: HTTP_MODES.length - 1 + ACCOUNT_WORLDS.length };
}

// ---------------------------------------------------------------------------
// THE LIVE PROJECT
// ---------------------------------------------------------------------------
try {
  const env = readFileSync(path.join(REPO, ".env"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* already exported is fine */ }

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
const SUPA = process.env.SUPABASE_URL;

async function observeLive() {
  const w = {
    listed: null, status: null, verifyJwt: null, noAuthStatus: null, secretNames: null,
    callerBusinessId: null, otherBusinessId: OTHER, otherKey: null,
    start: null, otherStart: null, otherRemove: null,
    base: (arg("base") || process.env[R2_PUBLIC_ENV] || "").trim() || null,
  };
  if (w.base) {
    const { base } = mediaBase(() => w.base);
    if (base) w.base = base;
  }
  if (!TOKEN || !REF) {
    say("The live half was NOT read: SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF is not loaded.");
    say("Load them the documented way — `set -a; . ./.env; set +a` — and run this again.");
    return w;
  }
  // THE PROJECT IS CONFIRMED BEFORE THE FIRST CALL. `adtlnvihwrcqcasqcjwd` is
  // Andrew's real business and nothing here may touch it.
  if (REF !== "kguqylyzgyzfktkfnhjb") {
    console.error(`\nREFUSING: SUPABASE_PROJECT_REF is not this platform's project — ${REF}`);
    console.error("NOTHING ran and NO receipt was written. This is not a pass.");
    process.exit(2);
  }
  const api = async (p) => {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}${p}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) throw new Error(`${p} failed: ${r.status}`);  // a failed read is not an empty one
    return r.json();
  };

  const fns = await api("/functions");
  const fn = fns.find((f) => f.slug === "photo-door");
  w.listed = !!fn;
  w.status = fn ? fn.status : null;
  w.verifyJwt = fn ? fn.verify_jwt : null;
  say(`The live project (${REF}): ${fns.length} functions deployed; photo-door `
    + (fn ? `${fn.status}, verify_jwt ${fn.verify_jwt}` : "NOT among them"));

  // NAMES ONLY. `.name` is taken on the line that receives the listing, so no
  // secret value is ever bound, compared, printed or written.
  w.secretNames = (await api("/secrets")).map((s) => s.name);
  say(`Function secrets present, by name: ${w.secretNames.filter((n) => n.startsWith("R2_")).join(", ") || "none beginning R2_"}`);

  if (!w.listed) {
    say("No deployed door, so NO session was created and NO call was made — there is nothing to call.");
    return w;
  }

  // Only now is a session worth creating: the demo tenant's owner, the login
  // every end-to-end script here already uses.
  const { demoOwner } = await import("./lib/demoOwner.mjs");
  const anon = process.env.SUPABASE_ANON_KEY;
  const owner = demoOwner();
  const auth = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: owner.email, password: owner.password }),
  }).then((r) => r.json());
  if (!auth?.access_token) throw new Error("could not sign in as the demo owner; the door cannot be called");
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const biz = (await fetch(`${SUPA}/rest/v1/businesses?select=id&slug=eq.demo-detail`,
    { headers: { apikey: svc, Authorization: `Bearer ${svc}` } }).then((r) => r.json()))?.[0]?.id;
  if (!biz) throw new Error('no business with slug "demo-detail" — run node scripts/seed-demo.mjs');
  w.callerBusinessId = biz;

  const calls = await callDoor(`${SUPA}/functions/v1/photo-door`, auth.access_token);
  Object.assign(w, calls);
  say(`The deployed door answered: start ${w.start.status}, foreign start ${w.otherStart.status}, `
    + `foreign remove ${w.otherRemove.status}, no-auth ${w.noAuthStatus}`);
  return w;
}

// ---------------------------------------------------------------------------

const { caught, missed, handed } = await runStandIns();
say("");
say(`CANARIES CAUGHT: ${caught} of ${handed} handed-over defects.`
  + (missed.length ? ` ${missed.length} MISSED: ${missed.join(" | ")}` : " None missed."));
say("");

const world = await observeLive();
// `callDoor` builds the caller's uuid into the bodies it sends, so the live
// world's caller is the business the live session really belongs to.
if (world.callerBusinessId === null) world.callerBusinessId = CALLER;
const rules = judge(world, BREAK);

say("");
say("THE LIVE PROJECT — 0.11bb's four criteria, asked of the deployed door.");
for (const r of rules) {
  say("  " + (r.ok ? "PASS" : r.unjudgeable ? "UNJU" : "FAIL") + "  " + r.id.padEnd(26) + " " + r.why);
  say("        " + CRITERIA[r.id]);
}

const failures = rules.filter((r) => !r.ok && !r.unjudgeable).map((r) => r.id + ": " + r.why);
const unjudgeable = rules.filter((r) => !r.ok && r.unjudgeable).map((r) => r.id + ": " + r.why);
const canaryOk = missed.length === 0;

say("");
say(`${rules.length} rules asked, ${failures.length} failed, ${unjudgeable.length} UNJUDGEABLE, `
  + `${assertions} assertions.`);
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
say(status === "pass" ? "PASS — 0.11bb's four criteria are met by the deployed door."
  : `FAIL — ${failures.length} failed, ${unjudgeable.length} unjudgeable, ${missed.length} canaries missed.`);

const log = path.join(REPO, "receipts/photo-door-deployed.log");
writeFileSync(log, lines.join("\n") + "\n");

writeReceipt({
  check_id: "photo-door-deployed",
  started_at: STARTED,
  status,
  expected_targets: Object.keys(CRITERIA).length,
  discovered_targets: rules.length,
  attempted_targets: rules.length,
  completed_targets: rules.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  // THE COUNT CANNOT VARY, SO IT IS DECLARED AS A STRUCTURE RATHER THAN AS A
  // FLOOR WITH SLACK IN IT (`docs/gotchas.md` 98). One assertion per stand-in
  // mode and one per account world: 8 + 4. Delete a mode and the count drops
  // below the floor; add one and the floor must be raised in the same edit.
  min_assertions: HTTP_MODES.length + ACCOUNT_WORLDS.length,
  assertion_floor:
    "one assertion per stand-in mode (8) plus one per fabricated account world (4). The count is fixed by "
    + "construction, so the floor is the same number by design: removing a mode drops below it.",
  failures,
  warnings: unjudgeable,
  artifacts: ["receipts/photo-door-deployed.log"],
  // THE NEGATIVE CONTROL IS THE WHOLE STAND-IN RUN. Eleven defects are handed
  // over every run — seven wrong loopback doors and four fabricated account
  // worlds — and `observed_failure` is false the moment ONE goes unnoticed,
  // which is the only state in which a green here would be worthless.
  canary: {
    id: "eleven-handed-over-defects",
    observed_failure: canaryOk,
    detail: `caught ${caught} of ${handed}`
      + (missed.length ? "; MISSED " + missed.join(" | ") : "; none missed"),
  },
  dimensions: {
    break: BREAK || null,
    unjudgeable: unjudgeable.length,
    canaries_caught: caught,
    canaries_missed: missed,
    door_deployed: world.listed,
    base_source: arg("base") != null ? "--base=" : process.env[R2_PUBLIC_ENV] ? R2_PUBLIC_ENV : "none",
  },
});

process.exit(status === "pass" ? 0 : 1);
