// ROADMAP 14.3 — WHAT ACTUALLY HAPPENED TO THE EMAIL, from the provider.
//
// `send-email` records that we handed a message to Resend and Resend took it.
// That is not the same fact as it arriving, and the gap between those two is
// the whole of Andrew's complaint: *"show if it bounced or if it went through
// properly."* This endpoint is the second half — Resend calls it when a message
// is delivered, bounces, or is marked as spam, and the row written at send time
// is updated in place.
//
// ============================================================================
// THE SIGNATURE IS THE ENTIRE AUTHENTICATION
// ============================================================================
// Resend has no bearer token to present, so this URL is open to the internet,
// exactly like `stripe-webhook`. Without the check, anybody could POST
// `email.bounced` for an address they do not own and have this product tell a
// detailer their customer is unreachable. `_shared/svix.ts` carries the
// mechanics and the three easy mistakes; the raw body is read here before
// anything parses it, and the timestamp tolerance is not skipped.
//
// **IT MUST BE DEPLOYED WITH JWT VERIFICATION OFF**, or Supabase rejects
// Resend's request before this file runs — the same load-bearing deployment
// flag `stripe-webhook` carries, and safe for the same reason.
//
// ============================================================================
// IT ONLY EVER UPDATES A ROW THAT ALREADY EXISTS
// ============================================================================
// No branch here inserts. A signed event for a message id this deployment
// never sent — another environment sharing the Resend account, or a message
// from before 14.3 shipped — updates nothing and is acknowledged. That makes
// the endpoint idempotent for free: replaying `email.delivered` writes the
// same value it wrote the first time, so there is no event-id lock to keep
// (which is where `stripe-webhook` has to do real work, because its handlers
// move money).
//
// ============================================================================
// A 2xx ON ANYTHING WE CANNOT HANDLE
// ============================================================================
// Returning 500 for an event type this file does not model makes Resend retry
// it and eventually disable the endpoint. A bad signature is a 400 and a
// database write that really failed is a 500, because both are worth retrying.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";
import { SvixError, svixHeadersOf, verifySvix } from "../_shared/svix.ts";

const SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

// Resend's event names, mapped to the words the detailer's screen uses.
//
// `email.sent` and `email.delivery_delayed` are deliberately absent. The first
// says what the row already says and would overwrite a later `delivered` if it
// arrived out of order; the second is a temporary state that resolves itself,
// and showing "delayed" for a message that lands ninety seconds later teaches
// a detailer to distrust the column.
const OUTCOME: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  // The recipient's server accepted it and then rejected it — same end state
  // as a bounce from the detailer's point of view, and the `detail` line says
  // which it was.
  "email.failed": "bounced",
};

// ONCE DELIVERED, A LATE `delivered` CANNOT UNDO A BOUNCE, and a bounce cannot
// be undone by anything. Providers do redeliver out of order, and the failure
// this prevents is the one that matters: a bounced address quietly reverting to
// "delivered" is worse than no column at all.
const FINAL = new Set(["bounced", "complained"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  // The blunt ceiling. Keyed on the caller's address and generous, so real
  // delivery traffic never touches it; it is here so an unauthenticated URL
  // cannot be looped to spend the project's invocations.
  if (!await withinLimits(supabase, [{ ...LIMITS.publicCeiling, bucket: "resend-webhook", key: ipOf(req) }])) {
    return json({ error: "too_many_requests" }, 429);
  }

  // RAW FIRST. Nothing may parse this before the signature is checked.
  const rawBody = await req.text();

  let event: Record<string, unknown>;
  try {
    event = await verifySvix(rawBody, svixHeadersOf(req), SECRET);
  } catch (err) {
    const e = err as SvixError;
    console.error("resend webhook rejected:", e.message);
    return json({ error: e.message }, e.status ?? 400);
  }

  const type = String(event.type ?? "");
  const data = (event.data ?? {}) as Record<string, unknown>;
  const providerId = typeof data.email_id === "string" ? data.email_id : null;

  const status = OUTCOME[type];
  if (!status || !providerId) {
    // Acknowledged on purpose — see the header. An event we do not model is
    // not a failure, and retrying it for three days helps nobody.
    return json({ received: true, ignored: type || "unknown" });
  }

  // The provider's own words about WHY, which is the line the detailer reads
  // under a bad outcome. Resend puts a bounce reason in different places
  // depending on the event, so the first one present wins.
  //
  // **NULL FOR A GOOD OUTCOME, and not the event type.** Falling back to
  // "email.delivered" stores a string that means nothing to anybody and that
  // the screen would have to know to hide. A delivered message has no reason
  // and should carry none.
  const bounce = (data.bounce ?? {}) as Record<string, unknown>;
  const reason = bounce.message ?? bounce.subType ?? data.reason ?? null;
  const detail = status === "delivered"
    ? null
    : String(reason ?? type).slice(0, 200);

  const { data: updated, error } = await supabase
    .from("email_sends")
    .update({ status, detail })
    .eq("provider_id", providerId)
    // The guard above, as a query rather than as a read-then-write: a row
    // already in a final state is not eligible, so two events racing cannot
    // resolve in the wrong order.
    .not("status", "in", `(${[...FINAL].join(",")})`)
    .select("id, business_id, customer_id");

  if (error) {
    // A REAL WRITE FAILURE IS A 500, so Resend retries it. This is the one
    // branch where retrying is what we want.
    console.error("could not record the delivery outcome:", error);
    return json({ error: "write_failed" }, 500);
  }

  // ---------------------------------------------------------------------------
  // AND THE BANNER THAT ALREADY EXISTS FINALLY SEES A REAL BOUNCE.
  // ---------------------------------------------------------------------------
  // `customers.email_failed_at` draws *"This address bounced"* on the client
  // record (roadmap 2.20, `app/src/screens/Clients.jsx`) and `send-campaign`
  // filters on it. Until now it was stamped ONLY when Resend refused a message
  // synchronously, at the moment of sending — and **most bounces are not like
  // that.** A mailbox that does not exist is usually accepted first and
  // rejected minutes later by the receiving server, which arrives here and
  // nowhere else. So the flag existed, was drawn in the right place, and could
  // not see the common case.
  //
  // `bounced` ONLY, NEVER `complained`. A spam complaint means the address
  // works perfectly and the person does not want the mail; the banner says
  // "check it with them or call instead", which would send a detailer chasing
  // a typo that is not there. Roadmap 2.19's unsubscribe is that one's answer.
  //
  // Best-effort, like every other piece of email bookkeeping in this repo: the
  // outcome is already recorded above, and failing the webhook here would make
  // Resend retry an event that has already been handled.
  const row = updated?.[0];
  if (status === "bounced" && row?.customer_id) {
    try {
      await supabase
        .from("customers")
        .update({ email_failed_at: new Date().toISOString(), email_failed_reason: detail })
        .eq("id", row.customer_id);
    } catch (e) {
      console.error("could not flag the address on the customer:", e);
    }
  }

  return json({ received: true, status, matched: updated?.length ?? 0 });
});
