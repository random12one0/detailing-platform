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
// **TWO KINDS OF THING MUST NOT SHARE A LIST.** A function this check FAILED
// to reach is debt — somebody can go and fix the arguments. A function this
// check can NEVER reach is a decision, and leaving it in the same bucket
// leaves five permanent entries reading as unfinished work for ever. The
// other session applied exactly this to receipts two hours ago, one level
// down: a thing you decided not to measure and a thing you failed to measure
// must not look the same.
const outOfReach = [];
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

// ---------------------------------------------------------------------------
// WHAT DOES THIS FUNCTION REJECT ON? — read from its own validation branches.
// ---------------------------------------------------------------------------
// **GUESSING BY FIELD NAME GOT 15 OF 39 THROUGH THE DOOR AND THEN STOPPED.**
// The remaining refusals were mostly a plain `400`, which says "you are
// missing something" and not what. So instead of guessing harder, read the
// guard that produced it: every one of these functions rejects in the same
// shape, `if (!thing) return json({ error: … }, 400)`, and the identifiers
// inside that negation ARE the required fields.
//
// This does not synthesise values — it names the field. A skip that says
// *"rejects on `domain_id`, which this harness has no fixture for"* is a
// piece of work somebody can pick up; a skip that says *"400"* is a shrug.
function requiredFor(src) {
  const s = strip(src);
  const out = new Set();
  // `if (!a || !b?.trim() || !c) return json({...}, 400)` — and the same with
  // `body.` in front, which is the other spelling in this codebase.
  for (const m of s.matchAll(/if\s*\(([^)]*?)\)\s*return\s+json\([^;]*?,\s*400\s*\)/g)) {
    for (const id of m[1].matchAll(/!\s*(?:body\??\.)?([a-z_][a-z0-9_]*)/gi)) {
      const name = id[1];
      if (["member", "json", "String", "Number", "Array", "UUID"].includes(name)) continue;
      out.add(name);
    }
  }
  return [...out];
}

// ---------------------------------------------------------------------------
// OUT OF THIS CHECK'S REACH — named, with a reason each, and PROVED.
// ---------------------------------------------------------------------------
// This instrument aims a tenant's identifiers at a function and watches what
// comes back. A function that takes no tenant identifier from its caller
// cannot be aimed at all — not "is hard to aim", cannot. A cron sweep has no
// caller-supplied tenant; a provider webhook carries Stripe's or Resend's own
// payload and its signature.
//
// **AN ALLOWLIST WITH WRITTEN REASONS IS ONLY HONEST IF IT IS REFUSABLE**, so
// two things hold it in place. Every entry is checked STRUCTURALLY against
// the same field discovery the rest of the script uses: if a function listed
// here turns out to have a tenant-bearing field after all, that is a FAILURE
// naming it, not a quiet pass — the list cannot be used to hide something.
// And `--break=reach` empties it, which drops all of them back into the
// ordinary skip list and proves the list is doing work.
// **`send-owner-reminders` WAS IN THIS LIST AND THE STRUCTURAL CHECK THREW IT
// OUT, 2026-09-20.** It runs on a 15-minute cron, so it was written down as a
// sweep with no caller-supplied tenant — from what it is FOR, by assumption.
// It also accepts `business_id` and `booking_id`, so a caller CAN aim it, and
// the check said so by name:
//
//   listed as out of reach, but it DOES accept a tenant-bearing field
//   (booking_id, business_id)
//
// **That is the entire reason this list is verified against the source rather
// than believed.** An allowlist written from intent hides exactly the thing
// somebody assumed was not there, and this one tried to on its first outing.
// It is back in the ordinary skip bucket, where it answers 500 to its own
// tenant and is honest debt.
// ---------------------------------------------------------------------------
// NEVER CALLED, AND **NOT BREAKABLE** — a safety rule, not a classification.
// ---------------------------------------------------------------------------
// **`report-problem` LIVED IN `OUT_OF_REACH` FOR ONE HOUR AND `--break=reach`
// SENT A TENTH MESSAGE TO THE SUPPORT INBOX.** The sabotage switch empties
// that map to prove the classification is refusable — which is right — and in
// doing so it also removed the only thing stopping a function whose recipient
// this harness cannot aim. The count went 9 -> 10, found by querying
// `email_sends` after the run rather than by assuming the guard held.
//
// **A SAFETY EXCLUSION AND A CLASSIFICATION ARE DIFFERENT THINGS AND MUST NOT
// SHARE A SWITCH.** One says "this cannot be measured here"; the other says
// "measuring this has a real-world side effect we cannot contain". A
// `--break` exists to make a check fail on purpose, and a `--break` that can
// put mail in somebody's inbox is a hazard rather than a control. This set is
// consulted before anything else and no flag empties it.
const NEVER_CALL = {
  "report-problem":
    "its recipient comes from Deno.env.get(\"SUPPORT_EMAIL\") rather than from "
    + "the request, so this harness cannot keep its mail inside the sink. "
    + "Calling it has already put ten messages in the platform's own support "
    + "inbox. Proving isolation here needs a different instrument.",
};

const OUT_OF_REACH = BREAK === "reach" ? {} : {
  "watch-jobs":
    "a cron sweep. It takes no input at all and walks every tenant by design; "
    + "there is no caller-supplied tenant to point at another one.",
  "refresh-weather":
    "a cron sweep that refills a weather cache. No tenant in its input.",
  "stripe-webhook":
    "a provider webhook. Its body is Stripe's payload and its authority is "
    + "Stripe's signature, neither of which a tenant supplies.",
  "resend-webhook":
    "a provider webhook. Its body is Resend's delivery event, verified by a "
    + "Svix signature.",
  "translate-content":
    "takes text and a target language. No tenant identifier is part of the "
    + "request, so there is no other tenant to ask it about.",
};

const dirs = readdirSync(FUNCTIONS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "_shared")
  .map((d) => d.name).sort();

let A, B, Bn, ownerA, staffA, formerA, ownerB;
const aIds = {};
const bIds = {};
const bnIds = {};
const canaryDetectors = [];
const exercisedOk = [];
const provedByRejection = [];

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
    // ROUND TWO — the objects the other 26 functions needed before they would
    // answer their own tenant at all. Each one was chosen by reading the 400 or
    // 409 the function returned, not guessed.
    const promo = await rest("POST", "/rest/v1/promo_codes", {
      body: [{ business_id: b.id, code: `EDGE${tag.toUpperCase()}`, type: "percentage", value: 5 }],
    });
    const camp = await rest("POST", "/rest/v1/campaigns", {
      body: [{ business_id: b.id, slug: `edge-${tag.toLowerCase()}`, name: `${S("A")} campaign` }],
    });
    const plan = await rest("POST", "/rest/v1/plans", {
      body: [{ business_id: b.id, name: `${S(tag === "Bn" ? "B" : tag)} plan` }],
    });
    const planId = plan.data?.[0]?.id ?? null;
    const custId = cust.data?.[0]?.id ?? null;
    let memberId = null;
    if (planId && custId) {
      const pm = await rest("POST", "/rest/v1/plan_members", {
        body: [{ business_id: b.id, plan_id: planId, customer_id: custId }],
      });
      memberId = pm.data?.[0]?.id ?? null;
    }
    // A QUOTED, PENDING booking so `accept-quote` has something to accept, and
    // a CONFIRMED one so `reschedule-booking` has something to move.
    // **ON ITS OWN DAY.** Putting the second booking on the same day as the
    // first cost `update-booking` its proof: A's own call started answering 409
    // because the slot gate was re-validating a move into a day that now had
    // two bookings in it. A fixture that makes one function testable must not
    // quietly make another untestable.
    const day2 = new Date(Date.now() + 33 * 86400_000).toISOString().slice(0, 10);
    const bk2 = await rest("POST", "/rest/v1/bookings", {
      body: [{
        business_id: b.id, customer_name: `${S(tag === "Bn" ? "B" : tag)} client`,
        customer_phone: "555-0102", customer_email: SINK,
        start_at: `${day2}T20:00:00Z`, end_at: `${day2}T21:00:00Z`,
        service_type: "mobile", status: "confirmed", vehicle_size: "medium",
        vehicle_size_label: "Medium", subtotal: 120, total_price: 120,
      }],
    });
    if (bk.data?.[0]?.id) {
      await rest("PATCH", `/rest/v1/bookings?id=eq.${bk.data[0].id}`,
        { body: { quoted_amount: 99 }, prefer: "return=minimal" });
    }

    // ROUND THREE — seeded because the functions' own 400 guards named them.
    // `send-invoice` rejects on `isFinalized`, so the booking it is pointed at
    // has to be a finished job with a final amount, not an upcoming one.
    if (bk2.data?.[0]?.id) {
      await rest("PATCH", `/rest/v1/bookings?id=eq.${bk2.data[0].id}`, {
        body: { status: "completed", finalized_at: new Date().toISOString(), final_amount: 120 },
        prefer: "return=minimal",
      });
    }
    // `accept-invite` rejects on `token`, so one invite is seeded per tenant.
    //
    // **ON ITS OWN ADDRESS, AND THAT IS THE THIRD TIME THIS LESSON HAS COST A
    // RESULT.** Seeding it at the sink address made `invite-user` answer 409
    // — it invites the sink too, and an address already invited is a conflict
    // — so a function that had PROVED it refuses tenant B became a skip. A
    // fixture that makes one function testable must not quietly make another
    // untestable. No mail is ever sent to this address: the row is inserted
    // directly, and `example.com` is IANA-reserved and undeliverable anyway.
    const inv = await rest("POST", "/rest/v1/business_invites", {
      body: [{ business_id: b.id, email: `edge-replay-seed-${b.slug}@example.com`, role: "staff" }],
    });

    const store = tag === "A" ? aIds : tag === "B" ? bIds : tag === "Bn" ? bnIds : null;
    if (store) {
      store.business_id = b.id;
      store.business_slug = b.slug;
      store.booking_id = bk.data?.[0]?.id ?? null;
      store.customer_id = cust.data?.[0]?.id ?? null;
      store.service_id = svc.data?.[0]?.id ?? null;
      store.day = day;
      store.promo_code = promo.data?.[0]?.code ?? null;
      store.campaign_slug = camp.data?.[0]?.slug ?? null;
      store.plan_id = planId;
      store.member_id = memberId;
      store.confirmed_booking_id = bk2.data?.[0]?.id ?? null;
      store.finalized_booking_id = bk2.data?.[0]?.id ?? null;
      store.invite_token = inv.data?.[0]?.token ?? null;
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
    // ROUND TWO — the fields that were keeping 34 functions at the front door.
    if (f === "member_id") return ids.member_id;
    if (f === "plan_id") return ids.plan_id;
    if (f === "token") return ids.invite_token;
    if (f === "password") return "Edge-replay-invited-pw!";
    if (f === "q") return `${S("A")} street`;
    if (f === "session_id") return "edge-replay-session";
    if (f === "label") return "edge replay";
    if (f === "role") return "staff";
    if (f === "amount" || f === "quoted_amount") return 99;
    if (f === "name") return `${S("A")} probe`;
    if (f === "phone") return "555-0199";
    if (f === "code") return "EDGEREPLAY";
    if (f === "host" || f === "domain") return "edge-replay.example";
    if (f === "url") return "https://edge-replay.example/x";
    // FLAT, NOT NESTED. `owner-push-subscribe` reads `endpoint`, `p256dh` and
    // `auth` as three top-level fields — its own 400 guard says so — and a
    // `keys: {…}` object satisfied none of them.
    if (f === "endpoint") return "https://edge-replay.example/push";
    if (f === "p256dh") return "BEdgeReplayPublicKeyxxxxxxxxxxxxxxxxxxxxxxxx";
    if (f === "auth") return "edgeReplayAuthSecret";
    if (f === "soft_delete" || f === "dry_run") return false;
    // **`status` IS DELIBERATELY NOT SYNTHESISED.** Sending one turned
    // `update-booking` from a proved rejection into a 409: it is a field whose
    // value changes what the call MEANS, and a generic guess at it re-validates
    // a slot nobody asked to move. A field this harness cannot mean anything
    // sensible by is better left out of the request than filled in with a word.
    if (f === "notes" || f === "admin_notes") return `${S("A")} note`;
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
    // **THE UNION, AND THAT IS THE POINT OF READING THE GUARDS.** A field can
    // be REQUIRED without being visible in the request shape: `owner-push-
    // subscribe` reads its subscription out of a nested object, so `p256dh`
    // and `auth` never appeared in the destructure — but its own 400 guard
    // names them both. Discovery finds what the function reads; the guards
    // find what it insists on. Neither alone gets through the door.
    const fields = [...new Set([...fieldsFor(src), ...requiredFor(src)])];
    const build = (ids) => {
      const out = {};
      for (const f of fields) {
        const v = valueFor(f, ids);
        if (v !== undefined) out[f] = v;
      }
      return out;
    };
    // **THE HANDFUL OF VALUES A FUNCTION'S OWN SEMANTICS DECIDE.** The FIELDS
    // are still discovered from source; only these values are named, and each
    // one came from reading the 400 the function returned rather than from a
    // guess. A function whose semantics change stops answering and reappears
    // as a skip with its status printed, so this list cannot rot silently.
    const OVERRIDE = {
      "respond-to-booking": { action: "accept" },
      "unsubscribe": { action: "get" },
      "plan-link": { action: "get" },
      "track-visit": (ids) => ({ slug: ids.campaign_slug, visitor_id: "edge-replay-visitor" }),
      "validate-promo-code": (ids) => ({ code: ids.promo_code, customer_email: SINK }),
      "reschedule-booking": (ids) => ({ booking_id: ids.confirmed_booking_id }),
      "accept-quote": (ids) => ({ booking_id: ids.booking_id }),
      "send-invoice": (ids) => ({ booking_id: ids.finalized_booking_id }),
      // **ITS OWN HOUR, BECAUSE THE CHECKS WERE STANDING ON EACH OTHER.**
      // `reschedule-booking` runs first alphabetically and moves A's confirmed
      // booking to 09:00; `update-booking` then tried to move A's other
      // booking into the same slot and got a 409 overlap — so a function that
      // had already PROVED it refuses tenant B silently became a skip. Two
      // checks sharing one fixture is the interference CLAUDE.md warns about
      // for the test battery, arriving inside a single script.
      "update-booking": { start_time: "13:00" },
    }[fn];

    const withOverride = (base, ids) => {
      const extra = typeof OVERRIDE === "function" ? OVERRIDE(ids) : (OVERRIDE ?? {});
      const out = { ...base };
      for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== null) out[k] = v;
      return out;
    };

    const crossBody = withOverride(build(bIds), bIds);   // what A's actors send at tenant B
    const selfBody = withOverride(build(aIds), aIds);    // the SAME call at A's OWN tenant
    const anonBody = withOverride(build(bnIds), bnIds);  // the same question about B's twin

    // ---------------------------------------------------------------------
    // THE FRONT DOOR FIRST — and this is what turned 5 of 39 into a real
    // number.
    // ---------------------------------------------------------------------
    // **OWNER A GETTING 401 WITH B'S `business_id` IS THE TENANT REJECTION
    // WORKING.** The first version counted those as "the harness could not
    // reach it" and skipped 34 functions on that basis. That was too
    // pessimistic in the other direction: a 401 there is exactly the evidence
    // wanted — as long as it is a refusal of *B* and not a refusal of
    // everyone.
    //
    // So each function is called TWICE by the same actor with the same shape:
    // once with A's own identifiers, once with B's. Only the pair is
    // informative.
    //
    //   self 2xx + cross refused -> **isolation proved by rejection**
    //   self 2xx + cross 2xx with B's data -> a leak
    //   self not 2xx             -> the front door is shut to A as well, so
    //                               the cross refusal says nothing. SKIP, with
    //                               A's own status printed, because that is
    //                               the number that explains it.
    // -------------------------------------------------------------------
    // **WILL THIS FUNCTION MAIL SOMEWHERE THIS SCRIPT CANNOT AIM? — 2026-09-20**
    // -------------------------------------------------------------------
    // `report-problem` takes no recipient from its request: it sends to
    // `Deno.env.get("SUPPORT_EMAIL") || "support@detailingplatform.com"`. The
    // sink address in the body could not redirect it, and calling it as part
    // of the replay put **nine** "Problem report · EDGEREPLAY-A-SECRET DETAIL"
    // emails into the platform's own support inbox — a real inbox a real
    // person reads. Nothing went to a customer, and it still should not have
    // happened, because the whole promise of this script is that its mail
    // lands nowhere.
    //
    // **THE RULE IS STRUCTURAL, NOT A NAME.** A function whose send target
    // comes from the environment or from a literal rather than from the
    // request is one this harness cannot keep inside the sink, so it is not
    // called at all — declared, with the reason. Matching on `report-problem`
    // by name would leave the next one to be discovered the same way.
    // -------------------------------------------------------------------
    // IS THIS FUNCTION OUT OF THIS CHECK'S REACH? — decided, not failed.
    // -------------------------------------------------------------------
    // The unbreakable set first. Nothing below this line can undo it.
    if (NEVER_CALL[fn]) {
      outOfReach.push(`${fn}: NOT CALLED — ${NEVER_CALL[fn]}`);
      rows.push({ fn, verdict: "never called (safety)", detail: NEVER_CALL[fn].slice(0, 120) });
      console.log(`    ${fn.padEnd(24)} never called — would mail an address this script cannot aim`);
      continue;
    }
    const reachReason = OUT_OF_REACH[fn];
    const hasTenantField = Object.keys(build(bIds)).length > 0;
    if (reachReason) {
      // **THE LIST IS CHECKED AGAINST THE SOURCE, NOT TRUSTED.** A function
      // named here that DOES accept a tenant identifier is a failure by name:
      // that is the shape an allowlist rots into, and the whole reason this
      // bucket exists is to stop two different things sharing one list.
      assertions++;
      if (hasTenantField && fn !== "report-problem") {
        say(`edge ${fn}: [edge-reach] listed as out of reach, but it DOES accept a `
          + `tenant-bearing field (${Object.keys(build(bIds)).join(", ")}). Either the reason `
          + `is wrong or the function changed; it must not sit in this bucket.`);
      }
      outOfReach.push(`${fn}: ${reachReason}`);
      rows.push({ fn, verdict: "out of reach (by design)", detail: reachReason.slice(0, 120) });
      console.log(`    ${fn.padEnd(24)} out of reach — ${reachReason.split(".")[0]}`);
      continue;
    }

    const selfRes = Object.keys(selfBody).length
      ? await call(fn, ownerA.jwt, selfBody)
      : { status: 0, text: "" };
    const ran = BREAK !== "self" && selfRes.status >= 200 && selfRes.status < 300;

    // Not in the list, and still nothing to aim: that IS debt, and it belongs
    // in the skip bucket rather than the decided one.
    if (!hasTenantField) {
      skips.push(`${fn}: takes no field this harness can aim at a tenant `
        + `(fields found: ${fields.length ? fields.join(", ") : "none"}), and it is NOT in the `
        + `out-of-reach list. Either it belongs there with a written reason, or the field `
        + `discovery is missing something it accepts.`);
      rows.push({ fn, verdict: "SKIPPED — nothing to aim, and unclassified", detail: fields.join(", ").slice(0, 90) });
      console.log(`    ${fn.padEnd(24)} SKIPPED — nothing to aim, and not classified`);
      continue;
    }

    const anonRes = await call(fn, ANON, anonBody);
    const anonSaw = sawB(anonRes.text);

    const statuses = [["self(A)", selfRes.status], ["anon", anonRes.status]];
    const problems = [];
    let rejected = 0;
    for (const actor of ACTORS) {
      if (actor.baseline) continue;
      const r = await call(fn, actor.jwt, crossBody);
      statuses.push([actor.name, r.status]);
      assertions++;
      if (sawB(r.text) && !anonSaw) {
        problems.push(`${actor.name} got B's data from ${fn} (${r.status}) where anon got none`);
      } else if (!(r.status >= 200 && r.status < 300) && !anonSaw) {
        rejected++;
      }
    }

    // THE OVER-PRIVILEGED CALLER, unchanged: it must come back carrying B's
    // data somewhere in the run, or the leak detector cannot see one at all.
    const svcRes = await call(fn, SERVICE, crossBody);
    const svcSaw = sawB(svcRes.text);
    statuses.push(["service", svcRes.status]);
    const canaryBlocked = svcRes.status === 401;

    const stat = statuses.map(([n, st]) => `${n} ${st}`).join(", ");
    if (problems.length) {
      for (const p of problems) say(`edge ${fn}: [edge] ${p}`);
      rows.push({ fn, verdict: "LEAK", detail: problems.join("; ") });
      console.log(`    ${fn.padEnd(24)} LEAK — ${problems[0].slice(0, 80)}`);
    } else if (!ran) {
      // THE FRONT DOOR IS SHUT TO A AS WELL, so A being refused B proves
      // nothing. A's OWN status is printed because it is the number that
      // explains the skip and the number somebody needs to fix it.
      // NAME THE FIELD, NOT THE STATUS. Read out of the function's own 400
      // guards; anything it demands that this harness never sent is the thing
      // standing between here and a real result.
      const needs = requiredFor(src).filter((f) => !(f in selfBody));
      skips.push(`${fn}: owner A could not get a 2xx with its OWN tenant either (${stat}).`
        + (needs.length
          ? ` It rejects on ${needs.map((f) => `\`${f}\``).join(", ")}, which this harness `
            + `does not supply.`
          : ` Its 400 guards name nothing this harness is missing, so the refusal is `
            + `elsewhere — a lookup, a permission, or a precondition on the row.`)
        + ` Either way the cross-tenant refusal proves nothing and nothing is claimed.`);
      rows.push({ fn, verdict: "SKIPPED — front door shut to A too", detail: stat });
      console.log(`    ${fn.padEnd(24)} SKIPPED — A's own call got ${selfRes.status}`);
    } else if (rejected > 0) {
      exercisedOk.push(fn);
      provedByRejection.push(fn);
      rows.push({ fn, verdict: "ok — refused B, works for A", detail: stat });
      console.log(`    ${fn.padEnd(24)} ok — A's own call ${selfRes.status}, `
        + `B's identifiers refused ${rejected}/3 actors`);
    } else {
      // RAN, AND WAS NOT REFUSED. For a public-by-design endpoint that is the
      // product: anon got the same thing. Recorded separately from a rejection
      // because "open to everybody" and "closed to the wrong tenant" are
      // different proofs and must not be added together.
      exercisedOk.push(fn);
      rows.push({
        fn,
        verdict: anonSaw ? "ok — public, anon sees the same" : "ok — ran, nothing of B's returned",
        detail: stat + (anonSaw ? " · anon saw B" : "") + (svcSaw ? " · canary saw B" : ""),
      });
      console.log(`    ${fn.padEnd(24)} ok — A's own call ${selfRes.status}`
        + (anonSaw ? "  (public — anon sees it too)" : ", B returned nothing")
        + (svcSaw ? "  [canary reached it]"
          : canaryBlocked ? "  [canary blocked at the gateway]" : ""));
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
const exercised = exercisedOk.length;
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
    ran: exercisedOk.length,
    proved_by_rejection: provedByRejection.length,
    proved_by_rejection_names: provedByRejection,
    still_refusing: skips.length,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${rows.length} functions, ${assertions} assertions, `
  + `${failures.length} failure(s), ${skips.length} declared skip(s). Receipt ${receiptPath}`);
console.log(`
  THE FOUR NUMBERS`);
console.log(`  ${exercised} genuinely RAN — owner A got a 2xx out of them with its own tenant.`);
console.log(`  ${skips.length} still REFUSE — A's own call never succeeded, so their refusal of B`);
console.log(`     proves nothing. That is DEBT: reasons below, one per function, each naming`);
console.log(`     the field it rejects on where its own guards name one.`);
console.log(`  ${provedByRejection.length} PROVED ISOLATION BY REJECTING the other tenant — they work`);
console.log(`     for A and refuse B's identifiers to every actor.`);
console.log(`  ${outOfReach.length} are OUT OF THIS CHECK'S REACH by design — cron sweeps and provider`);
console.log(`     webhooks take no tenant from a caller, so they can never be aimed. That is a`);
console.log(`     DECISION, not debt, and it is deliberately not counted in skipped_targets.`);
for (const f of failures.slice(0, 20)) console.log("  · " + f);
for (const s of skips.slice(0, 20)) console.log("  skip: " + s);
for (const o of outOfReach) console.log("  out of reach: " + o);
process.exit(status === "pass" ? 0 : 1);
