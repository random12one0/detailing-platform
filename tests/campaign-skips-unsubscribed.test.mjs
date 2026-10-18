// ROADMAP 97.21 (R3) — `send-campaign` STILL SKIPS AN UNSUBSCRIBED CUSTOMER, RUN RATHER THAN READ.
//
//   node --test tests/campaign-skips-unsubscribed.test.mjs
//   BREAK=mail-the-unsubscribed node tests/campaign-skips-unsubscribed.test.mjs  # sabotage: send-campaign forgets the opt-out
//
// 97.21 took the marketing opt-out OUT of the two appointment-reminder functions. This is the other
// half: the one reader that is supposed to honour it still does. It loads the REAL `send-campaign`
// and `send-email` (`loadEdge`, the same harness as tests/campaign-press-once.test.mjs) against a
// fake Supabase and a fake provider held in this file, presses one campaign at three customers —
// normal, unsubscribed, bounced — and asks what the provider was handed. No socket is opened.
//
// The BREAK rewrites the PRODUCTION source as it loads and proves the rewrite landed (docs/gotchas.md
// 102). An env var, not a flag (docs/gotchas.md 104).

import { registerHooks } from "node:module";
import net from "node:net";
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEdge } from "../scripts/lib/edgeLocal.mjs";

const BREAK = process.env.BREAK || "";
const SABOTAGE = {
  "mail-the-unsubscribed": ["send-campaign/index.ts",
    "String(c.email ?? \"\").trim() && !c.unsubscribed_at && !c.email_failed_at);",
    "String(c.email ?? \"\").trim() && !c.email_failed_at);"],
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
net.Socket.prototype.connect = function () { sockets++; throw new Error("campaign-skips-unsubscribed opens no network connection"); };

const FAKE = "https://fake-supabase.invalid";
const B1 = "11111111-1111-4111-8111-111111111111";
const cust = (n, email, extra = {}) => ({ id: `11111111-0000-4000-8000-00000000000${n}`, business_id: B1, name: `Client ${n}`, email, unsubscribed_at: null, email_failed_at: null, lang: "en", ...extra });
const NORMAL = cust(1, "normal@fixture.mail");
const UNSUB = cust(2, "unsub@fixture.mail", { unsubscribed_at: "2026-10-01T00:00:00Z" });
const BOUNCED = cust(3, "bounced@fixture.mail", { email_failed_at: "2026-10-01T00:00:00Z" });
const TABLES = {
  businesses: [{ id: B1, slug: "b1", name: "Fixture One", status: "active", mailing_address: "1 Main St", contact_email: "one@fixture.mail", timezone: "America/Los_Angeles" }],
  business_users: [{ user_id: "u1", business_id: B1, role: "owner", permissions: [] }],
  customers: [NORMAL, UNSUB, BOUNCED],
};
const provider = [];
const unknown = [];
let edge = null;
const send = (status, body, headers = {}) =>
  new Response(body === undefined ? "" : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

globalThis.fetch = async (input, init) => {
  const req = new Request(input, init);
  const u = new URL(req.url);
  if (u.origin === "https://api.resend.com") { provider.push(JSON.parse(await req.text())); return send(200, { id: `re_${provider.length}` }); }
  if (u.origin !== FAKE) { unknown.push(`${req.method} ${u.origin}${u.pathname}`); return send(502, { message: "outside" }); }
  if (u.pathname === "/functions/v1/send-email") return edge.get("send-email")(req);
  if (u.pathname === "/auth/v1/user") {
    return (req.headers.get("authorization") || "") === "Bearer tok-u1"
      ? send(200, { id: "u1", aud: "authenticated", role: "authenticated" }) : send(401, { msg: "bad jwt" });
  }
  const text = ["GET", "HEAD"].includes(req.method) ? "" : await req.text();
  const rpc = u.pathname.match(/^\/rest\/v1\/rpc\/(.+)$/);
  if (rpc) return send(200, rpc[1] === "claim_email_send" ? true : null);
  const tbl = u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
  if (!tbl) { unknown.push(`${req.method} ${u.pathname}`); return send(404, { message: "no fake" }); }
  if (tbl[1] === "campaign_presses" && req.method === "POST") return send(201, null);
  let rows = TABLES[tbl[1]] ?? [];
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
  SUPABASE_URL: FAKE, SUPABASE_SERVICE_ROLE_KEY: "service-role-fixture", SUPABASE_ANON_KEY: "anon-fixture", RESEND_API_KEY: "re_fixture",
});

test("97.21 · the sabotage, if any, landed in the production source", () => {
  assert.ok(landed, `BREAK=${BREAK} never reached send-campaign`);
});

test("97.21 · a campaign reaches the normal customer and never the unsubscribed or bounced one", async () => {
  const res = await edge.get("send-campaign")(new Request(`${FAKE}/functions/v1/send-campaign`, {
    method: "POST",
    headers: { Authorization: "Bearer tok-u1", "Content-Type": "application/json" },
    body: JSON.stringify({ business_id: B1, customer_ids: [NORMAL.id, UNSUB.id, BOUNCED.id], subject: "Come back", message: "It has been a while.", press_id: "aaaaaaaa-0000-4000-8000-000000000001" }),
  }));
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  const to = provider.flatMap((p) => [].concat(p.to));
  // Discovery floor: a press that reached nobody would pass the two "never" lines below.
  assert.deepEqual(to, [NORMAL.email], `the provider was handed ${JSON.stringify(to)}`);
  assert.ok(!to.includes(UNSUB.email), "the unsubscribed customer was mailed a campaign");
  assert.ok(!to.includes(BOUNCED.email), "the bounced customer was mailed a campaign");
  assert.equal(body.sent, 1, JSON.stringify(body));
  assert.equal(body.unsubscribed, 1, "the opt-out is reported to the detailer as skipped");
  assert.equal(body.bounced, 1, JSON.stringify(body));
});

test("97.21 · nothing left the process", () => {
  assert.equal(sockets, 0, `${sockets} socket connects`);
  assert.deepEqual(unknown, [], "every request was answered by the fake");
});
