// ROADMAP 2.14 STEP 3 — THE CUSTOMER'S OWN PLAN PAGE, AND THE ONLY WAY TO
// REACH IT.
//
// THE OWNER ASKED FOR CUSTOMER ACCOUNTS AND THE ANSWER WAS "GOOD IDEA, ONE
// STEP EARLY" (round 3 of docs/plans-research-2026-09-04.md). Everything he
// wanted from an account — the plan applies itself, the customer can see what
// they are on, the customer can leave — is a property of KNOWING WHO THEY ARE,
// and this product already knows that from an unguessable UUID in a link,
// twice: `/booking/:id` and 2.12's quote acceptance. So `plan_members.id` is
// the credential, and there is no password, no second kind of `auth.users`
// row, and no RLS policy that has to answer "is this a customer".
//
// THREE ACTIONS IN ONE FUNCTION, and that is deliberate rather than lazy: they
// share the member lookup, the not-found answer and the CORS surface, and
// three functions would be three deploys of the same twenty lines. Same shape
// as `owner-push-subscribe`'s `probe` branch.
//
//   get     { member_id }                  → what they are on, what they are owed
//   cancel  { member_id }                  → ends the plan, tells the detailer
//   email   { business_slug, email }       → EMAILS them their link
//
// THE `email` ACTION IS THE ONE WITH A SECURITY SHAPE, and it is why the owner
// did NOT get what he first described. His words were *"they just type in
// their email and it'll automatically show them"* — which is address
// enumeration: anybody could type a neighbour's address and learn whether they
// use this detailer and what they pay. **The safe twin is one word different:
// EMAIL IN, LINK OUT.** Nothing about the address is ever reflected back. This
// endpoint returns the SAME body whether or not the address belongs to a
// member, and the only thing that varies is whether an email is sent.
//
// CANCELLING IS ENDING, NOT DELETING. `status = 'ended'` plus `ended_on`,
// which is the vocabulary `20260904002000_plans.sql` closed with a check
// constraint. The ledger stays — what somebody was owed is a fact about the
// past, and the partial unique index `plan_members_one_live` only counts rows
// that are not ended, so they can join again tomorrow.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, businessBySlug, getSettings } from "../_shared/tenant.ts";
import { buildBrand, ownerRecipients, sendTenantEmail } from "../_shared/email.ts";
import { planCancelledEmail, planLinkEmail } from "../_shared/emailTemplates.ts";
import { businessSiteUrl, planUrl } from "../_shared/config.ts";

// The member, their plan and the two halves of the ledger. `plan_visits` is
// the OWED half and `bookings.plan_member_id` the USED half — they live apart
// on purpose (see the migration header), and this is one of the few places
// that has to add them up.
async function loadMember(memberId: string) {
  const { data: member } = await supabase
    .from("plan_members")
    .select("*, plan:plans(*)")
    .eq("id", memberId)
    .maybeSingle();
  if (!member || !member.plan) return null;

  const [visits, used, customer] = await Promise.all([
    // `member_id` and `plan_member_id` are selected even though both rows are
    // already filtered to this member: the page hands these two arrays
    // STRAIGHT to `ledgerFor` in `app/src/lib/plans.js`, which is the one
    // tested implementation of the owed figure, and it filters by them.
    supabase.from("plan_visits").select("member_id, delta, due_on, kind").eq("member_id", member.id),
    supabase.from("bookings")
      .select("id, plan_member_id, start_at, status")
      .eq("plan_member_id", member.id)
      .neq("status", "cancelled")
      .is("deleted_at", null),
    supabase.from("customers").select("name, email").eq("id", member.customer_id).maybeSingle(),
  ]);
  return { member, visits: visits.data ?? [], used: used.data ?? [], customer: customer.data ?? null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json();
    const action = String(body.action || "get");

    // ------------------------------------------------------------------
    // EMAIL IN, LINK OUT.
    // ------------------------------------------------------------------
    if (action === "email") {
      const email = String(body.email || "").trim().toLowerCase();
      const business = await businessBySlug(body.business_slug);
      // THE SAME ANSWER EITHER WAY, and the early returns below are all of
      // them. An unknown business, a malformed address and an address that is
      // simply not a member are indistinguishable from outside — which is the
      // whole point, because the difference between them is the fact worth
      // stealing.
      const ok = json({ success: true, sent: true });
      if (!business || !email.includes("@")) return ok;

      const { data: customers } = await supabase
        .from("customers")
        .select("id, name")
        .eq("business_id", business.id)
        .ilike("email", email);
      const ids = (customers ?? []).map((c: { id: string }) => c.id);
      if (!ids.length) return ok;

      const { data: members } = await supabase
        .from("plan_members")
        .select("id, customer_id, plan:plans(name)")
        .eq("business_id", business.id)
        .neq("status", "ended")
        .in("customer_id", ids);
      const member = (members ?? [])[0];
      if (!member) return ok;

      const settings = await getSettings(business.id);
      const brand = await buildBrand(business, settings);
      const name = (customers ?? []).find((c: { id: string }) => c.id === member.customer_id)?.name ?? "";
      // deno-lint-ignore no-explicit-any
      const planName = String((member as any).plan?.name ?? "your plan");
      const msg = planLinkEmail(brand, {
        customerName: name,
        planName,
        planUrl: planUrl(member.id),
        bookUrl: businessSiteUrl(business.slug),
      });
      await sendTenantEmail({
        businessId: business.id, to: email, subject: msg.subject, html: msg.html, text: msg.text,
      });
      return ok;
    }

    const memberId = String(body.member_id || "").trim();
    if (!memberId) return json({ error: "member_id is required" }, 400);
    const loaded = await loadMember(memberId);
    if (!loaded) return json({ error: "not_found" }, 404);
    const { member, visits, used, customer } = loaded;
    const business = await businessById(member.business_id);
    if (!business) return json({ error: "not_found" }, 404);

    // ------------------------------------------------------------------
    // CANCEL — the customer leaving, from the same medium they joined in.
    // ------------------------------------------------------------------
    if (action === "cancel") {
      if (member.status === "ended") return json({ error: "This plan has already ended." }, 409);
      // UTC, and that MATCHES rather than fights the rest of the ledger:
      // `started_on` and `accrue_from` default to Postgres's `current_date`
      // and `accrue_plan_visits()` runs on it, and Supabase's database is UTC.
      // A business-local date here would be the second clock in a feature
      // whose whole job is counting periods.
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("plan_members")
        .update({ status: "ended", ended_on: today })
        .eq("id", member.id);
      if (error) return json({ error: error.message }, 500);

      // THE DETAILER HAS TO BE TOLD, and best-effort like every other send in
      // this codebase: a failing relay must never leave the customer unable to
      // leave. It is a `console.error` inside an edge function otherwise —
      // invisible from every screen — which is exactly the failure
      // `e2e-booking.mjs` reads the function logs for.
      try {
        const settings = await getSettings(business.id);
        const brand = await buildBrand(business, settings);
        const msg = planCancelledEmail(brand, {
          customerName: customer?.name ?? "A customer",
          planName: member.plan.name,
          startedOn: member.started_on,
          endedOn: today,
        });
        for (const to of ownerRecipients(business, settings)) {
          await sendTenantEmail({ businessId: business.id, to, subject: msg.subject, html: msg.html, text: msg.text });
        }
      } catch (e) {
        console.error("plan-link cancel notify failed:", e);
      }
      return json({ success: true, status: "ended" });
    }

    // ------------------------------------------------------------------
    // GET — what they are on.
    // ------------------------------------------------------------------
    // THE ARITHMETIC IS NOT HERE. `app/src/lib/plans.js` owns the ledger and
    // `tests/plans.test.mjs` holds it, so this returns the two raw halves —
    // the grants and the member's bookings — and the page calls `ledgerFor`
    // on them. A second implementation of the owed figure is the one thing
    // this feature cannot afford: it is the number the whole thing exists to
    // print.
    return json({
      success: true,
      member: {
        id: member.id,
        status: member.status,
        started_on: member.started_on,
        ended_on: member.ended_on,
        accrue_from: member.accrue_from,
        price_kind: member.price_kind,
        price_amount: member.price_amount,
      },
      plan: {
        id: member.plan.id,
        name: member.plan.name,
        description: member.plan.description,
        cadence_count: member.plan.cadence_count,
        cadence_unit: member.plan.cadence_unit,
        visits_per_period: member.plan.visits_per_period,
        term_months: member.plan.term_months,
      },
      visits,
      used,
      customer_name: customer?.name ?? "",
      business: { slug: business.slug, name: business.name, phone: business.contact_phone },
      book_url: businessSiteUrl(business.slug),
    });
  } catch (err) {
    console.error("plan-link error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
