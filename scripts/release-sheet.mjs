// ONE RELEASE SHEET — every database change and program still to go live, in
// the order they must go. ROADMAP 97.91, 2026-10-18.
//
//   node scripts/release-sheet.mjs                     # writes docs/release-sheet.md
//   node scripts/receipt.mjs receipts/release-sheet.json
//   node scripts/release-sheet.mjs --break=drop-step   # forget 97.18's steps: must go red naming 97.18
//   node scripts/release-sheet.mjs --break=drop-line   # cut verify-domain's line from the written sheet: names 97.13
//   node scripts/release-sheet.mjs --break=unhold      # publish platform-admin like the rest: names 0.6b and 4.3b
//   node scripts/release-sheet.mjs --break=open-wait   # 97.10 unfinished, hold ignored: names 97.68
//   node scripts/release-sheet.mjs --break=no-cron     # forget 97.3's scheduler key: names 97.3
//   node scripts/release-sheet.mjs --break=no-order    # forget 0.6b's first/alone/last: names 0.6b
//   node scripts/release-sheet.mjs --break=no-escape   # website step without the way past the push check
//   node scripts/release-sheet.mjs --break=fn-before-page # create-booking and create-business before the website: names 99.2, 99.2a and 97.37
//   node scripts/release-sheet.mjs --break=lock-one    # 4.3b's lock declared as update-booking only: names 4.3b and verify-domain
//   node scripts/release-sheet.mjs --break=lock-order  # verify-domain back ahead of every database change: names 4.3b
//   node scripts/release-sheet.mjs --break=webhook-last # the payment webhook back after create-business: names 0.6b and 97.37
//
// The last three (and drop-line, unhold) only bite while the server check names the programs they
// move. On a receipt naming none (the stale one 98.18 met) fn-before-page and lock-order printed
// nothing new, so re-run all eleven after every fresh deployed-inventory receipt (98.18, 2026-10-24).
//
// It READS. Credential-free: it never asks the database or the server anything
// itself. Its inputs are the receipts `migration-drift.mjs` and
// `deployed-inventory.mjs` write (run those first, with credentials; both only
// read), `FOR-ANDREW.md`, `ROADMAP.md`, `supabase/` and git. It applies nothing,
// deploys nothing, pushes nothing.
//
// WHY. FOR-ANDREW.md had thirteen "AT YOUR NEXT RELEASE" rows, each with its
// own ordering rule, and nobody had merged them, so a release meant Andrew
// reconciling thirteen notes by hand.
//
// THE FIRST VERSION READ ONLY THOSE THIRTEEN, AND A REVIEWER FOUND WHAT THAT
// COST (2026-10-18): it told Andrew to publish `platform-admin`, which 0.6b
// holds back on purpose; it listed the four scheduled programs with no word
// about 97.3's scheduler key, so following it would have stopped reminders;
// and it could not be finished, because the push gate refuses the website
// while any held program is out of date and the sheet never said how to get
// past it. Every count it checked was right. So the population is now every
// FOR-ANDREW row that carries a release instruction (RELEASE_RE below), each
// one declared here or excluded by name with a reason, and the rules a row
// states are held as CHECKS on the written text: holds, "alone", "first",
// "last", "only if", waits on other items, and before/after pairs.
//
// HOW IT DECIDES THE ORDER. Part 0: things that must be true before starting.
// Part 1: setup outside the code (keys, Stripe). Part 2: every unapplied
// database change, oldest first, with a program a rule needs BEFORE a change
// (97.13's verify-domain) placed just before the earliest change it must
// precede, so the changes it needs itself (4.3b's lock) are already in.
// Part 3: programs, `update-booking` first and alone, then one pass,
// then `platform-billing` alone. Held programs are listed once, never as a step. Part 4: the website.
// Part 5: the programs a rule sends AFTER the website (`create-booking`, 99.2 and
// 99.2a, the rule 97.64 set), then the payment webhook alone (0.6b), then any program a
// rule sends after it (`create-business`, 97.37: see SETTLED). 97.16's `accept-quote` rule went with the 2026-10-23
// release, so `accept-quote` now goes in the ordinary pass. The
// push check (.githooks/pre-push) refuses the website while any program is not
// this checkout, so the website step names exactly what it will report and says
// `SHIP_WITH_DRIFT=1` is the way past, as 0.6b says.
//
// THE SECOND REVIEW (2026-10-18, fourth supervision) found the ORDER wrong in two
// places, with every count right: `accept-quote` and `create-booking` went out
// long before the website (97.16, 97.64 say page first), and `verify-domain` went
// out before the support-session change its lock reads (4.3b named only
// `update-booking`). Both rules lived in ROADMAP entries, which the first two
// versions never read. (Both items were ticked after the 2026-10-23 release and their
// declarations removed by 98.18; the website-first `create-booking` rule lives on in
// 99.2/99.2a, and the lock in 4.3b's unlock file.) So every open ROADMAP release line is now read too, and the
// lock is expanded from the server check's own list rather than typed.
//
// BLIND SPOT: migration-drift cannot see triggers, constraints or a data-only
// change. A file a declared row names is put on the sheet anyway, marked as
// such. A file no row names and drift cannot see is not on the sheet at all.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { writeReceipt, REPO } from "./receipt.mjs";

const started_at = new Date().toISOString();
const BREAKS = ["drop-step", "drop-line", "unhold", "open-wait", "no-cron", "no-order", "no-escape", "fn-before-page", "lock-one", "lock-order", "webhook-last"];
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && !BREAKS.includes(BREAK)) {
  console.error(`Unknown --break=${BREAK}. Known: ${BREAKS.join(", ")}.`);
  process.exit(2);
}
const rd = (p) => readFileSync(join(REPO, p), "utf8");
const git = (...a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8" }).trim();

// ---------------------------------------------------------------------------
// THE DECLARATION: one entry per release-carrying FOR-ANDREW row, keyed by the
// ROADMAP number in its heading (or in its first lines). A node is a migration
// file, a program name, "website" or a manual step id.
//   before   [x, y]: x must happen before y
//   manual   steps outside the code; part 0 = must be true before starting,
//            part 1 = setup before the database
//   hold     programs that must NOT go out in this release, with the reason
//   first / alone / last   0.6b's program order
//   onlyIf   { program: manual id } publish it only if that step was done
//   waitsOn  { program: [items] } each must be ticked or AWAITS PUBLISH of it
// ---------------------------------------------------------------------------
const M = {
  body: "20261010010000_email_sends_keeps_the_body.sql",
  support: "20261010030000_support_sessions_read_only.sql",
  google: "20261010040000_google_business_links.sql",
  sign: "20261011010000_email_sign_as_business.sql",
  attempts: "20261013130000_receipt_upload_attempts.sql",
  latePut: "20261013131000_receipt_attempts_late_put.sql",
  cron: "20261016100000_cron_jobs_send_secret.sql",
  payProblem: "20261016160000_booking_payment_problem.sql",
  lines: "20261017000000_booking_lines_same_business.sql",
  photos: "20261017010000_photos_deadlines_same_business.sql",
  customer: "20261017020000_customer_same_business.sql",
  staff: "20261017030000_staff_cannot_delete_bookings_or_write_customers.sql",
  notes: "20261017130000_set_customer_notes_refuses_support_sessions.sql",
  campaigns: "20261017200000_campaigns_get_a_daily_share.sql",
  forget: "20261017210000_forget_customer_forgets_their_email.sql",
  reminders: "20261017220000_reminders_ignore_marketing_opt_out.sql",
  domains: "20261018010000_domain_claims_need_proof.sql",
  lock: "20261018030645_booking_day_rules_lock.sql",
  invites: "20261010020000_action_log_invites.sql",
  expire: "20261017180000_support_sessions_expire.sql",
  endAtAuth: "20261017190000_support_sessions_end_at_auth.sql",
  feed: "20261024150000_calendar_feed_token.sql",
  damageAck: "20261024160000_damage_ack.sql",
  awaitingPay: "20261024210000_awaiting_first_payment.sql",
  unlock: "20261024230000_support_sessions_unlock.sql",
};
// The support-session lock (4.3c): every program carrying either file reads the
// `support_sessions` table, so each goes after the database change that makes it.
// Expanded from the server check's own list (`bundleBefore`), never typed by hand:
// the first version named only `update-booking` and put `verify-domain` ahead of it.
const LOCK = ["_shared/tenant.ts", "_shared/supportSession.ts"];
const SCHEDULED = ["send-owner-reminders", "refresh-weather", "watch-jobs", "photo-reconcile"];
const HOLD_ADMIN = "Held on purpose until 4.3c is finished: 4.3e combined its two button fixes on 2026-10-24 and waits for your \"approve the 4.3e amendments\". When it goes, the unlock database change must already be in, or the button answers \"did not go through\".";
const HOLD_GOOGLE = "Never published; waits for Google's approval (0.15). Until it goes up, the Google Business screen wrongly tells an owner \"Only the owner can connect Google.\"";

const DECLARED = {
  "0.11cc": {
    website: true,
    manual: [{ id: "spanish-check", part: 0, must: true, text: "**Must be done first:** a session with the keys runs 0.11cc's one skipped Spanish check, clean. The website step below carries the receipts switch, and you ruled on 2026-10-13 that nothing may go out with a check skipped. If this has not happened, do not start: 97.14's two database changes in Part 2 need the website in the same sitting." }],
    before: [["spanish-check", M.staff]],
    rule: "The website is not ready to publish until its one skipped Spanish check is run clean, so that check is the first step, ahead of every database change.",
    after: ["A session checks the live site and ticks 0.11cc and 0.11c."],
  },
  "0.6b": {
    first: ["update-booking"], alone: ["platform-billing"], last: ["stripe-webhook"],
    hold: { "platform-admin": HOLD_ADMIN, "google-business": HOLD_GOOGLE },
    before: [[M.body, "send-email"], [M.payProblem, "stripe-webhook"]],
    manual: [{ id: "two-reads", part: 0, text: "Two reads, nothing changes: in the platform's folder, `git status --porcelain supabase/functions` must print nothing (if it prints a file, a session is changing the programs right now; stop). And no browser check may be running on the practice business while you publish." }],
    rule: "`update-booking` first and alone; the one-column change before `send-email`; `platform-billing` alone; the payment webhook last and alone, with its database change before it. `platform-admin` and `google-business` are held back.",
    after: ["The server check should now name ONLY the held programs. Anything else it names did not publish: tell a session its name."],
  },
  "4.3b": {
    migrations: [M.unlock], hold: { "platform-admin": HOLD_ADMIN },
    before: [[M.unlock, "create-business"]], bundleBefore: [[M.unlock, LOCK]],
    rule: "The unlock database change goes before `create-business` and EVERY program that carries the lock (the shared tenant and support-session files); the three support-session changes before it are already applied. Applied on its own it changes nothing. `platform-admin` stays held until 4.3c is finished.",
  },
  "97.3": {
    migrations: [M.cron], functions: SCHEDULED,
    manual: [
      { id: "cron-make", part: 1, text: "Scheduler key (97.3) 1 of 4: in your password manager, generate a random 40-character password (letters and numbers only) and save it as \"Detailing platform — cron secret\". Never paste it anywhere else." },
      { id: "cron-vault", part: 1, text: "Scheduler key 2 of 4: Supabase, project kguqylyzgyzfktkfnhjb, Vault, Add new secret, name `cron_secret`, value: that password." },
      { id: "cron-fnsecret", part: 1, text: "Scheduler key 3 of 4: same project, Edge Functions, Secrets, Add, name `CRON_SECRET`, the same value." },
      { id: "cron-check", part: 1, text: "Scheduler key 4 of 4: SQL editor, `select name from vault.secrets where name = 'cron_secret';` must show one row." },
    ],
    before: [["cron-make", "cron-vault"], ["cron-vault", "cron-fnsecret"], ["cron-fnsecret", "cron-check"], ["cron-check", M.cron],
      ...SCHEDULED.flatMap((f) => [[M.cron, f], ["cron-fnsecret", f]])],
    rule: "The four scheduled programs only after the key is in Vault and on the server and the scheduled-jobs change is applied. Published first, every scheduled run is refused and reminders stop going out.",
    after: [
      "About 20 minutes after the scheduled programs go up: SQL editor, `select status_code, count(*) from net._http_response where created > now() - interval '30 minutes' group by 1;` should show only 200. A 401 means the two key values differ; a 503 means the server secret is missing.",
      "Add `CRON_SECRET=` with the same value to the repo's `.env` yourself, then ask a session to add the header line to the two live test suites that call the watcher and the sweep (97.3 names the change).",
    ],
  },
  "0.11bd": {
    onlyIf: { "photo-door": "cf-purge" },
    manual: [{ id: "cf-purge", part: 1, text: "Cloudflare cache purge (0.11bd): create a Cache Purge token restricted to detailingplatform.com and save it in this platform's Supabase function secrets as `CF_CACHE_PURGE_TOKEN`, and the domain's Zone ID as `CF_MEDIA_ZONE_ID` (docs/media-cache-deletion.md). If you skip this, skip the photo-door program in Part 3 too." }],
    before: [["cf-purge", "photo-door"]],
    rule: "Published without those two secrets, the new `photo-door` refuses every media deletion.",
    after: ["A session repeats 0.11bd's real warmed-URL check after `photo-door` is up."],
  },
  "14.39": {
    migrations: [M.attempts, M.latePut], functions: ["photo-door", "photo-reconcile"],
    manual: [{ id: "r2-proof", part: 0, text: "Recommended, not required: before you start, have a session with the existing R2 setup run 14.39's committed real-R2 proof, rather than relying on the local result." }],
    before: [[M.attempts, M.latePut], [M.latePut, "photo-door"], [M.latePut, "photo-reconcile"]],
    rule: "Its two database changes in order, then `photo-door` and `photo-reconcile`.",
    after: ["A session repeats 14.39's real-R2 sabotage, successful receipt and scheduled-cleanup proof before ticking it."],
  },
  "3.1d": {
    migrations: [M.body], functions: ["send-email"],
    before: [[M.body, "send-email"]],
    rule: "The one-column change before `send-email`, or every email stops being logged until it is in.",
  },
  "98.2": {
    functions: "all",
    rule: "Full green waits for `platform-admin` (4.3c) and `google-business` (99.1); both are held back on this sheet, so the server check will still name them afterwards, and that is expected.",
    after: ["Have a session run the server check (`node scripts/deployed-inventory.mjs`, then `node scripts/receipt.mjs receipts/deployed-inventory.json`) and keep the receipt; 98.2 is ticked only when both pass, which is after the held programs go up."],
  },
  "97.7": {
    website: true, bundles: "_shared/pricing.ts",
    after: ["Optional, ten seconds on your phone: book two cars, put the second on a Saturday, and check \"Weekend rate\" sits under that car on the last step."],
  },
  "97.12": {
    migrations: [M.lines],
    functions: ["get-booking-receipt", "send-invoice", "accept-quote", "respond-to-booking", "booking-ics"],
    rule: "Either order is safe.",
  },
  "97.18": {
    migrations: [M.lock],
    functions: ["create-booking", "reschedule-booking", "update-booking"],
    before: [[M.lock, "create-booking"], [M.lock, "reschedule-booking"], [M.lock, "update-booking"]],
    rule: "The other way round, every booking fails until the database change is in.",
  },
  "97.14": {
    migrations: [M.staff, M.notes], website: true,
    before: [[M.staff, M.notes], [M.notes, "website"]],
    rule: "Both database changes and the website in ONE sitting. Only one half live: the Notes box stops saving (old website, new database) or says \"Your notes were not saved\" (new website, old database).",
  },
  "97.21": { migrations: [M.reminders], rule: "Any order." },
  "97.20": { migrations: [M.forget], unaffected: ["delete-customer"], rule: "Nothing to publish with it." },
  "97.19": {
    migrations: [M.campaigns], website: true, functions: ["send-email", "send-campaign"],
    before: [[M.campaigns, "send-email"], [M.campaigns, "send-campaign"]],
    rule: "Programs before the database stops promo emails until it is in. The row lists the website before the two programs; this sheet publishes them before the website, so the push check at the website step names fewer programs. The danger the row names (programs before the database) is still kept.",
  },
  "97.13": {
    migrations: [M.domains], functions: ["verify-domain"], website: true,
    before: [["verify-domain", M.domains], ["verify-domain", "website"]],
    rule: "The other way round, nobody can add a web address until the program lands.",
    after: ["The live-database test `owner-writes` turns green only once this database change is in."],
  },
  "97.72": {
    migrations: [M.customer], functions: ["send-owner-reminders", "plan-link"],
    rule: "Either order is safe.",
  },
  "97.71": { migrations: [M.photos], rule: "No program needs publishing." },
  "97.68": {
    functions: ["stripe-webhook"],
    manual: [{ id: "stripe-refund-event", part: 1, text: "In Stripe: Developers, Webhooks, open the endpoint for connected accounts and add the event `charge.refunded`. While there, check `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed` are on it too (97.68, 97.11)." }],
    before: [["stripe-refund-event", "stripe-webhook"]],
    waitsOn: { "stripe-webhook": ["97.10", "97.11", "97.69"] },
    rule: "The payment webhook goes out with 97.10, 97.11 and 97.69 in it. Skipping the Stripe setting breaks nothing; the refund line just stays until it is on.",
  },
  "97.37": {
    website: true, migrations: [M.awaitingPay], functions: ["stripe-webhook", "create-business", "platform-admin"],
    before: [[M.awaitingPay, "create-business"], [M.awaitingPay, "stripe-webhook"], [M.awaitingPay, "platform-admin"], ["stripe-webhook", "create-business"], ["website", "create-business"]],
    hold: { "platform-admin": HOLD_ADMIN },
    waitsOn: { "stripe-webhook": ["97.10", "97.11", "97.69"] },
    rule: "The database change first: `create-business` writes the new column and the back office list reads it, so either one ahead of it breaks signup or the list. Then the payment webhook and the website before `create-business`: the other way round, a signup that pays stays dark, and a new account lands on a full dashboard that cannot take bookings. The back office's \"Waiting for payment\" and \"Put live without payment\" ride with `platform-admin`, which is held; until it goes, a waiting signup shows as Suspended there and \"Reopen account\" puts it live (its mark stays set, which is harmless: the dashboard only waits while the account is also switched off).",
    after: ["Optional: make a throwaway account at /app, check it lands on \"Finish payment to go live\" and its booking page is not found, then remove it from the back office."],
  },
  "99.2a": {
    functions: ["send-invoice", "invite-user", "send-owner-reminders"], bundles: "_shared/emailKit.ts", migrations: [M.sign],
    before: [["website", "create-booking"]], conflict: true,
    rule: "Publishing the website alone does not update emails; the programs do. Its database change only matters for the \"Sign emails with the business name\" switch; until it is in, turning that one switch on fails and everything else saves.",
    after: ["Have a session check a real booking confirmation's subject, body and plain-text copy."],
  },
  "99.1": {
    migrations: [M.google], hold: { "google-business": HOLD_GOOGLE },
    rule: "Its database change is harmless on its own and goes in with the rest. The program waits for Google, so the website goes out without it, and the Google Business screen shows the wrong \"Only the owner\" sentence until it does.",
  },
  "9.1b": {
    website: true,
    after: ["Ten seconds after the website is out: open Business on your phone; under \"What customers see\" your booking page shows instead of a white box. Then a session reruns `node --env-file=.env scripts/live-setup-counts.mjs` and its `--break=count` control."],
  },
  "2.15": {
    manual: [{ id: "iphone-walk", part: 0, text: "Optional, before the release: twenty minutes on your iPhone with the keyboard up (2.15 and 8.2), following your list's \"AT RELEASE\" row." }],
  },
};
// ---------------------------------------------------------------------------
// ROADMAP entries carry ordering rules too, and some have no FOR-ANDREW row at
// all (97.16, 97.64). Every OPEN item with an "AWAITS PUBLISH" or "Release step,
// not a decision" line is read: it is declared (above, or here), or excluded in
// ROADMAP_NO_ORDER with its reason. An excluded line that states an order
// (STRONG below) is a failure, so a rule cannot be waved through as "no order".
// ---------------------------------------------------------------------------
const CONFLICT = "**Two of your notes disagree, and this sheet settles it.** The 99.2f note (in \"Use the shorter email dates and times\", and ROADMAP 99.2) says publish `create-booking` before the website. ROADMAP 97.64 says the website first, then `create-booking`. **This sheet does the website first and `create-booking` straight after it, in the same sitting.** Why: the other way round, a customer whose first press was lost and who presses Book again from the old page gets no link to their booking (97.64). Website first, the only cost is that a text-consent tick made in those few minutes is not saved by the old program, and no texts are sent yet anyway (99.2f).";
// 0.6b sends the payment webhook last and alone; 97.37 sends it before `create-business`, which a rule
// also sends after the website. Both cannot hold (98.19, 2026-10-24). 0.6b's reason is isolation: "it
// touches money, so if anything goes wrong there is only one thing it can have been". So the webhook
// stays ALONE and `create-business` follows it as the very last step. Held by verify(): said out loud
// whenever the clash exists, the webhook followed only by programs a rule sends after it, each after it.
const SETTLED = "**Two of your rules pull against each other, and this sheet settles it.** Your launch notes (0.6b) say the payment webhook goes last and alone. ROADMAP 97.37 says the payment webhook goes before `create-business`, and `create-business` also has to wait for the website. **This sheet publishes the payment webhook alone, then `create-business` as the very last step.** Why: 0.6b's reason for last and alone is that if anything goes wrong with money there is only one thing it can have been, and the webhook still goes out by itself. The other way round, a detailer who signs up and pays in the minutes between the two would pay and still not go live (97.37).";
Object.assign(DECLARED, {
  "99.2": {
    functions: ["create-booking", "send-invoice", "invite-user", "send-owner-reminders"], bundles: "_shared/emailKit.ts", website: true, before: [["website", "create-booking"]], conflict: true,
    rule: "Its email wording goes out with every program carrying the shared email kit (with 99.2a). Its line says `create-booking` before the website; 97.64 says the reverse. Settled at the top of this sheet: website first, `create-booking` straight after.",
  },
  "97.53": {
    migrations: [M.feed], functions: ["calendar-feed"], website: true,
    before: [[M.feed, "calendar-feed"], [M.feed, "website"]],
    rule: "The database change first: the feed program and the Notifications screen both read the new column, and without it the screen offers only Create calendar link and the feed refuses every link.",
    after: ["Subscribe for real: Google Calendar, From URL (or Apple Calendar, New Calendar Subscription), paste the link from Notifications, Your calendar. Reset it once and check the old link stops updating."],
  },
  "97.55": {
    migrations: [M.damageAck], functions: ["acknowledge-checkin", "get-booking-receipt"], website: true,
    before: [[M.damageAck, "get-booking-receipt"], [M.damageAck, "acknowledge-checkin"], [M.damageAck, "website"]],
    rule: "The database change first, and it is not optional: `get-booking-receipt` now reads the new `damage_ack_at` column in its main booking read, so published before the change it fails and EVERY customer's receipt link says Booking not found. The check-in program and the website card need it too.",
    after: ["A session with the keys runs `node scripts/checkin-live.mjs`: it ticks one demo booking through the public function, reads it back, and puts it back."],
  },
});
// 98.18, 2026-10-24: 97.64, 97.16, 97.10, 97.11 and 4.1d (declared) and 97.1, 97.2, 97.4, 97.5,
// 97.6, 97.9, 97.69, 97.17, 97.20a, 97.22, 97.24 and 9.1c (excluded) were removed: each was ticked
// after its live check passed (7f7789b3, 40ee9d97). 97.15 is still open but its three support-session
// files are applied (4.3e's FOR-ANDREW note), so its rule moved to 4.3b's unlock file.
const ROADMAP_NO_ORDER = {
  "97.8": "says either can go first",
  "97.25": "the backups repository, not this release",
  "97.90": "checks to run after the publish",
  "0.11c": "the website publish 0.11cc's step carries",
  "0.4": "`platform-admin`, held back on this sheet",
  "0.4g": "`platform-admin`, held back on this sheet",
  "9.18": "`platform-admin`, held back on this sheet",
  "0.6c": "runs 0.6b's order, which this sheet keeps",
  "1.3": "live: the database check sees its one column and does not name the file, so it is already applied",
};
const STRONG = [/\bFIRST\b/, /\b(?:site|page|program|function|migration) first\b|\bbefore (?:publishing|deploying|the (?:app|site|website|page|webhook|program|function)s?)\b|in (?:that|this) order|\bonly then\b|never the function alone|\bafter \d+\.\d+[a-z]*'s\b/i];
if (BREAK === "lock-one") for (const d of Object.values(DECLARED)) { delete d.bundleBefore; if (d.hold?.["platform-admin"] && d.rule?.includes("support-session")) d.before = [...(d.before || []), [M.unlock, "update-booking"]]; }

// Rows that match the release wording and carry no step, each with its reason.
// A new release row that is in neither table turns the check red by name.
const EXCLUDED = {
  "97.91": "this sheet's own pointer row",
  "97.28": "a two-minute edit in the private backups repository, not part of this release (like 97.25)",
  "Publish and apply — the one ordered list": "says DONE 2026-10-10, steps 1 to 9, nothing left",
  "Waiting on you — nothing breaks while these wait": "a 1,400-line group of older rows; NOT READ by this sheet, said on the sheet",
};
if (BREAK === "drop-step") delete DECLARED["97.18"];
if (BREAK === "no-cron") delete DECLARED["97.3"];
if (BREAK === "no-order") for (const d of Object.values(DECLARED)) { delete d.first; delete d.alone; delete d.last; }
if (BREAK === "unhold") for (const d of Object.values(DECLARED)) if (d.hold) delete d.hold["platform-admin"];

// ---------------------------------------------------------------------------
// INPUTS
// ---------------------------------------------------------------------------
const failures = [];
const head = git("rev-parse", "HEAD");
function loadReceipt(name, watched) {
  const r = JSON.parse(rd(`receipts/${name}.json`));
  const sab = r.dimensions?.break || r.dimensions?.sabotage || r.dimensions?.broken_on_purpose
    || (r.warnings || []).some((w) => /sabotage, not a result/.test(w));
  if (sab) failures.push(`receipts/${name}.json is a SABOTAGE run, not a result; re-run ${name}.mjs clean.`);
  // release-sheet-standin.mjs marks its made-up inventory, so one a killed run left behind is refused, not read (98.18).
  if (r.dimensions?.standin) failures.push(`receipts/${name}.json is a STAND-IN written by release-sheet-standin.mjs, not a measurement of the server; put it back with \`git checkout HEAD -- receipts/${name}.json\` and re-run ${name}.mjs.`);
  if (r.canary && r.canary.observed_failure !== true) failures.push(`receipts/${name}.json did not catch its own canary, so its findings prove nothing.`);
  let moved = "";
  try { moved = git("diff", "--name-only", r.git_sha, "HEAD", "--", watched); } catch { moved = `(cannot compare: ${r.git_sha} is not in this repository)`; }
  if (moved) failures.push(`STALE: receipts/${name}.json was taken at ${String(r.git_sha).slice(0, 8)} and ${watched} has changed since (${moved.split("\n").length} file(s)). Re-run ${name}.mjs (read-only, needs credentials) and then this.`);
  return r;
}
const drift = loadReceipt("migration-drift", "supabase/migrations");
const inv = loadReceipt("deployed-inventory", "supabase/functions");

const migFiles = new Set(readdirSync(join(REPO, "supabase/migrations")).filter((f) => f.endsWith(".sql")));
const fnDirs = new Set(readdirSync(join(REPO, "supabase/functions"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_")).map((d) => d.name));

const SQL_RE = /\d{14}_[a-z0-9_]+\.sql/g;
const driftMigs = new Set();
for (const f of drift.failures || []) for (const m of f.matchAll(SQL_RE)) if (migFiles.has(m[0])) driftMigs.add(m[0]);
const invFns = [...new Set([...(inv.dimensions?.differing || []), ...(inv.dimensions?.not_deployed || [])])];
const notDeployed = new Set(inv.dimensions?.not_deployed || []);
const causes = inv.dimensions?.causes || {};

// Every FOR-ANDREW row, with its key: the first ROADMAP number in its heading,
// else in its first three lines, else its heading text.
const RELEASE_RE = /AT YOUR NEXT RELEASE|next (?:back-end )?release|RELEASE STEP|Release step, not a decision|WHEN YOU LAUNCH|AT RELEASE|before you\s+publish|when you publish|routine release step/i;
function allRows(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  lines.forEach((l, i) => {
    if (!/^## /.test(l)) return;
    let j = i + 1;
    while (j < lines.length && !/^## /.test(lines[j])) j++;
    let body = lines.slice(i + 1, j).join("\n");
    // A heading over a list of rows: only its FIRST row is read, and the sheet says so.
    const group = /^\s*- \[.\] \*\*/.test(body);
    if (group) { const second = body.slice(1).search(/\n- \[.\] \*\*/); if (second >= 0) body = body.slice(0, second + 1); }
    const heading = l.slice(3).trim();
    const id = (/\(ROADMAP ([0-9][0-9.]*[a-z]*)/.exec(heading) || /\(ROADMAP ([0-9][0-9.]*[a-z]*)/.exec(lines.slice(i + 1, i + 4).join(" ")) || [])[1];
    const title = heading.replace(/^[A-Z ,]+ · /, "").replace(/\s*\(ROADMAP[^)]*\)\s*$/, "");
    rows.push({ key: id || heading.split(/\.| · /)[0].trim(), id, title, line: i + 1, heading, body, group, release: RELEASE_RE.test(heading) || RELEASE_RE.test(body) || /\bpublish\b/i.test(heading) });
  });
  return rows;
}
const forAndrew = rd("FOR-ANDREW.md");
const everyRow = allRows(forAndrew);
const thirteen = everyRow.filter((r) => /^## DO, AT YOUR NEXT RELEASE/.test("## " + r.heading));
const headingCount = (forAndrew.match(/^## DO, AT YOUR NEXT RELEASE/gm) || []).length;
if (thirteen.length !== headingCount) failures.push(`FOR-ANDREW.md has ${headingCount} "AT YOUR NEXT RELEASE" heading(s) but ${thirteen.length} parsed; a heading has changed shape.`);
if (thirteen.length === 0) failures.push("ZERO release rows found in FOR-ANDREW.md: the heading parser matched nothing.");
const rows = everyRow.filter((r) => r.release && !EXCLUDED[r.key] && !EXCLUDED[r.heading.split(/\.| · /)[0].trim()]);
const rowName = (row) => `${row.file || "FOR-ANDREW.md"}:${row.line} "${row.key} — ${row.title}"`;

// ROADMAP titles and box states.
const roadmap = rd("ROADMAP.md");
const entryOf = (id) => {
  const re = new RegExp(`^- \\[(.)\\] \\*\\*${id.replace(/\./g, "\\.")} — (.*?)\\*\\*`, "m");
  const m = re.exec(roadmap);
  if (!m) return null;
  const rest = roadmap.slice(m.index + m[0].length);
  const end = rest.search(/\n- \[.\] \*\*/);
  return { open: m[1] === " ", title: m[2].replace(/\.$/, "").replace(/\s*\([^()]*\)$/, ""), text: end < 0 ? rest : rest.slice(0, end) };
};
const itemTitle = entryOf;
// Every OPEN ROADMAP item's release line(s): a line that STARTS with the marker,
// plus its wrapped continuation lines. A line that only quotes the phrase is not one.
const MARKER = /^\s*(?:- )?(?:\*\*)?(?:AWAITS PUBLISH|Release step, not a decision)/;
const roadmapRows = [];
{
  const L = roadmap.split(/\r?\n/);
  L.forEach((l, i) => {
    // A title can wrap onto the next line (0.4g), so the closing ** is optional.
    const m = /^- \[ \] \*\*([0-9][0-9.]*[a-z]*) — (.*?)(?:\*\*|$)/.exec(l);
    if (!m) return;
    let j = i + 1;
    while (j < L.length && !/^- \[.\] \*\*/.test(L[j]) && !/^#/.test(L[j])) j++;
    const body = [];
    for (let k = i + 1; k < j; k++) if (MARKER.test(L[k])) {
      body.push(L[k]);
      for (let c = k + 1; c < j && /^ {3,}\S/.test(L[c]) && !/^\s*- /.test(L[c]) && !MARKER.test(L[c]); c++) body.push(L[c]);
    }
    if (body.length) roadmapRows.push({ file: "ROADMAP.md", key: m[1], id: m[1], title: m[2].replace(/\.$/, "").replace(/\s*\([^()]*\)$/, ""), line: i + 1, body: body.join("\n") });
  });
}
// Floor 20 on 2026-10-18; 15 since 98.18 (2026-10-24): the 2026-10-23 release ticked twelve items, leaving 17, and
// an independent line count agreed. A floor, never an equality: more release lines is not a fault.
if (roadmapRows.length < 15) failures.push(`only ${roadmapRows.length} open ROADMAP item(s) with a release line were found; the parser has stopped matching (the 2026-10-24 floor is 15).`);
const readRows = [...rows, ...roadmapRows.filter((r) => DECLARED[r.key])];
const itemOfFile = (file) => {
  const subj = git("log", "--diff-filter=A", "--format=%s", "--", `supabase/migrations/${file}`).split("\n").pop() || "";
  return (/^(\d+\.\d+[a-z]*)\b/.exec(subj) || [])[1] || null;
};
// A program that waits on an item may go out only if the item is ticked, or is
// built and waits only on this very publish (AWAITS PUBLISH naming it).
const waitState = (item, fn) => {
  if (BREAK === "open-wait" && item === "97.10") return "unfinished";
  const e = entryOf(item);
  if (!e) return "unknown";
  if (!e.open) return "ticked";
  return new RegExp(`AWAITS PUBLISH[^\\n]*${fn}`).test(e.text) ? "awaits this publish" : "unfinished";
};

// ---------------------------------------------------------------------------
// RESOLVE each row's declaration, and cross-check it against the row's text.
// ---------------------------------------------------------------------------
const need = { mig: new Map(), fn: new Map(), website: new Set() };
const add = (map, k, id) => (map.get(k) || map.set(k, new Set()).get(k)).add(id);
const manual = new Map(); // id -> { part, text, ids:Set }
const held = new Map();   // program -> { reason, ids:Set }
const order = { first: new Set(), alone: new Set(), last: new Set() };
const onlyIf = new Map();
const rowProblems = [];
// The lock rule, expanded from the server check: each out-of-date program carrying a lock file.
for (const d of Object.values(DECLARED)) for (const [mig, mods] of d.bundleBefore || []) {
  d.before = d.before || [];
  for (const f of invFns) if (mods.some((x) => (causes[f]?.shared_modules || []).includes(x)) && !d.before.some(([a, b]) => a === mig && b === f)) d.before.push([mig, f]);
}
for (const row of readRows) {
  const d = DECLARED[row.key];
  if (!d) { rowProblems.push(`${rowName(row)} carries a release instruction and has NO step on the sheet (no declaration in scripts/release-sheet.mjs, and not excluded)`); continue; }
  const fns = d.functions === "all" ? [...invFns] : [...(d.functions || [])];
  if (d.bundles) fns.push(...Object.entries(causes).filter(([, c]) => (c.shared_modules || []).includes(d.bundles) || (c.function_local || []).includes(d.bundles)).map(([n]) => n));
  for (const f of d.migrations || []) { if (!migFiles.has(f)) rowProblems.push(`${rowName(row)} declares ${f}, which is not in supabase/migrations`); add(need.mig, f, row.key); }
  for (const f of fns) { if (!fnDirs.has(f)) rowProblems.push(`${rowName(row)} declares program ${f}, which is not in supabase/functions`); add(need.fn, f, row.key); }
  if (d.website) need.website.add(row.key);
  for (const s of d.manual || []) (manual.get(s.id) || manual.set(s.id, { ...s, ids: new Set() }).get(s.id)).ids.add(row.key);
  for (const [f, reason] of Object.entries(d.hold || {})) (held.get(f) || held.set(f, { reason, ids: new Set() }).get(f)).ids.add(row.key);
  for (const k of ["first", "alone", "last"]) for (const f of d[k] || []) order[k].add(f);
  for (const [f, s] of Object.entries(d.onlyIf || {})) onlyIf.set(f, s);
  // What the row's own words name must be declared.
  for (const m of row.body.matchAll(SQL_RE)) if (!(d.migrations || []).includes(m[0]) && !(d.before || []).flat().includes(m[0])) rowProblems.push(`${rowName(row)} names ${m[0]} but its declaration does not`);
  if (d.functions !== "all") for (const m of row.body.matchAll(/`([a-z][a-z0-9-]+)`/g)) {
    const f = m[1];
    if (fnDirs.has(f) && !fns.includes(f) && !(d.hold || {})[f] && !(d.before || []).flat().includes(f) && !(d.onlyIf || {})[f]
      && !["first", "alone", "last"].some((k) => (d[k] || []).includes(f)) && !Object.keys(d.waitsOn || {}).includes(f) && !(d.unaffected || []).includes(f)) {
      rowProblems.push(`${rowName(row)} names program ${f} but its declaration does not`);
    }
  }
  // A row that names a shared file means every out-of-date program carrying it (4.3b's lock).
  if (d.functions !== "all") for (const m of new Set([...row.body.matchAll(/`(_shared\/[A-Za-z]+\.ts)`/g)].map((x) => x[1]))) {
    const named = new Set([...fns, ...(d.before || []).flat(), ...Object.keys(d.hold || {})]);
    const missing = invFns.filter((f) => (causes[f]?.shared_modules || []).includes(m) && !named.has(f));
    if (missing.length) rowProblems.push(`${rowName(row)} names ${m}, and its declaration leaves out ${missing.length} out-of-date program(s) carrying it: ${missing.join(", ")}`);
  }
}
// ROADMAP release lines that are not declared must be excluded by name, and an
// exclusion may not wave through a line that states an order.
for (const row of roadmapRows) {
  if (DECLARED[row.key]) continue;
  const why = ROADMAP_NO_ORDER[row.key];
  if (!why) { rowProblems.push(`${rowName(row)} has a release line and is neither declared nor excluded in scripts/release-sheet.mjs`); continue; }
  const said = STRONG.map((re) => (re.exec(row.body) || [])[0]).find(Boolean);
  if (said) rowProblems.push(`${rowName(row)} states an order ("${said}") and is excluded as "${why}"; declare its rule`);
}
for (const k of Object.keys(ROADMAP_NO_ORDER)) if (!roadmapRows.some((r) => r.key === k)) failures.push(`scripts/release-sheet.mjs excludes ROADMAP ${k}, which has no open release line any more; remove it.`);
for (const key of Object.keys(DECLARED)) if (!readRows.some((r) => r.key === key)) failures.push(`scripts/release-sheet.mjs declares ${key}, which has no release row in FOR-ANDREW.md and no open release line in ROADMAP.md any more; remove it.`);
// Programs a program-level wait leaves unfinished are held, with the reason.
for (const d of Object.values(DECLARED)) for (const [f, items] of Object.entries(d.waitsOn || {})) {
  const unfinished = items.filter((i) => waitState(i, f) !== "ticked" && waitState(i, f) !== "awaits this publish");
  if (unfinished.length && BREAK !== "open-wait") held.set(f, { reason: `Waits on ${unfinished.join(", ")}, not finished yet.`, ids: new Set(["waits"]) });
}

// ---------------------------------------------------------------------------
// BUILD THE SHEET
// ---------------------------------------------------------------------------
const part0 = () => [...manual.values()].filter((x) => x.part === 0).sort((a, b) => Number(!!b.must) - Number(!!a.must));
const allBefore = Object.values(DECLARED).flatMap((d) => d.before || []);
const preFns = new Set(allBefore.filter(([a, b]) => fnDirs.has(a) && migFiles.has(b)).map(([a]) => a));
const allMigs = [...new Set([...driftMigs, ...need.mig.keys()])].sort();
const heldHere = [...held.keys()].filter((f) => invFns.includes(f)).sort();
const publish = invFns.filter((f) => !held.has(f)).sort();
const firsts = publish.filter((f) => order.first.has(f) && !preFns.has(f));
const alones = publish.filter((f) => order.alone.has(f));
const lasts = publish.filter((f) => order.last.has(f));
// Programs a rule puts AFTER the website (97.16, 97.64): published straight after it, same sitting.
const afterSite = BREAK === "fn-before-page" ? [] : publish.filter((f) => allBefore.some(([a, b]) => a === "website" && b === f) && !preFns.has(f));
const pass = publish.filter((f) => !preFns.has(f) && !order.first.has(f) && !order.alone.has(f) && !order.last.has(f) && !afterSite.includes(f));
// A program a rule sends after a last-and-alone one (97.37's `create-business` after the webhook) goes after it (98.19).
const afterLast = BREAK === "webhook-last" ? [] : afterSite.filter((f) => allBefore.some(([a, b]) => lasts.includes(a) && b === f));
const afterSiteFirst = afterSite.filter((f) => !afterLast.includes(f));
// A program that must precede a database change goes just before the EARLIEST one it
// must precede, so every database change it needs (4.3b's lock) is already in.
const preAt = new Map();
for (const f of [...preFns].sort()) {
  const at = BREAK === "lock-order" ? allMigs[0] : allBefore.filter(([a, b]) => a === f && migFiles.has(b)).map(([, b]) => b).sort()[0];
  (preAt.get(at) || preAt.set(at, []).get(at)).push(f);
}
const part3 = allMigs.flatMap((m) => [...(preAt.get(m) || []), m]);
// An excluded ROADMAP line naming a database change the sheet does not carry must say why it is live.
for (const row of roadmapRows) {
  const why = !DECLARED[row.key] && ROADMAP_NO_ORDER[row.key];
  if (why && !why.startsWith("live:")) for (const m of row.body.matchAll(SQL_RE)) if (!allMigs.includes(m[0])) rowProblems.push(`${rowName(row)} names ${m[0]}, which is not on the sheet, and its exclusion does not say it is live`);
}
const tags = (set) => (set && set.size ? ` · for ${[...set].filter((x) => x !== "waits").sort().join(", ")}` : "");
const migIds = (f) => { const ids = new Set(need.mig.get(f) || []); const g = itemOfFile(f); if (g) ids.add(g); return ids; };

const out = [];
const stepNo = new Map();
let n = 0;
const push = (key, text, subs = []) => { n++; stepNo.set(key, n); out.push(`${n}. ${text}`); for (const s of subs) out.push(`   - ${s}`); };
// Step numbers are fixed before any text cites them: a dry pass assigns them.
const plan = [
  ...part0().map((s) => s.id),
  ...[...manual.values()].filter((s) => s.part === 1).map((s) => s.id),
  ...part3, ...firsts, ...pass, ...alones, "website", ...afterSiteFirst, ...lasts, ...afterLast,
];
plan.forEach((k, i) => stepNo.set(k, i + 1));
const label = (x) => (x === "website" ? "the website" : manual.has(x) ? `step ${stepNo.get(x)}` : `${x} (step ${stepNo.get(x)})`);
const ref = (node) => (node === "website" ? "the website step" : `step ${stepNo.get(node) ?? "?"}`);
const rulesInto = (node) => allBefore.filter(([, b]) => b === node).map(([a]) => a).filter((a) => !held.has(a));
const afterNote = (node) => { const a = [...new Set(rulesInto(node))].sort((x, y) => stepNo.get(x) - stepNo.get(y)); return a.length ? `only after ${a.map(ref).join(", ")}` : ""; };
const firstMigStep = stepNo.get(part3[0]);
const pushNames = [...afterSite, ...lasts, ...heldHere];
const conflicts = readRows.filter((r) => DECLARED[r.key]?.conflict).map((r) => r.key);
// A program is written in code type only on its own step, so "appears once" stays countable.
const plain = (s) => s.replace(/`([a-z][a-z0-9-]+)`/g, (m, f) => (fnDirs.has(f) ? f : m));

out.push("# Release sheet — everything still to go live, in order", "");
out.push(`Written by \`node scripts/release-sheet.mjs\` from the database check taken at \`${String(drift.git_sha).slice(0, 8)}\` and the server check taken at \`${String(inv.git_sha).slice(0, 8)}\`. Do not edit by hand; re-run it.`, "");
out.push("## In plain words", "");
out.push(`This is one list for your next release, built from the release notes in your list and the release lines in the roadmap. **${allMigs.length} database changes** go into the live database, **${publish.length - afterSite.length - lasts.length} programs** go onto the server, then **the website** goes out, then **${afterSite.length + lasts.length} more programs** straight after it. **${heldHere.length} programs are held back on purpose** and are listed at the bottom, never as a step. Where an order matters, the step says so and names the step it must come after.`, "");
out.push(`**When to start.** ${part0().filter((x) => x.must).map((x) => `Step ${stepNo.get(x.id)}`).join(", ")} must already be done before you begin; if it is not, do not start. Steps 1 to ${firstMigStep - 1} change nothing anybody sees, so you can stop anywhere in them. **Once you start step ${firstMigStep}, go through to the end of the sheet in the same sitting:** 97.14's two database changes and the website must go out together, or the Notes box stops saving${afterSite.length ? `, and ${afterSite.join(" and ")} must follow the website within minutes` : ""}.`, "");
out.push(`**The website step will be refused at first, and that is expected.** Your push first checks the server, and it stops while any program is out of date. At that moment ${pushNames.length} always are: the ${heldHere.length} held back, and the ${afterSite.length + lasts.length} that go straight after the website. When it names only those, push with \`SHIP_WITH_DRIFT=1 git push\`, as your launch notes (0.6b) say.`, "");
if (conflicts.length) out.push(plain(CONFLICT), "");
// Said whenever the clash exists, so the sabotage that drops the settled order is held to the paragraph.
const clash = lasts.some((l) => afterSite.some((f) => allBefore.some(([a, b]) => a === l && b === f)));
if (clash) out.push(plain(SETTLED), "");
out.push("Nothing here has been done for you. No session applies, publishes or pushes. Each step ends with the ROADMAP items it is for; your notes for each stay in your list as the detail.", "");

out.push("## Part 0 — before you start", "");
for (const s of part0()) push(s.id, `${s.text}${tags(s.ids)}`);
out.push("");
out.push("## Part 1 — setup outside the code", "");
for (const s of [...manual.values()].filter((x) => x.part === 1)) { const a = afterNote(s.id); push(s.id, `${s.text}${a ? ` — ${a}` : ""}${tags(s.ids)}`); }
out.push("");
out.push("## Part 2 — the database changes, oldest first", "");
out.push("Apply each file from `supabase/migrations/` in this order. One program goes in between them, where a rule needs it.", "");
for (const f of part3) {
  if (preFns.has(f)) {
    const must = allBefore.filter(([a, b]) => a === f && migFiles.has(b)).map(([, b]) => ref(b)).sort();
    const a = afterNote(f);
    push(f, `Publish \`${f}\` here, between the database changes${a ? ` — ${a}` : ""}; it must go before ${[...new Set(must)].join(", ")}.${tags(need.fn.get(f))}`);
    continue;
  }
  const a = afterNote(f);
  const unseen = driftMigs.has(f) ? "" : " (the database check cannot see this kind of change; it is listed because your note says it is not applied)";
  const named = [...migIds(f)].map((id) => { const t = itemTitle(id); return t ? `${id} (${t.title})` : id; });
  push(f, `Apply \`${f}\`${a ? ` — ${a}` : ""}${unseen}${named.length ? ` · for ${named.join("; ")}` : " · no ROADMAP item found for it"}`);
}
out.push("");
out.push("## Part 3 — the programs", "");
const fnLine = (f, lead) => {
  const notes = [];
  const a = afterNote(f); if (a) notes.push(a);
  if (onlyIf.has(f)) notes.push(`only if you did ${ref(onlyIf.get(f))}; if you skipped it, skip this one too and expect the push check to name it`);
  if (SCHEDULED.includes(f)) notes.push("a scheduled program: needs the scheduler key from Part 1");
  if (notDeployed.has(f)) notes.push("never published before");
  for (const d of Object.values(DECLARED)) for (const i of (d.waitsOn || {})[f] || []) notes.push(`carries ${i} (${waitState(i, f)})`);
  return `${lead}\`${f}\`${notes.length ? ` — ${notes.join("; ")}` : ""}${tags(need.fn.get(f))}`;
};
if (firsts.length) { out.push("**First, alone:**", ""); for (const f of firsts) push(f, fnLine(f, "Publish, alone, ")); out.push(""); }
out.push("**Then these, in one pass, in any order among themselves:**", "");
for (const f of pass) push(f, fnLine(f, "Publish "));
out.push("");
if (alones.length) { out.push("**Then, alone:**", ""); for (const f of alones) push(f, fnLine(f, "Publish, alone, ")); out.push(""); }
out.push("## Part 4 — the website", "");
push("website", `**Publish the website** (a push to main).${pushNames.length ? ` The push check will stop and name ${pushNames.join(", ")}${onlyIf.size ? ` (and ${[...onlyIf.keys()].join(", ")} if you skipped it)` : ""}; when it names only those, push with \`SHIP_WITH_DRIFT=1 git push\`.` : ""} Then wait until Netlify shows this deploy as Published (a few minutes) and go straight on.${tags(need.website)}`);
out.push("");
out.push("## Part 5 — straight after the website, same sitting", "");
if (afterSiteFirst.length) { out.push("**These go after the website, never before it:**", ""); for (const f of afterSiteFirst) push(f, fnLine(f, "Publish ")); out.push(""); }
if (lasts.length) { out.push(afterLast.length ? "**Then alone, nothing else running; check it before the next step:**" : "**Last, alone, nothing else running:**", ""); for (const f of lasts) push(f, fnLine(f, afterLast.length ? "Publish, alone, " : "Publish, last and alone, ")); out.push(""); }
if (afterLast.length) { out.push("**Last of all, after the payment webhook:**", ""); for (const f of afterLast) push(f, fnLine(f, "Publish, last, ")); out.push(""); }
out.push("## Held back on purpose — do NOT publish these this time", "");
for (const f of heldHere) out.push(`- \`${f}\` — ${held.get(f).reason}${tags(held.get(f).ids)}`);
out.push("");
out.push("## The rules each note set, and where this sheet keeps them", "");
const ruleRows = readRows.filter((r, i) => readRows.findIndex((x) => x.key === r.key) === i);
for (const row of ruleRows) {
  const d = DECLARED[row.key];
  if (!d) continue;
  const kept = (d.before || []).filter(([a, b]) => !held.has(a) && !held.has(b)).map(([a, b]) => `${label(a)} before ${label(b)}`);
  out.push(`- **${row.key} — ${row.title}${row.file ? " (roadmap)" : ""}.** ${plain(d.rule || "No order of its own.")}${kept.length ? ` Kept: ${kept.join("; ")}.` : ""}`);
}
out.push("");
out.push("## After the release", "");
for (const row of ruleRows) for (const a of DECLARED[row.key]?.after || []) out.push(`- ${plain(a)} · for ${row.key}`);
out.push("- Have a session re-run the database check and the server check, then this sheet. Anything still listed did not go live.");
out.push("");
out.push("## What this sheet reads, and what it does not", "");
out.push(`It reads every row in your list that carries a release instruction: ${rows.map((r) => r.key).join(", ")}. It also reads the release line of every open roadmap item (${roadmapRows.length}); ${ruleRows.filter((r) => r.file).map((r) => r.key).join(", ")} set an order with no row in your list, and the other ${roadmapRows.filter((r) => !DECLARED[r.key]).length} are excluded by name in the script, each with its reason. ${rows.filter((r) => r.group).map((r) => `Of "${r.heading.split(" — ")[0]}" it reads only the first row (${r.key}); the rows under it are the 2026-09-23 publish order your launch notes (0.6b) replaced.`).join(" ")} It does not read: ${Object.entries(EXCLUDED).map(([k, v]) => `"${k}" (${v})`).join("; ")}. The database check cannot see a change made only of triggers, constraints or data, so a file like that is on this sheet only if one of the rows it reads names it.`, "");

let sheet = out.join("\n");
if (BREAK === "no-escape") sheet = sheet.split("\n").map((l) => (l.includes("**Publish the website**") ? l.replace(/ The push check will stop and name.*?git push`\./, "") : l)).join("\n");
if (BREAK === "drop-line") sheet = sheet.split("\n").filter((l) => !l.includes("`verify-domain`")).join("\n");

// ---------------------------------------------------------------------------
// VERIFY THE WRITTEN TEXT
// ---------------------------------------------------------------------------
function verify(text, { migs, fns, rowList, decl, extraRows = [] }) {
  const bad = [];
  const all = text.split("\n");
  const stepLines = all.filter((l) => /^\d+\. /.test(l));
  const heldStart = all.findIndex((l) => l.startsWith("## Held back"));
  const heldLines = heldStart < 0 ? [] : all.slice(heldStart + 1, all.findIndex((l, i) => i > heldStart && l.startsWith("## ")));
  const lineOf = (needle) => stepLines.findIndex((l) => l.includes(needle));
  const count = (needle) => text.split(needle).length - 1;
  const isHeld = (f) => heldLines.some((l) => l.startsWith(`- \`${f}\``));
  // "Last" means no program after it except ones a rule sends after it (98.19: 97.37's `create-business`).
  const lastOk = (f) => {
    const i = lineOf("`" + f + "`");
    return i >= 0 && /alone/.test(stepLines[i]) && stepLines.slice(i + 1).every((l) => {
      const g = (/`([a-z][a-z0-9-]+)`/.exec(l) || [])[1];
      return Object.values(decl).some((d) => (d.before || []).some(([a, b]) => a === f && b === g));
    });
  };
  const positions = [];
  for (const f of migs) {
    const c = count(`\`${f}\``);
    if (c !== 1) bad.push(`database change ${f} appears ${c} time(s) on the sheet, not once`);
    else positions.push([f, lineOf(`\`${f}\``)]);
  }
  for (let i = 1; i < positions.length; i++) if (positions[i][1] < positions[i - 1][1]) bad.push(`${positions[i][0]} is listed before ${positions[i - 1][0]}; the database changes are out of version order`);
  for (const f of fns) { const c = count(`\`${f}\``); if (c !== 1) bad.push(`program ${f} appears ${c} time(s) on the sheet, not once`); }
  const manualText = (id) => { for (const d of Object.values(decl)) for (const s of d.manual || []) if (s.id === id) return s.text; return null; };
  const nodeLine = (x) => (x === "website" ? lineOf("**Publish the website**") : manualText(x) ? lineOf(manualText(x).slice(0, 50)) : lineOf(`\`${x}\``));
  const tagged = (i, id) => i >= 0 && new RegExp(`(?:for |; |, )${id.replace(/\./g, "\\.")}\\b`).test(stepLines[i]);
  const websiteAt = lineOf("**Publish the website**");
  const firstMig = Math.min(...migs.map((f) => lineOf(`\`${f}\``)).filter((i) => i >= 0));
  for (const row of [...rowList, ...extraRows]) {
    const d = decl[row.key];
    const name = rowName(row);
    if (!d) { bad.push(`${name} is not covered by any step`); continue; }
    // The row's own words: what it holds back must be held; what it sends alone must stand alone.
    for (const m of row.body.matchAll(/Held back on purpose:\s*`([a-z-]+)`/g)) if (fns.includes(m[1]) && !isHeld(m[1])) bad.push(`${name} holds ${m[1]} back on purpose, and the sheet does not (it is ${lineOf("`" + m[1] + "`") >= 0 ? `step ${lineOf("`" + m[1] + "`") + 1}` : "missing"})`);
    for (const f of Object.keys(d.hold || {})) if (fns.includes(f) && !isHeld(f)) bad.push(`${name} holds ${f} back, and the sheet publishes it`);
    for (const m of row.body.matchAll(/`([a-z-]+)`(?: first,)? alone/g)) if (fns.includes(m[1]) && !isHeld(m[1]) && !/alone/.test(stepLines[lineOf("`" + m[1] + "`")] || "")) bad.push(`${name} sends ${m[1]} alone, and the sheet does not`);
    if (/payment webhook,? last and alone/i.test(row.body) && fns.includes("stripe-webhook") && !isHeld("stripe-webhook")) {
      if (!lastOk("stripe-webhook")) bad.push(`${name} sends the payment webhook last and alone, and the sheet does not (step ${lineOf("`stripe-webhook`") + 1})`);
    }
    const nodes = [...(d.migrations || []), ...(d.functions === "all" ? [] : d.functions || []).filter((f) => fns.includes(f) && !isHeld(f)), ...(d.website ? ["website"] : []), ...(d.manual || []).map((s) => s.id)];
    if (!nodes.length && !Object.keys(d.hold || {}).length && !(d.after || []).length && d.functions !== "all") bad.push(`${name} declares nothing to do`);
    for (const x of nodes) if (!tagged(nodeLine(x), row.key)) bad.push(`${name}: its step "${x}" is not on the sheet tagged ${row.key}`);
    if (d.functions === "all" && !stepLines.some((l, i) => tagged(i, row.key))) bad.push(`${name} is not covered by any step`);
    for (const [a, b] of d.before || []) {
      if (isHeld(a) || isHeld(b)) continue;
      const ia = nodeLine(a), ib = nodeLine(b);
      if (ia < 0 || ib < 0 || ia >= ib) bad.push(`${name}: its rule "${a} before ${b}" does not hold on the sheet (${ia < 0 ? a + " missing" : ib < 0 ? b + " missing" : `step ${ia + 1} is not before step ${ib + 1}`})`);
    }
    for (const [f, items] of Object.entries(d.waitsOn || {})) for (const i of items) {
      const st = waitState(i, f);
      if (st !== "ticked" && st !== "awaits this publish" && !isHeld(f)) bad.push(`${name}: ${f} waits on ${i}, which is ${st}, and the sheet publishes it anyway (step ${lineOf("`" + f + "`") + 1})`);
    }
    for (const f of d.first || []) if (!isHeld(f) && fns.includes(f)) { const i = lineOf("`" + f + "`"); if (!/alone/.test(stepLines[i] || "") || stepLines.some((l, j) => j < i && /^\d+\. Publish /.test(l) && !l.includes("between the database changes"))) bad.push(`${name}: ${f} is not the first program, alone`); }
    for (const f of d.last || []) if (!isHeld(f) && fns.includes(f) && !lastOk(f)) bad.push(`${name}: ${f} is not the last program, alone`);
  }
  // After the website: only programs a rule sends after it, then the last-and-alone one.
  const afterRule = new Set(Object.values(decl).flatMap((d) => (d.before || []).filter(([a]) => a === "website").map(([, b]) => b)));
  const lastOnes = new Set(Object.values(decl).flatMap((d) => d.last || []));
  for (const l of stepLines.slice(websiteAt + 1)) {
    const f = (/`([a-z][a-z0-9-]+)`/.exec(l) || [])[1];
    if (!afterRule.has(f) && !lastOnes.has(f)) bad.push(`step ${l.split(".")[0]} comes after the website, and no rule sends ${f || "it"} there`);
    else if (f && !(stepLines[websiteAt] || "").includes(f)) bad.push(`the website step does not warn that the push check will name ${f}, which goes after it`);
  }
  // A settled disagreement is said out loud, naming both sides.
  const conflictKeys = rowList.filter((r) => decl[r.key]?.conflict).map((r) => r.key);
  if (conflictKeys.length && !(/Two of your notes disagree/.test(text) && /99\.2f/.test(text) && /97\.64/.test(text))) bad.push(`${conflictKeys.join(", ")} disagree about the order, and the sheet does not say so or how it is settled`);
  // A last-and-alone program that another rule sends ahead of a program (0.6b against 97.37) is a clash:
  // the sheet says so, naming both, and its steps do what it says.
  for (const f of new Set(Object.values(decl).flatMap((d) => d.last || []))) {
    if (isHeld(f) || !fns.includes(f)) continue;
    const owners = Object.entries(decl).filter(([, d]) => (d.last || []).includes(f)).map(([k]) => k);
    for (const [k, d] of Object.entries(decl)) for (const [a, b] of d.before || []) {
      if (a !== f || isHeld(b) || !fns.includes(b)) continue;
      const keys = [...owners, k].join(" and ");
      const fi = lineOf("`" + f + "`"), bi = lineOf("`" + b + "`");
      if (!(/Two of your rules pull against each other/.test(text) && [...owners, k].every((o) => text.includes(`(${o})`) || text.includes(`ROADMAP ${o} `))))
        bad.push(`${keys} disagree about the order (${f} last, and ${f} before ${b}), and the sheet does not say so or how it is settled`);
      else if (!(bi > fi && lastOk(f))) bad.push(`${keys}: the sheet says it settles their clash by publishing ${f} alone and then ${b} last, and its steps do not (${f} is step ${fi + 1}, ${b} is step ${bi + 1})`);
    }
  }
  const heldNames = heldLines.map((l) => (/^- `([a-z-]+)`/.exec(l) || [])[1]).filter(Boolean);
  if (heldNames.length && !(stepLines[websiteAt] || "").includes("SHIP_WITH_DRIFT=1")) bad.push("programs are held back, and the website step does not say how to push past the check that refuses it");
  for (const f of heldNames) if (!(stepLines[websiteAt] || "").includes(f)) bad.push(`the website step does not warn that the push check will name held program ${f}`);
  if (/stop at the end of a part/i.test(text)) bad.push("the plain words still advise stopping at the end of a part, which leaves 97.14 half done");
  const part2At = all.findIndex((l) => l.startsWith("## Part 2"));
  const firstOfPart2 = stepLines.indexOf(all.slice(part2At).find((l) => /^\d+\. /.test(l)));
  if (firstMig >= 0 && !text.includes(`Once you start step ${firstOfPart2 + 1}, go through to the end of the sheet in the same sitting`)) bad.push("the plain words do not say where the same-sitting stretch starts");
  return bad;
}
const ctx = { migs: [...driftMigs].sort(), fns: invFns, rowList: readRows, decl: DECLARED };
const sheetFindings = [...verify(sheet, ctx), ...rowProblems];
for (const row of thirteen) if (!rows.includes(row)) sheetFindings.push(`${rowName(row)} is an "AT YOUR NEXT RELEASE" row the sheet does not read`);
failures.push(...sheetFindings);

// CANARY: an extra row and an extra migration the sheet never heard of must both be reported.
const canaryRow = { key: "0.0", id: "0.0", title: "canary row", line: 0, body: "" };
const canaryMig = "20991231000000_canary.sql";
const canaryFindings = verify(sheet, { ...ctx, migs: [...ctx.migs, canaryMig], extraRows: [canaryRow] });
const canaryCaught = canaryFindings.some((f) => f.includes('"0.0 — canary row" is not covered')) && canaryFindings.some((f) => f.includes(canaryMig));

// ---------------------------------------------------------------------------
// WRITE
// ---------------------------------------------------------------------------
// Each sabotage keeps its own sheet and receipt, so neither a clean run nor the other sabotage overwrites it.
const sheetPath = BREAK ? `receipts/release-sheet.${BREAK}.sabotage.md` : "docs/release-sheet.md";
writeFileSync(join(REPO, sheetPath), sheet.replace(/\n+$/, "") + "\n");
const targets = ctx.migs.length + invFns.length + rows.length + roadmapRows.length;
const ok = failures.length === 0 && canaryCaught;
const { path: receiptPath } = writeReceipt({
  check_id: BREAK ? `release-sheet.${BREAK}` : "release-sheet",
  started_at,
  status: ok ? "pass" : "fail",
  expected_targets: targets,
  discovered_targets: ok ? targets : Math.max(1, targets - sheetFindings.length),
  attempted_targets: targets,
  completed_targets: targets,
  skipped_targets: 0,
  assertions_executed: ctx.migs.length * 2 + invFns.length + readRows.length * 4 + roadmapRows.length + 6,
  min_assertions: 60,
  failures,
  artifacts: ["scripts/release-sheet.mjs", sheetPath],
  warnings: [
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
    "Reads only the migration-drift and deployed-inventory RECEIPTS; it is as current as they are, and refuses (STALE) when supabase/ changed since either was taken.",
    "migration-drift cannot see triggers, constraints or data-only migrations; such a file reaches this sheet only when a row it reads names it.",
    `NOT READ: ${Object.keys(EXCLUDED).join("; ")}.`,
  ],
  dimensions: {
    ...(BREAK ? { break: BREAK } : {}),
    head,
    drift_receipt_sha: drift.git_sha,
    inventory_receipt_sha: inv.git_sha,
    migrations_from_drift: ctx.migs,
    migrations_from_rows_only: allMigs.filter((f) => !driftMigs.has(f)),
    programs_named: invFns.length,
    programs_published: publish.length,
    programs_held: heldHere,
    release_rows_read: rows.map((r) => r.key),
    roadmap_release_lines_read: roadmapRows.length,
    roadmap_rules_declared: readRows.filter((r) => r.file).map((r) => r.key),
    roadmap_excluded: roadmapRows.filter((r) => !DECLARED[r.key]).map((r) => r.key),
    after_the_website: afterSite,
    after_the_last_program: afterLast,
    at_your_next_release_rows: thirteen.map((r) => r.key),
    steps: n,
  },
  canary: {
    id: "a release row and a migration file the sheet never heard of must both be reported",
    observed_failure: canaryCaught,
    findings: canaryFindings.filter((f) => f.includes("0.0") || f.includes(canaryMig)),
  },
});

console.log(`${rows.length} release row(s) read (${thirteen.length} "AT YOUR NEXT RELEASE") and ${roadmapRows.length} ROADMAP release line(s) (${readRows.filter((r) => r.file).length} declared), ${ctx.migs.length} unapplied database change(s) from the drift check (+${allMigs.length - ctx.migs.length} named only by a row), ${invFns.length} program(s) not live: ${publish.length} published, ${heldHere.length} held (${heldHere.join(", ")}); ${n} step(s).`);
console.log(`canary ${canaryCaught ? "caught" : "NOT CAUGHT"}`);
for (const f of failures) console.log("FAIL — " + f);
console.log(`${ok ? "PASS" : "FAIL"} — sheet ${sheetPath}, receipt ${receiptPath}`);
process.exit(ok ? 0 : 1);
