// THE ONE SCREEN WHERE A BUG EXPOSES EVERY TENANT AT ONCE — roadmap 4.4.
//
// Everything else in this product is protected by row-level security scoped to
// one business. The back office deliberately is not, and 4.4's own wording
// calls the security "the part that is not negotiable" — so this file exists
// before the screen is finished rather than after.
//
// **WHAT IT MOSTLY GUARDS IS THE ABSENCE OF SOMETHING**, which no behavioural
// test can see. The obvious way to build a back office is to add
// `or public.is_platform_admin()` to the twenty tenant policies and let the
// admin screens use `supabase.from()` like every other screen. It works on the
// first day and it puts a cross-tenant escape hatch into twenty policies that
// are otherwise provably per-business. **One typo, one copied line, one policy
// rewritten by a later migration, and a detailer's browser reads somebody
// else's customers.** § 1 asserts that no migration in the repo has ever done
// it, so the next session that reaches for the easy shape is told.
//
// Credential-free: it reads SOURCE. The live half — a signed-in detailer
// getting 404 from the endpoint — needs env vars and lives in
// `tests/tenant-isolation.test.mjs`'s family; it was also exercised by hand
// when the function was deployed (demo owner → 404, anon → 401).
//
//   node tests/platform-admin.test.mjs

import { readFileSync, readdirSync } from "node:fs";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

// Comments AND single-quoted SQL strings. The second half was added after
// this file failed on its OWN migration: a `comment on column ... is '…'`
// whose text reads "never in get_public_business_profile, never selected"
// mentions both names in one literal, so a comment-only strip left the
// documentation of a rule looking exactly like a violation of it.
const strip = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*(\/\/|--).*$/gm, "")
  .replace(/'(?:''|[^'])*'/g, "''");
const read = (p) => readFileSync(p, "utf8");

const MIGRATIONS = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql"));
const fn = read("supabase/functions/platform-admin/index.ts");
const page = read("app/src/admin/AdminPage.jsx");
const mig = read("supabase/migrations/20260906001000_platform_admin.sql");

// ─── 1. NO POLICY ANYWHERE GRANTS CROSS-TENANT READ ───────────────────────
console.log("\n1. row-level security still says 'one business, always'");
{
  let offenders = [];
  for (const f of MIGRATIONS) {
    const sql = strip(read(`supabase/migrations/${f}`));
    // A policy body that mentions the admin check at all. There is exactly one
    // legitimate place for `is_platform_admin()` — its own definition — and it
    // is a `create function`, not a `create policy`.
    for (const m of sql.matchAll(/create\s+policy[\s\S]*?;/gi)) {
      if (/is_platform_admin|platform_admins/i.test(m[0])) offenders.push(`${f}: ${m[0].slice(0, 90)}`);
    }
  }
  check("NO POLICY MENTIONS THE ADMIN CHECK", offenders.length === 0,
    offenders.join("\n        ") || "");
  check("...and the migrations were actually read", MIGRATIONS.length > 20,
    `${MIGRATIONS.length} migration files — if this is small, the loop above proved nothing`);

  // The admin tables themselves must have NO policies at all. With RLS forced
  // and no policy, `authenticated` can neither read nor write them by any
  // query — so a detailer cannot discover who the admins are, cannot make
  // themselves one, and cannot forge or delete an audit row.
  const s = strip(mig);
  for (const t of ["platform_admins", "platform_admin_events"]) {
    check(`${t} has RLS forced`, new RegExp(`alter table public\\.${t}\\s+force\\s+row level security`, "i").test(s));
    check(`${t} has NO policy, which is the strongest statement available`,
      !new RegExp(`create policy[^;]*on public\\.${t}`, "i").test(s));
  }
  check("is_platform_admin is not executable by a browser",
    /revoke all on function public\.is_platform_admin\(\) from public, anon, authenticated/.test(s));
}

// ─── 2. The gate is in the database ───────────────────────────────────────
console.log("\n2. the gate is a table, not a claim and not an env var");
{
  const f = strip(fn);
  check("the JWT is verified against GoTrue", /supabase\.auth\.getUser\(token\)/.test(f));
  check("AND THEN CHECKED AGAINST platform_admins",
    /from\("platform_admins"\)[\s\S]{0,120}\.eq\("user_id", user\.id\)/.test(f),
    "a JWT proves who they are; the table decides what that is worth");
  // `user.role` / the JWT claims, NOT any `role ===` anywhere: the list
  // action reads `m.role === "owner"` to find whose email to show, which
  // is a business membership and has nothing to do with authorisation.
  // A matcher that cannot tell those apart fails on correct code, and a
  // check that fails on correct code teaches people to edit the check.
  check("no role claim is trusted", !/app_metadata|user_metadata|user\.role|jwt\.role/.test(f),
    "a claim is signed by GoTrue and can be stale for an hour after it is revoked");
  check("no environment variable is the gate", !/Deno\.env\.get\("ADMIN|ADMIN_EMAIL|IS_ADMIN/.test(f),
    "an env var is invisible to every query and cannot be audited");
  check("a non-admin gets 404, not 403",
    /if \(!admin\) return json\(\{ error: "Not found" \}, 404\)/.test(f),
    "a 403 tells a curious detailer the endpoint exists and that one row is all that stands in the way");
  check("and the SCREEN says the same thing", /Page not found/.test(page),
    "two different answers from the server and the page is the server's answer leaking");
}

// ─── 3. Impersonation is logged, and the log is not optional ──────────────
console.log("\n3. impersonation");
{
  const f = strip(fn);
  const block = f.match(/if \(action === "impersonate"\)[\s\S]*?\n    \}/)?.[0] ?? "";
  check("the impersonate branch was found", block.length > 0);
  check("IT LOGS BEFORE IT MAKES THE LINK",
    block.indexOf("logIt(") < block.indexOf("generateLink") && block.includes("logIt("),
    "a link handed out before the record is written is a link handed out if the record fails");
  check("AND A FAILED LOG STOPS THE ACTION", /if \(!await logIt\([\s\S]{0,200}return json/.test(block),
    "everywhere else a failed log is a console line; here it is the whole point");
  check("the record names who, when and which business",
    /admin_id/.test(f) && /admin_email/.test(f) && /business_name/.test(f),
    "if a detailer ever asks 'were you looking at my numbers?', he wants a record rather than a memory");
  check("the link is generated, never emailed", /generateLink/.test(block) && !/sendTenantEmail|send-email/.test(block));
  check("the button warns before it acts", /confirm\(/.test(page) && /written down/.test(page));
}

// ─── 4. Every write is logged ─────────────────────────────────────────────
console.log("\n4. the audit covers more than the one action 4.4 asked for");
{
  const f = strip(fn);
  for (const a of ["note", "suspend", "tier"]) {
    // TO THE END OF THE BRANCH, not to the first `return json`. The tier
    // branch returns early on an unknown value, so a non-greedy match to the
    // first return stopped before the log and reported a missing one.
    const block = f.match(new RegExp(`if \\(action === "${a}"[\\s\\S]*?\\n    \\}`))?.[0] ?? "";
    check(`${a} is logged`, /logIt\(/.test(block), block.slice(0, 80) || "(branch not found)");
  }
  check("the note's CONTENT is not copied into the log", /length: note\.length/.test(f),
    "recording that he wrote a private line about a customer is the audit; quoting it is a second copy");
}

// ─── 5. The screen cannot reach the database directly ─────────────────────
console.log("\n5. the back office reads nothing through RLS");
{
  const p = strip(page);
  check("NOT ONE supabase.from() ON THE ADMIN SCREEN", !/supabase\.from\(/.test(p),
    "every byte comes through the edge function, which is what makes the absent policies safe");
  check("only the session is read from the client", /supabase\.auth\.getSession\(\)/.test(p));
  // COMMENTS STRIPPED FIRST, and this is the THIRD time in one night that a
  // check has failed on prose promising the very thing it checks for: this
  // page's own header says "It sits OUTSIDE `BusinessProvider`".
  // `tests/booking-core.test.mjs` § 1 carries the same note.
  check("it is not wrapped in BusinessProvider",
    !/BusinessProvider/.test(p)
    && /<Route path="\/admin" element=\{<AdminPage \/>\} \/>/.test(read("app/src/main.jsx")),
    "a screen that can see every business must not sit in the same context tree as one a detailer opens");
  check("it has its own stylesheet and shares no rule",
    /import "\.\/admin\.css"/.test(page)
    && !/\.card\b|\.nav-row\b|className="btn/.test(p),
    "a shared selector is the quiet way 'its own layout' gets broken");
}

// ─── 6. The private note stays private ────────────────────────────────────
console.log("\n6. the platform's notes are not the detailer's to read");
{
  // `businesses`' own policy is `for all` to members, so a detailer's
  // `select *` WOULD return this column. Nothing in the app selects it, and
  // that is what keeps *"call back, seems unhappy"* away from its subject.
  let leaks = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${e.name}`;
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(jsx?|mjs)$/.test(e.name)) continue;
      if (full.includes("/admin/")) continue;      // the back office may
      if (strip(read(full)).includes("admin_notes_platform")) leaks.push(full);
    }
  };
  walk("app/src");
  check("NO DETAILER-FACING FILE READS admin_notes_platform", leaks.length === 0, leaks.join(", "));
  check("...and the walk actually looked at something",
    readdirSync("app/src").length > 5, "an empty walk finds no leaks either");
  // The public profile is the other way it could escape — it is a
  // `security definer` function, so it bypasses RLS entirely.
  // AND STRIPPED HERE TOO: the platform-admin migration mentions BOTH names in
  // one comment — "never in get_public_business_profile" — which made it its
  // own counter-example.
  const profile = MIGRATIONS.filter((f) => strip(read(`supabase/migrations/${f}`)).includes("get_public_business_profile"));
  check("it is in no version of the public profile",
    profile.every((f) => !strip(read(`supabase/migrations/${f}`)).includes("admin_notes_platform")),
    profile.join(", "));
}

// ─── 7. What the spec said not to build ───────────────────────────────────
console.log("\n7. and the things the spec refused");
{
  const p = strip(page);
  check("no chart", !/chart|Chart|recharts|<svg[\s\S]*polyline/.test(p),
    "fewer than ten customers means every trend line is noise — the spec says so in as many words");
  check("no second permission system for admins", !/admin_role|adminPermissions/.test(strip(fn)),
    "there is one admin; a lattice for a table with one row is what 2.13 refused for 'team'");
  check("no refunds or card handling — Stripe's dashboard is better at those",
    !/refund|dispute|card_number/i.test(strip(fn)),
    "show the state, link out for the action");
  check("FOUR figures and no more",
    // `pa-num"` WITH THE QUOTE: the wrapper is `pa-nums`, and matching the
    // bare prefix counted the container as a fifth figure.
    (p.match(/pa-num"/g) ?? []).length === 4, `${(p.match(/pa-num"/g) ?? []).length} figures`);
}

// ─── 8. Stage 3: the site columns ─────────────────────────────────────────
// The spec's one product-specific column — *do they have one, what is its
// address, is a custom domain pointed at it, when was it last touched.* Three
// of those four are the platform's own record of work done OUTSIDE this
// product, which is what every check here is about: a record its subject can
// edit, or a date its subject can type, is not a record.
console.log("\n8. their site");
{
  const site = strip(read("supabase/migrations/20260906002000_site_columns.sql"));
  const f = strip(fn);
  const p = strip(page);

  check("the site columns are revoked from `authenticated` at column level",
    /revoke\s+update\s*\(\s*site_url\s*,\s*site_updated_at\s*\)\s+on\s+public\.businesses\s+from\s+authenticated/i.test(site),
    "RLS chooses ROWS and says nothing about COLUMNS, and `businesses` carries an owner update policy — without this a detailer stamps their own 'last touched'");

  // THE TIMESTAMP IS THE SERVER'S. A date the caller sends is a date somebody
  // typed, and the whole value of this column is that it was not.
  check("`site_updated_at` is the server's clock, never the caller's",
    /site_updated_at: full \? new Date\(\)/.test(f) && !/site_updated_at: body\./.test(f),
    "a typed date is not a record of when work happened");

  // A BARE HOSTNAME PUT IN AN `href` IS A RELATIVE LINK — /admin/ridgeline.com
  // — which fails by going somewhere plausible rather than by erroring.
  check("a bare hostname gets a scheme before it is stored",
    /`https:\/\/\$\{url\}`/.test(f),
    "without it the screen's link is relative and lands inside /admin");

  // ROADMAP 3.3'S OWN NAMED FAILURE, FROM THE OTHER SIDE.
  // `business_domains.domain` means a hostname that RESOLVES TO THIS APP; a
  // detailer's website may live anywhere. Writing one into that table points a
  // customer's own receipt at a 404.
  check("the site action never writes `business_domains`",
    !/action === "site"[\s\S]{0,900}business_domains/.test(f),
    "a host that does not serve this app in that table sends a customer's own booking to a 404");

  // The trap § 4 already holds for the setup filter, in a second place: a
  // filter whose input the server never sends matches nothing, which reads
  // exactly like nobody qualifying — here, like everybody already having a
  // website.
  check("the *no website yet* filter has its input",
    /"nosite"[\s\S]{0,160}!r\.site_url/.test(p)
      && /site_url: b\.site_url/.test(f)
      && /admin_notes_platform, site_url, site_updated_at/.test(f),
    "the list's own select must carry the column the filter reads");

  check("the site is written down like every other action, with what it was before",
    /logIt\(admin, "site", biz, \{ from: biz\.site_url/.test(f)
      && /select\("id, name, slug, status, plan_tier, site_url"\)/.test(f),
    "the previous address is the useful half, and `biz` must select it or every entry says null");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
