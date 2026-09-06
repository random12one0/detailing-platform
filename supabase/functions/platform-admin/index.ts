// ROADMAP 4.4 — the platform owner's back office, server side.
//
// Input: { action, ... }   Platform-admin only, checked in the DATABASE.
//
// **EVERY BYTE THE BACK OFFICE SHOWS COMES THROUGH HERE**, and that is the
// whole security design rather than a style choice. The obvious build gives
// the twenty tenant tables an `or public.is_platform_admin()` clause and lets
// the admin screens use `supabase.from()` like every other screen. It is
// refused: that puts a cross-tenant escape hatch into twenty policies which
// are otherwise provably per-business, and **this is the one place in the
// product where a mistake exposes every tenant at once.** One typo, one copied
// line, one policy rewritten by a later migration, and a detailer's browser
// reads somebody else's customers.
//
// So the policies keep saying exactly what they said before — one business,
// always — there is literally no path by which a signed-in browser reaches
// another tenant's rows, and this function reads everything under the service
// role after checking `platform_admins`.
//
// EVERY WRITE IS LOGGED, not only impersonation. 4.4 asks for the log on the
// one action; a log that covers one action tells you what somebody did on the
// day you thought to ask about that action.
//
// WHAT IS DELIBERATELY NOT HERE, from the spec's own "what not to build":
// charts, admin roles, a ticketing system, anything Stripe's dashboard already
// does better (show the state, link out for the action), and a second copy of
// the detailer's screens — *open their dashboard as them* is why those exist.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { PLATFORM_URL } from "../_shared/config.ts";
import { createBusinessRow } from "../_shared/newBusiness.ts";
import { PRICES, pricesFrom, type PriceTable } from "../_shared/platformBilling.ts";
import { businessById, getSettings } from "../_shared/tenant.ts";
import { buildBrand, sendTenantEmail } from "../_shared/email.ts";
import { inviteEmail } from "../_shared/emailTemplates.ts";

interface Admin { id: string; email: string }

// The gate. A JWT proves who they are; this table decides what that is worth,
// and it is read with the service role because RLS on it is forced with NO
// policies — invisible and unwritable from every browser.
async function requireAdmin(req: Request): Promise<Admin | null> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return null;
  const { data: row } = await supabase
    .from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!row) return null;
  return { id: user.id, email: user.email ?? "" };
}

async function logIt(admin: Admin, action: string, business: { id?: string; name?: string } | null, detail: unknown = {}) {
  const { error } = await supabase.from("platform_admin_events").insert({
    admin_id: admin.id,
    admin_email: admin.email,
    business_id: business?.id ?? null,
    business_name: business?.name ?? null,
    action,
    detail: detail ?? {},
  });
  // A FAILED LOG FAILS THE ACTION for impersonation, and only for that: the
  // caller decides. Everything else is best-effort, because refusing to
  // suspend a non-paying business because a log row would not insert is the
  // wrong trade.
  if (error) console.error("platform_admin_events insert failed:", error);
  return !error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    const body = await req.json().catch(() => ({}));
    const admin = await requireAdmin(req);
    // THE SAME ANSWER FOR "NOT SIGNED IN" AND "NOT AN ADMIN". A 403 that
    // distinguishes them tells a curious detailer that this endpoint exists
    // and that the only thing between them and it is a row somewhere.
    if (!admin) return json({ error: "Not found" }, 404);

    const action = String(body.action || "");

    // --- JOB 1: who are my customers and what state are they in? ----------
    if (action === "list") {
      // ONE ROUND TRIP PER TABLE, joined in memory. There are fewer than ten
      // businesses and there will be fewer than a hundred for a long time; a
      // view or a stack of lateral joins is the right answer at a thousand,
      // and building it now would be guessing at a shape nothing has measured.
      const [biz, subs, book, users] = await Promise.all([
        supabase.from("businesses")
          .select("id, slug, name, status, plan_tier, contact_email, contact_phone, created_at, admin_notes_platform, site_url, site_updated_at")
          .order("created_at", { ascending: false }),
        supabase.from("platform_subscriptions")
          .select("business_id, status, recurring_cents, bill_interval, current_period_end, suspended_at, cancel_at_period_end"),
        // `start_at` only, and every row: "last activity" is the column the
        // spec says earns its place — a detailer with no booking in three
        // weeks is on holiday or leaving, and both are worth knowing before
        // the card fails.
        supabase.from("bookings").select("business_id, start_at, created_at, status")
          .is("deleted_at", null),
        supabase.from("business_users").select("business_id, email, role"),
      ]);
      // THE SITE COLUMN IS A LIST QUESTION BEFORE IT IS A PAGE ONE. The
      // filter he actually wants is "who am I still owing a website", and a
      // filter whose input the server never sends matches nothing — which
      // reads exactly like "everybody has one". One more whole-table read of
      // a table with fewer rows than there are businesses.
      const { data: domAll } = await supabase.from("business_domains")
        .select("business_id, domain, verified_at");

      // THE SEVEN-STEP SETUP PROGRESS, PER BUSINESS, AND IT IS HERE BECAUSE
      // THE LIST HAS A FILTER FOR IT. "Setup unfinished" is one of the four
      // filters the spec names, and a filter whose input the server never
      // sends is a filter that quietly matches nothing — which reads exactly
      // like "everybody has finished". Six more whole-table reads at fewer
      // than a hundred businesses; the shape to reach for at a thousand is a
      // view, and nothing has measured that yet.
      //
      // THE ARITHMETIC IS NOT REPEATED HERE. `app/src/lib/setup.js` owns it
      // and the DETAILER sees its answer on their own Business screen; this
      // sends the same inputs so the back office can run the same function
      // rather than inventing a second completeness number. Two numbers about
      // the same thing is how a support call starts with an argument.
      const [svcAll, addAll, promoAll, hoursAll, brandAll, setAll] = await Promise.all([
        supabase.from("services").select("business_id, is_active"),
        supabase.from("add_ons").select("business_id, is_active"),
        supabase.from("promo_codes").select("business_id, is_active"),
        supabase.from("business_hours").select("business_id, open_time"),
        supabase.from("business_branding").select("business_id, primary_color"),
        supabase.from("business_settings").select("business_id, setup, booking_mode"),
      ]);
      const tally = (rows: { business_id: string }[] | null, keep: (r: any) => boolean) => {
        const m = new Map<string, number>();
        for (const r of rows ?? []) if (keep(r)) m.set(r.business_id, (m.get(r.business_id) ?? 0) + 1);
        return m;
      };
      const nServices = tally(svcAll.data, (r) => r.is_active);
      const nAddOns = tally(addAll.data, (r) => r.is_active);
      const nPromos = tally(promoAll.data, (r) => r.is_active);
      const nOpenDays = tally(hoursAll.data, (r) => !!r.open_time);
      const brandBy = new Map((brandAll.data ?? []).map((r) => [r.business_id, r]));
      const setBy = new Map((setAll.data ?? []).map((r) => [r.business_id, r]));

      const byBiz = <T extends { business_id: string }>(rows: T[] | null) => {
        const m = new Map<string, T[]>();
        for (const r of rows ?? []) {
          const list = m.get(r.business_id) ?? [];
          list.push(r);
          m.set(r.business_id, list);
        }
        return m;
      };
      const bookings = byBiz(book.data);
      const members = byBiz(users.data);
      const subByBiz = new Map((subs.data ?? []).map((s) => [s.business_id, s]));

      const now = Date.now();
      const rows = (biz.data ?? []).map((b) => {
        const bs = bookings.get(b.id) ?? [];
        const last = bs.reduce<string | null>((a, r) => (!a || r.created_at > a ? r.created_at : a), null);
        const live = bs.filter((r) => r.status !== "cancelled");
        const days = last ? Math.floor((now - Date.parse(last)) / 86_400_000) : null;
        const owner = (members.get(b.id) ?? []).find((m) => m.role === "owner");
        return {
          id: b.id,
          slug: b.slug,
          name: b.name,
          status: b.status,
          plan_tier: b.plan_tier,
          owner_email: owner?.email ?? b.contact_email ?? null,
          created_at: b.created_at,
          has_note: !!(b.admin_notes_platform || "").trim(),
          bookings_total: live.length,
          last_booking_at: last,
          days_since_booking: days,
          requests_waiting: bs.filter((r) => r.status === "pending").length,
          subscription: subByBiz.get(b.id) ?? null,
          booking_mode: setBy.get(b.id)?.booking_mode ?? "reserve",
          site_url: b.site_url ?? null,
          site_updated_at: b.site_updated_at ?? null,
          // The domain that WINS is decided in SQL (`business_canonical_host`)
          // and never by a rule at four call sites; this is the list's
          // one-line summary of the same rows, so it prefers a verified one
          // exactly as that function does.
          domain: (() => {
            const ds = (domAll ?? []).filter((d) => d.business_id === b.id);
            return (ds.find((d) => d.verified_at) ?? ds[0])?.domain ?? null;
          })(),
          domain_verified: (domAll ?? []).some((d) => d.business_id === b.id && d.verified_at),
          // The INPUTS to `setupProgress`, never its answer — see above.
          setup_inputs: {
            counts: {
              services: nServices.get(b.id) ?? 0,
              addOns: nAddOns.get(b.id) ?? 0,
              promos: nPromos.get(b.id) ?? 0,
              hoursOpen: (nOpenDays.get(b.id) ?? 0) > 0,
            },
            branding: { primary_color: brandBy.get(b.id)?.primary_color ?? null },
            settings: { setup: setBy.get(b.id)?.setup ?? null },
            business: { contact_phone: b.contact_phone ?? null, contact_email: b.contact_email ?? null },
          },
        };
      });

      // FOUR FIGURES AND NO CHART — the spec is explicit. Everything past
      // these is a trend line nobody acts on at this size.
      const { data: founding } = await supabase.rpc("founding_offer");
      const mrrCents = (subs.data ?? [])
        .filter((s) => s.status === "active" || s.status === "trialing")
        .reduce((a, s) => a + Math.round(Number(s.recurring_cents || 0) / (s.bill_interval === "year" ? 12 : 1)), 0);

      // WHAT WE CHARGE, AND WHAT WE WOULD CHARGE WITH NOTHING SET. Both, so
      // the screen can say which one is live rather than showing four numbers
      // whose origin is invisible — and so *back to the built-in prices* has
      // something to show before it is pressed.
      const { data: ps } = await supabase.from("platform_settings")
        .select("prices, updated_at").limit(1).maybeSingle();

      // ITEM D — WHETHER THE SCHEDULED JOBS ARE STILL RUNNING. A failure of
      // either is completely silent: no screen changes and nobody is told,
      // and the first symptom is a detailer saying their morning alert
      // stopped. This product has been bitten twice by exactly that shape
      // (a dead email relay, VAPID keys never set) and both times the
      // evidence was a console line inside a function.
      const { data: beats } = await supabase.from("job_heartbeats")
        .select("job, ran_at, detail").order("job");

      return json({
        prices: { current: ps?.prices ?? null, built_in: PRICES, updated_at: ps?.updated_at ?? null },
        heartbeats: beats ?? [],
        rows,
        totals: {
          businesses: rows.length,
          active: rows.filter((r) => r.status === "active").length,
          mrr_cents: mrrCents,
          founding_left: Number(founding?.left ?? 0),
        },
      });
    }

    // --- JOB 2: what is going on with this one? ---------------------------
    if (action === "get") {
      const id = String(body.business_id || "");
      if (!id) return json({ error: "business_id is required" }, 400);
      const [b, settings, branding, members, svc, addOns, hours, bookings, sub, invoices, domains, events] =
        await Promise.all([
          supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
          supabase.from("business_settings").select("*").eq("business_id", id).maybeSingle(),
          supabase.from("business_branding").select("*").eq("business_id", id).maybeSingle(),
          supabase.from("business_users").select("email, role, label, permissions, created_at").eq("business_id", id),
          supabase.from("services").select("id, name, price, is_active").eq("business_id", id),
          supabase.from("add_ons").select("id, is_active").eq("business_id", id),
          supabase.from("business_hours").select("weekday, open_time, close_time").eq("business_id", id),
          supabase.from("bookings").select("id, status, start_at, created_at, total_price, final_amount")
            .eq("business_id", id).is("deleted_at", null).order("start_at", { ascending: false }).limit(200),
          supabase.from("platform_subscriptions").select("*").eq("business_id", id).maybeSingle(),
          supabase.from("platform_invoices").select("*").eq("business_id", id)
            .order("created_at", { ascending: false }).limit(24),
          supabase.from("business_domains").select("domain, verified_at, created_at").eq("business_id", id),
          supabase.from("platform_admin_events").select("admin_email, action, detail, created_at")
            .eq("business_id", id).order("created_at", { ascending: false }).limit(20),
        ]);
      if (!b.data) return json({ error: "No such business" }, 404);
      // PROMO CODES ARE COUNTED, NOT LISTED, and the same for the catalog's
      // detail: the spec's Job 2 is "have they finished setting up", which the
      // seven-step progress in `app/src/lib/setup.js` already answers. The
      // counts here are exactly that function's inputs, so the back office
      // shows THE SAME NUMBER the detailer sees rather than a second one.
      const [{ count: promos }, { count: photos }] = await Promise.all([
        supabase.from("promo_codes").select("id", { count: "exact", head: true })
          .eq("business_id", id).eq("is_active", true),
        supabase.from("gallery_images").select("id", { count: "exact", head: true })
          .eq("business_id", id).eq("is_active", true),
      ]);

      return json({
        business: b.data,
        settings: settings.data,
        branding: branding.data,
        members: members.data ?? [],
        counts: {
          services: (svc.data ?? []).filter((s) => s.is_active).length,
          addOns: (addOns.data ?? []).filter((a) => a.is_active).length,
          promos: promos ?? 0,
          photos: photos ?? 0,
          hoursOpen: (hours.data ?? []).some((h) => h.open_time),
        },
        bookings: bookings.data ?? [],
        subscription: sub.data,
        invoices: invoices.data ?? [],
        domains: domains.data ?? [],
        events: events.data ?? [],
      });
    }

    // --- JOB 3: do the thing without asking a developer -------------------

    // CREATE A BUSINESS BY HAND — for in-person onboarding: he signs somebody
    // up at their shop rather than sending them to a form. It is the one
    // action here that does not take a `business_id`, so it sits above the
    // lookup below.
    //
    // THE ROW AND ITS DEFAULTS COME FROM `_shared/newBusiness.ts`, the same
    // helper signup uses, and that is the whole reason the helper exists: a
    // second copy of "what a new business is" is where two KINDS of business
    // start to differ quietly — one with no settings row renders a dashboard
    // of nulls, one with no hours has a booking page that can never be
    // booked, and neither throws.
    // WHAT WE CHARGE — roadmap 4.4's "platform settings", which has exactly
    // one job. The price table is typed twice on purpose (a Deno bundle
    // cannot import out of `supabase/`), and one row makes the two copies one
    // number. It takes no `business_id`: this is the platform's own setting.
    //
    // NULL PUTS THE FILES BACK, and that is a real button rather than a
    // theoretical state — it is the whole safety net. If a typed table ever
    // looks wrong, one press restores what the product charged before anybody
    // touched it.
    if (action === "prices") {
      let value: PriceTable | null = null;
      if (body.prices !== null && body.prices !== undefined) {
        // `pricesFrom` already decides what a usable table is, and reusing it
        // here is the point: the screen cannot save a table the checkout
        // would silently reject and fall back from. A SECOND validator is how
        // those two answers drift.
        const SENTINEL = {} as unknown as PriceTable;
        const parsed = pricesFrom(body.prices, SENTINEL);
        if (parsed === SENTINEL) {
          return json({ error: "Those prices do not add up — every figure must be a number, and only the setup fee may be zero." }, 400);
        }
        value = parsed;
      }
      const { error } = await supabase.from("platform_settings").update({ prices: value }).eq("id", true);
      if (error) throw error;
      // THE WHOLE TABLE IS IN THE LOG, not a "changed" flag. This is the only
      // write in this back office that decides what somebody's card is
      // charged, and "he changed the prices on the 6th" is not an answer to
      // give anybody who asks which price they were shown.
      await logIt(admin, "prices", null, { to: value });
      return json({ success: true, prices: value, built_in: PRICES });
    }

    if (action === "create") {
      const made = await createBusinessRow(supabase, {
        name: body.name, slug: body.slug, timezone: body.timezone,
        contact_email: body.owner_email, contact_phone: body.contact_phone,
      });
      if (made.error || !made.business) return json({ error: made.error }, made.status ?? 400);
      const created = made.business;

      // NO MEMBERSHIP, AN INVITE. The person being signed up at their own
      // counter may have no account at all, and `business_users.user_id`
      // references `auth.users` — there is nobody to point it at. The invite
      // is the path that already exists and already ends in an owner, so the
      // dashboard they eventually open is identical to a self-signup's.
      const email = String(body.owner_email || "").trim().toLowerCase();
      let invite = null;
      if (email && email.includes("@")) {
        const { data: row } = await supabase.from("business_invites")
          .insert({ business_id: created.id, email, role: "owner", invited_by: admin.id })
          .select().single();
        if (row) {
          const settings = await getSettings(created.id);
          const business = (await businessById(created.id))!;
          const brand = await buildBrand(business, settings);
          const link = `${PLATFORM_URL}/invite/${row.token}`;
          const msg = inviteEmail(brand, { role: "owner", label: null, link, expiresAt: row.expires_at });
          const sent = await sendTenantEmail({
            businessId: created.id, to: email, subject: msg.subject, html: msg.html, text: msg.text,
          });
          // THE LINK COMES BACK EITHER WAY. He is standing next to them: if
          // the email is slow or the address was mistyped, reading the link
          // off his own screen is the whole point of doing this in person.
          invite = { email, link, emailed: sent, expires_at: row.expires_at };
        }
      }
      await logIt(admin, "create", created, { slug: created.slug, invited: email || null });
      return json({ success: true, business: created, invite });
    }

    const id = String(body.business_id || "");
    if (!id) return json({ error: "business_id is required" }, 400);
    const { data: biz } = await supabase
      .from("businesses").select("id, name, slug, status, plan_tier, site_url").eq("id", id).maybeSingle();
    if (!biz) return json({ error: "No such business" }, 404);

    if (action === "note") {
      const note = typeof body.note === "string" ? body.note.slice(0, 4000) : "";
      const { error } = await supabase.from("businesses")
        .update({ admin_notes_platform: note || null }).eq("id", id);
      if (error) throw error;
      // The note's CONTENT is deliberately not in the log. It is his own
      // private line about a customer; recording that he wrote one is the
      // audit, quoting it is a second copy of the thing.
      await logIt(admin, "note", biz, { length: note.length });
      return json({ success: true });
    }

    if (action === "suspend" || action === "restore") {
      const status = action === "suspend" ? "paused" : "active";
      const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
      if (error) throw error;
      // SUSPENSION IS `businesses.status = 'paused'` AND NOTHING ELSE, which
      // 2.20 stage 2 already built and proved: `businessBySlug` and
      // `get_public_business_profile` filter on `active`, so one column
      // darkens the public booking page, while `businessById` does not — a
      // customer who already booked keeps the page they cancel from, and the
      // detailer keeps every row. **This is that mechanism reached by hand
      // rather than a second one.**
      await logIt(admin, action, biz, { from: biz.status, to: status });
      return json({ success: true, status });
    }

    // THEIR WEBSITE — the one fact in this back office that is about work
    // done OUTSIDE the product. Everything else here is a row a detailer's
    // own use of the app produced; this is the platform owner's record of a
    // site he built by hand, which is why the columns are revoked from
    // `authenticated` and why the timestamp is the SERVER's rather than a
    // date typed into a box.
    if (action === "site") {
      const url = String(body.site_url || "").trim();
      // A BARE HOSTNAME IS WHAT SOMEBODY TYPES, and `href`ing it without a
      // scheme makes a RELATIVE link — /admin/ridgeline.com — which fails by
      // going somewhere plausible rather than by erroring. Store it whole.
      const full = !url ? null : /^https?:\/\//i.test(url) ? url : `https://${url}`;
      if (full) {
        try { new URL(full); } catch { return json({ error: "That is not a web address." }, 400); }
      }
      const { error } = await supabase.from("businesses")
        .update({ site_url: full, site_updated_at: full ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      await logIt(admin, "site", biz, { from: biz.site_url ?? null, to: full });
      return json({ success: true, site_url: full });
    }

    // ITEM H — EVERYTHING THEY OWN, AS ONE FILE.
    //
    // `/terms` says *"your customer list, your bookings and your history
    // belong to you, and you can have a copy of them at any time by asking"*,
    // and until now nothing could produce one. **It is also the answer to a
    // customer-data deletion request, which is the one legal ask that arrives
    // without warning.**
    //
    // THE TABLES ARE DISCOVERED IN SQL, NOT LISTED HERE. A hand-written list
    // goes stale the first time somebody adds a table, and the failure is
    // SILENT — the export succeeds, the file looks complete, and the missing
    // table is found by the person who no longer has it. `export_business()`
    // asks the catalog for every table with a `business_id`, which is the
    // same definition of "belongs to a business" that every RLS policy uses.
    if (action === "export") {
      const { data, error } = await supabase.rpc("export_business", { p_business_id: id });
      if (error) throw error;
      if (!data) return json({ error: "No such business" }, 404);
      // LOGGED LIKE EVERY OTHER WRITE, even though it writes nothing: this is
      // the single call in the product that returns every customer and every
      // price of one business at once, and "who took a copy, and when" is
      // exactly the question a detailer is entitled to ask. The row carries
      // the SIZE rather than the file.
      await logIt(admin, "export", biz, { tables: Object.keys(data.tables ?? {}).length });
      return json({ success: true, export: data });
    }

    if (action === "tier") {
      const tier = String(body.plan_tier || "");
      if (!["founding", "standard"].includes(tier)) return json({ error: "Unknown plan tier" }, 400);
      const { error } = await supabase.from("businesses").update({ plan_tier: tier }).eq("id", id);
      if (error) throw error;
      // AND THIS IS ALSO "RELEASE A FOUNDING SPOT", which the spec says he
      // will think of as its own action. The count is COMPUTED from the
      // accounts (`founding_offer()`), never typed, so moving somebody to
      // standard IS releasing their spot and there is nothing else to do.
      await logIt(admin, "tier", biz, { from: biz.plan_tier, to: tier });
      return json({ success: true, plan_tier: tier });
    }

    // RESEND AN INVITE — "the support request that otherwise needs him to open
    // the auth table", in the spec's own words. It supersedes any live invite
    // for that address rather than adding a second, because two live links to
    // the same account is a support call about which one to use.
    if (action === "resend_invite") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email.includes("@")) return json({ error: "A valid email address is required." }, 400);
      await supabase.from("business_invites")
        .update({ revoked_at: new Date().toISOString() })
        .eq("business_id", id).eq("email", email)
        .is("accepted_at", null).is("revoked_at", null);
      const role = body.role === "staff" ? "staff" : "owner";
      const { data: row, error: invErr } = await supabase.from("business_invites")
        .insert({ business_id: id, email, role, invited_by: admin.id })
        .select().single();
      if (invErr) throw invErr;
      const settings = await getSettings(id);
      const business = (await businessById(id))!;
      const brand = await buildBrand(business, settings);
      const link = `${PLATFORM_URL}/invite/${row.token}`;
      const msg = inviteEmail(brand, { role, label: null, link, expiresAt: row.expires_at });
      const sent = await sendTenantEmail({
        businessId: id, to: email, subject: msg.subject, html: msg.html, text: msg.text,
      });
      await logIt(admin, "resend_invite", biz, { email, role, emailed: sent });
      return json({ success: true, invite: { email, link, emailed: sent, expires_at: row.expires_at } });
    }

    if (action === "impersonate") {
      // THE BIGGEST SINGLE TIME-SAVER IN ANY BACK OFFICE — *"my Tuesday hours
      // aren't showing"* becomes thirty seconds instead of a twenty-message
      // thread — AND THE ONE THAT WILL LOOK WORST IF IT IS EVER QUESTIONED.
      const { data: owner } = await supabase
        .from("business_users").select("email").eq("business_id", id).eq("role", "owner").limit(1).maybeSingle();
      const email = owner?.email;
      if (!email) return json({ error: "That business has no owner account to sign in as." }, 409);

      // THE LOG IS WRITTEN BEFORE THE LINK IS MADE, AND ITS FAILURE STOPS
      // THE ACTION. Everywhere else in this function a failed log is a
      // console line, because refusing to suspend a non-paying business over
      // an audit row is the wrong trade. Here it is the opposite: an
      // impersonation nobody can prove happened is exactly the thing the log
      // exists for, and "it did not get written" is not an answer to give a
      // detailer who asks.
      if (!await logIt(admin, "impersonate", biz, { as: email })) {
        return json({ error: "Could not write the audit record, so this was not done." }, 500);
      }

      const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${PLATFORM_URL}/app` },
      });
      if (linkErr) return json({ error: linkErr.message }, 500);
      // GENERATED, NOT SENT. `generateLink` returns the URL without emailing
      // it, so the detailer is never told that somebody looked — which is a
      // deliberate choice and the reason the audit row above is not optional.
      return json({ success: true, url: link?.properties?.action_link, as: email });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("platform-admin error:", error);
    return json({ error: (error as Error)?.message || "internal_error" }, 400);
  }
});
