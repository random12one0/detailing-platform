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
import { monthlySeries } from "../app/src/lib/adminInsight.js";

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
  // ── THE DOOR, added 2026-09-06 ────────────────────────────────────────
  // **THE TWO REFUSALS MUST STAY DIFFERENT.** A signed-out visitor gets a
  // login; a signed-in NON-ADMIN still gets *Page not found*. Collapsing
  // them either way is a real fault: show the login to a signed-in detailer
  // and the page starts hinting there is a gate to get past; show *not
  // found* to a signed-out owner and the back office has no door at all,
  // which is what he hit on the live site.
  check("2b-i · a signed-out visitor is offered a login, not an error",
    /status: "anon"/.test(page) && /getSession\(\)[\s\S]{0,200}status: "anon"/.test(page),
    "a 401 drew \"Something went wrong\" and left the owner with no way in");
  // **SCOPED TO THE BRANCH, NOT MEASURED IN CHARACTERS.** This was
  // `"denied"[\s\S]{0,400}Page not found` and roadmap 8.2 pushed the two 500
  // apart by adding the impersonation case between them — a check that went
  // red on a change that did exactly what it guards. A proximity window is a
  // check whose colour depends on how much prose sits inside the branch.
  const denied = page.slice(page.indexOf('state.status === "denied"'),
    page.indexOf('state.status === "error"'));
  check("2b-ii · and a signed-in non-admin still gets Page not found",
    denied.includes("Page not found"),
    "the two refusals answer different questions and must not collapse");
  // ONE MESSAGE FOR BOTH HALVES. Saying which of the email or the password
  // was wrong is address enumeration with a friendly face — the same rule
  // the password-reset screen follows.
  // **ALSO SCOPED, AND FOR A SHARPER REASON:** the words this forbids are
  // ordinary English. Read against the whole file it failed on *"there is no
  // account to open their dashboard as"* — a sentence about a BUSINESS with
  // no owner row, nowhere near a sign-in form. A rule about what one form
  // says has to be read against that form.
  const gate = page.slice(page.indexOf('state.status === "anon"'),
    page.indexOf('state.status === "denied"'));
  check("2b-iii · a failed sign-in does not say WHICH half was wrong",
    /That email and password do not match/.test(gate)
      && !/(no account|unknown email|wrong password)/i.test(gate));

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
  // **WHOAMI MUST NEVER ANSWER "no".** It exists so the detailer dashboard
  // can offer a door to the back office, and it is safe only because a
  // non-admin gets the same 404 from the shared gate that every other action
  // gives them. An action returning {admin:false} would turn a silent
  // endpoint into one that confirms itself to anybody who asks, which is the
  // whole thing the 404 protects.
  check("whoami answers only for an admin, and 404s for everyone else",
    /if \(action === "whoami"\) return json\(\{ admin: true/.test(strip(fn))
      && !/admin: false/.test(strip(fn)),
    "a false answer is a confirmation that the endpoint exists");
  // And it must sit BELOW the gate, or it answers before anyone is checked.
  // **PRESENCE FIRST, THEN ORDER** — `indexOf(a) < indexOf(b)` passes
  // LOUDEST when `a` has been deleted, because -1 is less than every real
  // index. Written correctly in `job-photos` this morning and repeated wrong
  // here within the day, which is why it is a named helper now rather than a
  // habit.
  check("and it is inside the gate, not before it", (() => {
    const f = strip(fn);
    const gate = f.indexOf("if (!admin) return json");
    const who = f.indexOf('action === "whoami"');
    return gate >= 0 && who >= 0 && gate < who;
  })(), "an answer given before the gate is an answer given to anybody");

  check("no chart", !/chart|Chart|recharts|<svg[\s\S]*polyline/.test(p),
    "fewer than ten customers means every trend line is noise — the spec says so in as many words");
  check("no second permission system for admins", !/admin_role|adminPermissions/.test(strip(fn)),
    "there is one admin; a lattice for a table with one row is what 2.13 refused for 'team'");
  check("no refunds or card handling — Stripe's dashboard is better at those",
    !/refund|dispute|card_number/i.test(strip(fn)),
    "show the state, link out for the action");
  // **THE FOUR-FIGURE RULE WAS RETIRED BY THE OWNER ON 2026-09-06** and this
  // check now guards the new limit instead of the old one. His instruction:
  // *"I don't wanna have anything that's, like, could be visible hidden."*
  //
  // The original four were right for what this page WAS — an administrative
  // tool. The two added are about the PRODUCT rather than the business: jobs
  // and money carried through the platform this month, which is what says
  // whether the thing works at all and was unanswerable here before.
  //
  // **A CEILING IS STILL CHECKED, because the reasoning behind the original
  // rule has not gone away** — a strip of figures stops being read somewhere
  // around eight, and "show me everything" taken literally is the wall of
  // fields `docs/platform-admin-audit-2026-09-06.md` warns against in its
  // first paragraph. Eight is the ceiling; six is what is drawn.
  // **COUNTED INSIDE THE STRIP, NOT IN THE WHOLE FILE — re-pointed 2026-09-14
  // by roadmap 8.14, which put a promo code in the numeral face two hundred
  // lines further down and turned this red about a figure that is not in the
  // strip at all.** The claim is about what a reader meets across the top of
  // the page; the file-wide count was a proxy for it that any later use of the
  // same class breaks. `.pa-num` is the numeral face and other things are
  // legitimately set in it.
  // `stripBlock`, not `strip`: this file already has a `strip()` that removes
  // comments, and a `const` of the same name put it in its own temporal dead
  // zone two hundred lines EARLIER — the same shape as `appear()` in
  // sweep-widths.mjs, which CLAUDE.md records twice.
  const stripBlock = p.slice(p.indexOf('<header className="pa-strip'), p.indexOf("</header>"));
  const figures = (stripBlock.match(/pa-num"/g) ?? []).length;
  check("the check has a strip to count — the header was found", stripBlock.length > 200);
  // SEVEN SINCE 2026-09-06's REBUILD — one LEAD figure plus six — and the
  // ceiling is what this check is really for. A strip of figures stops being
  // read somewhere around eight, and "show me everything" taken literally is
  // the wall of fields `docs/platform-admin-audit-2026-09-06.md` warns
  // against in its first paragraph. What changed is the HIERARCHY, not the
  // budget: the lead is set against the ground with no box, the other six are
  // a ruled row, and six equal cards is a wall wearing a grid.
  check("seven figures across the top, and never more than eight",
    figures === 7 && figures <= 8, `${figures} figures`);
  check("and exactly one of them is the lead",
    (p.match(/className="pa-lead"/g) ?? []).length === 1);
  // The jobs label gained the word "finished" on 2026-09-06 — testing loop
  // F-016, and § 11i is where the reason lives. The claim here is unchanged:
  // these two are about the PRODUCT rather than the company.
  check("and the two new ones are about the product, not the business",
    /jobs finished this month/.test(p) && /through the platform/.test(p),
    "the other four all answer 'how is my company doing'; these answer 'is it carrying work'");

  // NO CHART STILL HOLDS. More figures is not more decoration, and the
  // original reasoning is untouched by the owner's change: below ten
  // customers every trend line is noise.
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


// ─── 9. Item H: everything they own, as one file ──────────────────────────
// `/terms` says a detailer's list, bookings and history are theirs and they
// can have a copy by asking, and nothing could produce one. It is also the
// answer to a customer-data deletion request — the one legal ask that arrives
// without warning.
console.log("\n9. taking their data with them");
{
  const mig = strip(read("supabase/migrations/20260906005000_export_business.sql"));
  const f = strip(fn);
  const p = strip(page);

  // THE TABLES ARE DISCOVERED, NOT LISTED. A hand-written list goes stale the
  // first time somebody adds a table, and the failure is SILENT: the export
  // succeeds, the file looks complete, and the missing table is found by the
  // person who no longer has it.
  check("9a · the tables are discovered from the catalog",
    /information_schema\.columns/.test(mig) && /column_name = ''/.test(mig),
    "a hand-written list of twenty tables is a list that goes stale silently");
  check("9b · by the same rule every RLS policy uses — a `business_id`",
    /business_id/.test(read("supabase/migrations/20260906005000_export_business.sql")));

  // TWO THINGS ARE OURS AND MUST NOT LEAVE IN IT: the audit trail of what the
  // platform owner did to their account, and the platform's private note about
  // them. Both sit inside the same shapes as their own data, which is exactly
  // how they would slip out.
  const raw = read("supabase/migrations/20260906005000_export_business.sql");
  check("9c · the audit log is excluded by name",
    /c\.table_name <> 'platform_admin_events'/.test(raw));
  check("9d · and the platform's private note is stripped from the row",
    /- 'admin_notes_platform'/.test(raw));

  // THE SAME SECURITY FLOOR AS EVERYTHING ELSE HERE. One call returns every
  // customer, every booking and every price of one business — the exact shape
  // § 1 exists to keep out of a browser.
  check("9e · the function is service-role only",
    /revoke all on function public\.export_business\(uuid\) from public, anon, authenticated/.test(raw)
      && /grant execute on function public\.export_business\(uuid\) to service_role/.test(raw),
    "proven live: a signed-in admin's browser calling the RPC directly gets 403");

  check("9f · the back office reaches it through the gate, like every other action",
    /action === "export"[\s\S]{0,400}supabase\.rpc\("export_business"/.test(f));
  // Logged even though it writes nothing: "who took a copy, and when" is
  // exactly what a detailer is entitled to ask. The row carries the SIZE, not
  // the file.
  check("9g · and it is written down, with the size rather than the contents",
    /logIt\(admin, "export", biz, \{ tables: Object\.keys/.test(f));

  // DOWNLOADED, NOT DISPLAYED. It is every customer and every booking they
  // have, and a screen that prints that is a screen somebody leaves open.
  check("9h · the screen hands over a file rather than drawing it",
    /URL\.createObjectURL/.test(p) && /a\.download = /.test(p)
      && !/<pre>\{JSON\.stringify\(r\.export/.test(p));

  // FOUND BY PRESSING A BUTTON AND LOOKING. Every confirmation on this screen
  // was set and then wiped by the refresh that followed it, in the same tick.
  check("9i · a confirmation survives the refresh that follows it",
    /openBusiness\(open, true\)/.test(p) && /if \(!keepMsg\) setMsg\(null\)/.test(p),
    "the action worked, the list refreshed, and the only thing missing was the sentence saying so");
}


// ─── 10. Item D: if a scheduled job stops, somebody finds out ─────────────
// `pg_cron` posts to the reminder sweep every fifteen minutes and accrues plan
// visits once a night, and **a failure of either was completely silent**. This
// product has been bitten twice by that exact shape — a dead email relay for
// the whole of roadmap 0.2, and VAPID keys that were never set — and both
// times the only evidence was a console line inside an edge function.
console.log("\n10. the jobs that nobody watches");
{
  const raw = read("supabase/migrations/20260906006000_job_heartbeats.sql");
  const sweep = strip(read("supabase/functions/send-owner-reminders/index.ts"));
  const f = strip(fn);
  const p = strip(page);

  check("10a · there is a heartbeat table at all", /create table if not exists public\.job_heartbeats/.test(raw));
  // RLS FORCED, NO POLICIES — the `platform_admins` rule. Nothing a detailer's
  // browser does needs to know whether our crons are healthy.
  check("10b · and it is unreachable from any browser",
    /alter table public\.job_heartbeats force  ?row level security/.test(raw)
      && !/create policy[^;]*job_heartbeats/.test(raw),
    "the back office reads it under the service role, like everything else on that screen");

  // THE LOAD-BEARING CHOICE. The cron's own statement is a `net.http_post`,
  // which succeeds the moment the request is queued: stamping there would
  // prove the SCHEDULER is alive and say nothing about the thing it calls —
  // which is the more likely of the two to break, and the one that broke.
  check("10c · the sweep stamps itself from the function, not from the cron",
    /note_heartbeat[\s\S]{0,120}send-owner-reminders/.test(sweep)
      && !/note_heartbeat[\s\S]{0,200}net\.http_post/.test(raw),
    "a stamp in the cron statement proves the scheduler ran, not that the sweep worked");
  // BEST-EFFORT: a heartbeat that could fail a sweep would be a monitor that
  // causes the outage it watches for.
  check("10d · and a failed heartbeat cannot fail the sweep",
    /try \{[\s\S]{0,240}note_heartbeat[\s\S]{0,200}catch/.test(sweep));
  check("10e · at the END of the run, so a stamp means it got that far",
    sweep.indexOf("note_heartbeat") > sweep.indexOf("const summary"));

  check("10f · the back office is sent them", /from\("job_heartbeats"\)/.test(f)
    && /heartbeats: beats \?\? \[\]/.test(f));
  // SHOWN WHETHER OR NOT ANYTHING IS WRONG. A monitor that only appears when
  // it is unhappy cannot be told apart from one that is no longer wired up.
  // **RE-POINTED BY ROADMAP 8.12, WHICH REWROTE BOTH LINES.** The list is
  // `jobKeys` now — the named jobs plus anything else that has reported — and
  // the window comes from the row rather than from a constant in this file's
  // subject. The property is unchanged and the spelling is not; a check that
  // pins an old spelling goes red on a correct change, and one that is left
  // pointing at deleted code goes VACUOUS, which is worse.
  check("10g · and the screen prints it either way", /jobKeys\.map\(/.test(p)
    && /pa-bad" : "pa-quiet"/.test(p));
  // A job that has never reported is what a dropped table looks like too.
  check("10h · a job that has never reported counts as stale",
    /if \(!beat\) return true;/.test(p));
  // AND THE WINDOW IS THE ROW'S. Roadmap 8.12 moved it out of this screen
  // because the emailer needed the same number, and two copies of a threshold
  // is how a screen says a job is fine while the alarm is going off.
  check("10h-ii · and the staleness window comes from the row, not this file",
    /beat\.stale_after_seconds/.test(p) && !/45 \* 60_?000/.test(p));
  // `ago()` bottoms out at "today", which says nothing about a job that runs
  // every fifteen minutes — "Reminders LAST RAN today" is what the first
  // version printed.
  check("10i · in minutes and hours, not \"today\"",
    /minutes ago/.test(p) && /hour\$\{h === 1 \? "" : "s"\} ago/.test(p));
  // And the day it was installed it must not cry about a nightly job that has
  // simply not come round yet.
  check("10j · both jobs are seeded when the watching starts",
    /insert into public\.job_heartbeats[\s\S]{0,240}on conflict \(job\) do nothing/
      .test(read("supabase/migrations/20260906006100_seed_job_heartbeats.sql")),
    "a monitor that cries on the day it is installed is one somebody ignores by the end of the week");
}

// ─── 11. THE BACK OFFICE COUNTS DETAILERS, NOT ROWS ───────────────────────
//
// Testing loop pass 002, 2026-09-06. `businesses.is_demo` has existed since
// roadmap 6.2 — it is what keeps the seeded demo out of the founding count —
// and **this screen never asked the server for it.** So three demos and every
// fixture the database-backed suites leave behind were listed and counted as
// ordinary detailers: the headline read **"Detailers 15"** on a platform with
// none, and NEEDS A LOOK was eight rows of test businesses.
//
// The rows still CARRY them, deliberately: he does open the demo, and a
// suite's leftovers are worth seeing. What must never happen again is a
// FIGURE that includes them, because every figure on this screen is read as
// an answer about customers.
console.log("\n11. demos are marked and never counted");
{
  const f = strip(fn);
  const p = strip(page);

  check("11a · the server asks for is_demo", /\bis_demo\b/.test(f)
    && /select\("id, slug, name, status, plan_tier, is_demo/.test(f));
  check("11b · and sends it on every row", /is_demo: !!b\.is_demo,/.test(f));

  // ONE derived list, used by every tile. A tile filtering for itself is a
  // tile the next one forgets to copy.
  check("11c · the tiles are computed from the real detailers only",
    /const real = rows\.filter\(\(r\) => !r\.is_demo\);/.test(f));
  const tiles = f.slice(f.indexOf("totals: {"), f.indexOf("new_month:") + 90);
  check("11d · and no tile is computed from the raw rows",
    tiles.length > 100 && !/\brows\.(filter|reduce)\b/.test(tiles),
    tiles.match(/rows\.(filter|reduce)/g)?.join(", ") ?? "");
  check("11e · except the demo count itself, which is the difference",
    /demo: rows\.length - real\.length,/.test(f));

  // THE SCREEN SAYS SO. A number that silently means something narrower than
  // its label is the same defect one layer up.
  check("11f · a demo row is tagged in the list", /r\.is_demo && <span className="pa-tag">demo<\/span>/.test(p));
  check("11g · and the headline says how many were left out",
    /t\.demo \? `detailers · \$\{t\.demo\} demo` : "detailers"/.test(p));

  // ─── the month has an end (F-018) ───────────────────────────────────────
  // `start_at >= monthStart` with nothing above it counted a completed job
  // dated NEXT month as this month's takings.
  // **THE RULE, NOT THE VARIABLE.** This pinned `const monthTo =
  // monthEnd.getTime();` and went red when roadmap 8.7 replaced that line
  // with a per-business `monthWindow` that returns BOTH bounds — a check
  // failing on a change that keeps the very thing it guards. What matters is
  // that the filter is bounded at both ends.
  check("11h · this month has an upper bound as well as a lower one",
    /const \[monthAgo, monthTo\] = monthWindow\(b\.timezone\);/.test(f)
      && /t >= monthAgo && t < monthTo/.test(f));
  // AND THE MONTH IS THE DETAILER'S — F-018's other half, roadmap 8.7. An
  // edge function's `new Date()` is UTC, so "this month" began at 5pm on the
  // last day of the previous month in Los Angeles, and every job done on the
  // 1st before their morning fell into last month's takings.
  check("11h-ii · and it is computed in the business's own timezone",
    /const monthWindow = \(tz: string\)/.test(f)
      && /localToDate\(tz \|\| "UTC"/.test(f),
    "fourteen detailers in four zones do not share a first-of-the-month");
  check("11h-iii · reusing _shared/tz.ts rather than a second copy of the maths",
    /import \{ dateStrIn, localToDate \} from "\.\.\/_shared\/tz\.ts";/.test(f));
  // THE THIRD CLOCK, which nobody had noticed: the per-business chart ran on
  // the ADMIN'S BROWSER, so the same detailer's months moved depending on
  // where the person reading happened to be sitting.
  const insight = strip(read("app/src/lib/adminInsight.js"));
  check("11h-iv · the chart's months are the detailer's, not the reader's",
    /const monthKey = \(iso, tz\)/.test(insight)
      && /timeZone: tz \|\| undefined/.test(insight)
      && /monthlySeries\(detail\.bookings, 6, new Date\(\), b\?\.timezone\)/.test(page));
  // **AND IT IS ASSERTED AS BEHAVIOUR, not only as source.** Every check above
  // reads the file; this one runs the function on the one instant where the
  // two clocks must disagree — 20:00 on 31 August in Los Angeles is 03:00 on
  // 1 September in UTC. If they ever agree here, the timezone is being
  // ignored no matter what the source says.
  {
    const iso = "2026-09-01T03:00:00.000Z";
    const rows = [{ status: "completed", start_at: iso, created_at: iso, final_amount: 100, total_price: 100, deleted_at: null }];
    const at = new Date("2026-09-15T12:00:00Z");
    const monthOf = (tz) => monthlySeries(rows, 6, at, tz).filter((m) => m.jobs > 0).map((m) => m.key).join(",");
    check("11h-v · the same booking really does land in different months",
      monthOf("America/Los_Angeles") === "2026-08" && monthOf("UTC") === "2026-09",
      `LA ${monthOf("America/Los_Angeles")} vs UTC ${monthOf("UTC")}`);
  }

  // ─── the tile says what it counts (F-016) ───────────────────────────────
  // "0 jobs this month" sat beside a row reading "30 bookings, last today".
  // Both were right; together they read as a broken number.
  check("11i · the jobs tile says the jobs are finished ones",
    /jobs finished this month/.test(p));

  // ─── the photo line stops contradicting itself (F-017) ──────────────────
  // "10 MB each for 15 detailers · 154 MB promised" — two independent
  // roundings of the same arithmetic, printed side by side. Under the ceiling
  // the promised figure is exactly share x businesses and says nothing new;
  // over it, it is the whole point.
  check("11j · the promised total is printed only when it is over the ceiling",
    /committed_bytes > state\.photo_store\.total_bytes\s*&& ` · PROMISED/.test(p));

  // ─── clicking a detailer goes to the detailer (F-015) ───────────────────
  // The panel renders below the whole list, so pressing a name looked like it
  // did nothing at fifteen tenants and will be a hundred rows down at a
  // hundred.
  // **11k CHANGED SHAPE WITH THE LAYOUT, 2026-09-06, and the new rule is the
  // stronger one.** The original was written when the whole screen was one
  // column and the open business rendered below the entire list. The rebuild
  // put it BESIDE the list at a desk, and the scroll then fought the layout
  // it was written for — opening a detailer threw the page down past its own
  // figures. So the rule is no longer "scroll to it"; it is "scroll only
  // where it is somewhere else".
  check("11k · the scroll only happens where the panel is not already beside the list",
    /matchMedia\("\(min-width: 1024px\)"\)\.matches/.test(p)
      && /window\.scrollTo\(\{ top: 0/.test(p),
    "at a desk the two columns are both on screen and any scroll is wrong");
  check("11l · but a refresh after an action does not move him",
    /if \(!keepMsg && !window\.matchMedia/.test(p));

  // ─── the door says where it is (F-021) ──────────────────────────────────
  check("11m · the signed-out door names itself",
    /The back office<\/h1>/.test(p));
  // And still never says WHY a signed-in stranger was refused — the 404 rule
  // this file has held since stage 1.
  check("11n · and still tells a signed-in non-admin nothing",
    !/not an admin|permission|platform_admins/i.test(strip(page).slice(
      strip(page).indexOf('status === "denied"'),
      strip(page).indexOf('status === "denied"') + 400)));
}

// ─── 12. THE LAYOUT AND THE MOTION ────────────────────────────────────────
//
// The owner, 2026-09-06, after reading the rebuilt screen:
//
//   *"I wasn't very happy with my admin dashboard of all the detailers and
//   stuff… I want everything to feel very professional and I want the layout
//   to be nice and easy to navigate with like animations and what not."*
//
// **This section exists because the file it guards used to argue the
// opposite in writing.** `admin.css`'s header said the screen was
// "deliberately plain" and that "there is no animation here on purpose —
// nothing on this page is being introduced to anybody", which is a trap any
// internal tool falls into: it treats motion as INTRODUCTION, so a screen
// with an audience of one needs none. Motion's other job is saying where
// something came from, and that job gets harder as a screen gets denser.
//
// A prose decision that has been reversed leaves nothing behind that can
// fail. These checks are what stops the next session restoring the old one
// because the comment sounded reasonable.
console.log("\n12. the layout, and the motion the owner asked for");
{
  const p = strip(page);
  const css = strip(read("app/src/admin/admin.css"));

  // ── LAYOUT ───────────────────────────────────────────────────────────
  // TWO COLUMNS AT A DESK. One 900px column at 1920 is a narrow ribbon with
  // two thirds of the screen empty, and it is what put the open business a
  // hundred rows below the list (F-015).
  check("12a · the list and the open business are a two-column split",
    /\.pa-split \{[\s\S]{0,200}?grid-template-columns: 1fr;/.test(css)
      && /@media \(min-width: 1024px\)[\s\S]{0,300}?\.pa-split \{ grid-template-columns: minmax\(/.test(css));
  check("12b · and the width is the product's own, not a second opinion",
    /max-width: var\(--wrap/.test(css) && !/max-width: 900px/.test(css));
  // ON A PHONE IT IS TWO LEVELS, not one long page. Stacked, the back control
  // undid nothing you could see.
  check("12c · below 1024 the open business replaces the list",
    /@media \(max-width: 1023px\)[\s\S]{0,160}?\.pa-split\.open \.pa-rail \{ display: none; \}/.test(css));
  check("12d · and the split knows when something is open",
    /"pa-split" \+ \(open \? " open" : ""\)/.test(p));
  check("12e · with a way back that only exists where it means something",
    /className="pa-back"/.test(p)
      && /@media \(max-width: 1023px\) \{ \.pa-back \{ display: block; \} \}/.test(css));
  // THE RIGHT-HAND COLUMN IS NEVER BLANK. An empty half-screen reads as a
  // page that failed to load — the same defect the sign-in gate had.
  check("12f · the resting state says what the column is for",
    /className="pa-rest"/.test(p) && /\.pa-rest \{/.test(css));

  // ── MOTION ───────────────────────────────────────────────────────────
  // The product's three kinds, in this file's own spellings. It shares no
  // RULE with theme.css — and that includes not borrowing its keyframe names,
  // which would be a shared rule wearing a different hat.
  for (const [name, why] of [
    ["pa-arrive", "the page's own first paint"],
    ["pa-col-in", "a business opening"],
    ["pa-col-out", "and closing"],
    ["pa-bar-rise", "the bars growing"],
  ]) {
    check(`12g · ${name} exists — ${why}`, new RegExp("@keyframes " + name + "\\b").test(css));
  }
  // **A FALLBACK IS NOT A NEW NUMBER.** The first version of this check read
  // `!/animation:[^;]*\d+ms/` and failed on `var(--t-reveal, 420ms)`, which is
  // the correct spelling — the fallback is what keeps this file readable if a
  // token is renamed. The rule is that no duration exists OUTSIDE a `var()`,
  // so strip the var() calls and there should be no ms left at all.
  const noVars = css.replace(/var\([^()]*\)/g, "TOKEN");
  check("12h · every duration is a token, never a number typed here",
    !/animation(-duration)?:[^;]*\d+ms/.test(noVars),
    (noVars.match(/animation[^;]*\d+ms/g) ?? []).join(" | "));
  // A STAGGER STEP is a per-screen decision, unlike a duration: the design
  // system fixes three durations and deliberately fixes no step.
  check("12h-ii · and the stagger steps are the only bare numbers",
    (css.match(/animation-delay: calc\(var\([^)]*\) \* \d+ms\)/g) ?? []).length >= 3);

  // **THE SWAP CARRIES NO ANIMATION OF ITS OWN.** A whole block changing
  // opacity at once is what a page reload looks like, and it is the exact
  // note the owner rejected on sight in September. The PARTS move.
  check("12i · a swap animates its parts, never the frame",
    /\.pa-swap > \* \{ animation:/.test(css) && !/^\.pa-swap \{[^}]*animation/m.test(css));
  check("12j · and the frame is re-keyed so the swap actually runs",
    /className="pa-swap" key=\{b\.id\}/.test(p));

  // AN EXIT IS A DELAYED UNMOUNT and the duration lives in one place.
  check("12k · closing animates out through the shared hook",
    /useLeaving\(\(\) => setOpen\(null\)\)/.test(p) && /\.pa-col\.leaving \{ animation: pa-col-out/.test(css));
  check("12l · and no second copy of the exit duration",
    !/setTimeout\([^)]*18\d\)/.test(p));

  // ONE DEGRADATION IMPLEMENTATION PER SURFACE — the design system forbids a
  // second `prefers-reduced-motion` block, and `.lite` is the same switch by
  // another name.
  check("12m · reduced motion is handled once",
    (css.match(/@media \(prefers-reduced-motion/g) ?? []).length === 1);
  check("12n · and ?lite=1 rides the same rule",
    /\.lite \.pa-in, \.lite \.pa-col/.test(css));

  // ── THE CHART ────────────────────────────────────────────────────────
  // It is an <svg> because CSS percentage heights could not hold it: twice,
  // every bar collapsed to its 2px floor and the row overflowed its own label
  // by 18px, because a percentage height needs a DEFINITE parent height.
  check("12o · the six-month chart is drawn with explicit coordinates",
    /<svg className="pa-bars"/.test(p) && /viewBox=\{/.test(p));
  check("12p · and no percentage height is left inside it",
    !/pa-bar[^r][\s\S]{0,200}?height: 100%/.test(css));
  // A MONTH WITH NO WORK IS NEVER THE LIT ONE, even when it is this month.
  check("12q · an empty month is not lit", /\.pa-barr\.now\.has \{ fill:/.test(css));
  // AND THE EMPTY MONTHS ARE DRAWN AT ALL — the spine comes from the clock,
  // not from the data, which is what keeps a gap visible.
  check("12r · the spine is built from the calendar, not from the bookings",
    /for \(let i = months - 1; i >= 0; i--\)/.test(strip(read("app/src/lib/adminInsight.js"))));
}

// ─── 13. THE DOOR: WHO YOU ARE, AND WHEN YOU ARE SOMEBODY ELSE ────────────
// ROADMAP 8.2. The owner's report was *"it just kinda logged me in without
// doing anything… that thing was a little glitchy."* It was not a glitch:
// /admin and /app are one origin sharing one Supabase session, so a browser
// that had signed into the dashboard already never saw a sign-in form. The
// gate was right and the ACKNOWLEDGEMENT was missing — no name, no way out,
// and an impersonation that swapped the session in silence and then answered
// *Page not found* when he came back.
//
// **NONE OF THIS IS THE GATE AND NO CHECK HERE MAY IMPLY IT IS.** The gate is
// § 1 to § 6: a `platform_admins` row read under the service role, 404 to
// everybody else. What follows guards the things a browser says about itself,
// and the one that would be a real hole if it were done the obvious way — a
// screenshot script publishing a password for the all-seeing account.
console.log("\n13. the back office's own door (roadmap 8.2)");
{
  const p13 = strip(page);
  const app = strip(read("app/src/App.jsx"));
  const impCode = strip(read("app/src/lib/impersonation.js"));
  const css = read("app/src/admin/admin.css");
  const theme = read("app/src/theme.css");

  // ── IT SAYS WHO YOU ARE, AND LETS YOU STOP BEING THEM ────────────────
  // **THE RENDERING EXPRESSION, NOT THE NAME.** The first version of this read
  // `/state\.me/` over the whole file and passed with the address never drawn:
  // `state.me` is also where it is PUT on the state, two hundred lines up. A
  // check on a variable's name is greenest when the only thing using it is the
  // line that sets it.
  check("13a · the bar prints the signed-in address",
    /\{state\.me && \(/.test(p13) && /\{state\.me\}/.test(p13) && /className="pa-who"/.test(p13));
  check("13a-ii · and the address is the session's own, not a guess",
    /sess\.session\.user\?\.email/.test(p13));
  // **RE-POINTED, NOT RELAXED — ROADMAP 8.18 GAVE THE PRODUCT ONE DOOR.**
  // This used to read the back office's own `supabase.auth.signOut()`; there
  // were three such exits and they each had to remember to drop the note, end
  // the parked accounts and then sign out, which is how the third one quietly
  // stops doing the third. `app/src/lib/signout.js` is the only
  // `auth.signOut(` in `app/src` now, so the assertion follows it there.
  check("13b · there is a sign out",
    /function signOutNow/.test(p13) && /signOutEverything\(\)/.test(p13));
  // THE NOTE GOES FIRST. If the sign-out throws, a surviving note tells the
  // next person on this browser they are impersonating somebody they are not.
  const door = strip(read("app/src/lib/signout.js"));
  const so = door.indexOf("export async function signOutEverything");
  const endAt = door.indexOf("endImpersonation()", so);
  const outAt = door.indexOf("supabase.auth.signOut()", so);
  check("13b-ii · signing out drops the impersonation note before it signs out",
    so >= 0 && endAt > so && outAt > so && endAt < outAt,
    "the note has to be cleared even if the sign-out fails");

  // ── THE 404 IS STILL THE 404 ─────────────────────────────────────────
  // The reason this page answers *Page not found* rather than *you are not an
  // admin* is that naming the gate sends a curious detailer looking for the
  // row. 8.2 added ONE exception and it must stay one.
  check("13c · a signed-in non-admin still gets Page not found",
    /Page not found/.test(p13));
  check("13c-ii · and the only thing that changes it is this browser's own note",
    /const imp = impersonation\(state\.me\)/.test(p13));

  // ── THE NOTE AUTHORISES NOTHING ──────────────────────────────────────
  // It is localStorage in one browser. A detailer who writes one by hand
  // changes what their own screen says and nothing else — so this module must
  // never ask the server anything.
  check("13d · impersonation.js talks to nobody",
    !/fetch\(|supabase|^import /m.test(impCode),
    "a note that can call the server is no longer a note");
  // MATCHED ON THE ADDRESS, NEVER ON A CLOCK. A TTL is a guess about how long
  // somebody looks at a dashboard, and every wrong guess either hides the
  // warning mid-session or follows him back into his own account.
  check("13d-ii · it is believed only while that address is the one signed in",
    /rec\.as === String\(email\)\.toLowerCase\(\)/.test(impCode));
  check("13d-iii · and no session means no note",
    /if \(!email\) return null;/.test(impCode));

  // ── WRITTEN BEFORE THE JUMP ──────────────────────────────────────────
  // After `window.location.href` this browser is somebody else and has no way
  // of knowing it used to be us, so a note written afterwards is never
  // written at all.
  const bi = p13.indexOf("beginImpersonation(");
  const jump = p13.indexOf("window.location.href = r.url");
  check("13e · the note is written before the browser becomes the detailer",
    bi >= 0 && jump >= 0 && bi < jump,
    "beginImpersonation must precede the navigation");

  // ── NOT OFFERED WHERE THE SERVER WILL REFUSE IT ──────────────────────
  // R9's second half: `impersonate` answers 409 when the business has no owner
  // row, which is true of several fixtures and of every business added from
  // this screen before its invite is accepted.
  check("13f · the owner account is looked up before the button is drawn",
    /const ownerMember = detail\?\.members\?\.find/.test(p13));
  check("13f-ii · and the button is disabled without one",
    /disabled=\{busy \|\| !ownerMember\}/.test(p13));
  // **`{!ownerMember && (` APPEARS TWICE** — once over the sentence saying why
  // the button is off, once over the invite that fixes it — so testing for the
  // guard passes with either half deleted. Ask about the invite itself and the
  // guard nearest to it, and assert the OLD guard is gone: an empty members
  // list is not the same question as a business with no owner.
  // COUNTED, because `lastIndexOf` from the invite still finds the OTHER
  // guard when the invite's own is replaced — the two blocks are adjacent, so
  // proximity cannot tell them apart. Exactly two, and the invite present.
  const guards = (p13.match(/\{!ownerMember && \(/g) ?? []).length;
  check("13f-iii · the invite that fixes it is offered by the same test",
    guards === 2
      && p13.includes("Resend the owner's invite")
      && !/detail\.members\.length === 0/.test(p13),
    "saying there is no account and offering no way to make one is half an answer");
  check("13g · the server is still the one that refuses",
    /has no owner account to sign in as/.test(strip(fn)));

  // ── AND THE DASHBOARD SAYS IT TOO ────────────────────────────────────
  // The half of the complaint that lives outside /admin: he lands on somebody
  // else's dashboard, with this product's own chrome around it, and every
  // switch he touches is theirs.
  check("13h · the dashboard draws a strip while impersonating",
    /className="impbar"/.test(app));
  check("13h-ii · from the note, checked against the live session",
    /impersonation\(session\?\.user\?\.email\)/.test(app));
  check("13h-iii · and it carries a way out", /await signOut\(\)/.test(app));
  // **EVERY SIGN-OUT DROPS THE NOTE, not only the two the back office draws.**
  // The gear sign-out is the exit somebody takes when they have forgotten they
  // are impersonating, and a note that outlives its session asserts something
  // that stopped being true. One place, because all three exits route through
  // it. Raised by the item's own security review and fixed rather than filed.
  // ONE PLACE SINCE ROADMAP 8.18: the gear's exit IS `signOutEverything`, so
  // what 13b-ii asserts about that function covers this too. What is left to
  // check here is that the gear still routes through it rather than growing a
  // fourth copy — `tests/two-logins.test.mjs` § 5 fails on any other
  // `auth.signOut(` in `app/src`.
  const ctx = strip(read("app/src/context/BusinessContext.jsx"));
  check("13h-iv · the app's own sign-out goes through that same door",
    /signOut: signOutEverything/.test(ctx),
    "so the note is dropped before the sign-out there too");
  // LAW 11b: the accent is the TENANT'S identity, and this strip exists to say
  // the identity around it is not yours — so it takes the fixed pair.
  const at = theme.indexOf(".impbar {");
  const impbar = at < 0 ? "" : theme.slice(at, at + 900);
  check("13i · the strip is drawn in --bad, never the tenant's accent",
    at >= 0 && /--bad/.test(impbar) && !/var\(--accent/.test(impbar));

  // ── THE ONE THAT WOULD HAVE BEEN A REAL HOLE ─────────────────────────
  // Found 2026-09-07 while doing the rest of this item: two scripts carried a
  // FIXED password for `shoot-admin@detailplatform.com`, created it on the
  // live platform project, added it to `platform_admins` and left it there —
  // in a PUBLIC repository. CLAUDE.md already had the sentence and it had only
  // ever been applied to the demo detailer: *"making demo@… an admin would put
  // every detailer's data behind demo123."*
  // **THE SUBJECT LIST IS "WHAT INSERTS A ROW", NEVER "WHAT MENTIONS THE
  // TABLE".** The first version of this check read the word `platform_admins`
  // and swept in `adversary-probe.mjs`, which names the table precisely
  // BECAUSE it must never be readable — a file failing a security check for
  // testing that same rule. The name is not the deed.
  // **`strip` IS A SQL STRIPPER AND IT SILENTLY ATE THIS LIST.** Its
  // single-quote rule pairs the apostrophe in one string with the apostrophe
  // in another hundreds of lines later, so on a big .mjs file it deletes the
  // code in between — `seed-demo.mjs` dropped out of the subject list
  // entirely and every check below passed by never seeing it. Comments only,
  // for JavaScript.
  const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const scripts = readdirSync("scripts").filter((f) => f.endsWith(".mjs"));
  const inserts = scripts.filter((f) => /rest\/v1\/platform_admins/.test(stripJs(read(`scripts/${f}`))));
  check("13j · the check has subjects — some script does create an admin",
    inserts.length > 0,
    "with nothing to read, every check below passes by having no subjects");
  // NOT A REGRESSION CHECK ON THE LEAKED STRING ITSELF: the only copy left is
  // the sentence in `admin-account.mjs` explaining what happened, so a check
  // for the string would fail on its own write-up. That is the comment-vacuity
  // trap this file has already been bitten by twice, from the other side.
  // The rule is about the SHAPE — a password that came out of the file.
  const madeUp = (f) => /crypto\.randomUUID\(\)|Math\.random\(\)/.test(stripJs(read(`scripts/${f}`)));
  for (const f of inserts) {
    check(`13k · ${f} generates the password it uses, never writes one down`, madeUp(f));
  }
  // AND A TEMPORARY ADMIN DOES NOT SURVIVE THE RUN. A standing all-seeing
  // account between runs is the same risk with a password nobody has typed
  // yet. The subject here is anything driving a browser at /admin.
  const temps = scripts.filter((f) => /makeAdmin\(/.test(stripJs(read(`scripts/${f}`))) && f !== "admin-account.mjs");
  check("13l · the check has subjects — something does sign in at /admin",
    temps.length >= 2, `found: ${temps.join(", ") || "none"}`);
  for (const f of temps) {
    check(`13l-ii · ${f} removes the admin it made`, /dropAdmin\(/.test(stripJs(read(`scripts/${f}`))));
  }
  // **THE ONE DELIBERATE EXCEPTION IS WRITTEN DOWN RATHER THAN SILENT.**
  // `seed-demo.mjs --platform-admin` leaves a standing account on purpose —
  // it is opt-in, its password is random and lands only in the gitignored
  // refs file, and P-12 is the item that deletes it. An exemption nobody can
  // see is how the next one gets added beside it.
  check("13l-iii · the one admin that is meant to persist says so on its own row",
    /delete it before launch|delete before launch/i.test(read("scripts/seed-demo.mjs")));
  // The teardown never throws, because it runs where a throw would replace the
  // real failure with itself.
  check("13m · the teardown cannot become the error",
    /export async function dropAdmin[\s\S]*?try \{[\s\S]*?\} catch/.test(read("scripts/admin-account.mjs")));
  // AND THE ONE ACCOUNT THAT BELONGS TO A REAL PERSON IS NEVER GIVEN A
  // PASSWORD BY US — the owner's own instruction for this item.
  const add = strip(read("scripts/platform-admin-add.mjs"));
  check("13n · adding a real admin never sets or resets their password",
    !/method: "PUT"/.test(add) && /auth\/v1\/recover/.test(add),
    "an existing account must be left exactly as it is");

  // The identity line is its own row rather than a third button: an email is
  // the one string here that cannot be shortened without lying, and 320 is
  // where the two controls opposite it already wrap.
  check("13o · the address is set as prose, not as a tracked-out label",
    /\.pa-who \{[\s\S]*?letter-spacing: 0;[\s\S]*?text-transform: none;/.test(css));
  check("13o-ii · and it can break rather than push the bar sideways",
    /\.pa-who \{[\s\S]*?overflow-wrap: anywhere;/.test(css));
}

// ─── 14. THE EMAIL SAFETY NET ─────────────────────────────────────────────
// ROADMAP 8.6. Two asks, one subsystem.
//
// **R1:** *"a tracker inside my dashboard that shows me how many emails get
// sent a day, and gives me warnings when we're getting close to that hundred
// a day limit — and then I'll update and say okay, upgrade it, and then don't
// give me this warning again."* **Nothing counted sends.**
//
// **R2, and he believed it already worked:** *"I'll get an email if someone
// signs up and whatnot. I hope you set that all up."* **Nothing in this
// product emailed him about anything.**
//
// **THE CAP HAS ALREADY BITTEN ONCE AND THAT IS WHY THIS IS NOT DECORATION.**
// Resend's free plan is 100 emails a day ACROSS EVERY TENANT and the
// transactional set spends about five a booking, so the platform's
// twenty-first booking of the day is refused — testing-loop F-025, where the
// 429 was read as *this address is wrong* and real customers were stamped
// `email_failed_at` permanently, which `send-campaign` then enforces.
console.log("\n14. the email safety net (roadmap 8.6)");
{
  const mig = read("supabase/migrations/20260907000300_email_safety_net.sql");
  const send = strip(read("supabase/functions/send-email/index.ts"));
  const admin = strip(read("supabase/functions/platform-admin/index.ts"));
  const page = strip(read("app/src/admin/AdminPage.jsx"));
  const cb = strip(read("supabase/functions/create-business/index.ts"));
  const tpl = strip(read("supabase/functions/_shared/emailTemplates.ts"));

  // ── THE COUNT IS ONE STATEMENT ────────────────────────────────────────
  // A read-then-write from the edge function drops one of any two concurrent
  // sends, and the entire value of this number is being trusted near a limit.
  check("14a · the day's count is a single atomic upsert",
    /insert into public\.platform_email_days[\s\S]{0,400}on conflict \(day\) do update/.test(mig)
      && /sent\s+= platform_email_days\.sent\s+\+ excluded\.sent/.test(mig));
  // UTC, because that is the clock the provider's cap runs on. Counting in
  // the owner's timezone prints a number that disagrees with Resend's at the
  // exact hours the warning matters.
  check("14a-ii · and the day is UTC, like the provider's cap",
    /\(now\(\) at time zone 'utc'\)::date/.test(mig)
      && /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(admin));
  // Nothing with a user's token has any business reading how much mail the
  // platform sends. Same posture as `platform_admins`: forced, no policies.
  check("14a-iii · the table is forced RLS with no policies at all",
    /alter table public\.platform_email_days force row level security/.test(mig)
      && !/create policy[^;]*platform_email_days/i.test(mig));
  check("14a-iv · and the counter is service-role only",
    /revoke all on function public\.note_email_send\(boolean\) from public, anon, authenticated;/.test(mig));

  // ── IT IS COUNTED AT THE ONE CHOKE POINT ──────────────────────────────
  // `send-email` is the single door every email in the product goes through.
  // Counting anywhere else is counting some of them.
  check("14b · both outcomes are counted, at the send",
    /await note\(true\)/.test(send) && /await note\(false\)/.test(send));
  // **THE REFUSAL IS THE HALF THAT PREDICTS THE PROBLEM.** The 429 F-025
  // mis-read is a FAILED send, and a day whose failures are climbing is a day
  // already past the cap.
  const okAt = send.indexOf("await note(true)");
  const failAt = send.indexOf("await note(false)");
  check("14b-ii · the refusal is counted before the error is returned",
    failAt > 0 && failAt < send.indexOf("Failed to send email", failAt));
  check("14b-iii · and the success after the address is cleared",
    okAt > 0 && okAt > send.indexOf("markAddress(business_id, to, null)"));
  // A COUNTER MUST NEVER FAIL A SEND. The whole product's rule about email is
  // that a booking never fails because an email did; a counter is one step
  // further from the booking than that.
  check("14b-iv · counting can never fail a send",
    /const note = async \(ok: boolean\) => \{[\s\S]{0,200}try \{[\s\S]{0,160}catch/.test(send));

  // ── THE OWNER SEES IT, AND IT WARNS BEFORE THE LIMIT ──────────────────
  check("14c · the back office is handed today's count and the cap",
    /email: \{[\s\S]{0,200}cap: ps\?\.email_daily_cap \?\? 100/.test(admin));
  check("14c-ii · and the screen prints it beside the other silent limits",
    /Emails: \$\{state\.email\.sent\} of \$\{state\.email\.cap\} today/.test(page));
  // **AT FOUR FIFTHS, NOT AT THE LIMIT.** A warning that arrives AT the cap is
  // a warning about emails that have already failed.
  check("14c-iii · it goes red before the cap, not at it",
    /state\.email\.sent >= state\.email\.cap \* 0\.8 \? "pa-bad"/.test(page));
  // **AND THE WAY TO SILENCE IT IS TO RAISE THE CAP** — his own sentence read
  // literally. A dismiss flag silences a true statement and leaves the next
  // busy Saturday exactly where F-025 found it.
  check("14c-iv · the cap is a stored number, so raising it is the answer",
    /email_daily_cap integer not null default 100/.test(mig)
      && !/dismiss/i.test(page.slice(page.indexOf("state.email"), page.indexOf("state.email") + 900)));

  // ── R2: SOMEBODY SIGNED UP ────────────────────────────────────────────
  check("14d · a signup emails the owner",
    /platformAlertEmail\(/.test(cb) && /kind: "New detailer"/.test(cb));
  // **NOT `platform_admins.email`.** Who may open the back office and who
  // wants to hear about a signup are different questions, and the admin login
  // is deliberately a throwaway today.
  check("14d-ii · to platform_settings.owner_email, not to an admin row",
    /select\("owner_email"\)/.test(cb) && !/platform_admins/.test(cb));
  // BEST-EFFORT AND LAST. A signup must never fail because a notification did.
  check("14d-iii · and it can never fail the signup",
    /try \{[\s\S]{0,1400}could not send the signup alert[\s\S]{0,40}\}/.test(cb));
  // A GUARD THAT SKIPS MUST PRINT. A feature that is switched off looks
  // exactly like a feature that is quiet.
  check("14d-iv · and the screen says when nobody is being told",
    /NOBODY is being emailed about signups/.test(page));

  // ── ONE TEMPLATE, NOT ONE PER EVENT ───────────────────────────────────
  // A signup, a first payment and 8.12's dead-man's switch are the same
  // shape. Twelve near-identical templates is how the set drifts.
  check("14e · the alert is one template the caller words",
    /export function platformAlertEmail\(brand: TenantBrand, a: PlatformAlertData\)/.test(tpl));
  check("14e-ii · and it is rendered with the other twenty-five",
    /platform-new-detailer/.test(read("scripts/render-emails.mjs")),
    "this script is the only thing in the repo that has ever LOOKED at an email");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
