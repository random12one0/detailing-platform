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
import { dateStrIn, localToDate } from "../_shared/tz.ts";
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

    // **THE CHEAPEST QUESTION IN THIS FUNCTION, and it exists so the
    // DETAILER'S dashboard can offer a way through to the back office.**
    // Until now /admin was a URL you had to know, which is why the owner
    // could not find his own way in.
    //
    // It answers nothing a non-admin could not already work out: they get
    // the same 404 from the gate above that every other action gives them,
    // so this adds no new disclosure. **What it must never become is an
    // action that returns `{admin:false}` instead of 404** — that would
    // turn a silent endpoint into one that confirms itself to anybody who
    // asks, which is the whole thing the 404 is protecting.
    //
    // No table reads: the gate has already done the only query that matters.
    if (action === "whoami") return json({ admin: true, email: admin.email ?? null });


    // --- JOB 1: who are my customers and what state are they in? ----------
    if (action === "list") {
      // ONE ROUND TRIP PER TABLE, joined in memory. There are fewer than ten
      // businesses and there will be fewer than a hundred for a long time; a
      // view or a stack of lateral joins is the right answer at a thousand,
      // and building it now would be guessing at a shape nothing has measured.
      const [biz, subs, book, users] = await Promise.all([
        supabase.from("businesses")
          .select("id, slug, name, status, plan_tier, is_demo, contact_email, contact_phone, created_at, admin_notes_platform, site_url, site_updated_at")
          .order("created_at", { ascending: false }),
        supabase.from("platform_subscriptions")
          .select("business_id, status, recurring_cents, bill_interval, current_period_end, suspended_at, cancel_at_period_end"),
        // `start_at` only, and every row: "last activity" is the column the
        // spec says earns its place — a detailer with no booking in three
        // weeks is on holiday or leaving, and both are worth knowing before
        // the card fails.
        // MONEY COLUMNS ADDED 2026-09-06 (`docs/platform-admin-audit-2026-09-06.md`
        // Q1). The list already carried "when did they last book"; what it
        // could not answer was the first question anybody asks about a
        // tenant — **is this working for them.** `final_amount` is what was
        // actually charged and `total_price` is what was quoted, and the
        // difference between the two is the whole reason this repo has a
        // rule about a number PRINTED not being a number CHARGED.
        supabase.from("bookings")
          .select("business_id, start_at, created_at, status, total_price, final_amount")
          .is("deleted_at", null),
        supabase.from("business_users").select("business_id, email, role"),
      ]);
      // One more whole-table read, same shape as the six below it: how many
      // people each detailer has on their books. It answers "are they using
      // it" better than any other single number, because a detailer with
      // sixty customers is not leaving.
      const { data: custAll } = await supabase.from("customers").select("business_id");
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

      const nCustomers = new Map<string, number>();
      for (const c of custAll ?? []) nCustomers.set(c.business_id, (nCustomers.get(c.business_id) ?? 0) + 1);

      const now = Date.now();
      // THE MONTH IS THE CALENDAR MONTH, not the last thirty days. A back
      // office is read beside an invoice and a bank statement, and both of
      // those are calendar months; a rolling window would quietly disagree
      // with every other number he compares it against.
      // **AND THE MONTH IS THE DETAILER'S, NOT THE SERVER'S — roadmap 8.7,
      // testing-loop F-018.** `new Date()` in an edge function is UTC, so
      // "this month" began at 00:00 UTC — which is 5pm on the last day of the
      // previous month in Los Angeles. Every job a detailer did on the 1st
      // before their own morning fell into last month's takings, on the tile
      // the owner reads as *how much work the platform carried*. His words:
      // *"it should just use whatever they set it to."*
      //
      // **THE WINDOW IS THEREFORE PER BUSINESS**, computed inside the row map
      // below from `b.timezone`, because fourteen detailers in four zones do
      // not share a first-of-the-month. `_shared/tz.ts` already owns this
      // arithmetic — `localToDate` solves the DST offset — and a second
      // implementation of it here is the thing that file exists to prevent.
      const monthWindow = (tz: string) => {
        const [y, mo] = dateStrIn(tz || "UTC", new Date()).split("-").map(Number);
        return [
          localToDate(tz || "UTC", y, mo, 1, 0, 0).getTime(),
          localToDate(tz || "UTC", mo === 12 ? y + 1 : y, mo === 12 ? 1 : mo + 1, 1, 0, 0).getTime(),
        ] as const;
      };
      // AND IT HAS AN END — testing loop F-018, 2026-09-06. The filter was
      // `start_at >= monthAgo` with nothing above it, so a completed job
      // DATED next month counted as this month's takings. A detailer who
      // finalises early, or a job rescheduled forward and then marked done,
      // is enough — and the figure that goes wrong is the one on the tile
      // the owner reads as "how much work the platform carried".

      const rows = (biz.data ?? []).map((b) => {
        const bs = bookings.get(b.id) ?? [];
        const last = bs.reduce<string | null>((a, r) => (!a || r.created_at > a ? r.created_at : a), null);
        const live = bs.filter((r) => r.status !== "cancelled");
        // **WHAT WAS CHARGED, FALLING BACK TO WHAT WAS QUOTED.** A job that
        // has not been finalised has no `final_amount` yet, and treating
        // that as zero would make every busy detailer look idle until they
        // did their paperwork. The fallback is named here rather than
        // buried, because it is the reason this figure can differ from the
        // detailer's own Money screen by the value of un-finalised work.
        const paid = (r: { final_amount: number | null; total_price: number | null }) =>
          Number(r.final_amount ?? r.total_price ?? 0);
        const done = live.filter((r) => r.status === "completed");
        const [monthAgo, monthTo] = monthWindow(b.timezone);
        const monthJobs = done.filter((r) => {
          if (!r.start_at) return false;
          const t = Date.parse(r.start_at);
          return t >= monthAgo && t < monthTo;
        });
        const days = last ? Math.floor((now - Date.parse(last)) / 86_400_000) : null;
        const owner = (members.get(b.id) ?? []).find((m) => m.role === "owner");
        return {
          id: b.id,
          slug: b.slug,
          name: b.name,
          status: b.status,
          plan_tier: b.plan_tier,
          // WHETHER THIS IS A REAL DETAILER — testing loop F-014, 2026-09-06.
          // The column has existed since roadmap 6.2 (it is what keeps the
          // demo out of the founding count) and this screen never asked for
          // it, so three seeded demos AND every fixture the database-backed
          // suites leave behind were listed as ordinary detailers. The
          // headline read "Detailers 15" on a platform with none, and NEEDS
          // A LOOK — the one list here whose whole job is to be short — was
          // eight rows of test businesses. A back office that cannot tell a
          // fixture from a customer cannot answer the question it exists
          // for.
          is_demo: !!b.is_demo,
          owner_email: owner?.email ?? b.contact_email ?? null,
          created_at: b.created_at,
          has_note: !!(b.admin_notes_platform || "").trim(),
          bookings_total: live.length,
          jobs_done: done.length,
          jobs_cancelled: bs.length - live.length,
          revenue_month: monthJobs.reduce((a, r) => a + paid(r), 0),
          revenue_total: done.reduce((a, r) => a + paid(r), 0),
          jobs_month: monthJobs.length,
          customers: nCustomers.get(b.id) ?? 0,
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
        .select("prices, updated_at, email_daily_cap, owner_email, healthcheck_url").limit(1).maybeSingle();

      // ITEM D — WHETHER THE SCHEDULED JOBS ARE STILL RUNNING. A failure of
      // either is completely silent: no screen changes and nobody is told,
      // and the first symptom is a detailer saying their morning alert
      // stopped. This product has been bitten twice by exactly that shape
      // (a dead email relay, VAPID keys never set) and both times the
      // evidence was a console line inside a function.
      //
      // ROADMAP 8.12 — `stale_after_seconds` and `alerted_at` ride along, and
      // the first of the two is the point: the screen used to carry its own
      // copy of every window, so a threshold changed in one place left the
      // line saying a job was fine while the alarm was going off. The row is
      // the ONE copy now and the screen asks it.
      const { data: beats } = await supabase.from("job_heartbeats")
        .select("job, ran_at, detail, stale_after_seconds, alerted_at").order("job");

      // THE PHOTO STORE — added 2026-09-06 with the share rule. A detailer's
      // allowance is the whole store divided by a hundred, so **the total is
      // the only thing the owner can actually decide**, and he cannot decide
      // it without seeing it.
      //
      // `committed` is the number that goes wrong first and the one nothing
      // else would ever show: the store can be 4% USED and 140% PROMISED at
      // the same time, and only the second predicts the morning a detailer
      // cannot upload. Past a hundred businesses the shares stop fitting.
      const { data: store } = await supabase.rpc("photo_store_state");

      // ROADMAP 8.14 — THE PLATFORM'S OWN PROMO CODES. Sent here rather than
      // read by the screen for the reason every byte on this page is: no
      // policy on any table has an "or a platform admin" clause, and this
      // table has no policies at all. `redeemed` rides along because a code
      // nobody has used and a code that has been used forty times are
      // different decisions, and neither is visible from the code itself.
      const { data: promos } = await supabase.from("platform_promo_codes")
        .select("*").order("created_at", { ascending: false }).limit(100);

      // ROADMAP 8.6 — TODAY'S EMAILS AGAINST THE CAP. *"a tracker inside my
      // dashboard that shows me how many emails get sent a day, and gives me
      // warnings when we're getting close to that hundred a day limit."*
      //
      // **UTC, because that is the clock the provider's cap runs on.**
      // Counting in his own timezone would print a number that disagrees with
      // Resend's at the exact hours the warning matters.
      //
      // The row is ABSENT until the first send of the day, and absent means
      // zero rather than unknown — so the screen is handed a number either
      // way and never has to decide what a missing row means.
      const today = new Date().toISOString().slice(0, 10);
      const { data: mail } = await supabase.from("platform_email_days")
        .select("sent, failed").eq("day", today).maybeSingle();

      // The detailers, as opposed to everything else in the table — testing
      // loop F-014. Seeded demos and the fixtures the database-backed suites
      // leave behind are all real rows with real bookings, and every tile on
      // this screen was counting them.
      const real = rows.filter((r) => !r.is_demo);

      return json({
        prices: { current: ps?.prices ?? null, built_in: PRICES, updated_at: ps?.updated_at ?? null },
        heartbeats: beats ?? [],
        photo_store: store?.[0] ?? null,
        promos: promos ?? [],
        // The cap comes from the ROW so raising it is how the warning is
        // answered — his own sentence, read literally. `owner_email` rides
        // along because the screen has to be able to say when nobody is
        // being told about a signup.
        email: {
          sent: mail?.sent ?? 0,
          failed: mail?.failed ?? 0,
          cap: ps?.email_daily_cap ?? 100,
          owner_email: ps?.owner_email ?? null,
        },
        // ROADMAP 8.12 — WHETHER ANYTHING IS WATCHING FROM OUTSIDE. The
        // watcher runs on the same `pg_cron` it watches, so pg_cron stopping
        // takes the alarm with it and the silence is identical to health. The
        // URL is the whole configuration, and **the boolean is sent rather
        // than the address**: this is a write-only secret in effect — anybody
        // holding it can keep our monitoring green from the outside — and the
        // screen only needs to know whether it is there.
        watch: { outside: Boolean(ps?.healthcheck_url) },
        rows,
        // EVERY TILE COUNTS REAL DETAILERS ONLY — testing loop F-014. The
        // rows still carry the demos and the fixtures, because he does open
        // the demo and does want to see a suite's leftovers; what he must
        // never be told is that he has fifteen customers. `founding_left`
        // already excluded them at the database (roadmap 6.2) and was the
        // only figure on this screen that did.
        totals: {
          businesses: real.length,
          active: real.filter((r) => r.status === "active").length,
          demo: rows.length - real.length,
          mrr_cents: mrrCents,
          founding_left: Number(founding?.left ?? 0),
          // ADDED 2026-09-06. **The proof the thing works**, and the number
          // to have in front of you on a sales call: how much work the
          // platform actually carried this month, across everybody. The
          // four above are about the BUSINESS; this one is about the
          // PRODUCT, which is a different question and was unanswerable.
          suspended: real.filter((r) => r.status === "paused").length,
          jobs_month: real.reduce((a, r) => a + r.jobs_month, 0),
          revenue_month: real.reduce((a, r) => a + r.revenue_month, 0),
          customers: real.reduce((a, r) => a + r.customers, 0),
          // Signed up this calendar month — churn needs a cancelled-at
          // history nothing records yet, and a half of a pair is worse than
          // neither: "3 joined" beside nothing reads as "and none left".
          new_month: real.filter((r) => Date.parse(r.created_at) >= monthAgo).length,
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

    // ── ROADMAP 8.14 — MAKING A CODE, AND RETIRING ONE ─────────────────
    //
    // **THERE IS NO EDIT AND THAT IS DELIBERATE.** A code's terms are what
    // somebody was told when it was handed to them; changing 25% into 10%
    // afterwards changes what a person already in a conversation is being
    // offered, and there is no record anywhere of what it used to say. Make
    // another code and switch this one off.
    if (action === "promo_new") {
      const code = String(body.code ?? "").trim().toUpperCase();
      // The same shape the column's own CHECK enforces, said here so the
      // answer is a sentence rather than a Postgres constraint name.
      if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code)) {
        return json({
          error: "A code is 3 to 32 characters: letters, numbers and dashes, no spaces.",
        }, 400);
      }
      const kind = body.kind === "percent" ? "percent" : "amount";
      // **DOLLARS IN, CENTS STORED.** He types 200 meaning $200, and every
      // money column in this schema is cents. Doing that conversion on the
      // SCREEN is how a code worth two dollars gets created and nobody
      // notices until somebody redeems it.
      const raw = Number(body.value);
      const value = kind === "percent" ? Math.round(raw) : Math.round(raw * 100);
      if (!Number.isFinite(value) || value <= 0 || (kind === "percent" && value > 100)) {
        return json({
          error: kind === "percent"
            ? "A percentage has to be between 1 and 100."
            : "An amount has to be more than zero.",
        }, 400);
      }
      const offSetup = body.off_setup !== false;
      const offRecurring = body.off_recurring === true;
      if (!offSetup && !offRecurring) {
        return json({ error: "Pick what it comes off — the build, the monthly, or both." }, 400);
      }
      const row = {
        code,
        kind,
        value,
        off_setup: offSetup,
        off_recurring: offRecurring,
        stacks_with_founding: body.stacks_with_founding === true,
        max_redemptions: Number.isFinite(Number(body.max_redemptions))
            && Number(body.max_redemptions) > 0
          ? Math.round(Number(body.max_redemptions))
          : null,
        expires_at: typeof body.expires_at === "string" && body.expires_at
          ? new Date(`${body.expires_at}T23:59:59Z`).toISOString()
          : null,
        note: typeof body.note === "string" ? body.note.slice(0, 300) : null,
      };
      const { error } = await supabase.from("platform_promo_codes").insert(row);
      // 23505 is a duplicate key, and it is the one failure here somebody can
      // actually act on — every other one is ours.
      if (error) {
        return json({
          error: (error as { code?: string }).code === "23505"
            ? `${code} already exists. Switch it off or pick another name.`
            : error.message,
        }, 400);
      }
      // A CODE IS MONEY OFF, so it is logged like the price table is: what was
      // made, in full, because "he made a code in September" is not an answer
      // to give anybody who asks why a detailer is paying what they pay.
      await logIt(admin, "promo_new", null, row);
      return json({ success: true });
    }

    if (action === "promo_off") {
      const code = String(body.code ?? "").trim().toUpperCase();
      // **SWITCHED OFF, NEVER DELETED.** `platform_subscriptions.promo_code`
      // names it, and a row pointing at a code that no longer exists is a
      // discount nobody can explain.
      const { error } = await supabase.from("platform_promo_codes")
        .update({ active: false }).eq("code", code);
      if (error) throw error;
      await logIt(admin, "promo_off", null, { code });
      return json({ success: true });
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
