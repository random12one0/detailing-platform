// ROADMAP 8.12 — THE DEAD MAN'S SWITCH.
//
// `job_heartbeats` has recorded when each scheduled job last finished since
// roadmap 7.3 item D, and the back office draws a line about it. **Nothing has
// ever TOLD anybody.** That is a monitor you have to remember to visit, about
// a class of failure whose entire character is that nobody knows to look —
// this product has been bitten by it twice (a dead email relay for the whole
// of roadmap 0.2, VAPID keys never set for the life of the push feature) and
// both times the only evidence was a console line inside a function.
//
// This runs every fifteen minutes, asks the database what has CHANGED, and
// emails the owner. It is deliberately small: the decision, the marking and
// the concurrency are all one SQL statement (`claim_job_alerts`), so this file
// is a sentence-builder and a sender.
//
// ---------------------------------------------------------------------------
// TWO LEGS, AND THE SECOND IS THE ONE THAT CANNOT BE BUILT FROM IN HERE.
// ---------------------------------------------------------------------------
// **INSIDE:** one job stopped while the scheduler kept running — the likely
// case, and what the email below is for.
//
// **OUTSIDE:** `pg_cron` itself stopped, the project was paused, the database
// is unreachable. Then this function never runs either, and the silence is
// byte-identical to everything being fine. **No amount of code in this file
// can see that**, so it pings `platform_settings.healthcheck_url` on every
// healthy run and something outside notices when the pings stop.
//
// It is NULL today. The back office prints that in as many words rather than
// printing nothing, because a monitor that is not set up looks exactly like a
// monitor with nothing to report — which is the whole failure this item
// exists to remove.
//
// ---------------------------------------------------------------------------
// THE SCHEDULER'S KEY SINCE ROADMAP 97.3 — the call must carry `x-cron-secret`
// (`_shared/cronAuth.ts`), read from Vault by the cron job. What follows is the
// earlier reasoning for running without one, kept because it is what that fixed:
// ---------------------------------------------------------------------------
// `pg_cron` posts to it with no header, because the only key that would
// satisfy a check is the service-role key and that must never be written into
// a migration. What an unauthenticated caller can make this do is bounded by
// the claim: it sends only what a scheduled run a few minutes later would have
// sent, once, and a second call sends nothing at all.
//
// The one thing a caller CAN do is make the outside check look healthier than
// it is, by pinging on our behalf. That costs them a URL they do not have and
// an indefinite commitment to keep our monitoring green; it is noted rather
// than defended against, because the alternative is a secret in a migration.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { cronRefusal } from "../_shared/cronAuth.ts";
import { sendTenantEmail } from "../_shared/email.ts";
import { platformAlertEmail } from "../_shared/emailTemplates.ts";
import { PLATFORM_NAME, platformBrand } from "../_shared/platformBrand.ts";
import { PLATFORM_URL } from "../_shared/config.ts";

interface Change {
  job: string;
  ran_at: string;
  went: "stale" | "recovered";
}

// THE OWNER'S WORDS FOR OUR JOB NAMES. A key with no entry prints the key,
// which is ugly and correct — it is better to be told that
// `some-new-sweep` has stopped than to be told nothing because nobody
// updated a lookup table.
const LABELS: Record<string, string> = {
  "send-owner-reminders": "the reminder sweep",
  "accrue-plan-visits": "the nightly plan-visit accrual",
};
const label = (job: string) => LABELS[job] ?? job;

/** "3 hours ago" / "2 days ago" — enough to say how bad it is. */
function since(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return "an unknown time ago";
  const mins = Math.round(ms / 60_000);
  if (mins < 90) return `${mins} minutes ago`;
  const hours = Math.round(ms / 3_600_000);
  if (hours < 48) return `${hours} hours ago`;
  return `${Math.round(ms / 86_400_000)} days ago`;
}

/**
 * THE PING, AND IT IS BEST-EFFORT LIKE EVERY OTHER SIDE EFFECT IN THIS FILE.
 *
 * A monitor that could fail the run it is monitoring would be causing the
 * outage it watches for — the same sentence the heartbeat inside the reminder
 * sweep carries. A short timeout, because healthchecks.io being slow must not
 * hold an edge function open.
 */
async function pingOutside(url: string | null): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(5_000),
      body: "",
    });
    if (!res.ok) console.error("healthcheck ping refused:", res.status);
    return res.ok;
  } catch (e) {
    console.error("healthcheck ping failed:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  const refused = cronRefusal(req);
  if (refused) return refused;

  try {
    // -----------------------------------------------------------------------
    // THE ADDRESS IS READ *BEFORE* THE CLAIM, AND THAT ORDER IS THE WHOLE BUG.
    // -----------------------------------------------------------------------
    // Claiming first and reading second lost a real notice on 2026-09-13:
    //
    //     02:07:00.819  rpc/claim_job_alerts   200   <- claimed "recovered"
    //     02:07:00.914  platform_settings      504   <- and then this
    //
    // The claim had already cleared `alerted_at`, the undefined `ps` failed
    // `ps?.owner_email`, and the only "it is running again" this outage would
    // ever produce went into a `console.warn`. Andrew saw a stoppage email
    // with no all-clear after it. **`FOUND.md` measured ~1.1% of every REST
    // call in this project returning 504**, so at two calls a tick this loses
    // roughly thirty claims a month — stoppages exactly as readily.
    //
    // Read first, and a 504 costs one skipped tick instead of one lost alarm:
    // nothing has been consumed, and the next run sees the same change.
    //
    // **AND THE `error` IS READ, NOT ONLY THE DATA.** `.maybeSingle()` returns
    // "no row" and "the read failed" through the same `data: null`, so an
    // unconfigured product and a timed-out gateway were one value. Saying "no
    // owner_email" about a read that never landed is the instrument reporting
    // on a question it could not ask.
    const { data: ps, error: psErr } = await supabase.from("platform_settings")
      .select("owner_email, healthcheck_url").limit(1).maybeSingle();
    if (psErr) {
      // NO CLAIM AND NO PING. The ping means "this watcher ran and is
      // healthy", and a run that could not find out who to tell is not that —
      // letting it through would make the outside monitor green for a watcher
      // doing nothing, which is the failure this whole item exists to remove.
      console.error("watch-jobs: could not read platform_settings, claiming nothing:", psErr.message);
      return json({ success: false, skipped: "settings_unreadable" }, 503);
    }

    // ONE STATEMENT DECIDES AND MARKS. See the migration: two runs overlapping
    // cannot both report the same stoppage, and a job that has been down for a
    // week is not in this list because he has already been told.
    //
    // ponytail: it watches the ROWS, so a job whose row was DELETED is watched
    // by nothing — no row, no comparison, no alert. Nothing in the product
    // deletes one (`note_heartbeat` upserts and the seed migration creates
    // them), and the back office's named list is what draws "have never
    // reported" if one ever goes. Give the watcher its own expected-job list
    // the day a job can legitimately be removed.
    const { data, error } = await supabase.rpc("claim_job_alerts");
    if (error) throw new Error(error.message);
    const changes = (data ?? []) as Change[];

    let sent = false;
    if (changes.length > 0 && ps?.owner_email) {
      const stopped = changes.filter((c) => c.went === "stale");
      const back = changes.filter((c) => c.went === "recovered");

      // THE HEADLINE IS THE WHOLE MESSAGE ON A PHONE, so it says which way and
      // which job rather than "scheduled job update".
      const headline = stopped.length === 1 && back.length === 0
        ? `${label(stopped[0].job)} has stopped running`
        : stopped.length > 0
        ? `${stopped.length} scheduled jobs have stopped running`
        : back.length === 1
        ? `${label(back[0].job)} is running again`
        : `${back.length} scheduled jobs are running again`;

      const intro = stopped.length > 0
        // WHAT IT MEANS FOR HIM, not what it means for the database. He is not
        // a coder and "a cron job is stale" is not an actionable sentence.
        ? "Something that is supposed to run on a schedule has not finished when it should have. While it is down, the work it does silently does not happen: reminders do not go out, or plan visits are not credited. Nothing is lost; it catches up once it is running again."
        : "The job below is finishing on schedule again. Anything it was due to do while it was down has been picked up on its next run.";

      const mail = platformAlertEmail(platformBrand(PLATFORM_URL), {
        kind: "Scheduled jobs",
        headline: headline.charAt(0).toUpperCase() + headline.slice(1),
        intro,
        facts: changes.map((c) => [
          label(c.job).replace(/^the /, "").replace(/^\w/, (m) => m.toUpperCase()),
          c.went === "stale"
            ? `has not finished since ${since(c.ran_at)}`
            : `finished ${since(c.ran_at)}`,
        ] as [string, string]),
        buttonLabel: "Open the back office",
        buttonUrl: `${PLATFORM_URL}/admin`,
      });

      // NO `business_id`: this is the platform speaking about its own
      // plumbing, and there is no tenant it is a fact about. `send-email`
      // allows that only for platform mail (`sender_name` set), so a tenant
      // email that forgot its business still fails loudly.
      sent = await sendTenantEmail({
        to: ps.owner_email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        senderName: PLATFORM_NAME,
      });

      // A CLAIM THAT WAS NEVER SENT IS AN ALARM THAT NEVER RINGS, AND THAT IS
      // AS TRUE OF THE ALL-CLEAR AS OF THE ALARM — corrected 2026-09-13.
      //
      // This used to re-arm only the stoppages, on the stated grounds that a
      // lost recovery is good news he can also read on the screen. **Andrew
      // has rejected that trade in as many words:** a stoppage with no
      // all-clear after it is not a smaller failure than a missed stoppage, it
      // is the one that teaches him to stop opening the emails — and then the
      // next real alarm goes unread too. The relay can still refuse after a
      // good claim (a Resend 429 on the daily cap is a non-2xx and
      // `sendTenantEmail` answers false), so both halves go back.
      if (!sent) {
        try {
          await supabase.rpc("restore_job_alerts", {
            p_stale: stopped.map((c) => c.job),
            p_recovered: back.map((c) => c.job),
          });
        } catch (e) {
          console.error("could not re-arm the claimed jobs:", e);
        }
      }
    } else if (changes.length > 0) {
      // A FEATURE THAT IS OFF LOOKS EXACTLY LIKE A FEATURE THAT IS QUIET. The
      // claim has already been marked, so say plainly that the one thing this
      // function exists to do did not happen.
      console.warn("jobs changed state and there is no owner_email to tell:", changes);
    }

    // THE OUTSIDE LEG, LAST AND UNCONDITIONAL ON THE EMAIL. It says "this
    // watcher ran", which is a different fact from "everything it watches is
    // healthy" — and it is the only fact nothing else in this system can
    // observe.
    const pinged = await pingOutside(ps?.healthcheck_url ?? null);

    return json({ success: true, changes, emailed: sent, pinged });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
