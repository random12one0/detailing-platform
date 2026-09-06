// Signup: create a business and make the caller its owner.
//
// TIMEZONE IS REQUIRED HERE. The businesses.timezone column keeps a default
// only as a backstop for direct inserts; every business created through the
// real signup path must state its zone, because a business quietly running
// on the wrong clock books every job at the wrong time.
//
// Input: { name, slug, timezone, contact_email?, contact_phone?,
//          dropoff_address?, service_area?, claim_founding? }
//
// claim_founding is a REQUEST, never a fact. The database decides (see
// claim_founding_spot), because otherwise anyone who noticed
// ?offer=founding in a URL could grant themselves founding pricing for
// the life of their account.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { createBusinessRow } from "../_shared/newBusiness.ts";

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

    // The offer is granted by the database or not at all.
    let founding = false;
    if (body.claim_founding) {
      const { data: granted } = await supabase.rpc("claim_founding_spot", {
        p_business_id: business.id,
      });
      founding = granted === true;
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
