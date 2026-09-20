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

let passed = 0, failed = 0, skipped = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};
// A GUARD THAT SKIPS MUST PRINT — this repo’s most repeated failure is a
// skipped check reading exactly like a passing one. Counted separately so the
// suite's SIZE stays visible: 130 passed is a different fact from 130 passed
// with seven of them never run.
const skip = (name, why) => { skipped++; console.log(`  SKIP  ${name}\n        ${why}`); };

// ══ THE HOLLOW-PASS GUARD ═══════════════════════════════════════════════════
//
// **A NEGATIVE ASSERTION IS SATISFIED BY AN EMPTY FILE**, and until 2026-09-13
// every one in this suite was. MEASURED: every `read()` in this file replaced by
// `() => ""` and the suite re-run — **20 checks stayed green against nothing at
// all**, seventeen of them pure absence claims. That is the same disease as the
// `strip` bug in the same night, one level up: the bug was a mangled file, and
// what let it live for weeks was a suite that could not tell a mangled file from
// a clean one.
//
// **AND NO AGGREGATE GUARD CAN REPLACE THIS.** The obvious fix — fail if `strip`
// removes more than some share of a file — was measured and abandoned: the FIXED,
// comments-only strip legitimately removes **83% of `signout.js`, 78% of
// `impersonation.js` and 73% of `App.jsx`**, because this repo comments that
// heavily. No survival ratio can separate "that was all comments" from "that was
// the comments and the code", so the subject has to be named per check.
//
// So a negative assertion states an ANCHOR: something that MUST be present for
// the absence to mean anything. A missing anchor is reported as a missing
// subject, which is a failure — never a silent pass.
const absent = (name, hay, re, anchor, detail = "") =>
  anchor.test(hay)
    ? check(name, !re.test(hay), detail)
    : check(name, false,
        `NO SUBJECT: ${anchor} is not in what was read, so the absence of ${re} proves nothing`);

// Comments AND single-quoted SQL strings. The second half was added after
// this file failed on its OWN migration: a `comment on column ... is '…'`
// whose text reads "never in get_public_business_profile, never selected"
// mentions both names in one literal, so a comment-only strip left the
// documentation of a rule looking exactly like a violation of it.
// COMMENTS OUT, NOTHING ELSE. Read the paragraph below before adding to this.
const strip = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*(\/\/|--).*$/gm, "")
;

// THE SQL FORM KEEPS THE SECOND HALF, and it was added after this file failed
// on its OWN migration: a `comment on column ... is '...'` whose text reads
// "never in get_public_business_profile, never selected" mentions both names
// in one literal, so a comment-only strip left the documentation of a rule
// looking exactly like a violation of it.
//
// **AND THAT RULE IS FOR SQL ONLY - FOUND 2026-09-13, AND IT - FOUND 2026-09-13, AND IT
// HAD BEEN SILENTLY DELETING MOST OF EVERY OTHER FILE THIS SUITE READS.**
//
// `strip` used to end with that rule, which blanks a SQL string literal and
// its doubled-quote escape. Pointed at a migration it is right. Pointed at
// JSX, TypeScript or CSS it pairs an apostrophe in ordinary prose - owner's,
// detailer's, don't - with the next apostrophe ANYWHERE in the file and
// deletes everything between them, code included.
//
// Measured before the fix: AdminPage.jsx 73,108 characters -> 41,651 (57%
// survived), admin.css 62%, platform-admin/index.ts 49%, emailTemplates.ts
// **25%**. Check 14e asserted a function signature that is present on line
// 1213 of emailTemplates.ts and was reading a file that no longer had it.
//
// **THIS IS THE PROVE-YOUR-INSTRUMENT RULE AT THE SCALE OF A WHOLE SUITE.**
// Every stripped check in this file was asserting against a mangled file, so
// a red one said nothing about the product. Migrations keep the old
// behaviour under its own name.
const stripSql = (s) => strip(s).replace(/'(?:''|[^'])*'/g, "''");
// **`PA_MUT` IS HOW THIS SUITE GETS BASELINED WITHOUT WRITING IN ANOTHER LANE
// — added 2026-09-13.** `docs/BAR.md` says break a check on purpose before
// believing it, and every subject this file reads lives under `app/src`, which
// is lane B's. Editing those files to prove a check can fail is a lane breach
// AND trap (f) — a measurement taken while somebody else is building. So
// `PA_MUT` is a JSON map of `path -> replacement path`: copy the real file to
// the scratchpad, break it there, and point the suite at the copy for one run.
// Empty by default, so a normal run reads the real tree and this costs nothing.
const MUT = process.env.PA_MUT ? JSON.parse(process.env.PA_MUT) : {};
const read = (p) => readFileSync(MUT[p] ?? p, "utf8");

const MIGRATIONS = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql"));
const fn = read("supabase/functions/platform-admin/index.ts");
const page = read("app/src/admin/AdminPage.jsx");
const mig = read("supabase/migrations/20260906001000_platform_admin.sql");

// ─── 1. NO POLICY ANYWHERE GRANTS CROSS-TENANT READ ───────────────────────
console.log("\n1. row-level security still says 'one business, always'");
{
  let offenders = [], policies = 0;
  for (const f of MIGRATIONS) {
    const sql = stripSql(read(`supabase/migrations/${f}`));
    // A policy body that mentions the admin check at all. There is exactly one
    // legitimate place for `is_platform_admin()` — its own definition — and it
    // is a `create function`, not a `create policy`.
    for (const m of sql.matchAll(/create\s+policy[\s\S]*?;/gi)) {
      policies++;
      if (/is_platform_admin|platform_admins/i.test(m[0])) offenders.push(`${f}: ${m[0].slice(0, 90)}`);
    }
  }
  check("NO POLICY MENTIONS THE ADMIN CHECK", offenders.length === 0 && policies > 40,
    offenders.join("\n        ") || `only ${policies} policy statements found — the loop had nothing to inspect`);
  // **COUNT THE STATEMENTS, NOT THE FILES — CORRECTED 2026-09-13.** This counted
  // migration FILES, which exist whatever is inside them, so it stayed green
  // through the night `strip` was deleting half of every file it touched. The
  // subject of the check above is a `create policy` statement, so that is what
  // has to be counted.
  check("...and the migrations were actually read",
    MIGRATIONS.length > 20 && policies > 40,
    `${MIGRATIONS.length} migration files, ${policies} create-policy statements — either being small means the loop above proved nothing`);

  // The admin tables themselves must have NO policies at all. With RLS forced
  // and no policy, `authenticated` can neither read nor write them by any
  // query — so a detailer cannot discover who the admins are, cannot make
  // themselves one, and cannot forge or delete an audit row.
  const s = stripSql(mig);
  for (const t of ["platform_admins", "platform_admin_events"]) {
    check(`${t} has RLS forced`, new RegExp(`alter table public\\.${t}\\s+force\\s+row level security`, "i").test(s));
    absent(`${t} has NO policy, which is the strongest statement available`,
      s, new RegExp(`create policy[^;]*on public\\.${t}`, "i"),
      new RegExp(`create table if not exists public\\.${t}`, "i"));
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
  absent("no role claim is trusted", f, /app_metadata|user_metadata|user\.role|jwt\.role/,
    /supabase\.auth\.getUser\(token\)/,
    "a claim is signed by GoTrue and can be stale for an hour after it is revoked");
  absent("no environment variable is the gate", f, /Deno\.env\.get\("ADMIN|ADMIN_EMAIL|IS_ADMIN/,
    /from\("platform_admins"\)/,
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
    // **RE-POINTED 2026-09-13, NOT RELAXED.** The back office was rebuilt
    // (a3e35d5, aff33a0, 28e7ae3) and its status moved from a `state` object
    // to a `useState` local, so `status: "anon"` stopped being how the screen
    // spells it while the branch itself never moved. Trap (k): a check that
    // names a spelling is coupled to the spelling, not the behaviour.
    /setStatus\("anon"\)/.test(page) && /getSession\(\)[\s\S]{0,400}setStatus\("anon"\)/.test(page),
    "a 401 drew \"Something went wrong\" and left the owner with no way in");
  // **SCOPED TO THE BRANCH, NOT MEASURED IN CHARACTERS.** This was
  // `"denied"[\s\S]{0,400}Page not found` and roadmap 8.2 pushed the two 500
  // apart by adding the impersonation case between them — a check that went
  // red on a change that did exactly what it guards. A proximity window is a
  // check whose colour depends on how much prose sits inside the branch.
  // **AND THE WORDS MOVED INTO A COMPONENT, WHICH IS BETTER AND WHICH THE
  // CHECK BELOW NOW ASSERTS.** The rebuilt screen renders `<NotFound />` - the
  // product's ONE 404 page, the same one the router serves for any unknown
  // address - rather than repeating the sentence inline. So it reads the
  // branch for that component and then reads the component itself. Asserting
  // the shared component instead of the string is the whole of trap (k).
  check("2b-ii · and a signed-in non-admin still gets the product's 404 page",
    /if \(status === "denied"\) return <NotFound \/>/.test(page)
      && /import NotFound from "\.\.\/screens\/NotFound\.jsx"/.test(page),
    "the two refusals answer different questions and must not collapse");
  check("2b-ii-b - and that page really is the not-found page",
    /export default function NotFound/.test(read("app/src/screens/NotFound.jsx")),
    "without this, the check above passes on a component named NotFound that says anything at all");
  // ONE MESSAGE FOR BOTH HALVES. Saying which of the email or the password
  // was wrong is address enumeration with a friendly face — the same rule
  // the password-reset screen follows.
  // **ALSO SCOPED, AND FOR A SHARPER REASON:** the words this forbids are
  // ordinary English. Read against the whole file it failed on *"there is no
  // account to open their dashboard as"* — a sentence about a BUSINESS with
  // no owner row, nowhere near a sign-in form. A rule about what one form
  // says has to be read against that form.
  // **SCOPED TO `doorErr`, NOT TO THE STATUS BRANCH - RE-POINTED 2026-09-13.**
  // The rebuilt screen SETS the sign-in error at line 254 and RENDERS the anon
  // branch at 260, so a slice between the two status branches no longer
  // contains the sentence it is about and the check went red on copy that is
  // exactly right. `doorErr` is the sign-in door's own error state and it
  // brackets both halves.
  const gate = page.slice(page.indexOf("const [doorErr"),
    page.indexOf('status === "denied"'));
  check("2b-iii · a failed sign-in does not say WHICH half was wrong",
    /That email and password do not match/.test(gate)
      && !/(no account|unknown email|wrong password)/i.test(gate));

  check("and the SCREEN says the same thing", /<NotFound \/>/.test(page),
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
  // **DELETED 2026-09-13 — A CHECK AGAINST A DESIGN ANDREW REPLACED, NOT A
  // DROPPED CAPABILITY.** It asserted a browser confirm saying the look was
  // "written down". Impersonation no longer swaps the session: it opens a
  // /preview tab that keeps its own session in its own drawer, and
  // AdminPage.jsx quotes him asking for exactly that — *"I don't even wanna be
  // signing in as someone to view their dashboard"* — beside the comment "No
  // warning, because there is nothing left to warn about."
  // **THE SERVER HALF IS UNTOUCHED AND IS WHAT THIS SECTION IS FOR:** the two
  // checks above still hold that the action LOGS BEFORE IT ACTS and that a
  // FAILED LOG STOPS IT. Retiring the warning does not retire the record.
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
  absent("NOT ONE supabase.from() ON THE ADMIN SCREEN", p, /supabase\.from\(/,
    /supabase\.auth\.getSession\(\)/,
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
  let leaks = [], seen = 0;
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${e.name}`;
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(jsx?|mjs)$/.test(e.name)) continue;
      if (full.includes("/admin/")) continue;      // the back office may
      const body = strip(read(full));
      if (body.trim()) seen++;
      if (body.includes("admin_notes_platform")) leaks.push(full);
    }
  };
  walk("app/src");
  check("NO DETAILER-FACING FILE READS admin_notes_platform",
    leaks.length === 0 && seen > 80, leaks.join(", ") || `only ${seen} files had any content`);
  // **COUNT WHAT WAS READ, NOT WHAT WAS LISTED — CORRECTED 2026-09-13.** This
  // read `readdirSync("app/src").length > 5`, which counts DIRECTORY ENTRIES.
  // Those exist whatever the files contain, so gutting every file left this
  // guard green and the leak-hunt above green with it. The subject is a file
  // with text in it.
  check("...and the walk actually looked at something",
    seen > 80, `${seen} non-empty files walked — an empty walk finds no leaks either`);
  // The public profile is the other way it could escape — it is a
  // `security definer` function, so it bypasses RLS entirely.
  // AND STRIPPED HERE TOO: the platform-admin migration mentions BOTH names in
  // one comment — "never in get_public_business_profile" — which made it its
  // own counter-example.
  const profile = MIGRATIONS.filter((f) => stripSql(read(`supabase/migrations/${f}`)).includes("get_public_business_profile"));
  // AND `profile` HAS TO HAVE FOUND SOMETHING: `[].every()` is true, so an
  // empty list of versions passes this while proving nothing at all.
  check("it is in no version of the public profile",
    profile.length >= 1
      && profile.every((f) => !stripSql(read(`supabase/migrations/${f}`)).includes("admin_notes_platform")),
    profile.join(", ") || "no migration defines get_public_business_profile — nothing was inspected");
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

  // **`no chart` IS DELETED, 2026-09-13, AND IT IS THE ONE CHECK IN THIS FILE
  // THAT COULD NEVER BE SATISFIED.** It asserted that `AdminPage.jsx` contains
  // no chart — *"fewer than ten customers means every trend line is noise"* —
  // while checks `11h`, `11h-iv`, `12o`, `12q` and `12r` in this same file all
  // assert that a SIX-MONTH BAR CHART is drawn on that same page, with the
  // detailer's own months and an unlit empty month. Both cannot hold. The
  // spec moved: the chart was specified and built after this line was written,
  // and nobody came back for it, so it sat red as one of the 49.
  //
  // **A check that contradicts five of its own neighbours is not a finding
  // about the product, it is a finding about the suite** — and leaving it in
  // costs more than the coverage it never had, because a permanently red check
  // is what teaches people to stop reading the output.
  absent("no second permission system for admins", strip(fn), /admin_role|adminPermissions/,
    /from\("platform_admins"\)/,
    "there is one admin; a lattice for a table with one row is what 2.13 refused for 'team'");
  absent("no refunds or card handling — Stripe's dashboard is better at those",
    strip(fn), /refund|dispute|card_number/i, /action === "/,
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
  // **RE-POINTED 2026-09-13 — THE STRIP IS GONE AND THE TILES REPLACED IT.**
  // `<header className="pa-strip">` held one lead figure and six `.pa-num`
  // companions across the top of a one-screen back office. That screen is five
  // TABS now, and Today ENDS with `.pa-tiles` — five equal `<Tile>`s under
  // "Where the business stands", deliberately last and deliberately flat. The
  // file says why in as many words: *"THE NUMBERS, LAST AND FEW... cut to the
  // ones that mean something on their own."*
  const tileAt = p.indexOf('<div className="pa-tiles"');
  const tileBlock = tileAt < 0 ? "" : p.slice(tileAt, p.indexOf("</div>", tileAt));
  const figures = (tileBlock.match(/<Tile /g) ?? []).length;
  check("the check has figures to count — the tile block was found", tileBlock.length > 200);
  // **THE CEILING IS WHAT SURVIVES THE REBUILD, AND IT IS THE HALF WORTH
  // KEEPING.** A run of figures stops being read somewhere around eight, and
  // "show me everything" taken literally is the wall of fields
  // `docs/platform-admin-audit-2026-09-06.md` warns against in its first
  // paragraph. The exact count was never the property; the budget was.
  //
  // **`and exactly one of them is the lead` WAS DELETED RATHER THAN SOFTENED.**
  // It asserted a HIERARCHY — one lead figure against the ground, six in a
  // ruled row — and the rebuild flattened it to five equal tiles on purpose.
  // A check against a replaced design either goes red for ever or gets watered
  // down until it cannot fail, and the second is worse.
  check("no more than eight figures in one run",
    figures > 0 && figures <= 8, `${figures} figures`);
  // **ONE OF THE TWO SURVIVED THE REBUILD AND ONE DID NOT — 2026-09-13, and
  // the dead half is RECORDED rather than asserted.** The money that went
  // THROUGH the platform is still printed twice, on Today and on Money. The
  // platform-wide finished-jobs figure is on no tab at all, and
  // `platform-admin/index.ts:430` still computes `totals.jobs_month` for
  // nobody — a server field with no reader. That is Andrew's own cut, not a
  // regression, so this asserts what is true and the dead field is named in
  // `docs/lane-b-handover-2026-09-13.md` instead of being asserted back.
  // **SILENTLY BROKEN BY ROADMAP 10.2, 2026-09-20 — pinned the prose, not the
  // fact.** The copy condensation changed both tabs' sentences from "went
  // through" to "passed through", which is the wording this check happened
  // to name rather than the property it was written to guard: the same
  // platform-wide revenue figure, on both Today and Money. Re-pointed at the
  // figure itself, scoped to each tab's own function, so the next copy pass
  // can reword the sentence around it without going red again.
  const nowSection = p.slice(p.indexOf("function TabNow"), p.indexOf("function TabGrowth"));
  const moneySection = p.slice(p.indexOf("function TabMoney"));
  check("the platform's own takings are still on the screen",
    /money\(totals\.revenue_month/.test(nowSection) && /money\(totals\.revenue_month/.test(moneySection),
    "the tiles answer 'how is my company doing'; this one answers 'is it carrying work'");

  // **"NO CHART STILL HOLDS" USED TO BE HERE AND IT DOES NOT HOLD — 2026-09-13.**
  // The reasoning was *below ten customers every trend line is noise*, and it
  // was written about the platform-wide STRIP. A six-month per-business bar
  // chart was specified and built afterwards, and `11h`, `11h-iv`, `12o`, `12q`
  // and `12r` all guard it. The `no chart` check that sat here asserted the
  // opposite of five of its own neighbours and has been deleted.
  //
  // A comment restating a retired check is the next session's evidence that the
  // check was right, so it goes when the check goes.
}

// ─── 8. Stage 3: the site columns ─────────────────────────────────────────
// The spec's one product-specific column — *do they have one, what is its
// address, is a custom domain pointed at it, when was it last touched.* Three
// of those four are the platform's own record of work done OUTSIDE this
// product, which is what every check here is about: a record its subject can
// edit, or a date its subject can type, is not a record.
console.log("\n8. their site");
{
  const site = stripSql(read("supabase/migrations/20260906002000_site_columns.sql"));
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
  absent("the site action never writes `business_domains`",
    f, /action === "site"[\s\S]{0,900}business_domains/, /action === "site"/,
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
  const mig = stripSql(read("supabase/migrations/20260906005000_export_business.sql"));
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

  // **RE-POINTED 2026-09-13, AND IT IS STILL RED BECAUSE THE DEFECT IS REAL —
  // a different one from the defect it was written for.**
  //
  // The old `msg`/`keepMsg` pair went with the screen that had it, so a
  // confirmation wiped in the same tick can no longer happen: there is no
  // confirmation. What replaced it is worse and is live today. `TabWho` holds
  // the open detailer as `open`, a SNAPSHOT of the row object taken at
  // `setOpen(r)`, and `act()` awaits `reload()` — which refreshes `rows` in the
  // PARENT and never re-points `open` at the new row. **Press Suspend, confirm
  // it, and the panel still says they are live and still offers Suspend.** The
  // `detail` fetch is worse again: its effect keys on `[open]`, which did not
  // change, so it is never re-read either. Nothing on the screen says the
  // action worked, and the one thing that could have — the state itself — is
  // the stale copy.
  //
  // **SOURCE TEXT IS THE ONLY INSTRUMENT THIS REPO HAS FOR A REACT SCREEN**,
  // so this pins a SHAPE rather than a computed value, which is trap (k) and is
  // said out loud here rather than pretended away: the open detailer has to be
  // looked up out of `rows` rather than carried by value. An id-keyed fix and a
  // re-pointing fix both satisfy it; nothing that leaves the snapshot does.
  // Lane B owns it — `docs/lane-b-handover-2026-09-13.md`.
  check("9i · the open detailer is re-read after an action, not left on a snapshot",
    /setOpen\(/.test(p) && /rows\.find\(/.test(p),
    "AdminPage.jsx:994 holds the row by value; reload() refreshes rows and never re-points open, so Suspend leaves the panel saying the detailer is live");
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
  // RE-POINTED 2026-09-13: the rebuild moved this onto the Plumbing tab and
  // renamed everything. The heartbeats are mapped straight off `state`, and the
  // dot's two states are `pa-bad` / `pa-ok` — the property is that EVERY job
  // the server reports gets a row and a colour, not what the colour is called.
  check("10g · and the screen prints it either way",
    /\(state\?\.heartbeats \?\? \[\]\)\.map\(/.test(p)
      && /pa-bad" : "pa-ok"/.test(p));
  // A job that has never reported is what a dropped table looks like too, so
  // `null` has to fall on the BAD side of the comparison rather than skipping
  // it. RE-POINTED: `if (!beat) return true` became one expression.
  check("10h · a job that has never reported counts as stale",
    /const bad = m === null \|\| m > limit;/.test(p));
  // AND THE WINDOW IS THE ROW'S. Roadmap 8.12 moved it out of this screen
  // because the emailer needed the same number, and two copies of a threshold
  // is how a screen says a job is fine while the alarm is going off.
  // RE-POINTED 2026-09-13: the loop variable was renamed `beat` -> `h` in the
  // rebuild. The rule is that the number comes off the ROW, so the assertion
  // is the column, not whose local holds it.
  check("10h-ii · and the staleness window comes from the row, not this file",
    /\.stale_after_seconds/.test(p) && !/45 \* 60_?000/.test(p));
  // `ago()` bottoms out at "today", which says nothing about a job that runs
  // every fifteen minutes — "Reminders LAST RAN today" is what the first
  // version printed. `shortAgo()` is the rebuild's answer and the unit half of
  // this claim survives: minutes under an hour, hours under two days.
  check("10i · in minutes and hours, not \"today\"",
    /return `\$\{m\} min ago`/.test(p)
      && /hour/.test(p)
      && /\{shortAgo\(h\.ran_at\)\}/.test(p));
  // **AND THE PLURAL GUARD DID NOT SURVIVE IT — RED ON PURPOSE, 2026-09-13.**
  // The old check pinned `hour${h === 1 ? "" : "s"} ago`, which was the guard
  // itself. `shortAgo()` replaced it with a bare `${Math.round(m / 60)} hours
  // ago`, so **any job that last ran between 60 and 89 minutes back reads
  // "1 hours ago"** — and that band is exactly where the reminder sweep sits
  // when it has stopped, because its own staleness window is 45 minutes. The
  // string Andrew is most likely to read on a broken job is the ungrammatical
  // one. Same family as "1 visits", which CLAUDE.md already names once.
  //
  // AND IT IS NOT ONLY `shortAgo`. `ago()` has the same hole twice: 30 to 44
  // days reads "1 months ago" and 365 to 547 days reads "1 years ago", both on
  // the Detailers list and in the open panel's "Last booking" row. Lane B owns
  // all three — `docs/lane-b-handover-2026-09-13.md`.
  check("10i-ii · and one of anything is never printed with an s",
    !/\$\{Math\.round\(m \/ 60\)\} hours ago/.test(p)
      && !/\$\{Math\.round\(d \/ 30\)\} months ago/.test(p)
      && !/\$\{Math\.round\(d \/ 365\)\} years ago/.test(p),
    "AdminPage.jsx shortAgo() and ago() round to 1 and then append a plural: '1 hours ago', '1 months ago', '1 years ago'");
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
  // RE-POINTED 2026-09-13: `pa-tag` became `pa-flag` and the count moved out of
  // the headline into one sentence under the list. **The property is unchanged
  // and is the whole point of both** — a fixture is marked where it is read,
  // and the number left out of every other count is stated once in words.
  check("11f · a demo row is tagged in the list",
    /r\.is_demo && <span className="pa-flag">demo<\/span>/.test(p));
  // **SILENTLY BROKEN BY ROADMAP 10.2, 2026-09-20 — pinned the exact prefix
  // text, not the three facts that matter.** The condensation inserted ",
  // including " before the count so the sentence reads as one line instead of
  // two; the backtick-then-interpolation sequence this regex demanded no
  // longer exists even though the count, the label and the "left out" clause
  // all still do. Re-pointed at those three independently.
  check("11g · and the screen says how many were left out",
    /\$\{totals\.demo\}/.test(p)
      && /demo or test row/.test(p)
      && /left out of every count elsewhere/.test(p));

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
      // THE FOURTH ARGUMENT IS THE POINT, not the name of the row holding it:
      // the rebuild renamed `b` -> `row`. What must hold is that a timezone
      // off the BUSINESS is passed at all.
      && /monthlySeries\(detail[\w?.]*\.bookings, 6, new Date\(\), \w+[?.]*\.timezone\)/.test(page));
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
  //
  // **F-016 IS BACK, ON THE DETAILERS LIST, AND IT IS THE SAME TWO LINES ONE
  // INCH APART — RE-POINTED AND STILL RED, 2026-09-13.** The rebuild got the
  // open panel right (`<Row k="Finished this month" ...>`) and dropped the word
  // from the list row, which now prints `{r.jobs_month} jobs this month`
  // directly under a sentence reading `Booking · last one today`. The number
  // counts COMPLETED jobs — `platform-admin/index.ts:271` is `monthJobs.length`
  // off `done` — so a detailer with work booked for next week and nothing
  // finished yet reads "0 jobs this month, last one today". Both true, and
  // together they read as a broken screen.
  //
  // **ONE WORD, IN THE LIST ROW.** Lane B — `docs/lane-b-handover-2026-09-13.md`.
  // The anchor is the panel row, which proves the file was read even while the
  // list row is wrong.
  check("11i · the jobs figure says the jobs are finished ones, in BOTH places",
    /Finished this month/.test(p)
      && /r\.jobs_month === 1 \? "finished job" : "finished jobs"/.test(p),
    "AdminPage.jsx:1074 prints '{r.jobs_month} jobs this month' under 'Booking · last one today'");

  // ─── the photo line stops contradicting itself (F-017) ──────────────────
  // "10 MB each for 15 detailers · 154 MB promised" — two independent
  // roundings of the same arithmetic, printed side by side. Under the ceiling
  // the promised figure is exactly share x businesses and says nothing new;
  // over it, it is the whole point.
  // RE-POINTED 2026-09-13: the comparison was lifted into `overPromised`, so
  // BOTH halves are asserted — the condition is the right one, and the sentence
  // hangs off it rather than printing unconditionally.
  check("11j · the promised total is printed only when it is over the ceiling",
    /const overPromised = !!\(store\?\.total_bytes && store\.committed_bytes > store\.total_bytes\);/.test(p)
      && /\{overPromised && ` PROMISED/.test(p));

  // **AND EVERY FIELD IT READS OFF THAT ROW IS A COLUMN THE RPC RETURNS.**
  //
  // The screen read `store.cap_bytes` for six days. `cap_bytes` is real — it
  // is a column of `photo_budget()`, the PER-BUSINESS function — and it is not
  // a column of `photo_store_state()`, the platform-wide one whose row lands
  // on `state.photo_store`. So the expression was `undefined`, the meter
  // printed **0% at every fill level**, and the "nearly full" alert was false
  // however full the store was. **Nothing threw and nothing logged.** It is the
  // same shape as the `monthAgo` scope error: plausible code that only a real
  // number can contradict.
  //
  // SO THIS ASSERTS THE JOIN, NOT THE SPELLING. Hard-coding `total_bytes` here
  // would go red the day somebody renames the column correctly, and would say
  // nothing about the next wrong field — CLAUDE.md trap (k). The column list is
  // READ OUT OF THE MIGRATION, so the check follows a rename and still fails on
  // a field that was never there.
  {
    const share = read("supabase/migrations/20260906011000_photo_share.sql");
    // The right one of the file's two `returns table` blocks.
    const decl = share.slice(share.indexOf("function public.photo_store_state()"));
    const cols = (decl.slice(decl.indexOf("returns table ("), decl.indexOf(")", decl.indexOf("returns table (")))
      .match(/(\w+)\s+(?:bigint|int|integer|numeric|text|boolean)/g) ?? [])
      .map((m) => m.split(/\s+/)[0]);
    // `const store = state?.photo_store` is the only binding; everything after
    // it reads `store.x` or `store?.x`.
    const reads = [...page.matchAll(/(?<![\w.])store\??\.(\w+)/g)].map((m) => m[1]);
    const unknown = [...new Set(reads)].filter((f) => !cols.includes(f));
    check("11j-ii · every photo_store field the screen reads is one the RPC returns",
      cols.length >= 5 && reads.length > 0 && unknown.length === 0,
      cols.length < 5 ? "the column list was not parsed — this check proved nothing"
        : reads.length === 0 ? "no store.* reads found — this check proved nothing"
        : `not returned by photo_store_state(): ${unknown.join(", ")} · it returns ${cols.join(", ")}`);
  }

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
  // **AND 2026-09-13's REBUILD SETTLED IT BY REMOVING THE QUESTION.** The open
  // detailer is no longer a column in the page flow at any width: it is a fixed
  // overlay drawer anchored to the right, over a scrim, at `width: min(560px,
  // 100%)`. **A thing that is `position: fixed` is already in view, so there is
  // no scroll to get right and none in the file** — which is why 11k and 11l
  // collapse into one claim about the MECHANISM rather than two about a scroll.
  // Under 560px the drawer is the full width, so a phone still gets two levels
  // rather than one long page, which is what 12c asked for.
  check("11k · the open detailer needs no scroll, because it is not in the flow",
    /\.pa-open \{ position: fixed; inset: 0;/.test(strip(read("app/src/admin/admin.css")))
      && /width: min\(560px, 100%\)/.test(strip(read("app/src/admin/admin.css")))
      && !/window\.scrollTo\(/.test(p),
    "a fixed overlay is on screen by construction; a scrollTo left behind would be the bug");

  // ─── the door says where it is (F-021) ──────────────────────────────────
  // RE-POINTED 2026-09-13: the heading became the ACTION and the identity moved
  // to the eyebrow above it, which is CLAUDE.md § SCREEN RULES' own shape —
  // *a short imperative that names the action* — and F-021's property is
  // untouched: a stranger who lands here is told whose door it is and that it is
  // not a detailer's.
  check("11m · the signed-out door names itself",
    /Detailing Platform · back office/.test(p)
      && /<h1>Sign in<\/h1>/.test(p)
      && /This is the platform&apos;s own screen, not a detailer&apos;s\./.test(p));
  // And still never says WHY a signed-in stranger was refused — the 404 rule
  // this file has held since stage 1.
  // **THE SLICE HAD TO BE GUARDED.** `indexOf` returns -1 when the anchor is
  // gone, and `slice(-1, 399)` is the LAST CHARACTER of the file — so a
  // renamed status made this check read one character and pass. Same shape as
  // the `indexOf(a) < indexOf(b)` trap § 3 already names.
  {
    const p11 = strip(page);
    const at = p11.indexOf('status === "denied"');
    check("11n · and still tells a signed-in non-admin nothing",
      at >= 0 && !/not an admin|permission|platform_admins/i.test(p11.slice(at, at + 400)),
      at < 0 ? 'NO SUBJECT: there is no `status === "denied"` branch to read' : "");
  }
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
  // main.jsx, because the degradation switch moved OUT of this stylesheet and
  // into one live listener there — see 12m.
  const main = read("app/src/main.jsx");

  // ── LAYOUT ───────────────────────────────────────────────────────────
  // **THE SPLIT IS GONE AND A DRAWER REPLACED IT — RE-POINTED 2026-09-13.**
  // `.pa-split` was a grid that stacked under 1024 and put the open business
  // beside the list above it, with `.pa-rail`, `.pa-back` and `.pa-rest` as its
  // three moving parts. The rebuild made the back office five TABS and turned
  // the open detailer into a fixed overlay drawer over a scrim. **All five of
  // those class names are gone from both files**, so 12a, 12c, 12d, 12e and 12f
  // were five checks pinning a layout that no longer exists.
  //
  // **WHAT IS ASSERTED NOW IS THE PROPERTY EACH OF THEM WAS FOR**, which the
  // drawer answers differently and in most cases better:
  //   12a  F-015 — the open business must not sit a hundred rows below the list.
  //        A fixed overlay cannot.
  //   12c  a phone gets two levels, not one long page. `min(560px, 100%)` is
  //        the full width below 560, so the drawer covers the list.
  //   12d  the screen knows when something is open — it mounts the drawer.
  //   12e  there is a way back, and here there are three: the × , the scrim,
  //        and Escape. **All three are asserted**, because a drawer with only a
  //        scrim is a trap on a keyboard and one with only an × is a trap for a
  //        thumb.
  //   12f  DELETED. It guarded an empty half-screen reading as a failed load.
  //        There is no resting column to be empty. A check kept alive against a
  //        deleted surface is the vacuous kind this file spent 2026-09-13
  //        hunting.
  check("12a · the open business is over the list, never below it",
    /\.pa-open \{ position: fixed; inset: 0;/.test(css)
      && !/\.pa-split/.test(css) && !/pa-split/.test(p),
    "F-015 was the open business a hundred rows down; a fixed overlay cannot be");
  check("12b · and the width is the product's own, not a second opinion",
    /max-width: var\(--wrap/.test(css) && !/max-width: 900px/.test(css));
  check("12c · below 560 the open business covers the list",
    /\.pa-col \{[\s\S]{0,120}?width: min\(560px, 100%\);/.test(css));
  check("12d · and the screen only mounts it when something is open",
    /\{open && <Business row=\{open\}/.test(p));
  check("12e · with three ways back, because one is a trap",
    /className="pa-x" type="button" onClick=\{close\}/.test(p)
      && /<div className="pa-scrim" onClick=\{close\} \/>/.test(p)
      && /if \(e\.key === "Escape"\) close\(\);/.test(p),
    "a scrim alone is a trap on a keyboard and an x alone is a trap for a thumb");

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
  absent("12h · every duration is a token, never a number typed here",
    noVars, /animation(-duration)?:[^;]*\d+ms/, /animation: pa-/,
    (noVars.match(/animation[^;]*\d+ms/g) ?? []).join(" | "));
  // A STAGGER STEP is a per-screen decision, unlike a duration: the design
  // system fixes three durations and deliberately fixes no step.
  // RE-POINTED 2026-09-13. This read `>= 3` and the rebuilt screen has two
  // staggered containers, so a correct file failed a magic threshold. **COUNT
  // THE SUBJECTS, THEN ASSERT EVERY ONE CONFORMS** — that is the property the
  // rule is actually about, and it cannot be satisfied by a file with no
  // staggers in it at all.
  {
    const all = css.match(/animation-delay:[^;]*/g) ?? [];
    const step = css.match(/animation-delay: calc\(var\([^)]*\) \* \d+ms\)/g) ?? [];
    check("12h-ii · and the stagger steps are the only bare numbers",
      all.length >= 2 && step.length === all.length,
      `${all.length} animation-delay declarations, ${step.length} of them a calc'd step: ${all.join(" | ")}`);
  }

  // **THE SWAP CARRIES NO ANIMATION OF ITS OWN.** A whole block changing
  // opacity at once is what a page reload looks like, and it is the exact
  // note the owner rejected on sight in September. The PARTS move.
  check("12i · a swap animates its parts, never the frame",
    /\.pa-swap > \* \{ animation:/.test(css) && !/^\.pa-swap \{[^}]*animation/m.test(css));
  check("12j · and the frame is re-keyed so the swap actually runs",
    /className="pa-swap" key=\{\w+\.id\}/.test(p));

  // AN EXIT IS A DELAYED UNMOUNT and the duration lives in one place.
  // RE-POINTED 2026-09-13: the callback is `onClose` now and the class is
  // namespaced `pa-leaving`. **THE SHARED HOOK IS THE RULE**, so this asserts
  // the IMPORT PATH — a local re-implementation is the failure it guards — and
  // that the exit animation exists, not what the callback happens to be called.
  check("12k · closing animates out through the shared hook",
    /from "\.\.\/hooks\/useLeaving\.js"/.test(p) && /useLeaving\(\w+\)/.test(p)
      && /\.pa-col\.pa-leaving \{ animation: pa-col-out/.test(css));
  absent("12l · and no second copy of the exit duration",
    p, /setTimeout\([^)]*18\d\)/, /useLeaving\(/);

  // ONE DEGRADATION IMPLEMENTATION PER SURFACE — the design system forbids a
  // second `prefers-reduced-motion` block, and `.lite` is the same switch by
  // another name.
  // **RE-POINTED 2026-09-13, AND THE NUMBER FLIPPED FROM ONE TO ZERO.** This
  // read `=== 1` and the correct answer is now NONE: the switch is one live
  // listener in `main.jsx` that toggles `.lite` on <html> for BOTH the media
  // query and `?lite=1`, which is what makes them one mechanism instead of
  // two. A `@media (prefers-reduced-motion)` block in this stylesheet would be
  // the fork `?lite=1` cannot reach — the same rule `composition` § 9 holds
  // product-wide, and admin.css's own comment says so.
  check("12m · reduced motion is handled once",
    (css.match(/@media \(prefers-reduced-motion/g) ?? []).length === 0
      && /matchMedia\?\.\("\(prefers-reduced-motion: reduce\)"\)/.test(main)
      && /classList\.toggle\("lite"/.test(main),
    "the one mechanism is main.jsx toggling .lite; a block in admin.css is a second one");
  check("12n · and ?lite=1 rides the same rule",
    /get\("lite"\) === "1"/.test(main) && /forced \|\| !!mq\?\.matches/.test(main)
      && /\.lite \.pa-col,?\n?[\s\S]{0,80}?animation: none !important/.test(css),
    "the query has to OR with the media query, and .lite has to be what kills the animation");

  // ── THE CHART ────────────────────────────────────────────────────────
  // It is an <svg> because CSS percentage heights could not hold it: twice,
  // every bar collapsed to its 2px floor and the row overflowed its own label
  // by 18px, because a percentage height needs a DEFINITE parent height.
  // RE-POINTED: the class is `pa-chart` now. The rule is an SVG with a
  // COMPUTED viewBox, so neither half names a class any more.
  check("12o · the six-month chart is drawn with explicit coordinates",
    /<svg[^>]*viewBox=\{/.test(p));
  absent("12p · and no percentage height is left inside it",
    css, /pa-bar[^r][\s\S]{0,200}?height: 100%/, /\.pa-barr/);
  // A MONTH WITH NO WORK IS NEVER THE LIT ONE, even when it is this month.
  // RE-POINTED: the marker classes are namespaced `pa-now` / `pa-has` now. The
  // second half is the one that matters and is new — a rule lighting the
  // current month WITHOUT requiring work in it is the defect itself.
  check("12q · an empty month is not lit",
    /\.pa-barr\.pa-now\.pa-has \{ fill:/.test(css) && !/\.pa-barr\.pa-now \{ fill:/.test(css));
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

  // ══ IS THE NOTE MECHANISM STILL REACHABLE? ═══════════════════
  //
  // **SEVEN CHECKS BELOW WERE GREEN OVER CODE THAT CANNOT RUN — measured
  // 2026-09-13.** `beginImpersonation` is the only thing that ever writes the
  // note, and after the 2026-09-13 rebuild it is EXPORTED AND CALLED NOWHERE:
  // a repo-wide grep finds it in `lib/impersonation.js` (the definition) and
  // in this file, and in no third place. Andrew replaced the session swap with
  // a `/preview` tab that keeps its own session in `sessionStorage`, so no note
  // is ever written, `impersonation(email)` can only return null, the `impbar`
  // in `App.jsx` can never render, and `endImpersonation()` in `signout.js`
  // clears a key nothing sets.
  //
  // **EVERY ONE OF THOSE SEVEN STILL PASSED**, because each greps a source file
  // that still exists. That is trap (k) at its worst: the checks assert how the
  // module is WRITTEN, and the module is written correctly — it is merely
  // unreachable. A green line there is indistinguishable from a green line over
  // live code, which is this suite’s own stated disease.
  //
  // **SO THEY SKIP, LOUDLY, WHILE NOTHING CALLS IT.** Not deleted: if lane B
  // removes the dead module the skips go with it, and if the note ever comes
  // back the checks re-arm themselves on the next run with no edit. The gate is
  // the CALL, not the definition — `impersonation.js` defines the function, so
  // a check for the name alone is satisfied by the corpse.
  const noteIsWired = [
    "app/src/admin/AdminPage.jsx", "app/src/App.jsx",
    "app/src/context/BusinessContext.jsx", "app/src/screens/SiteIntake.jsx",
  ].some((f) => /(?<!function )beginImpersonation\(/.test(read(f)));
  const deadNote = "NOT MEASURED: nothing in app/src calls beginImpersonation, so no "
    + "note is ever written and this guards code that cannot run. Andrew replaced "
    + "the session swap with the /preview tab (app/src/lib/preview.js) on "
    + "2026-09-09. Lane B owns removing the dead module; this re-arms itself.";


  // ── IT SAYS WHO YOU ARE, AND LETS YOU STOP BEING THEM ────────────────
  // **THE RENDERING EXPRESSION, NOT THE NAME.** The first version of this read
  // `/state\.me/` over the whole file and passed with the address never drawn:
  // `state.me` is also where it is PUT on the state, two hundred lines up. A
  // check on a variable's name is greenest when the only thing using it is the
  // line that sets it.
  // RE-POINTED 2026-09-13. `state.me` became a `useState` local, so the old
  // spelling is gone; the WARNING above still stands and is now enforced
  // structurally rather than by naming a variable. Read whatever identifier
  // `pa-who` actually renders, then require something to SET it — which is the
  // difference between an address drawn and an address merely stored.
  {
    const who = p13.match(/className="pa-who">\{(\w+)\}/);
    check("13a · the bar prints the signed-in address",
      !!who && p13.includes("set" + who[1][0].toUpperCase() + who[1].slice(1) + "("),
      who ? `pa-who renders {${who[1]}} and nothing sets it` : "pa-who renders no identifier at all");
    // **THE CHAIN, NOT THE CALL.** `auth.getSession()` appears twice in this
    // file, so "getSession is somewhere" is satisfied by the other one. What
    // has to hold is that the address came OUT of a session object.
    const from = p13.match(/set\w+\((\w+)\.user\?\.email/);
    check("13a-ii · and the address is the session's own, not a guess",
      !!from && new RegExp("const " + from[1] + " = " + String.raw`\w+\?\.session`).test(p13)
        && /auth\.getSession\(\)/.test(p13));
  }
  // **RE-POINTED, NOT RELAXED — ROADMAP 8.18 GAVE THE PRODUCT ONE DOOR.**
  // This used to read the back office's own `supabase.auth.signOut()`; there
  // were three such exits and they each had to remember to drop the note, end
  // the parked accounts and then sign out, which is how the third one quietly
  // stops doing the third. `app/src/lib/signout.js` is the only
  // `auth.signOut(` in `app/src` now, so the assertion follows it there.
  // RE-POINTED 2026-09-13: there is no local wrapper any more — the button is
  // wired straight to the one door. That is strictly better, so the check
  // follows it: the IMPORT (a local re-implementation is the failure) and the
  // handler actually being that function.
  check("13b · there is a sign out",
    /import \{ signOutEverything \} from "\.\.\/lib\/signout\.js"/.test(p13)
      && /onClick=\{signOutEverything\}/.test(p13));
  // THE NOTE GOES FIRST. If the sign-out throws, a surviving note tells the
  // next person on this browser they are impersonating somebody they are not.
  const door = strip(read("app/src/lib/signout.js"));
  const so = door.indexOf("export async function signOutEverything");
  const endAt = door.indexOf("endImpersonation()", so);
  const outAt = door.indexOf("supabase.auth.signOut()", so);
  if (!noteIsWired) skip("13b-ii · signing out drops the impersonation note before it signs out", deadNote);
  else check("13b-ii · signing out drops the impersonation note before it signs out",
    so >= 0 && endAt > so && outAt > so && endAt < outAt,
    "the note has to be cleared even if the sign-out fails");

  // ── THE 404 IS STILL THE 404 ─────────────────────────────────────────
  // The reason this page answers *Page not found* rather than *you are not an
  // admin* is that naming the gate sends a curious detailer looking for the
  // row. 8.2 added ONE exception and it must stay one.
  check("13c · a signed-in non-admin still gets the product's 404 page",
    /<NotFound \/>/.test(p13));


  // ── THE NOTE AUTHORISES NOTHING ──────────────────────────────────────
  // It is localStorage in one browser. A detailer who writes one by hand
  // changes what their own screen says and nothing else — so this module must
  // never ask the server anything.
  if (!noteIsWired) {
    skip("13d · impersonation.js talks to nobody", deadNote);
    skip("13d-ii · it is believed only while that address is the one signed in", deadNote);
    skip("13d-iii · and no session means no note", deadNote);
  } else {
    absent("13d · impersonation.js talks to nobody",
      impCode, /fetch\(|supabase|^import /m, /export function beginImpersonation/,
      "a note that can call the server is no longer a note");
    check("13d-ii · it is believed only while that address is the one signed in",
      /rec\.as === String\(email\)\.toLowerCase\(\)/.test(impCode));
    check("13d-iii · and no session means no note",
      /if \(!email\) return null;/.test(impCode));
  }

  // ── NOT OFFERED WHERE THE SERVER WILL REFUSE IT ──────────
  // R9's second half: `impersonate` answers 409 when the business has no owner
  // row, which is true of several fixtures and of every business added from
  // this screen before its invite is accepted.
  //
  // **RE-POINTED 2026-09-13, AND THE SUBJECT MOVED AS WELL AS THE SPELLING.**
  // The 2026-09-13 rebuild reads the owner off the ROW rather than searching a
  // members list, so `ownerMember` is gone and `row.owner_email` is the gate.
  // The capability is intact; only the name changed — trap (k), the fifth time
  // this suite has paid for it. Asserted as the pairing of the two halves that
  // actually have to agree: the value the button is disabled ON, and the value
  // the explanation is shown ON. A check naming one of them alone goes green
  // with a button that is never offered or a sentence that never appears.
  // **RE-POINTED A SECOND TIME THE SAME DAY, AND THE PRODUCT GOT BETTER BOTH
  // TIMES.** This was `ownerMember` from a members search, then `row.owner_email`,
  // and is now `hasOwner`. The move was not cosmetic: the server builds
  // `owner_email` as `owner?.email ?? contact_email`, so a business somebody
  // typed a contact address for read as HAVING an owner it did not have, and
  // the button was enabled right up to the server’s 409. Trap (k) twice in one
  // day on one check — so this asserts the THREE-STATE, which is the property
  // that actually has to hold and is far harder to reword by accident.
  check("13f · the owner account gates the button",
    /disabled=\{hasOwner === false \|\| busy === "impersonate"\}/.test(p13),
    "the button has to be off when there is no account to open it as");
  // **`null` IS A THIRD ANSWER AND MUST NOT BE FOLDED INTO `false`.** The detail
  // arrives after the drawer opens and may not arrive at all; treating "we have
  // not read it yet" as "there is no owner" disables the button and prints a
  // sentence claiming a fact nobody has read. Asserted on the derivation, so a
  // rewrite back to a two-state boolean fails here.
  check("13f-i · and not knowing yet is a third answer, not a no",
    /const hasOwner = detail\?\.members \? detail\.members\.some\(\(m\) => m\.role === "owner"\) : null;/.test(p13),
    "hasOwner has to be true | false | null, never a plain boolean");
  check("13f-ii · and the screen says why, on the same condition",
    /\{hasOwner === false && \(/.test(p13)
      && /no account to open it as/.test(p13),
    "a disabled button with no sentence beside it is an unexplained dead end");
  // **RE-ARMED 2026-09-13.** This skipped earlier today because the rebuilt
  // screen stated the dead end and offered no way out, and the server action
  // that fixes it reached no screen — `FOUND.md` § EIGHT BACK-OFFICE ACTIONS HAVE
  // NO DOOR. Lane B built the door in `cfe29b3`, so the check is a check again
  // rather than a skip. **A skip is a debt, and this is what paying it looks
  // like:** the assertion comes back with no edit to the reason it was parked.
  check("13f-iii · the invite that fixes it is offered by the same screen",
    /action: "resend_invite", business_id: row\.id/.test(p13)
      && /setInviting\(\(v\) => !v\)/.test(p13),
    "saying there is no account and offering no way to make one is half an answer");
  check("13g · the server is still the one that refuses",
    /has no owner account to sign in as/.test(strip(fn)));

  // ── AND THE DASHBOARD SAYS IT TOO ────────────────────────────────────
  // The half of the complaint that lives outside /admin: he lands on somebody
  // else's dashboard, with this product's own chrome around it, and every
  // switch he touches is theirs.
  if (!noteIsWired) {
    skip("13h · the dashboard draws a strip while impersonating", deadNote);
    skip("13h-ii · from the note, checked against the live session", deadNote);
    skip("13h-iii · and it carries a way out", deadNote);
  } else {
    check("13h · the dashboard draws a strip while impersonating",
      /className="impbar"/.test(app));
    check("13h-ii · from the note, checked against the live session",
      /impersonation\(session\?\.user\?\.email\)/.test(app));
    check("13h-iii · and it carries a way out", /await signOut\(\)/.test(app));
  }
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
  // FIXED password for `shoot-admin@detailplatform.com`, created it on the  // mail-sink: prose about a login; autoconfirm is on so a signup sends nothing
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
  // **THE WINDOW WAS THE BUG, NOT THE CODE - RE-POINTED 2026-09-13.** The
  // payload's `email: {` and its `cap:` line are seventeen lines apart in
  // `platform-admin/index.ts` and the check allowed two hundred characters
  // between them, so it went red on a function that sends exactly what it is
  // asked to. This file's own note at 2b-ii already says why: a proximity
  // window is a check whose colour depends on how much prose sits inside the
  // branch. Both halves are asserted, neither is measured in characters.
  check("14c · the back office is handed today's count and the cap",
    /email: \{/.test(admin)
      && /cap: ps\?\.email_daily_cap \?\? 100/.test(admin)
      && /sent: /.test(admin.slice(admin.indexOf("email: {"), admin.indexOf("email: {") + 900)));
  // RE-POINTED 2026-09-13: `state.email` became the local `mail`, and the line
  // now appears TWICE — as an alert on Today when it matters, and always as a
  // Quotas row on Plumbing. Both are asserted, because the alert alone would
  // mean the figure is unreadable on a quiet day and the row alone would mean
  // nobody is told on a busy one.
  check("14c-ii · and the screen prints it beside the other silent limits",
    /Platform emails: \$\{mail\.sent\} of \$\{mail\.cap\} today/.test(page)
      && /\{mail\?\.sent \?\? 0\} of \{mail\?\.cap \?\? 0\}/.test(page));
  // **"PLATFORM" IS LOAD-BEARING AND IS NOT A TIDIER LABEL — 2026-09-08,
  // measured by domain.** `sent` comes from `platform_email_days`, a table in
  // THIS project, so it counts what the platform sent. The cap is Resend's
  // daily allowance, which is ACCOUNT-WIDE and shared with andrewsdetail.com —
  // his own live business, real customers, same Resend account. Numerator and
  // denominator are different populations, so the line UNDER-reports, which is
  // the unsafe direction: 470 platform against 57 business over 30 days means
  // a busy Saturday can read comfortable while the account is at its limit.
  // Dropping the word puts that claim back.
  check("14c-ii-b · the label says WHICH emails, because the cap is shared",
    /Platform emails/.test(page) && !/\{`Emails: /.test(page),
    "the numerator is platform-only and the cap is account-wide");
  check("14c-ii-c · and the warning says the account may be higher",
    /shared with andrewsdetail\.com/.test(page),
    "at four fifths of a SHARED cap, the real figure is the one that matters");
  // **AT FOUR FIFTHS, NOT AT THE LIMIT.** A warning that arrives AT the cap is
  // a warning about emails that have already failed.
  // RE-POINTED 2026-09-13: four fifths is still the trigger and it now fires in
  // two places — the alert is pushed at `>= cap * 0.8`, and the Quotas meter
  // turns at `mailPct >= 80`. The THRESHOLD is the property, not the class name.
  check("14c-iii · it goes red before the cap, not at it",
    /mail\.sent >= mail\.cap \* 0\.8/.test(page)
      && /mailPct >= 80 \? " pa-warn"/.test(page));
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

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed ? 1 : 0);
