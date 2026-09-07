// ROADMAP 8.2 — GIVE A REAL PERSON THE KEY TO THE BACK OFFICE.
//
//   node --env-file=.env scripts/platform-admin-add.mjs andrew@detailingplatform.com
//   node --env-file=.env scripts/platform-admin-add.mjs <email> --no-email
//
// **THE BACK OFFICE HAS NO WAY TO ADD AN ADMIN AND DELIBERATELY NEVER WILL.**
// `platform_admins` has RLS forced and no policies at all, so nothing with a
// user's token can read it, add to it or delete from it — that is the whole
// reason a detailer cannot make themselves one. A screen that adds admins
// would have to reach past that with the service role, which turns the one
// table nobody can touch into a table one bug can. So it is a script, run by
// hand, by somebody holding the service key.
//
// **IT NEVER CHOOSES OR CHANGES A PASSWORD.** The owner's own instruction for
// this item is that he supplies it. An existing account is left exactly as it
// is; a new one is created with a random string nobody ever sees or writes
// down, and the only way in is the set-password link this sends. That is also
// why re-running it is safe: it cannot lock anybody out of an account that
// already works.
//
// **THE LINK IS EMAILED, NEVER PRINTED.** A recovery link is a live credential
// for the account that can see every tenant, and a session transcript is not
// where one belongs. It also expires in about an hour, so printing it into a
// message somebody reads later is a link that is dead by the time it is
// clicked. **The durable way in is `/admin` → "Forgot your password?"**, which
// works for ever and needs nobody to run anything.

const email = process.argv[2]?.trim().toLowerCase();
const SEND = !process.argv.includes("--no-email");
if (!email || !email.includes("@")) {
  console.error("Usage: node --env-file=.env scripts/platform-admin-add.mjs <email> [--no-email]");
  process.exit(1);
}

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SITE = process.env.PLATFORM_URL || "https://detailingplatform.com";
if (!URL_ || !KEY) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

// FIND FIRST, CREATE SECOND. GoTrue answers 422 rather than 200 when the
// address is taken, and treating that as a failure would make the second run
// of this script look like a broken one.
const find = async () => {
  const r = await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H });
  const j = await r.json();
  return (j.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
};

let user = await find();
if (user) {
  console.log(`Account already exists — password untouched (${user.id}).`);
} else {
  // A random password that is never returned, never stored and never used.
  // The account is unreachable until the person sets their own through the
  // link below, which is exactly the state this item asks for.
  // One UUID: bcrypt takes 72 bytes and GoTrue refuses anything longer.
  const throwaway = `A1!${crypto.randomUUID()}`;
  const res = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST",
    headers: H,
    // `email_confirm` so there is no verification wall in front of the reset
    // link: the address is being proved by the fact that the link arrives at
    // it, and asking twice is a second way for this to fail silently.
    body: JSON.stringify({ email, password: throwaway, email_confirm: true }),
  });
  if (!res.ok) {
    console.error(`Could not create the account: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  user = await find();
  if (!user) { console.error("Created the account but could not read it back."); process.exit(1); }
  console.log(`Account created (${user.id}).`);
}

// THE ROW IS THE GATE. Everything above is an ordinary auth account with no
// more power than a detailer's; this line is what makes it an admin, and
// `platform-admin` answers 404 to anybody without it.
const existing = await (await fetch(
  `${URL_}/rest/v1/platform_admins?user_id=eq.${user.id}&select=user_id`, { headers: H },
)).json();
if (existing.length) {
  console.log("Already a platform admin — nothing to add.");
} else {
  const r = await fetch(`${URL_}/rest/v1/platform_admins`, {
    method: "POST",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify([{ user_id: user.id, email, note: "Added by scripts/platform-admin-add.mjs." }]),
  });
  if (!r.ok) { console.error(`Could not add the admin row: ${r.status} ${await r.text()}`); process.exit(1); }
  console.log("Platform admin row added.");
}

if (!SEND) { console.log("\n--no-email: no set-password link was sent."); process.exit(0); }

// GOTRUE'S OWN MAILER, NOT `send-email`. This is the one message in the
// product that is about an ACCOUNT rather than about a business, so it rides
// the same path `/admin` → "Forgot your password?" rides — one mechanism, and
// the person can repeat it themselves for ever without anybody running this.
const rec = await fetch(`${URL_}/auth/v1/recover`, {
  method: "POST",
  headers: { apikey: ANON ?? KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email }),
});
// It answers 200 whether or not the address exists — deliberately, and the
// same reasoning as `Auth.jsx`'s reset branch. Here we know it exists, so a
// non-200 really is a failure worth printing.
if (rec.ok) {
  console.log(`\nSet-password link emailed to ${email}. It lands on ${SITE}/reset and lasts about an hour.`);
  console.log(`If it is missed or expires: ${SITE}/admin → "Forgot your password?" sends a fresh one.`);
} else {
  console.error(`\nCould not send the set-password email: ${rec.status} ${await rec.text()}`);
  console.error(`The account and the admin row are in place. ${SITE}/admin → "Forgot your password?" is the other way in.`);
  process.exit(1);
}
