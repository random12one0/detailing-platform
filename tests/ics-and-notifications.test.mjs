// The .ics file, notification routing (multiple recipients + per-email
// toggles), message templates, and timezone-required signup.
//
//   node tests/ics-and-notifications.test.mjs

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
let ANON = process.env.SUPABASE_ANON_KEY;
if (!URL_ || !SERVICE) { console.error("Missing Supabase env"); process.exit(1); }
if (!ANON) {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } });
  ANON = (await r.json()).find((k) => k.name === "anon")?.api_key;
}

let passed = 0, failed = 0;
const check = (n, c, d = "") => { if (c) { passed++; console.log(`  ok    ${n}`); } else { failed++; console.error(`  FAIL  ${n} ${d}`); } };

async function rest(method, path, { key = SERVICE, jwt, body } = {}) {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${jwt ?? key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await res.text();
  let data = null; try { data = t ? JSON.parse(t) : null; } catch { data = t; }
  return { status: res.status, data };
}
const svc = { get: (p) => rest("GET", p), post: (p, b) => rest("POST", p, { body: b }), patch: (p, b) => rest("PATCH", p, { body: b }), del: (p) => rest("DELETE", p) };
async function fn(name, body, jwt) {
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify(body),
  });
  const t = await res.text();
  let data = null; try { data = t ? JSON.parse(t) : null; } catch { data = t; }
  return { status: res.status, data };
}
async function ensureUser(email, password) {
  await rest("POST", "/auth/v1/admin/users", { body: { email, password, email_confirm: true } });
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }) });
  const s = await r.json();
  if (!s.access_token) throw new Error(`sign-in failed ${email}`);
  return { id: s.user.id, jwt: s.access_token };
}
const daysOut = (n) => {
  const d = new Date(Date.now() + n * 86400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

console.log("setup");
const PW = "Phase2-ics-test-pw!";
const owner = await ensureUser("ics-owner@ics.test", PW);
await svc.del("/rest/v1/businesses?slug=in.(ics-a,ics-phx,ics-new)");

const [A] = (await svc.post("/rest/v1/businesses", [{
  slug: "ics-a", name: "ICS Test Detailing", timezone: "America/New_York",
  contact_email: "primary@ics.test", contact_phone: "555-7000",
  dropoff_address: "9 Shop Lane, Brooklyn, NY",
}])).data;
const [PHX] = (await svc.post("/rest/v1/businesses", [{
  slug: "ics-phx", name: "ICS Phoenix", timezone: "America/Phoenix", contact_email: "phx@ics.test",
}])).data;
await svc.post("/rest/v1/business_users", [{ business_id: A.id, user_id: owner.id, role: "owner" }]);
await svc.post("/rest/v1/business_settings", [{ business_id: A.id }, { business_id: PHX.id }]);
await svc.post("/rest/v1/business_hours", [A, PHX].flatMap((b) =>
  [0,1,2,3,4,5,6].map((wd) => ({ business_id: b.id, weekday: wd, open_time: "08:00", close_time: "18:00" }))));
const services = (await svc.post("/rest/v1/services", [A, PHX].map((b) =>
  ({ business_id: b.id, name: "Detail", price: 100, duration_minutes: 120 })))).data;

const day = daysOut(25);
const mk = (slug, biz) => fn("create-booking", {
  business_slug: slug, customer_name: "Ada Byron", customer_phone: "555-7100",
  customer_email: "ada@ics.test", customer_address: "22 Elm St, Brooklyn, NY",
  service_type: "mobile", vehicle_size: "small",
  service_ids: [services.find((s) => s.business_id === biz.id).id],
  booking_date: day, start_time: "10:00",
});
const bookingA = (await mk("ics-a", A)).data?.booking;
const bookingPhx = (await mk("ics-phx", PHX)).data?.booking;

// ---------------------------------------------------------------------------
console.log("\ntest 1: the .ics file stamps the business's timezone");
{
  const res = await fetch(`${URL_}/functions/v1/booking-ics?id=${bookingA.id}&audience=owner`, { headers: { apikey: ANON } });
  const text = await res.text();
  check("served as a calendar file", res.headers.get("content-type")?.includes("text/calendar"), res.headers.get("content-type"));
  check("attachment filename set", (res.headers.get("content-disposition") || "").includes(".ics"));
  // Scope this to the VEVENT — the VTIMEZONE component legitimately carries
  // its own bare DTSTART:19700101T000000 as the rule's effective date.
  const vevent = text.slice(text.indexOf("BEGIN:VEVENT"));
  check("event DTSTART carries TZID, not a floating time",
    vevent.includes("DTSTART;TZID=America/New_York:") && !/DTSTART:\d/.test(vevent), vevent.slice(0, 200));
  check("local wall clock is 10:00", text.includes(`DTSTART;TZID=America/New_York:${day.replace(/-/g, "")}T100000`), text.match(/DTSTART[^\r\n]*/)?.[0]);
  check("VTIMEZONE block present", text.includes("BEGIN:VTIMEZONE") && text.includes("TZID:America/New_York"));
  check("PRODID is the platform, not a business name", text.includes("PRODID:-//detailplatform.com//Booking//EN"));
  check("CRLF line endings", text.includes("\r\n"));
  check("owner copy carries the customer's contact", text.includes("555-7100"));
  check("location is the customer address for a mobile job", text.includes("22 Elm St"));
}

console.log("\ntest 2: the customer copy differs, and Phoenix gets no DST");
{
  const cust = await (await fetch(`${URL_}/functions/v1/booking-ics?id=${bookingA.id}&audience=customer`, { headers: { apikey: ANON } })).text();
  check("customer copy omits the customer's own phone", !cust.includes("Customer: Ada Byron"), cust.match(/DESCRIPTION[^\r\n]*/)?.[0]);
  check("customer copy is titled with the business", cust.includes("SUMMARY:ICS Test Detailing"));
  check("distinct UID per audience", cust.includes("-customer@") && !cust.includes("-owner@"));

  const phx = await (await fetch(`${URL_}/functions/v1/booking-ics?id=${bookingPhx.id}&audience=owner`, { headers: { apikey: ANON } })).text();
  check("Phoenix stamped with its own zone", phx.includes("DTSTART;TZID=America/Phoenix:"));
  check("Phoenix offset is -0700 and marked STANDARD (no DST)",
    phx.includes("TZOFFSETTO:-0700") && phx.includes("BEGIN:STANDARD"), phx.match(/TZOFFSETTO[^\r\n]*/)?.[0]);
  const ny = await (await fetch(`${URL_}/functions/v1/booking-ics?id=${bookingA.id}&audience=owner`, { headers: { apikey: ANON } })).text();
  check("New York in September is marked DAYLIGHT", ny.includes("BEGIN:DAYLIGHT"), ny.match(/BEGIN:(STANDARD|DAYLIGHT)/)?.[0]);
}

console.log("\ntest 3: a cancelled booking has no calendar file");
{
  const [b] = (await svc.patch(`/rest/v1/bookings?id=eq.${bookingPhx.id}`, { status: "cancelled" })).data;
  const res = await fetch(`${URL_}/functions/v1/booking-ics?id=${b.id}`, { headers: { apikey: ANON } });
  check("cancelled booking returns 410", res.status === 410, String(res.status));
  const missing = await fetch(`${URL_}/functions/v1/booking-ics?id=8f8b1a4a-0000-4000-8000-000000000000`, { headers: { apikey: ANON } });
  check("unknown id returns 404", missing.status === 404, String(missing.status));
}

console.log("\ntest 4: notification recipients and toggles");
{
  // Default: no list configured, so alerts fall back to contact_email.
  const s0 = (await svc.get(`/rest/v1/business_settings?business_id=eq.${A.id}&select=notification_emails,email_owner_new_booking`)).data[0];
  check("recipient list starts empty", Array.isArray(s0.notification_emails) && s0.notification_emails.length === 0);
  check("owner new-booking email defaults on", s0.email_owner_new_booking === true);

  const upd = await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${A.id}`, {
    key: ANON, jwt: owner.jwt,
    body: { notification_emails: ["owner@ics.test", "office@ics.test"], email_customer_confirmation: false },
  });
  check("owner can set multiple recipients", upd.status === 200 && upd.data?.[0]?.notification_emails?.length === 2, JSON.stringify(upd.data?.[0]?.notification_emails));
  check("owner can switch an email off", upd.data?.[0]?.email_customer_confirmation === false);

  // A booking still succeeds with confirmation email off (email is never a
  // gate on booking).
  const b2 = await fn("create-booking", {
    business_slug: "ics-a", customer_name: "Grace H", customer_phone: "555-7200",
    customer_email: "grace@ics.test", service_type: "mobile", vehicle_size: "small",
    service_ids: [services.find((s) => s.business_id === A.id).id],
    booking_date: daysOut(26), start_time: "10:00",
  });
  check("booking still succeeds with confirmation email disabled", b2.status === 200, JSON.stringify(b2.data).slice(0, 140));
}

console.log("\ntest 5: message templates");
{
  const seeded = await svc.post("/rest/v1/message_templates", [
    { business_id: A.id, key: "on_my_way", label: "On my way", body: "Hi {{customer_name}}, on my way." },
  ]);
  check("owner can create a template", seeded.status === 201, `${seeded.status}`);
  const dup = await svc.post("/rest/v1/message_templates", [
    { business_id: A.id, key: "on_my_way", label: "Dup", body: "x" },
  ]);
  check("template keys are unique per business", dup.status >= 400, `${dup.status}`);
  // Same key is fine for a different business.
  const other = await svc.post("/rest/v1/message_templates", [
    { business_id: PHX.id, key: "on_my_way", label: "On my way", body: "y" },
  ]);
  check("another business can reuse the same key", other.status === 201, `${other.status}`);

  const staff = await ensureUser("ics-staff@ics.test", PW);
  await svc.post("/rest/v1/business_users", [{ business_id: A.id, user_id: staff.id, role: "staff" }]);
  const staffRead = await rest("GET", "/rest/v1/message_templates?select=key", { key: ANON, jwt: staff.jwt });
  check("staff can READ templates (they send the texts)", (staffRead.data ?? []).length >= 1, JSON.stringify(staffRead.data));
  const staffWrite = await rest("PATCH", `/rest/v1/message_templates?business_id=eq.${A.id}`, {
    key: ANON, jwt: staff.jwt, body: { body: "hacked" },
  });
  check("staff cannot EDIT templates", staffWrite.status === 200 && (staffWrite.data ?? []).length === 0, `${staffWrite.status}`);
}

console.log("\ntest 6: signup requires a timezone");
{
  const user = await ensureUser("ics-signup@ics.test", PW);
  const noTz = await fn("create-business", { name: "No Zone Detailing", slug: "ics-new" }, user.jwt);
  check("signup without a timezone is refused", noTz.status === 400 && /timezone/i.test(noTz.data?.error || ""), JSON.stringify(noTz.data));
  const badTz = await fn("create-business", { name: "Typo Detailing", slug: "ics-new", timezone: "America/Los_Angles" }, user.jwt);
  check("a mistyped timezone is refused", badTz.status === 400, JSON.stringify(badTz.data));
  const ok = await fn("create-business", { name: "New Detailing", slug: "ics-new", timezone: "America/Denver" }, user.jwt);
  check("signup with a timezone succeeds", ok.status === 200 && ok.data?.business?.timezone === "America/Denver", JSON.stringify(ok.data));
  const anon = await fn("create-business", { name: "Anon", slug: "ics-anon", timezone: "UTC" });
  check("signup requires a signed-in user", anon.status === 401, `${anon.status}`);
  const created = (await svc.get(`/rest/v1/businesses?slug=eq.ics-new&select=id,timezone`)).data[0];
  const setRow = (await svc.get(`/rest/v1/business_settings?business_id=eq.${created.id}&select=business_id`)).data;
  check("signup also creates default settings", setRow.length === 1);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
