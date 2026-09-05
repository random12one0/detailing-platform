// ROADMAP 2.19 — "WANT TO EMAIL SOME OF YOUR OLD CUSTOMERS?"
//
// A DETAILER PICKED THE NAMES AND PRESSED SEND. That is the entire feature,
// and the owner drew the line himself on 2026-09-03: *"Don't have one that
// automatically messaged on the email. Just have it, like, the business person
// whoever is running it could send out email to someone that they want."*
// Nothing in this repo calls this function on a schedule and nothing should.
//
// WHY IT IS ITS OWN FUNCTION AND NOT A FIELD ON `send-email`. `send-email` is
// the internal relay: service-key only, one address, no idea who anybody is.
// This is the opposite — a session, a permission, a recipient LIST, and three
// rules about who may be on it that the browser must not be the one enforcing.
// The dashboard shows a count; this decides.
//
// THE THREE RULES, and every one of them is the difference between an email
// and a complaint:
//
//   1. THEY MUST HAVE AN EMAIL ADDRESS. Most of this trade's customers are a
//      name and a phone number; a campaign silently "sent" to somebody with no
//      address is a detailer believing they got in touch when they did not.
//      Skipped, counted, and reported back so the screen can say so.
//   2. THEY MUST NOT HAVE OPTED OUT. `customers.unsubscribed_at`, set by the
//      public `unsubscribe` function. Checked HERE rather than in the query
//      the browser wrote, because an opt-out honoured only by the UI is not
//      honoured.
//   3. THE BUSINESS MUST HAVE A POSTAL ADDRESS. CAN-SPAM requires one in every
//      commercial message, and this is the product's only commercial message.
//      No address, no send — a 400 with a sentence naming the field, rather
//      than a message that goes out non-compliant.
//
// AND A FOURTH THAT IS OURS RATHER THAN THE LAW'S: `CAMPAIGN_MAX`. The
// platform's whole Resend allowance on the free plan is 100 emails A DAY
// across every tenant, and the transactional set — confirmations, reminders,
// receipts — spends about five per booking. One unbounded campaign could eat
// the day and make bookings stop confirming, which is a far worse failure than
// a capped campaign. The cap goes up when the platform has its own Resend
// account (roadmap 2.18's open thread, and 2.20 prices it).
//
// Input: { business_id, customer_ids: string[], subject, message }
// Output: { sent, no_email, unsubscribed, failed, capped }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, can, getSettings, requireMember } from "../_shared/tenant.ts";
import { buildBrand, sendTenantEmail } from "../_shared/email.ts";
import { campaignEmail } from "../_shared/emailTemplates.ts";
import { businessSiteUrl, unsubscribeUrl } from "../_shared/config.ts";

/** See the fourth rule above. Raise it when the platform stops sharing a
 *  3,000-a-month, 100-a-day allowance with the transactional set. */
const CAMPAIGN_MAX = 50;

/** Resend's default rate limit is 2 requests a second, and this function is
 *  the only place in the repo that ever sends in a loop. Sequential with a gap
 *  rather than a burst that starts returning 429 at the third recipient —
 *  which would fail the sends nobody would ever look for. */
const GAP_MS = 550;

const SUBJECT_MAX = 120;
const MESSAGE_MAX = 2000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    const member = await requireMember(req, body.business_id ?? null);
    if (!member) return json({ error: "Unauthorized" }, 401);
    // `marketing` already meant "promo codes and campaign links" before this
    // item existed (roadmap 2.13, lib/permissions.js) — no new key.
    if (!can(member, "marketing")) {
      return json({ error: "You do not have permission to send customer emails." }, 403);
    }

    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();
    if (!subject || !message) return json({ error: "A subject and a message are both needed." }, 400);
    if (subject.length > SUBJECT_MAX || message.length > MESSAGE_MAX) {
      return json({ error: "That subject or message is longer than an email should be." }, 400);
    }

    const ids = Array.isArray(body.customer_ids) ? body.customer_ids.map(String) : [];
    if (ids.length === 0) return json({ error: "Nobody was chosen to send to." }, 400);

    const business = await businessById(member.businessId);
    if (!business) return json({ error: "unknown_business" }, 404);
    const mailingAddress = String(business.mailing_address ?? "").trim();
    if (!mailingAddress) {
      return json({
        error: "Add your business's mailing address under Business info first —"
          + " the law requires it at the bottom of an email like this.",
      }, 400);
    }

    // Scoped to the caller's own business: an id from another tenant simply
    // is not in the result, exactly as a nonexistent one is not.
    const { data: rows, error: readErr } = await supabase
      .from("customers")
      .select("id, name, email, unsubscribed_at, email_failed_at")
      .eq("business_id", member.businessId)
      .in("id", ids.slice(0, 500));
    if (readErr) throw readErr;

    const all = rows ?? [];
    const noEmail = all.filter((c) => !String(c.email ?? "").trim()).length;
    const optedOut = all.filter((c) => String(c.email ?? "").trim() && c.unsubscribed_at).length;
    // ROADMAP 2.20 — AND THIS IS THE ENFORCEMENT, NOT THE MODAL'S FILTER. The
    // browser's count is courtesy; a caller that posts ids straight at this
    // function would otherwise still spend the platform's shared sending
    // reputation on addresses the provider has already refused, which is the
    // exact resource the 50-per-press cap exists to protect. The flag clears
    // itself on the next successful send, so this excludes nobody permanently.
    const bounced = all.filter((c) =>
      String(c.email ?? "").trim() && !c.unsubscribed_at && c.email_failed_at).length;
    const eligible = all.filter((c) =>
      String(c.email ?? "").trim() && !c.unsubscribed_at && !c.email_failed_at);
    const recipients = eligible.slice(0, CAMPAIGN_MAX);

    const settings = await getSettings(business.id);
    const brand = await buildBrand(business, settings);
    const bookUrl = businessSiteUrl(business.slug);

    let sent = 0;
    let failed = 0;
    for (const c of recipients) {
      const mail = campaignEmail(brand, {
        customerName: c.name,
        subject,
        message,
        bookUrl,
        // EACH RECIPIENT'S OWN LINK. One shared link would unsubscribe
        // whoever pressed it last, or nobody — the opt-out has to know who.
        unsubscribeUrl: unsubscribeUrl(c.id),
        mailingAddress,
      });
      const ok = await sendTenantEmail({
        businessId: business.id,
        to: String(c.email).trim(),
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      if (ok) sent++;
      else failed++;
      if (recipients.indexOf(c) < recipients.length - 1) {
        await new Promise((r) => setTimeout(r, GAP_MS));
      }
    }

    // WHEN THIS BUSINESS LAST REACHED OUT — which is what makes the dashboard
    // nudge step back instead of asking the same question every morning.
    // Written even if every send failed: the detailer did the thing, and a
    // prompt that returns the next day because the relay was down would be
    // asking them to do it twice.
    await supabase
      .from("businesses")
      .update({ last_campaign_at: new Date().toISOString() })
      .eq("id", business.id);

    return json({
      sent,
      failed,
      no_email: noEmail,
      unsubscribed: optedOut,
      bounced,
      capped: Math.max(0, eligible.length - recipients.length),
      cap: CAMPAIGN_MAX,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
