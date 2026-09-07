// A THROWAWAY PLATFORM ADMIN FOR A SCRIPT THAT HAS TO LOOK AT `/admin`.
//
// **THIS EXISTS BECAUSE THE OLD VERSION OF IT WAS A PUBLISHED CREDENTIAL FOR
// THE ONE ACCOUNT THAT CAN SEE EVERY TENANT — found 2026-09-07, roadmap 8.2.**
// `shoot-admin.mjs` and `admin-contrast.mjs` each carried the same `const PW`
// — one fixed string, spelled out — created that account on the live platform
// project, added it to `platform_admins`, and left both behind when the run
// ended. **This repository is public.** So the password of an account that
// reads every business through the back office was on the internet, next to
// the URL it works at. The account and the row are gone and the string is
// deliberately not repeated here; a dead password quoted in a public file is
// still a password in a public file.
//
// CLAUDE.md already had the rule and it was only ever applied to the demo:
// *"Making `demo@detailplatform.com` an admin would put every detailer's data
// behind `demo123`."* A screenshot script is the same sentence with a longer
// password.
//
// **TWO CHANGES, AND EACH COVERS THE OTHER'S FAILURE:** the password is random
// per run and never leaves memory, so there is nothing to publish; and the
// admin row and the account are removed when the run ends, so there is no
// standing all-seeing account between runs. A killed run leaves an account
// whose password nobody knows and, more importantly, no `platform_admins`
// row — which is an ordinary signed-up user belonging to no business.
//
// ONE MODULE RATHER THAN THE SAME BLOCK IN TWO SCRIPTS. It was already
// duplicated once, and a duplicated block is how one of the two copies keeps
// the old behaviour when somebody fixes the other.

// **ONE UUID, NOT TWO — AND THAT IS A REAL LIMIT, NOT TIDINESS.** GoTrue
// hashes with bcrypt, which takes 72 bytes; `A1!` plus two UUIDs is 75, and
// the account creation is REFUSED. The first version did exactly that, and
// because the failure surfaced as *"could not create the shooter's admin
// account"* it read as a permissions problem rather than a length one.
const rnd = () => `A1!${crypto.randomUUID()}`;

export async function makeAdmin(URL_, KEY, email = "shoot-admin@detailplatform.com") {
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
  const password = rnd();
  const made = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: H, body: JSON.stringify({ email, password, email_confirm: true }),
  });
  // **THE CREATE'S OWN ANSWER FIRST.** Looking the account up in the admin
  // list instead was how the length failure above became a mystery: the POST
  // was refused, the list did not contain it, and the only thing printed was
  // "could not create". A 422 here is the ordinary case — the account survives
  // a run that was killed before its teardown — so the body is read either way
  // and only a genuinely unexplained miss is reported.
  let user = made.ok ? await made.json().catch(() => null) : null;
  if (!user?.id) {
    const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json();
    user = (all.users ?? []).find((u) => u.email === email);
  }
  if (!user?.id) {
    console.error(`could not create ${email}: ${made.status} ${await made.text().catch(() => "")}`.slice(0, 300));
    return null;
  }
  // The account may survive a run that was killed before its teardown. The PUT
  // is what makes THIS run's password the true one — without it a sign-in
  // would quietly fail and every shot below would be a photograph of a login
  // form, which is "a skipped check reads like a passing one" in picture form.
  await fetch(`${URL_}/auth/v1/admin/users/${user.id}`, {
    method: "PUT", headers: H, body: JSON.stringify({ password, email_confirm: true }),
  });
  await fetch(`${URL_}/rest/v1/platform_admins?user_id=eq.${user.id}`, { method: "DELETE", headers: H });
  await fetch(`${URL_}/rest/v1/platform_admins`, {
    method: "POST", headers: H,
    body: JSON.stringify([{ user_id: user.id, email, note: "Temporary — a script is looking at /admin. Removed when it finishes." }]),
  });
  return { email, password, id: user.id };
}

// NEVER THROWS. It runs in a `finally`, so an error here would replace the
// real failure with this one and the run would report the wrong thing.
export async function dropAdmin(URL_, KEY, id) {
  if (!id) return;
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
  try {
    await fetch(`${URL_}/rest/v1/platform_admins?user_id=eq.${id}`, { method: "DELETE", headers: H });
    await fetch(`${URL_}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: H });
  } catch { /* the row is what matters and it went first */ }
}
