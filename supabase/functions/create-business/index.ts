// Signup: create a business and make the caller its owner.
//
// TIMEZONE IS REQUIRED HERE. The businesses.timezone column keeps a default
// only as a backstop for direct inserts; every business created through the
// real signup path must state its zone, because a business quietly running
// on the wrong clock books every job at the wrong time.
//
// Input: { name, slug, timezone, contact_email?, contact_phone?,
//          dropoff_address?, service_area? }
//
// ROADMAP 8.5 — `claim_founding` IS GONE FROM THIS FUNCTION. It used to be a
// request the database decided on, and the reasoning below is still exactly
// right about WHO decides — it has simply moved to the moment somebody pays.
// The paragraph is kept because it is the argument against ever believing the
// query string, wherever the claim lives.
// claim_founding WAS a REQUEST, never a fact. The database decides (see
// claim_founding_spot), because otherwise anyone who noticed
// ?offer=founding in a URL could grant themselves founding pricing for
// the life of their account.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { createBusinessRow } from "../_shared/newBusiness.ts";
import { sendTenantEmail } from "../_shared/email.ts";
import { platformAlertEmail } from "../_shared/emailTemplates.ts";
import { platformBrand, PLATFORM_NAME } from "../_shared/platformBrand.ts";
import { siteFor } from "../_shared/tenantSite.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    // The caller must be a signed-in user; they become the owner.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();

    // ROADMAP 4.4 STAGE 2 — THE ROW AND ITS DEFAULTS MOVED TO
    // `_shared/newBusiness.ts`, unchanged. The back office can now create a
    // business by hand for in-person onboarding, and a second copy of "what a
    // new business is" is where two kinds of business start to differ
    // quietly: one with no settings row renders a dashboard of nulls, one
    // with no hours has a booking page that can never be booked. Neither
    // throws.
    const made = await createBusinessRow(supabase, {
      name: body.name,
      slug: body.slug,
      timezone: body.timezone,
      // SIGNUP'S OWN FALLBACK, which the shared helper deliberately does not
      // have: here there is a session, so the caller's own address is the
      // sensible default. The back office has no session to fall back to.
      contact_email: body.contact_email?.trim() || user.email || null,
      contact_phone: body.contact_phone,
      dropoff_address: body.dropoff_address,
      service_area: body.service_area,
    });
    if (made.error || !made.business) return json({ error: made.error }, made.status ?? 400);
    const business = made.business;

    // THE OWNER IS THE ONE THING THE HELPER REFUSES TO GUESS. Signup makes
    // the caller the owner because they are standing here with a session;
    // the back office cannot, because the person it signs up may have no
    // account at all and gets an invite instead.
    // **AND ITS ERROR IS READ — testing loop F-026, 2026-09-06.** It was
    // discarded, and this is the one write in the product where losing it
    // locks somebody out of their own business permanently:
    //
    //   the `businesses` row exists, holding their name and their slug —
    //   and possibly a founding spot — and they are not a member of it. The
    //   dashboard renders `<CreateBusiness />` whenever there is no business
    //   for the session, so the very next thing they see is the form they
    //   just filled in. Filling it in again fails on the slug, which is
    //   taken — **by them, invisibly**. There is no screen anywhere that can
    //   show them what happened and no button that can undo it.
    //
    // Nothing was written before this except the business and its defaults,
    // all of which cascade, so the honest answer is to take it back and let
    // them try again with the name they wanted.
    const { error: memberErr } = await supabase.from("business_users").insert({
      business_id: business.id, user_id: user.id, role: "owner", email: user.email,
    });
    if (memberErr) {
      console.error("owner membership failed; rolling back the business:", memberErr);
      await supabase.from("businesses").delete().eq("id", business.id);
      return json({ error: "We could not finish setting up your business. Please try again." }, 500);
    }

    // **SIGNUP NO LONGER TAKES A FOUNDING SPOT — roadmap 8.5.** The owner:
    // *"it should not be taken until they pay, obviously."* It was claimed
    // here, so three people who made an account and never came back consumed
    // the whole offer while the platform earned nothing.
    //
    // It now happens in `platform-billing`'s `subscribe`, ONE LINE ABOVE the
    // `planFor` that snapshots the price — because the price is stored and
    // never re-read, so a claim made anywhere else can end up stamping a
    // founding flag on a standard-priced subscription.
    //
    // `founding` stays in this response, and stays FALSE: a brand-new business
    // has no spot yet by definition, and the field is what `CreateBusiness`
    // reads. Removing it would be a silent `undefined` at that call site.
    const founding = false;

    // ── TELL THE OWNER SOMEBODY SIGNED UP — roadmap 8.6, R2 ──────────────
    // *"I'll get an email if someone signs up and whatnot. I hope you set
    // that all up."* Nothing did.
    //
    // **BEST-EFFORT, AND LAST.** By the same rule the whole product follows
    // for email: a signup must never fail because a notification did. It is
    // awaited so a failure is logged rather than lost to a dangling promise,
    // and everything above it has already committed.
    //
    // **IT GOES TO `platform_settings.owner_email`, NOT TO AN ADMIN ROW.**
    // Who may open the back office and who wants to hear about a signup are
    // different questions; the admin login is deliberately a throwaway today.
    // If nobody has set an address the send is skipped, and the back office
    // says so out loud on its health line — a feature that is off looks
    // exactly like a feature that is quiet.
    try {
      const { data: ps } = await supabase.from("platform_settings")
        .select("owner_email").limit(1).maybeSingle();
      if (ps?.owner_email) {
        const site = await siteFor(business.id);
        const brand = platformBrand(site);
        const mail = platformAlertEmail(brand, {
          kind: "New detailer",
          headline: `${business.name} just signed up`,
          intro: "Somebody created an account and a business. Nothing has been paid yet — you will get a second email when they subscribe.",
          facts: [
            ["Business", business.name],
            ["Booking page", `${site}/book/${business.slug}`],
            ["Signed up by", user.email ?? "unknown"],
          ],
          buttonLabel: "Open the back office",
          buttonUrl: `${site}/admin`,
        });
        await sendTenantEmail({
          businessId: business.id,
          to: ps.owner_email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          senderName: PLATFORM_NAME,
        });
      }
    } catch (e) {
      console.error("could not send the signup alert:", e);
    }

    return json({
      success: true,
      founding,
      business: { id: business.id, slug: business.slug, timezone: business.timezone },
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
