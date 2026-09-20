// THE EDGE-FUNCTION REPLAY — ROADMAP 4.4's second clause, and the whole of
// what was left of it.
//
//   set -a; . ./.env; set +a
//   node scripts/edge-tenant-replay.mjs
//   node scripts/edge-tenant-replay.mjs --keep
//   node scripts/receipt.mjs receipts/edge-tenant-replay.json
//
// ---------------------------------------------------------------------------
// WHY THE TENANT MATRIX CANNOT ANSWER THIS, AT ALL
// ---------------------------------------------------------------------------
// `scripts/tenant-matrix.mjs` proves four boundaries and every one of them is
// enforced by ROW-LEVEL SECURITY: tables, definer RPCs, storage objects,
// realtime. **An edge function runs as the SERVICE ROLE.** RLS is not
// consulted, not bypassed by accident, not partially applied — it is simply
// never asked. Every policy proved by that matrix is irrelevant on these 39
// paths.
//
// What stands in its place is hand-written: `requireMember(req, business_id)`
// and then `.eq("business_id", member.businessId)` on each query. ROADMAP 4.4
// recorded that **every member-gated function had been READ and each one
// paired its lookup correctly — "but that is a reading, not a test."** This is
// the test.
//
// ---------------------------------------------------------------------------
// THE INVARIANT
// ---------------------------------------------------------------------------
//   **An actor of tenant A, calling any edge function with tenant B's
//   identifiers, must not receive B's data, and must not change it.**
//
// Two halves, and the second is asked structurally rather than per function:
// every row B owns is fingerprinted before the replay and again after, and any
// difference is a write that crossed a tenant boundary — whichever function
// did it, including one nobody thought to look at.
//
// **ANON IS THE BASELINE, exactly as in the RPC section of the matrix.** Some
// of these functions are public on purpose: the booking page calls
// `available-slots` and `calculate-booking` for a tenant it has never signed
// in to. So the question is never "did A get something" but **"did A get more
// than a stranger gets"**, which needs no allowlist and cannot be gamed by a
// function that is meant to be open.
//
// **AND THE WRITE HALF IS HELD TO THE SAME BASELINE, WHICH THE FIRST VERSION
// WAS NOT.** That version compared reads against anon and compared writes
// against nothing, and duly reported a LEAK: tenant B's `bookings` and
// `email_sends` moved during the replay. **They did — and it is the product
// working as designed.** `cancel-booking` and `reschedule-booking` are
// UUID-BEARER endpoints: the booking's UUID *is* the credential, so the
// customer can cancel from their own emailed link with no account. Anybody
// holding that UUID can, including an anonymous stranger. A doing it is not a
// privilege A holds over B.
//
// An asymmetric detector like that is worse than none, because it produces a
// confident cross-tenant-write finding that a reader has every reason to
// believe. So the replay now runs **twice, against two identical fresh
// tenants**: anon drives one, A's actors drive the other, and a finding is
// only a finding when A moved something a stranger could not.
//
// ---------------------------------------------------------------------------
// THE SURFACE IS DISCOVERED, AND THE ARGUMENTS ARE BUILT FROM THE SOURCE
// ---------------------------------------------------------------------------
// Every directory under `supabase/functions/` that is not `_shared` is a
// target. **A function this script cannot call is a DECLARED SKIP with its
// reason printed**, never a silent pass — a function nobody could call is a
// function nobody tested, which is the failure this repo is named for.
//
// The request shape comes off the source rather than a list here, in the three
// spellings the codebase actually uses:
//   * `const { a, b } = await req.json()`
//   * `const body = await req.json()` followed by `body.a`
//   * `new URL(req.url).searchParams.get("a")`
//
// ---------------------------------------------------------------------------
// THE CANARY, AND ITS LIMIT, STATED
// ---------------------------------------------------------------------------
// A canary here would ordinarily be a deliberately broken function that trusts
// a tenant id from its caller — the shape `tenant_matrix_canary_rpc` uses.
// **That would have to be DEPLOYED, and deploying is Andrew's** (ROADMAP 0.6,
// CLAUDE.md). So the negative control is the one this item's own earlier text
// already used for the database half:
//
//   *"the same request with a key that should see everything found 63 foreign
//   customer rows. They exist and are findable, so 'none' above is a refusal
//   and not an empty database."*
//
// **Every function is called once more with the SERVICE ROLE key**, which is
// over-privileged by construction and must come back carrying B's sentinel.
// If it does not, the detector cannot see tenant data in an edge-function
// response at all and every clean line above it is void.
//
// **WHAT THAT CANARY DOES NOT PROVE, SAID PLAINLY:** it shows the detector can
// SEE a leak in a response. It does not show the detector would catch a subtle
// authorization bug in a function that correctly refuses the service-role
// path. A deployed broken function is the only control that would, and it is
// gated on Andrew. Recorded here rather than glossed over.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FUNCTIONS = path.join(ROOT, "supabase", "functions");
const started_at = new Date().toISOString();
const KEEP = process.argv.includes("--keep");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
let ANON = process.env.SUPABASE_ANON_KEY;

if (!URL_ || !SERVICE || !TOKEN || !REF) {
  console.error("SKIPPED — needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,");
  console.error("          SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.");
  console.error("          Nothing was measured. Run: set -a; . ./.env; set +a");
  process.exit(1);
}
const ALLOWED = "kguqylyzgyzfktkfnhjb";
if (REF !== ALLOWED) {
  console.error(`REFUSING — this writes fixtures and calls live functions, and ${REF} is not ${ALLOWED}.`);
  process.exit(2);
}

// Every address this script can cause mail to reach. Resend always accepts it
// and delivers it nowhere.
const SINK = "delivered@resend.dev";
const S = (t) => `EDGEREPLAY-${t}-SECRET`;

const sql = async (text) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: text }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : [];
};

if (!ANON) {
  const keys = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
  ANON = keys.find((k) => k.name === "anon")?.api_key ?? keys.find((k) => k.type === "publishable")?.api_key;
  if (!ANON) { console.error("No anon key"); process.exit(1); }
}

const rest = async (method, p, { jwt, body, prefer } = {}) => {
  const r = await fetch(`${URL_}${p}`, {
    method,
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${jwt ?? SERVICE}`,
      "Content-Type": "application/json", Prefer: prefer ?? "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, data, text };
};

async function ensureUser(email, password) {
  await rest("POST", "/auth/v1/admin/users", { body: { email, password, email_confirm: true } });
  const s = await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })).json();
  if (!s.access_token) throw new Error(`sign-in failed for ${email}`);
  return { id: s.user.id, jwt: s.access_token };
}

const failures = [];
const rows = [];
const skips = [];
const notes = [];
let assertions = 0;
const say = (m) => failures.push(m);

// ---------------------------------------------------------------------------
// 1 · DISCOVERY — the surface, and what each function wants
// ---------------------------------------------------------------------------
// Comments and strings are stripped first: a field name inside a comment or an
// error message is not a field, and both appear all over this codebase.
const strip = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*\/\/.*$/gm, " ");

function fieldsFor(src) {
  const s = strip(src);
  const out = new Set();
  // `const { a, b: c } = await req.json()`
  for (const m of s.matchAll(/const\s*\{([^}]*)\}\s*=\s*await\s+req\.json\(\)/g)) {
    for (const part of m[1].split(",")) {
      const name = part.split(":")[0].trim().replace(/^\.\.\./, "");
      if (/^[a-z_][a-z0-9_]*$/i.test(name)) out.add(name);
    }
  }
  // `body.foo`, `body?.foo`
  for (const m of s.matchAll(/\bbody\??\.\s*([a-z_][a-z0-9_]*)/gi)) out.add(m[1]);
  // `searchParams.get("foo")`
  for (const m of s.matchAll(/searchParams\.get\(\s*["']([^"']+)["']/g)) out.add(m[1]);
  return [...out];
}

const dirs = readdirSync(FUNCTIONS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "_shared")
  .map((d) => d.name).sort();

let A, B, Bn, ownerA, staffA, formerA, ownerB;
const bIds = {};
const bnIds = {};
const canaryDetectors = [];

/** Everything tenant B owns, as one comparable fingerprint. */
async function fingerprintB(businessId) {
  const tables = await sql(`
    select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and exists (select 1 from pg_attribute a where a.attrelid = c.oid
                     and a.attname = 'business_id' and a.attnum > 0 and not a.attisdropped)
     order by 1`);
  const out = {};
  for (const { t } of tables) {
    const r = await sql(`select count(*)::int as n, coalesce(md5(string_agg(x::text, '|' order by x::text)), '') as h
                           from (select to_jsonb(q) as x from public.${t} q where q.business_id = '${businessId}') s`);
    out[t] = `${r[0]?.n ?? 0}:${r[0]?.h ?? ""}`;
  }
  return out;
}

try {
  console.log("1 · discovery");
  console.log(`    ${dirs.length} edge functions in the repo`);

  console.log("\n2 · actors and fixtures");
  ownerA = await ensureUser("edge-owner-a@isolation.test", "Edge-replay-test-pw!");
  ownerB = await ensureUser("edge-owner-b@isolation.test", "Edge-replay-test-pw!");
  staffA = await ensureUser("edge-staff-a@isolation.test", "Edge-replay-test-pw!");
  formerA = await ensureUser("edge-former-a@isolation.test", "Edge-replay-test-pw!");

  // **TWO IDENTICAL VICTIMS, NOT ONE.** `Bs` is the tenant A's actors are
  // pointed at; `Bn` is the one anon is pointed at with the identical
  // arguments. They are seeded the same way in the same loop, so any
  // difference between what happened to them is a difference between the
  // CALLER and nothing else. See the header for the cross-tenant-write finding
  // this replaced.
  await rest("DELETE", "/rest/v1/businesses?slug=in.(edge-replay-a,edge-replay-b,edge-replay-bn)");
  const biz = await rest("POST", "/rest/v1/businesses", {
    body: [
      { is_demo: true, slug: "edge-replay-a", name: `${S("A")} DETAIL`, timezone: "America/Denver",
        contact_email: SINK, mailing_address: "PO Box 1, Denver CO" },
      { is_demo: true, slug: "edge-replay-b", name: `${S("B")} DETAIL`, timezone: "America/Denver",
        contact_email: SINK, mailing_address: "PO Box 2, Denver CO" },
      { is_demo: true, slug: "edge-replay-bn", name: `${S("B")} DETAIL`, timezone: "America/Denver",
        contact_email: SINK, mailing_address: "PO Box 3, Denver CO" },
    ],
  });
  if (biz.status !== 201) throw new Error(`fixture businesses: ${biz.status} ${biz.text.slice(0, 200)}`);
  A = biz.data.find((b) => b.slug === "edge-replay-a");
  B = biz.data.find((b) => b.slug === "edge-replay-b");
  Bn = biz.data.find((b) => b.slug === "edge-replay-bn");

  await rest("POST", "/rest/v1/business_users", {
    body: [
      { business_id: A.id, user_id: ownerA.id, role: "owner" },
      { business_id: B.id, user_id: ownerB.id, role: "owner" },
      { business_id: A.id, user_id: staffA.id, role: "staff" },
      { business_id: A.id, user_id: formerA.id, role: "staff" },
    ],
  });
  for (const [tag, b] of [["A", A], ["B", B], ["Bn", Bn]]) {
    await rest("POST", "/rest/v1/business_settings", {
      body: [{ business_id: b.id, mobile_enabled: true, dropoff_enabled: true,
        min_advance_minutes: 0, max_advance_days: 365, max_bookings_per_day: 50,
        buffer_minutes: 0, slot_interval_minutes: 30, cancellation_window_hours: 0 }],
    });
    await rest("POST", "/rest/v1/business_hours", {
      body: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        business_id: b.id, weekday, open_time: "07:00", close_time: "19:00" })),
    });
    const svc = await rest("POST", "/rest/v1/services", {
      body: [{ business_id: b.id, name: `${S(tag === "Bn" ? "B" : tag)} service`, price: 120, duration_minutes: 60 }],
    });
    const cust = await rest("POST", "/rest/v1/customers", {
      body: [{ business_id: b.id, name: `${S(tag === "Bn" ? "B" : tag)} client`, phone: "555-0101", email: SINK }],
    });
    const day = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
    const bk = await rest("POST", "/rest/v1/bookings", {
      body: [{
        business_id: b.id, customer_name: `${S(tag === "Bn" ? "B" : tag)} client`, customer_phone: "555-0101",
        customer_email: SINK, customer_address: `${S(tag === "Bn" ? "B" : tag)} street`,
        start_at: `${day}T17:00:00Z`, end_at: `${day}T18:00:00Z`,
        service_type: "mobile", status: "pending", vehicle_size: "medium",
        vehicle_size_label: "Medium", subtotal: 120, total_price: 120,
      }],
    });
    const store = tag === "B" ? bIds : tag === "Bn" ? bnIds : null;
    if (store) {
      store.business_id = b.id;
      store.business_slug = b.slug;
      store.booking_id = bk.data?.[0]?.id ?? null;
      store.customer_id = cust.data?.[0]?.id ?? null;
      store.service_id = svc.data?.[0]?.id ?? null;
      store.day = day;
    }
  }
  console.log(`    A ${A.id}  B ${B.id}`);
  console.log(`    B's booking ${bIds.booking_id}, customer ${bIds.customer_id}`);
  if (!bIds.booking_id || !bIds.customer_id) {
    say("B's fixture booking or customer could not be created — every deny assertion below "
      + "would have been made against a tenant that owns nothing, which is this repo's "
      + "hollow-check shape. Nothing was measured.");
    throw new Error("fixture incomplete");
  }

  // The removed member: signed in while a member, then the row deleted.
  await rest("DELETE", `/rest/v1/business_users?business_id=eq.${A.id}&user_id=eq.${formerA.id}`);

  // ---------------------------------------------------------------------------
  console.log("\n3 · the replay");
  const beforeB = await fingerprintB(B.id);
  const beforeBn = await fingerprintB(Bn.id);

  /** Build a request body for a function from B's identifiers. */
  const valueFor = (field, ids) => {
    const f = field.toLowerCase();
    if (f === "business_id" || f === "businessid") return ids.business_id;
    if (f === "business_slug" || f === "slug") return ids.business_slug;
    if (f === "booking_id" || f === "bookingid") return ids.booking_id;
    if (f === "customer_id" || f === "customerid") return ids.customer_id;
    if (f === "service_id") return ids.service_id;
    if (f === "service_ids") return [ids.service_id];
    if (f === "id") return ids.booking_id;
    if (f === "booking_date" || f === "start_date" || f === "end_date" || f === "date") return ids.day;
    if (f === "start_time") return "09:00";
    if (f === "duration_minutes") return 60;
    if (f === "service_type") return "mobile";
    if (f === "lang") return "en";
    if (f === "action") return "status";
    if (f === "to" || f === "email") return SINK;
    if (f === "subject" || f === "body" || f === "text" || f === "message") return `${S("A")} probe`;
    if (f === "vehicle_size") return "medium";
    return undefined;
  };

  const ACTORS = [
    { name: "anon", jwt: ANON, baseline: true },
    { name: "owner A", jwt: ownerA.jwt },
    { name: "staff A", jwt: staffA.jwt },
    { name: "former A", jwt: formerA.jwt },
  ];

  const call = (fn, jwt, body) =>
    fetch(`${URL_}/functions/v1/${fn}`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, text: (await r.text()).slice(0, 4000) }))
      .catch((e) => ({ status: 0, text: `fetch failed: ${e.message}` }));

  /** Did this response carry anything of B's? */
  // **EITHER TWIN COUNTS, because anon is pointed at the other one.** They
  // carry the same sentinel by construction (see the seeding loop), so this
  // asks "did a tenant's own data come back" rather than "did THAT id come
  // back", which is the question both halves of the comparison need.
  const sawB = (text) => {
    if (BREAK === "leak") return false;
    if (!text) return false;
    for (const ids of [bIds, bnIds]) {
      if (ids.business_id && text.includes(ids.business_id)) return true;
      if (ids.booking_id && text.includes(ids.booking_id)) return true;
      if (ids.customer_id && text.includes(ids.customer_id)) return true;
    }
    return text.includes(S("B"));
  };

  for (const fn of dirs) {
    let src;
    try { src = readFileSync(path.join(FUNCTIONS, fn, "index.ts"), "utf8"); } catch { src = ""; }
    const fields = fieldsFor(src);
    const build = (ids) => {
      const out = {};
      for (const f of fields) {
        const v = valueFor(f, ids);
        if (v !== undefined) out[f] = v;
      }
      return out;
    };
    const body = build(bIds);       // what A's actors send
    const anonBody = build(bnIds);  // the identical question about the other twin
    // A function with NO recognised field is one this script cannot aim at B.
    // Declared, with the fields it did find, never a silent pass.
    if (!Object.keys(body).length) {
      skips.push(`${fn}: no field could be aimed at tenant B `
        + `(fields found: ${fields.length ? fields.join(", ") : "none"}) — it was called, `
        + `but with nothing of B's in it, so a refusal proves nothing about isolation`);
      rows.push({ fn, verdict: "SKIPPED — nothing of B's to send", detail: fields.join(", ").slice(0, 90) });
      console.log(`    ${fn.padEnd(24)} SKIPPED — no field could be aimed at B`);
      continue;
    }

    const anonRes = await call(fn, ANON, anonBody);
    const anonSaw = sawB(anonRes.text);

    // COUNT SUBJECTS, PER FUNCTION. A deny assertion against a function that
    // answered nobody has compared nothing, and reads exactly like a correct
    // refusal — the hollow half this repo is named for, one level in from the
    // table matrix's version of it.
    const statuses = [["anon", anonRes.status]];
    const problems = [];
    for (const actor of ACTORS) {
      if (actor.baseline) continue;
      const r = await call(fn, actor.jwt, body);
      statuses.push([actor.name, r.status]);
      assertions++;
      if (sawB(r.text) && !anonSaw) {
        problems.push(`${actor.name} got B's data from ${fn} (${r.status}) where anon got none`);
      }
    }

    // THE CANARY, per function: the over-privileged caller must come back
    // carrying B's data, or this detector cannot see a leak here at all.
    const svcRes = await call(fn, SERVICE, body);
    const svcSaw = sawB(svcRes.text);
    statuses.push(["service", svcRes.status]);
    const answered = statuses.filter(([, st]) => st >= 200 && st < 300);
    // **THE GATEWAY REFUSES THE SERVICE-ROLE KEY ON A `verify_jwt` FUNCTION.**
    // 13 of these answered 401 to the canary on the first full run: the request
    // never reached the function at all, so for those the canary proves nothing
    // and only the real user JWTs exercised anything. Recorded per function
    // rather than averaged away.
    const canaryBlocked = svcRes.status === 401;

    const stat = statuses.map(([n, st]) => `${n} ${st}`).join(", ");
    if (problems.length) {
      for (const p of problems) say(`edge ${fn}: [edge] ${p}`);
      rows.push({ fn, verdict: "LEAK", detail: problems.join("; ") });
      console.log(`    ${fn.padEnd(24)} LEAK — ${problems[0].slice(0, 80)}`);
    } else if (!answered.length) {
      // NOBODY GOT A SUCCESSFUL RESPONSE. The refusals may be correct
      // authorization or may be a bad argument; this harness cannot tell, and
      // a green line that cannot tell is the thing being guarded against.
      skips.push(`${fn}: no caller received a 2xx (${stat}) — every refusal here may be `
        + `correct authorization or may be an argument this script could not synthesise. `
        + `The function was called and nothing was proved about its tenant checks.`);
      rows.push({ fn, verdict: "SKIPPED — nobody got a response", detail: stat });
      console.log(`    ${fn.padEnd(24)} SKIPPED — nobody got a 2xx (${stat})`);
    } else {
      rows.push({
        fn,
        verdict: svcSaw ? "ok" : "ok (leak-detector unproven here)",
        detail: stat + (anonSaw ? " · anon saw B" : "") + (svcSaw ? " · canary saw B" : ""),
      });
      console.log(`    ${fn.padEnd(24)} ok`
        + (anonSaw ? "  (public — anon sees it too)" : "")
        + (svcSaw ? "  [canary reached it]"
          : canaryBlocked ? "  [canary blocked at the gateway — unproven here]"
            : "  [canary got no tenant data — unproven here]"));
    }
    if (svcSaw) canaryDetectors.push(fn);
  }

  // ---------------------------------------------------------------------------
  console.log("\n4 · did anything of B's change?");
  // THE WRITE HALF, ASKED STRUCTURALLY. No per-function knowledge, so a
  // function nobody thought about is covered the same as one that was.
  const afterB = await fingerprintB(B.id);
  const afterBn = await fingerprintB(Bn.id);
  const movedByA = Object.keys(afterB).filter((t) => afterB[t] !== beforeB[t]);
  const movedByAnon = Object.keys(afterBn).filter((t) => afterBn[t] !== beforeBn[t]);
  // A PRIVILEGE IS WHAT A CAN DO THAT A STRANGER CANNOT. A table an anonymous
  // caller moved on the identical twin is the product's public design — the
  // UUID-bearer cancel and reschedule the customer's own emailed link uses.
  const onlyA = movedByA.filter((t) => !movedByAnon.includes(t));
  assertions++;
  if (onlyA.length) {
    for (const t of onlyA) {
      say(`edge: [edge-write] tenant B's ${t} changed for an actor of A and NOT for an `
        + `anonymous caller making the identical request against the twin tenant `
        + `(${beforeB[t]} -> ${afterB[t]}) — that is a privilege A holds over B`);
    }
    console.log(`    ${onlyA.length} table(s) A moved that a stranger could NOT: ${onlyA.join(", ")}`);
  } else {
    console.log(`    none of B's ${Object.keys(afterB).length} tables moved for A that did not also move for anon`);
  }
  if (movedByAnon.length) {
    notes.push(`public by design, measured rather than assumed: an ANONYMOUS caller holding a `
      + `booking's UUID moved ${movedByAnon.join(", ")} on the twin tenant. That is the `
      + `UUID-bearer model cancel-booking and reschedule-booking are built on — the emailed `
      + `link is the credential. It is not a tenant leak, and it is worth knowing that the `
      + `UUID is the only thing protecting those rows.`);
    console.log(`    (an anonymous caller moved ${movedByAnon.join(", ")} on the twin — the UUID-bearer design)`);
  }

} finally {
  if (!KEEP && A && B) {
    await rest("DELETE", "/rest/v1/businesses?slug=in.(edge-replay-a,edge-replay-b,edge-replay-bn)");
  }
}

// ---------------------------------------------------------------------------

const canary = {
  id: "the over-privileged caller · the service role must come back carrying B's data",
  // CAUGHT WHEN AT LEAST ONE FUNCTION HANDS B'S DATA TO THE SERVICE ROLE. That
  // is what shows the detector can SEE tenant data in an edge-function
  // response; without it, every "ok" above could be a detector looking at the
  // wrong thing. Its limit is in the header and is not glossed: it does not
  // prove a subtle authorization bug would be caught.
  observed_failure: canaryDetectors.length > 0,
  caught_by: canaryDetectors.slice(0, 12),
  findings: canaryDetectors.length
    ? [`[edge] ${canaryDetectors.length} function(s) returned B's data to the service role, `
      + `so a refusal to an actor of A is a real refusal and not an empty response`]
    : ["[edge] NOT CAUGHT — no function returned B's data even to an over-privileged caller, "
      + "so this run cannot tell a refusal from a detector that is looking at nothing"],
};

const expected = rows.length;
const exercised = rows.filter((r) => r.verdict.startsWith("ok")).length;
const status = failures.length === 0 && canary.observed_failure && skips.length === 0
  ? "pass" : "fail";
mkdirSync(path.join(ROOT, "artifacts", "edge-tenant-replay"), { recursive: true });
const art = "artifacts/edge-tenant-replay/index.html";
writeFileSync(path.join(ROOT, art), `<!doctype html><meta charset="utf-8">
<title>Edge-function tenant replay</title>
<style>body{font:13px/1.55 ui-monospace,monospace;margin:26px;background:#0f1214;color:#e3e8ea}
td,th{padding:5px 11px;border-bottom:1px solid #232a2e;text-align:left;vertical-align:top}
.LEAK{color:#ff8478}.ok{color:#8fd694}th{color:#8b969c}</style>
<h1>Every edge function, called as tenant A with tenant B's identifiers</h1>
<p>${rows.length} functions, ${assertions} assertions, ${failures.length} failure(s),
${skips.length} declared skip(s).</p>
<table><tr><th>function</th><th>verdict</th><th>detail</th></tr>
${rows.map((r) => `<tr><td>${r.fn}</td><td class="${r.verdict.startsWith("ok") ? "ok" : "LEAK"}">${r.verdict}</td><td>${r.detail}</td></tr>`).join("\n")}
</table>`, "utf8");

const { path: receiptPath } = writeReceipt({
  check_id: "edge-tenant-replay",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: expected,
  attempted_targets: expected,
  completed_targets: expected,
  // **DECLARED HONESTLY, AND IT IS WHY THIS RECEIPT DOES NOT PASS.** The
  // tenant matrix puts its one or two skips in `warnings` and reports zero
  // skipped targets, which is fine at one or two. Here it is **34 of 39**, and
  // a receipt reading `pass` over that would be the exact hollow shape this
  // whole apparatus exists to refuse, one level up from the checks it grades.
  //
  // `receipt.mjs` demands a `skip_allowlist` with a reason and an expiry for
  // any skip at all, and there is no honest allowlist to write here: the reason
  // is "this harness could not synthesise arguments good enough to reach the
  // function", which is work to do rather than a condition to wave through. So
  // it fails, by design, until the coverage is real.
  skipped_targets: skips.length,
  assertions_executed: assertions,
  min_assertions: 60,
  failures,
  artifacts: [art],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    "the canary is an over-privileged CALLER, not a deployed broken function: it proves the "
    + "detector can see tenant data in a response, not that a subtle authorization bug would be "
    + "caught. A deployed canary is gated on Andrew — ROADMAP 0.6.",
    ...notes, ...skips,
  ],
  dimensions: {
    project: REF,
    actors: ["anon", "owner A", "staff A", "former A"],
    functions: dirs.length,
    canary_reached: canaryDetectors.length,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${rows.length} functions, ${assertions} assertions, `
  + `${failures.length} failure(s), ${skips.length} declared skip(s). Receipt ${receiptPath}`);
console.log(`  ${exercised} of ${rows.length} functions were ACTUALLY EXERCISED — a caller got a`);
console.log(`  2xx out of them. The leak detector is proved on ${canaryDetectors.length}.`);
console.log(`  THIS DOES NOT CLOSE ROADMAP 4.4. The other ${skips.length} refused every caller,`);
console.log(`  and a refusal this harness cannot explain is not evidence of a tenant check.`);
for (const f of failures.slice(0, 20)) console.log("  · " + f);
for (const s of skips.slice(0, 20)) console.log("  skip: " + s);
process.exit(status === "pass" ? 0 : 1);
