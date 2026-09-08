// ROADMAP 2.20 STAGE 3 — the DETAILER's end of Connect.
//
// Five actions, all of them about ONE business's connection to ONE Stripe
// account: `status`, `start`, `finish`, `toggle`, `disconnect`.
// `supabase/functions/_shared/connect.ts` holds every decision; this file is
// the I/O and nothing else.
//
// ---------------------------------------------------------------------------
// OWNER ONLY, AND IT IS NOT THE `money` PERMISSION
// ---------------------------------------------------------------------------
// Roadmap 2.13 gave a detailer four permission ticks to hand out, and the one
// that looks right here is `money`. It is not, for the same reason 2.13
// refused a `team` tick: **this endpoint decides which bank account a
// customer's money lands in.** A member holding `money` can log an expense;
// nobody but the owner should be able to point the till somewhere else, and
// there is no tick that means "may connect a payment account and nothing
// else".
//
// The screen hides the row from staff as a courtesy. THIS is the enforcement.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, requireMember } from "../_shared/tenant.ts";
import { siteFor } from "../_shared/tenantSite.ts";
import { oauthDeauthorize, oauthToken, stripe, stripeConfigured, StripeError } from "../_shared/stripe.ts";
import {
  accountReady,
  authorizeUrl,
  cardStatus,
  connectClientId,
  connectConfigured,
  connectReturnUrl,
  stateFresh,
} from "../_shared/connect.ts";

/** The row, or a blank one. A business with no row has simply never started. */
async function connectionFor(businessId: string) {
  const { data } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  return data;
}

/**
 * What the settings screen draws. Deliberately the SAME shape whether or not
 * this deployment has a Connect client id, so the screen has one layout and
 * one empty state rather than two.
 */
function describe(row: Record<string, unknown> | null) {
  const settings = {
    stripe_account_id: (row?.stripe_account_id as string) ?? null,
    stripe_charges_enabled: Boolean(row?.charges_enabled),
    card_payments_enabled: Boolean(row?.card_payments_enabled),
  };
  return {
    ...cardStatus(settings),
    connected: Boolean(settings.stripe_account_id),
    chargesEnabled: settings.stripe_charges_enabled,
    cardPaymentsEnabled: settings.card_payments_enabled,
    connectedAt: (row?.connected_at as string) ?? null,
    // The last four of the account id is enough for a detailer to tell two
    // Stripe accounts apart, and there is no reason to print the whole thing.
    accountHint: settings.stripe_account_id ? settings.stripe_account_id.slice(-4) : null,
    // The screen needs to know whether the button can work AT ALL, so an
    // unconfigured deployment says so rather than offering a button that 503s.
    available: stripeConfigured() && connectConfigured(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    const businessId = typeof body?.business_id === "string" ? body.business_id : null;

    const member = await requireMember(req, businessId);
    if (!member) return json({ error: "not_found" }, 404);
    // 404 rather than 403, the posture roadmap 4.4 set for `/admin`: a 403
    // tells a curious staff member exactly which endpoint is worth attacking.
    if (member.role !== "owner") return json({ error: "not_found" }, 404);

    const bid = member.businessId;

    if (action === "status") {
      return json(describe(await connectionFor(bid)));
    }

    // -----------------------------------------------------------------------
    if (action === "start") {
      if (!stripeConfigured() || !connectConfigured()) {
        return json({ error: "not_configured" }, 503);
      }
      const business = await businessById(bid);
      if (!business) return json({ error: "not_found" }, 404);

      // A fresh random state per attempt. `crypto.randomUUID()` is the same
      // unguessable quality the receipt links already rest on.
      const state = crypto.randomUUID();
      const { error } = await supabase
        .from("connected_accounts")
        .upsert(
          { business_id: bid, connect_state: state, connect_state_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { onConflict: "business_id" },
        );
      if (error) return json({ error: "could_not_start" }, 500);

      const site = await siteFor(bid);
      return json({
        url: authorizeUrl({
          clientId: connectClientId(),
          state,
          redirectUri: connectReturnUrl(site),
          email: business.contact_email,
          businessName: business.name,
          url: site,
        }),
      });
    }

    // -----------------------------------------------------------------------
    if (action === "finish") {
      const code = typeof body?.code === "string" ? body.code : "";
      const state = typeof body?.state === "string" ? body.state : "";
      if (!code || !state) return json({ error: "missing_code" }, 400);

      const row = await connectionFor(bid);
      // THE THREE-PART CHECK, AND ALL THREE MATTER. The state has to exist,
      // it has to be THIS business's, and it has to be recent. Without the
      // first two, a `code` obtained anywhere attaches a stranger's Stripe
      // account to this business and every card payment goes to them.
      if (!row?.connect_state || row.connect_state !== state || !stateFresh(row.connect_state_at as string)) {
        return json({ error: "state_invalid" }, 400);
      }

      // SPENT BEFORE IT IS USED. Clearing the state first means a replay of
      // the same callback — a double-tap, a refreshed tab, a retried request
      // — cannot reach Stripe twice.
      await supabase
        .from("connected_accounts")
        .update({ connect_state: null, connect_state_at: null })
        .eq("business_id", bid);

      const token = await oauthToken(code);
      const accountId = typeof token.stripe_user_id === "string" ? token.stripe_user_id : "";
      if (!accountId) return json({ error: "no_account" }, 502);

      // ASK STRIPE WHETHER IT CAN ACTUALLY CHARGE, rather than assuming that
      // finishing the consent screen means yes. A brand-new Standard account
      // is frequently connected and not yet able to take a payment, and
      // storing `true` here would put a Pay button in front of a customer
      // that fails at Stripe.
      const account = await stripe(`/accounts/${accountId}`);

      const { error } = await supabase
        .from("connected_accounts")
        .update({
          stripe_account_id: accountId,
          charges_enabled: accountReady(account),
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", bid);
      if (error) return json({ error: "could_not_save" }, 500);

      return json(describe(await connectionFor(bid)));
    }

    // -----------------------------------------------------------------------
    // RE-ASK STRIPE. A Standard account's `charges_enabled` changes on
    // Stripe's schedule, not ours — it flips true when their checks finish and
    // can flip back — so the screen needs a way to catch up without waiting
    // for a webhook that may never have been configured.
    if (action === "refresh") {
      const row = await connectionFor(bid);
      if (!row?.stripe_account_id) return json(describe(row));
      const account = await stripe(`/accounts/${row.stripe_account_id}`);
      await supabase
        .from("connected_accounts")
        .update({ charges_enabled: accountReady(account), updated_at: new Date().toISOString() })
        .eq("business_id", bid);
      return json(describe(await connectionFor(bid)));
    }

    // -----------------------------------------------------------------------
    if (action === "toggle") {
      const on = body?.enabled === true;
      const row = await connectionFor(bid);
      // CANNOT BE SWITCHED ON BEFORE STRIPE SAYS YES. Otherwise the detailer
      // believes card is live, tells a customer so, and the customer meets an
      // error — the detailer's credibility spent on our optimism.
      if (on && !row?.charges_enabled) return json({ error: "not_ready" }, 409);
      const { error } = await supabase
        .from("connected_accounts")
        .update({ card_payments_enabled: on, updated_at: new Date().toISOString() })
        .eq("business_id", bid);
      if (error) return json({ error: "could_not_save" }, 500);
      return json(describe(await connectionFor(bid)));
    }

    // -----------------------------------------------------------------------
    if (action === "disconnect") {
      const row = await connectionFor(bid);
      if (row?.stripe_account_id && connectConfigured()) {
        // TOLD TO STRIPE, NOT JUST FORGOTTEN HERE. A row we deleted while
        // Stripe still lists us as a connected platform is a detailer who
        // cannot cleanly reconnect later. A failure is not fatal — the local
        // half must still happen, or the screen says connected for ever.
        try {
          await oauthDeauthorize(connectClientId(), row.stripe_account_id as string);
        } catch (_) { /* Stripe has already forgotten us, or is having a bad day. */ }
      }
      // THE ROW IS BLANKED, NOT DELETED. `card_payments_enabled` going false
      // in the same statement is the part that matters: a disconnect that
      // left the switch on would put the Pay button back the moment anybody
      // reconnected, without the detailer asking for it twice.
      await supabase
        .from("connected_accounts")
        .update({
          stripe_account_id: null,
          charges_enabled: false,
          card_payments_enabled: false,
          connected_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", bid);
      return json(describe(await connectionFor(bid)));
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    if (e instanceof StripeError) return json({ error: e.message, code: e.code }, e.status >= 500 ? 502 : e.status);
    console.error("connect-account", e);
    return json({ error: "server_error" }, 500);
  }
});
