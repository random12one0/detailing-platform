// ROADMAP 97.19 — A DOUBLE PRESS SENDS ONCE, AND A CAMPAIGN IS CLAIMED AS A CAMPAIGN, RUN RATHER THAN READ.
//
//   node --test tests/campaign-press-once.test.mjs
//   BREAK=no-press  node tests/campaign-press-once.test.mjs   # sabotage: send-campaign never records the press
//   BREAK=no-flag   node tests/campaign-press-once.test.mjs   # sabotage: campaigns are claimed as booking mail
//   BREAK=no-stop   node tests/campaign-press-once.test.mjs   # sabotage: the loop keeps going past the day's share
//
// THIS LOADS THE REAL `send-campaign` AND `send-email` (`loadEdge` in scripts/lib/edgeLocal.mjs) AND
// CALLS THEM AS FUNCTIONS. No server, no socket, no secret: the functions read an in-memory
// environment, and `fetch` is a fake Supabase held in this file. `send-campaign`'s call to the relay
// (through the real `sendTenantEmail` in _shared/email.ts) is routed to the REAL `send-email`
// handler, which calls the fake `claim_email_send`, which gives each business a share of 3 here, the
// way the migration does (tests/campaign-share-sql.test.mjs proves the SQL itself). The provider is a
// fake `api.resend.com` that counts what it was handed. Every socket connect is refused and counted.
//
// Each BREAK rewrites the PRODUCTION source as it loads (a load hook) and proves the rewrite landed
// before anything is judged (docs/gotchas.md 102). An env var, not a flag (docs/gotchas.md 104).

import { registerHooks } from "node:module";
import net from "node:net";
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEdge } from "../scripts/lib/edgeLocal.mjs";

const BREAK = process.env.BREAK || "";
const SABOTAGE = {
  "no-press": ["send-campaign/index.ts", '.from("campaign_presses")', '.from("nothing_recorded")'],
  "no-flag": ["send-campaign/index.ts", "        campaign: true,\n", "\n"],
  "no-stop": ["send-campaign/index.ts", "        held = recipients.length - i;\n        break;", "        held = 0;"],
};
if (BREAK && !SABOTAGE[BREAK]) throw new Error(`unknown BREAK=${BREAK}; known: ${Object.keys(SABOTAGE).join(", ")}`);
let landed = !BREAK;
if (BREAK) {
  const [file, from, to] = SABOTAGE[BREAK];
  registerHooks({
    load(url, ctx, next) {
      const r = next(url, ctx);
      if (!url.replace(/\\/g, "/").endsWith(`/supabase/functions/${file}`)) return r;
      const src = String(r.source).replace(/\r\n/g, "\n");
      if (!src.includes(from)) throw new Error(`BREAK=${BREAK} did not match ${file} — the sabotage did not land`);
      landed = true;
      return { ...r, source: src.replace(from, to) };
    },
  });
}

let sockets = 0;
net.Socket.prototype.connect = function () { sockets++; throw new Error("campaign-press-once opens no network connection"); };

const FAKE = "https://fake-supabase.invalid";
const KEY = "service-role-fixture";
const B1 = "11111111-1111-4111-8111-111111111111";
const B2 = "22222222-2222-4222-8222-222222222222";
const SHARE = 3;
const customers = (biz, n) => Array.from({ length: n }, (_, i) => ({
  id: `${biz.slice(0, 8)}-0000-4000-8000-${String(i).padStart(12, "0")}`, business_id: biz,
  name: `Client ${i}`, email: `client${i}@fixture.mail`, unsubscribed_at: null, email_failed_at: null, lang: "en",
}));
const TABLES = {
  businesses: [
    { id: B1, slug: "b1", name: "Fixture One", status: "active", mailing_address: "1 Main St", contact_email: "one@fixture.mail", timezone: "America/Los_Angeles" },
    { id: B2, slug: "b2", name: "Fixture Two", status: "active", mailing_address: "2 Main St", contact_email: "two@fixture.mail", timezone: "America/Los_Angeles" },
  ],
  business_users: [
    { user_id: "u1", business_id: B1, role: "owner", permissions: [] },
    { user_id: "u2", business_id: B2, role: "owner", permissions: [] },
  ],
  customers: [...customers(B1, 5), ...customers(B2, 5)],
};

const presses = new Set();       // campaign_presses (business_id, press_id), primary key
const claims = [];               // every claim_email_send call's arguments
const share = new Map();         // business -> campaign claims granted today
const provider = [];             // what the fake Resend was handed
const unknown = [];
let edge = null;

const send = (status, body, headers = {}) =>
  new Response(body === undefined ? "" : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

globalThis.fetch = async (input, init) => {
  const req = new Request(input, init);
  const u = new URL(req.url);
  if (u.origin === "https://api.resend.com") {
    provider.push(JSON.parse(await req.text()));
    return send(200, { id: `re_${provider.length}` });
  }
  if (u.origin !== FAKE) { unknown.push(`${req.method} ${u.origin}${u.pathname}`); return send(502, { message: "outside" }); }
  if (u.pathname === "/functions/v1/send-email") return edge.get("send-email")(req);
  if (u.pathname === "/auth/v1/user") {
    const id = { "tok-u1": "u1", "tok-u2": "u2" }[(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")];
    return id ? send(200, { id, aud: "authenticated", role: "authenticated" }) : send(401, { msg: "bad jwt" });
  }
  const text = ["GET", "HEAD"].includes(req.method) ? "" : await req.text();
  const rpc = u.pathname.match(/^\/rest\/v1\/rpc\/(.+)$/);
  if (rpc) {
    const args = JSON.parse(text || "{}");
    if (rpc[1] === "claim_email_send") {
      claims.push(args);
      if (!args.p_campaign) return send(200, true);
      const used = share.get(args.p_business_id) ?? 0;
      if (!args.p_business_id || used >= SHARE) return send(200, false);
      share.set(args.p_business_id, used + 1);
      return send(200, true);
    }
    return send(200, null);
  }
  const tbl = u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
  if (!tbl) { unknown.push(`${req.method} ${u.pathname}`); return send(404, { message: "no fake" }); }
  const name = tbl[1];
  if (name === "campaign_presses" && req.method === "POST") {
    const row = JSON.parse(text);
    const k = `${row.business_id}/${row.press_id}`;
    if (presses.has(k)) return send(409, { code: "23505", message: "duplicate key value violates unique constraint \"campaign_presses_pkey\"" });
    presses.add(k);
    return send(201, null);
  }
  let rows = TABLES[name] ?? [];
  for (const [k, v] of u.searchParams) {
    const eq = String(v).match(/^eq\.(.*)$/);
    if (eq) rows = rows.filter((r) => String(r[k]) === eq[1]);
    const inn = String(v).match(/^in\.\((.*)\)$/);
    if (inn) { const set = new Set(inn[1].split(",").map((s) => s.replace(/^"|"$/g, ""))); rows = rows.filter((r) => set.has(String(r[k]))); }
  }
  if (req.method !== "GET" && req.method !== "HEAD") return send(200, [], { "Content-Range": "*/0" });
  if (String(req.headers.get("accept") || "").includes("vnd.pgrst.object")) {
    return rows.length === 1 ? send(200, rows[0]) : send(406, { code: "PGRST116", message: "0 rows" });
  }
  return send(200, rows, { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
};

edge = await loadEdge(["send-campaign", "send-email"], {
  SUPABASE_URL: FAKE, SUPABASE_SERVICE_ROLE_KEY: KEY, SUPABASE_ANON_KEY: "anon-fixture", RESEND_API_KEY: "re_fixture",
});

const press = (who, biz, pressId, ids) => edge.get("send-campaign")(new Request(`${FAKE}/functions/v1/send-campaign`, {
  method: "POST",
  headers: { Authorization: `Bearer tok-${who}`, "Content-Type": "application/json" },
  body: JSON.stringify({ business_id: biz, customer_ids: ids, subject: "Come back", message: "It has been a while.", ...(pressId ? { press_id: pressId } : {}) }),
}));
const idsOf = (biz) => TABLES.customers.filter((c) => c.business_id === biz).map((c) => c.id);
const P1 = "aaaaaaaa-0000-4000-8000-000000000001";
const P2 = "aaaaaaaa-0000-4000-8000-000000000002";
const P3 = "bbbbbbbb-0000-4000-8000-000000000003";

test("97.19 · the sabotage, if any, landed in the production source", () => {
  assert.ok(landed, `BREAK=${BREAK} never reached send-campaign`);
});

test("97.19 · a campaign stops at its business's share and reports the rest as held", async () => {
  const res = await press("u1", B1, P1, idsOf(B1));
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(provider.length, SHARE, "the provider was handed exactly the business's share");
  assert.equal(body.sent, SHARE);
  assert.equal(body.held, 5 - SHARE, "the two after the share are held for tomorrow");
  assert.equal(body.failed, 0, "a held address is not reported as failed");
  assert.equal(claims.length, SHARE + 1, "the loop stopped at the first refusal instead of trying every address");
  assert.ok(claims.every((a) => a.p_campaign === true && a.p_business_id === B1 && a.p_platform === false),
    `every claim says campaign, business B1: ${JSON.stringify(claims)}`);
});

test("97.19 · the same press arriving again sends nothing", async () => {
  const before = provider.length, claimsBefore = claims.length;
  const res = await press("u1", B1, P1, idsOf(B1));
  assert.equal(res.status, 409, await res.clone().text());
  assert.match((await res.json()).error, /already sent/);
  assert.equal(provider.length, before, "no email reached the provider");
  assert.equal(claims.length, claimsBefore, "nothing was even claimed");
});

test("97.19 · two arrivals of one new press at the same moment send once", async () => {
  share.set(B1, 0);
  const before = provider.length;
  const [a, b] = await Promise.all([press("u1", B1, P2, idsOf(B1).slice(0, 2)), press("u1", B1, P2, idsOf(B1).slice(0, 2))]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409], `statuses ${a.status} ${b.status}`);
  assert.equal(provider.length - before, 2, "two recipients, sent once each");
});

test("97.19 · another business's campaign still sends after B1's share is spent", async () => {
  share.set(B1, SHARE);
  const before = provider.length;
  const res = await press("u2", B2, P3, idsOf(B2).slice(0, 2));
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.sent, 2);
  assert.equal(provider.length - before, 2);
  assert.ok(claims.slice(-2).every((a) => a.p_business_id === B2 && a.p_campaign === true));
});

test("97.19 · a press with no press id is refused before anything is sent", async () => {
  const before = provider.length, claimsBefore = claims.length;
  const res = await press("u1", B1, null, idsOf(B1));
  assert.equal(res.status, 400);
  assert.equal(provider.length, before);
  assert.equal(claims.length, claimsBefore);
});

test("97.19 · booking mail through the same relay is claimed as booking mail", async () => {
  const { sendTenantEmail } = await import("../supabase/functions/_shared/email.ts");
  const claimsBefore = claims.length;
  const ok = await sendTenantEmail({ businessId: B1, to: "client0@fixture.mail", subject: "You're booked", html: "<p>Booked</p>", text: "Booked" });
  assert.equal(ok, true, "B1's confirmation goes out with B1's campaign share spent");
  const a = claims[claimsBefore];
  assert.equal(a.p_campaign, false, JSON.stringify(a));
  assert.equal(a.p_business_id, B1);
});

test("97.19 · nothing left the process", () => {
  assert.equal(sockets, 0, `${sockets} socket connects`);
  assert.deepEqual(unknown, [], "every request was answered by the fake");
});
