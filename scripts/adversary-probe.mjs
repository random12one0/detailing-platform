// THE ADVERSARY PASS, AS A SCRIPT — `docs/testing/LOOP.md` §3d, A3 and A4.
//
// Not role-play. It asks one question of every public surface: **can a
// stranger, with no session and no credential, reach anything at all?** and
// **does a refusal ever say more than "no"?**
//
// The two suites beside it already cover the other half. `tenant-isolation`
// proves detailer A cannot read detailer B THROUGH ROW-LEVEL SECURITY, and
// `staff-roles` proves a staff member cannot reach money. Neither of them
// arrives with NO session at all, which is A3's whole point, and neither
// looks at what the REFUSAL says. A 500 with a stack trace and a 404 are both
// "it did not work"; only one of them is a map.
//
//   node --env-file=.env scripts/adversary-probe.mjs
//
// Needs SUPABASE_URL and SUPABASE_ANON_KEY (the publishable key a browser
// already has — that is the point: this uses nothing a stranger lacks).
// SUPABASE_SERVICE_ROLE_KEY is used ONLY to find a real booking id to attack,
// which is the one thing a probe cannot discover honestly.

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON) { console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY"); process.exit(1); }

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

const anonHeaders = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" };
const svcHeaders = SERVICE ? { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } : null;

const fn = async (name, body = {}) => {
  const r = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST", headers: anonHeaders, body: JSON.stringify(body),
  });
  return { status: r.status, text: (await r.text()).slice(0, 600) };
};
const rest = async (path) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: anonHeaders });
  return { status: r.status, text: (await r.text()).slice(0, 600) };
};

// WHAT A REFUSAL MAY NOT CONTAIN. A stack frame, a file path, a SQL
// fragment, a table name it was not asked about, or the name of the gate —
// each of those turns "no" into a description of what is behind the door.
const LEAKY = [
  [/\bat [A-Za-z$_][\w$.]*\s*\(/, "a stack frame"],
  [/file:\/\/\/|\/home\/deno|\.ts:\d+:\d+/, "a source path"],
  [/\bselect\b[\s\S]{0,40}\bfrom\b/i, "a SQL fragment"],
  [/platform_admins|service_role|SUPABASE_SERVICE/i, "the name of the gate"],
  [/PGRST\d{3}[\s\S]{0,200}(relation|column)/i, "the schema"],
];
const leaks = (text) => LEAKY.filter(([re]) => re.test(text)).map(([, why]) => why);

// ── A3 · a signed-out stranger tries every authenticated route ─────────────
console.log("\nA3: a stranger with no session");
{
  // Every function the deploy script does NOT mark public. The gateway
  // refuses these before the code runs, and that is the design — but it has
  // to be TRUE of all of them, and nothing has ever asserted the list.
  const GATED = [
    "platform-admin", "platform-billing", "invite-user", "send-campaign",
    "send-invoice", "update-booking", "respond-to-booking", "verify-domain",
    "owner-push-subscribe", "owner-push-unsubscribe",
    "preview-emails", "create-business",
  ];
  // NOT IN THAT LIST, AND THEY MUST NOT BE: `plan-link`, `booking-ics`,
  // `unsubscribe`, `get-booking-receipt`, `cancel-booking`,
  // `reschedule-booking` and `accept-quote` are all reached by a CUSTOMER,
  // who has no session and never will. Their credential is the row's own
  // UUID. Requiring a login there would mean asking somebody to make an
  // account in order to cancel an appointment, or to leave a mailing list,
  // which is the opposite of what the law and the product both want. What
  // they owe instead is A4 below, and the throttle in `spam-filter`.
  for (const name of GATED) {
    const r = await fn(name, { action: "list" });
    check(`${name} refuses an anonymous caller`, r.status === 401 || r.status === 403 || r.status === 404,
      `${r.status} ${r.text}`);
    const l = leaks(r.text);
    check(`${name}'s refusal says nothing else`, l.length === 0, l.join(", ") + " — " + r.text);
  }

  // AND THE BACK OFFICE IS THE ONE THAT MUST NOT EVEN CONFIRM ITSELF. A 403
  // tells a curious detailer the endpoint is real and that one row is all
  // that stands between them and it.
  const admin = await fn("platform-admin", { action: "whoami" });
  check("platform-admin never says 'not an admin'",
    !/admin|permission|denied/i.test(admin.text), admin.text);
}

// ── the tables, straight at PostgREST ──────────────────────────────────────
console.log("\nA3b: the tables, with the key a browser already has");
{
  // The anon key is PUBLIC — it is in the bundle. Row-level security is the
  // only thing between it and every tenant's data, so the question is not
  // whether the key works but whether it returns anything.
  const TABLES = [
    "businesses", "customers", "bookings", "business_users", "business_settings",
    "services", "promo_codes", "expenses", "plan_members", "platform_subscriptions",
    "platform_invoices", "platform_admins", "platform_admin_events", "job_photos",
  ];
  for (const t of TABLES) {
    const r = await rest(`${t}?select=*&limit=2`);
    let rows = null;
    try { rows = JSON.parse(r.text); } catch { /* an error body */ }
    const empty = Array.isArray(rows) ? rows.length === 0 : false;
    check(`${t} returns nothing to a stranger`, r.status === 401 || r.status === 403 || empty,
      `${r.status} ${r.text}`);
  }
}

// ── A4 · a customer edits a booking id in a URL ────────────────────────────
console.log("\nA4: guessing at somebody else's booking");
{
  // The booking UUID IS the credential on `/booking/:id` — there is no
  // session on that page and there cannot be one. So the only defence is that
  // the id is unguessable AND that a wrong one is refused identically to a
  // right-one-you-do-not-own. There is no difference between those two here,
  // which is the correct answer: every id you do not have is a wrong id.
  const bogus = "00000000-0000-4000-8000-000000000000";
  const r = await fn("get-booking-receipt", { id: bogus });
  check("a made-up booking id is refused", r.status === 404 || r.status === 400 || /not found/i.test(r.text),
    `${r.status} ${r.text}`);
  check("and the refusal does not describe the row", leaks(r.text).length === 0, r.text);

  // A REAL id belonging to somebody else is the same request with a
  // different uuid, and it MUST come back — that is the feature. What must
  // not come back is anything about the DETAILER'S other customers.
  if (svcHeaders) {
    const rows = await (await fetch(
      `${URL_}/rest/v1/bookings?select=id,business_id&limit=1`, { headers: svcHeaders })).json();
    if (Array.isArray(rows) && rows[0]) {
      const real = await fn("get-booking-receipt", { id: rows[0].id });
      check("a real booking id returns that booking", real.status === 200, `${real.status}`);
      let body = null; try { body = JSON.parse(real.text); } catch { /* */ }
      const blob = JSON.stringify(body ?? {});
      check("and carries no other customer's name or number",
        !/"customers"\s*:/.test(blob) && (blob.match(/customer_email/g) ?? []).length <= 1,
        blob.slice(0, 300));
    }
  }

  // The plan page has the same shape and the same reasoning.
  const plan = await fn("plan-link", { action: "get", member_id: bogus });
  check("a made-up plan membership is refused",
    plan.status === 401 || plan.status === 404 || plan.status === 400, `${plan.status} ${plan.text}`);
}

// ── the public profile is the fork line, so it is worth reading ────────────
console.log("\nA3c: what the public profile hands out");
{
  const r = await fetch(`${URL_}/rest/v1/rpc/get_public_business_profile`, {
    method: "POST", headers: anonHeaders, body: JSON.stringify({ p_slug: "demo-detail" }),
  });
  const text = (await r.text()).slice(0, 4000);
  check("the public profile answers a stranger", r.status === 200, `${r.status}`);
  // IT IS A PUBLIC PAGE, so a name, a price and an address are meant to be
  // here. What must never be: anybody's customer, anybody's booking, an
  // email that is not the business's own, or a platform column.
  for (const [word, why] of [
    ["customer_email", "a customer's address"],
    ["customer_phone", "a customer's number"],
    ["admin_notes_platform", "the platform's private note"],
    ["stripe_", "a payment handle"],
    ["notification_emails", "the detailer's alert list"],
  ]) {
    check(`and never ${why}`, !text.includes(word), word);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
