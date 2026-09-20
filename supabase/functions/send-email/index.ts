// The ONE internal email relay. Every other function sends mail by calling
// this with the service-role key; this file is the only place that knows the
// provider (Resend today — swap providers by editing this file alone).
//
// Addressing policy: mail is sent FROM the platform's verified domain with
// the tenant's brand name as display name; Reply-To is the tenant's own
// contact address, so replies reach the right detailer and never another
// business.
//
// Input: { business_id, to, subject, body, text?, attachments?, sender_name? }
// `business_id` is required for every tenant email and optional for the two
// kinds the PLATFORM sends in its own name (roadmap 2.20 stage 2 and 8.12).
//
// ROADMAP 14.3 — AND EVERY ONE OF THEM NOW LEAVES A ROW IN `email_sends`.
// There are five ways out of this function and until 14.3 three of them were
// silent: a reserved domain and a missing key each wrote a `console.warn`, and
// a provider refusal wrote a `console.error` — all three into an edge-function
// log nobody watches and which expires. So a customer saying "I never got the
// confirmation" had no answer anywhere in the system. `record()` below is
// called on all five, it is best-effort exactly like the counter and the
// bounce flag, and `resend-webhook` later updates the same row with what
// actually happened to the message.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { PLATFORM_FROM_ADDRESS } from "../_shared/config.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/**
 * STAMP OR CLEAR THE ADDRESS ON THE CUSTOMER IT BELONGS TO — roadmap 2.20.
 *
 * `failure` null means the send worked and the flag comes off.
 *
 * IT IS BEST-EFFORT, LIKE EVERY OTHER LINE IN THIS FILE. This function is
 * bookkeeping about an email; it must never be the reason a send is reported
 * as failed, so it swallows its own errors exactly as `sendTenantEmail` does.
 *
 * AN OWNER ALERT MATCHES NOTHING AND THAT IS CORRECT: a detailer's own
 * notification address is not one of their customers, so the update touches
 * zero rows and the owner's mail is not tracked here.
 *
 * ponytail: exact-match on the address, not case-folded. Every caller passes
 * an address read back out of the row it would update (`create-booking` stores
 * what the customer typed and every later send reads it), so the two agree by
 * construction. A `lower()` comparison needs an RPC or a functional index;
 * add one if a real mismatch ever turns up rather than on principle.
 */
async function markAddress(
  businessId: string,
  to: string,
  failure: unknown | null,
): Promise<void> {
  try {
    await supabase
      .from("customers")
      .update(
        failure === null
          ? { email_failed_at: null, email_failed_reason: null }
          : {
            email_failed_at: new Date().toISOString(),
            // The provider's own words, capped: this is drawn in one line
            // beside the address and a whole JSON body would not be read.
            email_failed_reason: String(
              (failure as { message?: string; name?: string })?.message
                ?? (failure as { name?: string })?.name
                ?? JSON.stringify(failure),
            ).slice(0, 200),
          },
      )
      .eq("business_id", businessId)
      .eq("email", to);
  } catch (e) {
    console.error("could not record the send result against the customer:", e);
  }
}

/**
 * ROADMAP 14.3 — ONE ROW PER ATTEMPTED SEND, whatever became of it.
 *
 * BEST-EFFORT, BY THE SAME RULE AS EVERYTHING ELSE IN THIS FILE. A booking must
 * never fail because bookkeeping about an email did, so this swallows its own
 * errors the way `markAddress` and `note` already do. A lost row is a gap in a
 * history; a thrown error here would be a customer with no confirmation.
 *
 * THE CUSTOMER LOOKUP IS THE SAME ONE `markAddress` MAKES, and it is what puts
 * the row on the screen it belongs to. An owner alert matches nothing and
 * correctly files with a null customer: a detailer's own notification address
 * is not one of their customers, and attaching it to a customer who happens to
 * share the address would put somebody else's mail on their record.
 *
 * ponytail: one extra indexed read per send, and written AFTER the outcome is
 * known rather than claimed before and updated after. Two rows of bookkeeping
 * per email to cover a crash between them is not worth it while the provider
 * call is a single awaited fetch inside a try; if this function ever grows a
 * second await after the send, write the row first instead.
 */
async function record(
  businessId: string | null,
  to: string,
  subject: string,
  status: string,
  detail?: unknown,
  providerId?: string | null,
): Promise<void> {
  try {
    let customerId: string | null = null;
    if (businessId) {
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", businessId)
        .eq("email", to)
        .maybeSingle();
      customerId = data?.id ?? null;
    }
    await supabase.from("email_sends").insert({
      business_id: businessId,
      customer_id: customerId,
      to_email: to,
      subject,
      status,
      provider_id: providerId ?? null,
      // The provider's own words, capped at the same 200 the customer flag uses.
      detail: detail === undefined || detail === null
        ? null
        : String(
          (detail as { message?: string })?.message
            ?? (detail as { name?: string })?.name
            ?? (typeof detail === "string" ? detail : JSON.stringify(detail)),
        ).slice(0, 200),
    });
  } catch (e) {
    console.error("could not record the send:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  // Internal-only: callable ONLY with the service-role key, so this can
  // never be abused as an open relay.
  const auth = req.headers.get("Authorization") || "";
  if (!SERVICE_ROLE_KEY || auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  // HELD OUTSIDE THE TRY so the catch below can still say WHICH email died.
  // `req.clone()` cannot do this job: a clone has to be taken before the body
  // is read, and by the time the catch runs it has been.
  let failedFor: { business_id: string | null; to: string; subject: string } | null = null;

  try {
    const { business_id, to, subject, body, text, attachments, sender_name } = await req.json();
    if (to && subject) failedFor = { business_id: business_id ?? null, to, subject };
    // ROADMAP 2.20 STAGE 2. Set only by platform billing mail, and it changes
    // two things: who the email says it is from, and whether the send result
    // is recorded against a CUSTOMER. A billing email goes to the detailer, so
    // there is no customer row it is a fact about — and stamping one because
    // the detailer's contact address happens to match a customer of their own
    // would put "this address bounced" on somebody it says nothing about.
    const fromPlatform = typeof sender_name === "string" && sender_name.trim() !== "";
    if (!to || !subject || !body) {
      return json({ error: "to, subject and body are required" }, 400);
    }
    // ROADMAP 8.12 — THE ONE EMAIL WITH NO TENANT BEHIND IT AT ALL.
    //
    // Billing mail is from us and ABOUT a detailer, so it still carries their
    // business id. The dead man's switch is from us about OUR OWN plumbing:
    // there is no business it is a fact about, and passing an arbitrary one
    // would file the send against a tenant it has nothing to do with.
    //
    // **STILL REQUIRED FOR EVERYTHING ELSE, AND LOUDLY.** A tenant email that
    // lost its business id would otherwise send with no name and no Reply-To
    // and look approximately right, which is how a whole class of defect in
    // this repo has survived. Only platform mail may omit it.
    if (!business_id && !fromPlatform) {
      return json({ error: "business_id is required" }, 400);
    }

    // Reserved and non-existent domains (RFC 2606 / 6761) can never receive
    // mail: sending anyway produces a hard bounce, and bounces damage the
    // sending domain's reputation. Seeded demo tenants use these addresses,
    // and a real detailer typo'd into one is equally undeliverable.
    const domain = String(to).split("@").pop()?.toLowerCase() ?? "";
    if (/(^|\.)(test|invalid|localhost|example)$/.test(domain) || /^example\.(com|net|org)$/.test(domain)) {
      console.warn("undeliverable domain - email not sent:", { to, subject });
      // 14.3 — a `console.warn` was the WHOLE record of this until now.
      await record(business_id ?? null, to, subject, "skipped",
        "that address cannot receive email");
      return json({ success: true, skipped: "undeliverable_domain" });
    }

    // Skipped entirely for a platform email with no business: the only two
    // things this row supplies are the `From:` display name, which
    // `sender_name` has already replaced, and the tenant Reply-To, which
    // platform mail deliberately does not set.
    const { data: business } = business_id
      ? await supabase
        .from("businesses")
        .select("name, contact_email")
        .eq("id", business_id)
        .maybeSingle()
      : { data: null };
    if (business_id && !business) return json({ error: "unknown_business" }, 404);

    const payload: Record<string, unknown> = {
      from: `${String(fromPlatform ? sender_name : business!.name).replace(/[<>]/g, "")} <${PLATFORM_FROM_ADDRESS}>`,
      to: [to],
      subject,
      html: body,
    };
    // THE PLAIN-TEXT ALTERNATIVE — added roadmap 2.18, 2026-09-03, and it had
    // been missing for the whole life of the product. An HTML-only message
    // with no text part is a long-standing spam-filter signal, and it applied
    // to EVERY email including the receipt, which is the one that must never
    // land in junk. Found by asking whether the emails work globally and
    // following the question past the templates into the sender, which is
    // where it actually lived. Every template derives its own text half from
    // its own markup (`emailKit.ts` → `htmlToText`), so the two cannot drift.
    if (text) payload.text = text;
    // Reply-To is the TENANT's address so a customer's reply reaches the right
    // detailer — which is exactly wrong for a billing email, where a reply
    // would go from us to the detailer and straight back to themselves.
    if (!fromPlatform && business!.contact_email) payload.reply_to = business!.contact_email;
    if (Array.isArray(attachments) && attachments.length > 0) payload.attachments = attachments;

    if (!RESEND_API_KEY) {
      // No provider key configured (e.g. a fresh environment): log instead of
      // failing the calling flow — bookings must never depend on email.
      console.warn("RESEND_API_KEY not set — email not sent:", { to, subject });
      await record(business_id ?? null, to, subject, "skipped",
        "email is not switched on for this deployment");
      return json({ success: true, skipped: "no_provider_key" });
    }

    // ROADMAP 8.6 — COUNT IT. Best-effort by the same rule the whole function
    // follows: a booking must never fail because a COUNTER did, so this is
    // awaited and its failure swallowed. It is a single atomic upsert in SQL,
    // so two sends at once cannot lose a count.
    const note = async (ok: boolean) => {
      try { await supabase.rpc("note_email_send", { p_ok: ok }); }
      catch (e) { console.error("could not count the send:", e); }
    };

    // ── THE DAY'S BUDGET, CLAIMED BEFORE THE PROVIDER IS CALLED ─────────────
    //
    // **Andrew, 2026-09-13:** *"If a heavy test run can exhaust the daily
    // allowance then a real signup notice silently does not arrive. Make it
    // impossible."* It was true — 2026-09-07 attempted 240 emails against a cap
    // of 100, and 2026-09-08 attempted 117 — so the platform's own alerts now
    // have a slice of the day nothing else can spend. Migration
    // 20260913030000 carries the arithmetic and the reasoning.
    //
    // **PLACED HERE AND NOWHERE EARLIER, ON PURPOSE.** Above this line are the
    // two ways a send costs the provider nothing: a reserved domain and a
    // missing key. Claiming before those would have every fixture in the repo
    // spending a budget it never touches, which is the opposite of the point.
    //
    // **`fromPlatform` IS THE DISCRIMINATOR AND IT ALREADY EXISTED.** The three
    // things that set it — billing mail, the dead man's switch, and
    // `create-business`'s signup alert — are exactly the mail he must receive,
    // and nothing a detailer or a test fixture can reach sets it.
    //
    // **BEST-EFFORT IN ONE DIRECTION ONLY.** If the claim itself errors we send
    // anyway: a counter must never be the reason a booking's confirmation does
    // not go out, and the provider's own 429 is still the backstop. A refusal
    // is different from a failure to ask.
    // **AND `rpc` DOES NOT THROW ON A DATABASE ERROR — it returns `{ error }`.**
    // Reading only `data` would turn a 504 from PostgREST into `null`, which is
    // not `false`, which is "allowed" — the right answer by luck rather than by
    // decision, and the exact shape of the discarded-error class this repo keeps
    // finding. So the error is read, said out loud, and then deliberately
    // ignored.
    let claimAllowed = true;
    try {
      const { data, error } = await supabase.rpc("claim_email_send", { p_platform: fromPlatform });
      if (error) console.error("could not claim the send against today's budget - sending anyway:", error);
      else claimAllowed = data !== false;
    } catch (e) {
      console.error("could not claim the send against today's budget - sending anyway:", e);
    }
    if (!claimAllowed) {
      // **LOUD, AND COUNTED IN ITS OWN COLUMN.** The whole defect he named is a
      // silent one, so this goes in the log with the recipient in it and into
      // `platform_email_days.refused`, which `claim_email_send` increments on
      // the way out.
      //
      // **IT IS DELIBERATELY NOT `note(false)`.** `failed` means the PROVIDER
      // rejected it, and this never reached the provider. It also could not
      // survive a sweep: a refused reminder is no longer marked as sent, so it
      // retries every fifteen minutes, and ten of those over an evening would
      // have added three hundred to the one number Andrew reads to decide
      // whether to upgrade the plan. Migration 20260913040000 has the
      // arithmetic.
      //
      // `markAddress` is not called either: 429 has never been the customer's
      // fault, and this is our own 429.
      console.error("DAILY EMAIL BUDGET SPENT - refused before the provider:", {
        to, subject, platform: fromPlatform,
      });
      // 14.3 — `refused`, NOT `failed`. The provider never saw this one, and a
      // detailer reading the row needs to know the difference: a failure is
      // something about the address, a refusal is something about us.
      await record(business_id ?? null, to, subject, "refused",
        "the day's email allowance was already spent");
      return json({
        error: "Failed to send email",
        reason: "daily_cap",
        retryable: true,
        details: fromPlatform
          ? "The provider's whole daily allowance is spent, including the platform's reserve."
          : "Tenant mail has spent its share of today's allowance. The platform's own alerts are still reserved.",
      }, 429);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Resend API error:", data);
      // ROADMAP 2.20 — AND THIS `console.error` IS EXACTLY WHY. A booking never
      // fails because an email did, so until this line the only record of a
      // rejected send was a log nobody reads, and the first symptom was a
      // customer saying they never got their confirmation. The fact goes on the
      // CUSTOMER, next to the address, where the detailer meets it at the
      // moment they are about to rely on it.
      //
      // 4xx ONLY, AND THAT IS WHAT MAKES THE FLAG HONEST. A 5xx is the
      // provider having a bad day, not this address being wrong — stamping it
      // would put "this address bounced" on every customer emailed during a
      // Resend outage, which is both false and the fastest way to teach a
      // detailer to ignore the flag. The send still failed and is still
      // logged; it is simply not the customer's fault.
      // **AND 429 IS NOT THE ADDRESS EITHER — testing loop F-025, 2026-09-06.**
      // The paragraph above is right about 5xx and stopped one status short.
      // Resend's free plan is **100 emails a day across every tenant** and the
      // transactional set spends about five per booking, so the platform's
      // twenty-first booking of the day is refused — with a 429, which is
      // under 500, so every customer emailed after the cap was being stamped
      // `email_failed_at` and told, permanently, that their address bounced.
      //
      // That is worse than the outage case the 5xx rule exists to prevent,
      // because it is **self-inflicted, arrives on the busiest days, and is
      // enforcement rather than display**: `send-campaign` filters on this
      // column, so a good day's customers quietly stop being reachable.
      // 408 for the same reason — a timeout is our side of the wire.
      const ourFault = res.status >= 500 || res.status === 429 || res.status === 408;
      if (!ourFault && !fromPlatform) await markAddress(business_id, to, data);
      // **A REFUSAL IS COUNTED TOO, AND IT IS THE HALF THAT PREDICTS THE
      // PROBLEM.** The 429 that F-025 mis-read as a bad address is a FAILED
      // send, and a day whose failures are climbing is a day already past the
      // cap — which is precisely the morning the owner needs to be told
      // BEFORE, not after.
      await note(false);
      await record(business_id ?? null, to, subject, "failed", data);
      return json({ error: "Failed to send email", details: data }, res.status);
    }
    // A BOUNCE MUST CLEAR ITSELF, unlike `unsubscribed_at`. Otherwise a
    // detailer who corrects a typo is told forever that the address they just
    // fixed is broken, and the flag becomes something to ignore.
    if (!fromPlatform) await markAddress(business_id, to, null);
    await note(true);
    // THE PROVIDER ID IS WHAT THE WEBHOOK LATER FINDS THIS ROW BY. Until 14.3
    // it was returned to the caller and dropped on the floor.
    await record(business_id ?? null, to, subject, "sent", null, data.id);
    return json({ success: true, id: data.id });
  } catch (err) {
    // 14.3 — THE SIXTH EXIT, and the only one that is not a decision this
    // function made: the fetch to the provider threw. Nothing is recorded when
    // the request body itself was unreadable, because then there is no
    // recipient to file it against and an unparseable body is not a send.
    if (failedFor) {
      await record(failedFor.business_id, failedFor.to, failedFor.subject, "failed", err);
    }
    return json({ error: (err as Error).message }, 500);
  }
});
