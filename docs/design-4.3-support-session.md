# ROADMAP 4.3: how the server can tell a support session from the owner's own login

**Written 2026-10-06 at `1f6d295`. DESIGN ONLY. Nothing here is built, nothing was
run against the live project, no link was minted and no credential was created.**
Every statement carries a tag. **READ** means I read it in the code at that
revision. **UNTESTED** means it is a belief about Supabase or about running
behavior that nothing has exercised. **JUDGEMENT** means it is my call.

## The problem, in the facts that decide it

| # | Fact | Tag |
|---|---|---|
| 1 | `impersonate` writes the audit row (`platform-admin/index.ts:976`), then `generateLink` mints an ordinary magic link **for the owner's own email** (`:980`) and returns the URL (`:989`). | READ |
| 2 | The browser takes the one-time `token` out of that URL (`AdminPage.jsx:1334`) and exchanges it itself with `verifyOtp` (`PreviewEntry.jsx:43`). The session lands in that tab's own storage drawer (`lib/supabase.js:96`). **So the support session is a second, separate sign-in of the same user, and the server never sees it being created.** | READ |
| 3 | Every database rule asks `current_business_ids()`, which reads `business_users` by `auth.uid()`. A support session and the owner's own login have the same `auth.uid()`. Nothing on the session says which is which. | READ (`20260827000100_tenant_core.sql`) |
| 4 | Owners sign in with a password, in all four places that sign anyone in. The only `verifyOtp` in the app is the preview door. | READ (`grep -rnE "signInWithPassword\|signInWithOtp\|verifyOtp" app/src`) |
| 5 | The browser writes straight to the database in 29 tables (command below). Every other write goes through edge functions, which run as the service role and ignore row rules. | READ (29 at `1f6d295`) |
| 6 | 19 edge functions share one membership check, `requireMember` (`_shared/tenant.ts:288`), which returns a role and lets `owner` do everything. Two other functions, `create-business` and `platform-admin`, call `getUser` themselves. | READ (19 at `1f6d295`) |
| 7 | "Looking / Working" is a browser-side switch (`lib/preview.js`). **Working is a feature**: an admin can fix a detailer's hours as the owner. A server rule that blocks writes can only be applied to Looking. | READ |
| 8 | There is no `supabase/config.toml`. Auth settings live in the Supabase dashboard, outside this repo, and `migration-drift.mjs` cannot see them. | READ |

```bash
# facts 5 and 6, re-takeable
node -e 'const fs=require("fs"),{execSync:x}=require("child_process"),t=new Set();for(const f of x("git ls-files app/src",{encoding:"utf8"}).split("\n").filter(f=>/\.(jsx?|mjs)$/.test(f)&&!/\.test\./.test(f)))for(const m of fs.readFileSync(f,"utf8").matchAll(/from\("([a-z_]+)"\)\s*\.(insert|update|upsert|delete)/g))t.add(m[1]);console.log(t.size)'
git grep -l requireMember -- 'supabase/functions/*/index.ts' | wc -l
```

**What the facts force.** The session does not exist until the link is used, so
whatever marks it either (a) is put in place beforehand and keyed on something
known beforehand (the user, the time), or (b) is attached the instant the session
is born, by whoever creates it. Option 1 is (a). Option 2 is (b).

**The 2026-09-21 ruling still binds** (key on *where the session is acting*, never
on who the person is). Both options mark a **session**, so Andrew working in his own
dashboard is never touched and no "unless it is his own business" exception exists.

## Option 1: mark it on the way in, with a sign-in hook

Before `generateLink`, `platform-admin` writes a one-use grant row for that user.
A Postgres function installed as the project's **custom access token hook** runs
every time a token is issued. If it sees a sign-in made by link and an unclaimed
grant for that user, it claims the grant and adds a `support` claim to the token.
Policies and `requireMember` read the claim.

**Costs.** A new table, the hook function, and **switching the hook on in the
dashboard, which is a live setting nobody can diff**. A refusing rule on every
tenant table's write path (see "Shared by both"). `requireMember` learns to read
the claim.

**What can go wrong.**
1. **It fails open, silently.** Hook switched off, renamed or erroring: no claim, no
   refusal, and the screen looks identical to a protected one. This is the exact
   failure the 4.3 entry names. JUDGEMENT.
2. **It can fail every login at once.** If the hook errors, issuing a token may fail
   for everybody. UNTESTED.
3. **The grant is keyed to the user, not the session.** Another link-style sign-in by
   that owner inside the window (a password-reset link, an invite) could claim the
   grant: the owner gets locked read-only and the real support session goes unmarked.
   Fact 4 makes this rare, not impossible. JUDGEMENT.
4. **Three assumptions nobody has checked:** that the hook is told how the sign-in was
   made and which session it is, that it runs again on refresh and can re-derive the
   flag, and that hooks are available on this project's plan. UNTESTED, all three.

## Option 2 (recommended): the server uses the link itself and marks the session by id

`platform-admin` stops handing the browser a one-time token. After writing the audit
row and calling `generateLink`, **it exchanges the token itself** (`verifyOtp`, on
the server). That returns the new session, and the session's id is in the access
token. It writes a row holding that id to a `support_sessions` table, **checks the
row landed, and only then returns the tokens** to the browser, which calls
`setSession` instead of `verifyOtp`. A small function, `is_support_session()`,
answers "is the session id in this request's token listed in `support_sessions`?".
Policies and `requireMember` ask it.

**Why it is better here.** The session is marked **before the browser ever holds it**,
so there is no gap and no race. The owner's own concurrent logins are different
sessions and are untouched by construction. The marker is the session's id, not the
user, so it needs no hook and **nothing lives outside the repo**. It fails closed: if
the marker cannot be written, or the token carries no session id, the function
refuses to hand anything over, the same rule the audit row already follows (`:976`).
The support session is the owner's own identity, so the dashboard looks exactly as
the owner sees it and nothing about roles or screens changes.

**Costs.**
- `platform-admin`: `impersonate` grows from "make a link" to a checked exchange. Small.
- `PreviewEntry.jsx` swaps `verifyOtp` for `setSession`, and the tokens travel in the
  tab's address-bar hash as the one-time token does today. **That is `app/src`, so
  it is lane A**, and one file. Small.
- One migration: `support_sessions`, `is_support_session()` and the refusing rules.
  Medium, and the refusing rules are the bulk (next section).
- `support_sessions` must be unreadable and unwritable by signed-in users, or a
  support session could delete its own marker. Part of the migration.

**What can go wrong.**
1. **The token may not carry a session id.** Then the check is always false and it
   fails open. Guard: `impersonate` decodes the token and **refuses to continue
   without one**. UNTESTED that Supabase tokens carry it, though I believe they do.
2. **Server-side `verifyOtp` with a link token may behave differently** from the
   browser call (rate limits, a session that is not created). UNTESTED.
3. **A refresh token now passes through the admin's browser** where today only a
   one-time token does. Both are credentials, but the refresh token outlives its
   first use. JUDGEMENT: acceptable for a platform admin's own tab, and the hash is
   cleared on arrival as now, but it is a real change.
4. **Working mode.** If Working should stay possible it must be a *different* door
   (today's link, no marker, a distinct audit action such as `impersonate_work`) or
   the same door with a `mode` on the marker row. See the decision below.

## Shared by both options, and where the real cost sits

- **Refusing rules.** One restrictive rule per write command (insert, update, delete)
  on every tenant table, **generated from the schema's own table discovery** (the way
  `tenant-matrix.mjs` finds tables), not from the app's list of 29. The 29 is only
  what the browser uses today, and a policy that allows a write the app never makes is
  still a hole. Also **`storage.objects`**, because photo uploads and deletes are
  browser writes (`lib/photos.js`).
- **Security-definer functions.** They run with their owner's rights, skip table
  rules, and signed-in users can call them. **Every one that writes needs its own
  check.** `tenant-matrix.mjs` already covers "definer RPCs" as a boundary, so a list
  exists to start from. **I did not enumerate which ones write. This is the part most
  likely to be underestimated.** UNTESTED.
- **Edge functions, fail-closed by default.** `requireMember` refuses a support session
  unless the caller opts in. The 19 callers then fail closed without being edited one
  by one, and only the pure reads opt in. By name `booking-ics` and `forecast` look
  like reads. **I did not read any of the 19 bodies**, so that is a guess. JUDGEMENT.
- **The two direct `getUser` callers.** `platform-admin` is the admin gate, not a
  support surface. I did not read `create-business`. UNTESTED.

## Considered and dropped, one line

A separate read-only "shadow" user per business (`role = 'support'`). The database
could tell it apart by identity alone, but it would appear in every "who is the owner"
and team query, it could not see what is gated on `is_business_owner()` (35 mentions
in 8 migration files at `1f6d295`: sum the per-file counts of
`git grep -c is_business_owner -- supabase/migrations`), and it changes screens. More
surface than Option 2 for the same refusal.

## Recommendation, and the one decision it needs

**Option 2.** It is the one whose failure is a refused write rather than a silent
allow, and the one with nothing outside the repo to forget.

**Decision for Andrew or the manager, before anything is built: what happens to
Working?** Today an admin can press "Let me make changes" and edit as the owner. A
server rule makes Looking truly read-only. Working then either (a) stays, as a
separate door that is **not** protected and is logged as its own action, which keeps
the capability but means 4.3's "block mutations" covers only Looking, or (b) goes, and
fixing a detailer's settings means asking them. **Recommendation: (a), logged as
`impersonate_work`.** Removing a capability is a product call, and I do not know who
asked for Working; (a) is additive and (b) is simpler to prove.

## What a proof would look like, so the done-when can be executed later

Press **both layers with the support session's own credentials, naming which one
refused**: (1) the Data API, one write attempt per tenant table, each refused by a row
rule; (2) every edge function that writes, each refused with the read-only reason. Plus
the audit row naming who looked and at whose records, which is already built.
**Producing that session means minting an impersonation link on a fixture business,
which is creating a credential. It needs the manager's say-so, a fixture, and the
dev database only.** Not done here.

## What is NOT known after this document

Whether Supabase tokens carry a session id. Whether server-side `verifyOtp` with a link
token returns a session. Which security-definer functions write. Which of the 19 edge
functions are pure reads. What `create-business` does with the caller. **The first two
are quick to settle on a throwaway fixture and decide whether Option 2 is possible at
all, so they come before any migration is written.**

---

## DECISION, 2026-10-10 (ROADMAP 4.3a): Option 2, Working is its own door, and five layers to refuse on

**Both unknowns above are now measured, not believed.** The throwaway fixture
(`node scripts/support-session-fixture.mjs`, 8 of 8 at `2d53244`) created a user with no
business, exchanged a generated link **on the server**, and deleted the user. No token was
printed or stored. One line per question is in `receipts/support-session-fixture.answers.json`:

| Question | Answer |
|---|---|
| Does the access token carry a session id? | **Yes**: a `session_id` claim, and it names a real `auth.sessions` row for that user |
| Can the server exchange the link itself? | **Yes**: `verifyOtp({ token_hash, type: "magiclink" })` on the server returns access and refresh tokens |
| Is the link spent once the server uses it? | **Yes**: a second exchange answers *"Email link is invalid or has expired"* |
| Does a refresh keep the same id? | **Yes**, so a marker keyed on it lasts the whole session |
| Does the owner's next sign-in get a different id? | **Yes**, so marking one session cannot touch the owner's own login |
| Can Postgres read it the way a policy would? | **Yes**: `auth.jwt() ->> 'session_id'` returns it |
| Can the session write past every database rule? | **Yes, through the Auth API.** See layer E |

Both sabotages ran red in the same commit: `--break=strip-sid` (the original unknown, a
token with no id) failed 5 of 8, and `--break=reuse` failed 1 of 8.

**THE APPROACH: Option 2, as written above.** `impersonate` writes the audit row, mints the
link, exchanges it itself, **refuses to continue if the token has no `session_id`**, writes
`support_sessions (session_id, user_id, business_id, admin_id, created_at)`, checks the row
landed, and only then returns the tokens. `PreviewEntry.jsx` calls `setSession` instead of
`verifyOtp`. `is_support_session()` is a security-definer function asking whether
`auth.jwt() ->> 'session_id'` is listed. `support_sessions` is unreadable and unwritable by
`authenticated` and `anon`. Option 1 (a sign-in hook) is dropped: it fails open when switched
off, and `hook_custom_access_token_enabled` is `false` on this project today (read from the
Management API's auth config, 2026-10-10), so it would also be one more dashboard setting
nobody can diff.

**THE WORKING SWITCH: it becomes its own door, opened from the back office and logged as its
own action.** Today the switch is a browser flag (`lib/preview.js`). A server-marked session
cannot be unlocked by flipping it, and it must not be: anything that lifts the mark from
inside the preview tab is something a leaked support token can do too. So:

- **Looking** is the only thing the existing button opens. Its session is marked and the
  server refuses every write. In a Looking tab the switch no longer offers Working; in its
  place it says that changes need the back office's other button.
- **Working** is a second button in the back office, next to the first. It calls a new
  action, `impersonate_work`, from the admin's own session (so `platform-admin` checks it is
  a platform admin, which the preview tab cannot pass), writes its own audit row **before**
  minting, and hands back a session that is **not** marked. Its banner says changes are saved
  to that business. The audit history shows the two actions in different words.
- A Working tab may still switch itself to Looking. That only removes ability, so the
  browser guard is enough there.

Why this and not removing Working: removing a capability is a product call, and nobody has
asked for it to go. This keeps it, makes it a deliberate act from the admin's own login, and
leaves it visible in the history. **If Andrew would rather Working went away entirely, 4.3c
drops the second button and nothing else changes.** His 2026-10-09 note that the back office
is to be rethought from scratch does not change this: the rule is about sessions, not
screens, so it survives any redesign.

**EVERY WRITE PATH 4.3c MUST REFUSE ON.** Discovered by `node scripts/support-write-paths.mjs`
at `87237ef` (live catalog, read-only queries). The full list is
`receipts/support-write-paths.list.json`, and 4.3c re-runs the script rather than trusting
these counts.

- **A. Data API tables: 36.** Every public table where `authenticated` holds the privilege
  and a permissive policy lets it through. Refusal: one restrictive policy per command,
  `using (not is_support_session())` and `with check (not is_support_session())`, generated
  over **every** public table with RLS on, not just the 36, so a table added later is covered
  the day it ships. The 13 table-and-command pairs that are granted but have no policy are
  refused today by RLS's default, and the same generated rule covers them.
- **B. storage.objects: 7 write policies** (business media insert, update and delete; expense
  receipts insert and delete; job photos insert and delete). The same restrictive rule, on
  `storage.objects`.
- **C. Security-definer functions: 2 of the 14** that `authenticated` may call write in their
  own body: `accrue_plan_visits()` and `set_my_lang(p_lang text)`. Each gets
  `if is_support_session() then raise exception` as its first statement. None of the 14 uses
  dynamic SQL, `perform`, a sequence or an outside call (checked against the catalog
  2026-10-10), so the other 12 only read. The script names all 14, so a new writer shows up.
- **D. Edge functions that authenticate a user: 21.** They run as the service role, so A to C
  do not reach them. Refusal: `requireMember` refuses a support session **by default**, and a
  function opts in to allow one. All 19 `requireMember` callers then fail closed without being
  edited one by one; only reads opt in, and 4.3c reads each body before opting one in
  (`booking-ics`, `forecast` and `preview-emails` write nothing in their own files;
  `report-problem` sends an email). The two that call `getUser` themselves get their own
  check: **`create-business` must refuse**, or a support session can create a new business
  owned by the owner; **`platform-admin` must refuse too**, because the demo login is both a
  platform admin and a detailer, so a support session opened on the demo business is a
  platform-admin session. The other 20 functions authenticate no user (the public booking
  page, webhooks and timed jobs), so a support session reaches no further there than anyone
  on the internet.
- **E. The Auth API: no database rule or edge function can refuse it.** Measured: the support
  session changed its own user record through `updateUser`, and the change was read back. On
  this project `security_update_password_require_reauthentication` is `false`, so the same
  call can set a new password without the current one. The dashboard's Password screen asks
  for the current password first, but only in the browser, and the browser guard does not
  wrap `auth.updateUser` (`lib/supabase.js` wraps the four table verbs; `lib/api.js` wraps
  edge-function calls). Email changes are protected: `mailer_secure_email_change_enabled` is
  `true`, which needs both addresses to confirm. **4.3c's job here:** (1) add the auth calls to
  the browser guard, so a stray click is stopped like every other write; (2) end a support
  session on the server after a fixed time by deleting its `auth.sessions` row, which bounds
  how long a leaked one is useful; (3) test on the fixture whether turning the
  reauthentication setting on stops a password change from a session created minutes
  earlier. If it does, switching it on is Andrew's, in the Supabase dashboard. If it does not,
  this route stays a named limit of the support view rather than a hidden one.

Realtime opens no channels (CLAUDE.md, "every realtime channel is private"), and GraphQL obeys
the same grants and rules as layer A, so neither adds a path.
