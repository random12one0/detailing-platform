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
