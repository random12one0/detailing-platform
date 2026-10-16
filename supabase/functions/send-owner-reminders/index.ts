// The reminder sweep — runs every ~15 minutes (scheduler), covering EVERY
// business. Due-ness is computed in SQL per business from that business's
// own settings and timezone (get_bookings_due_for_* functions). Also serves
// a manual member-gated mode: { business_id?, booking_id, target } re-sends
// one reminder on demand.
//
// Reminder kinds, all settings-driven:
//   * customer appointment reminders — TWO of them since roadmap 2.18, the
//     first carrying the evening-before rule and the second a plain offset,
//     each with its own marker so a re-run cannot double-send
//   * owner appointment reminders (evening-before rule included)
//  * "starting soon" owner push, "wrapping up" push, "finalize payment" push
//   * one morning digest per business per local day at daily_digest_hour

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { retryRead, supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { cronRefusal } from "../_shared/cronAuth.ts";
import { businessById, getSettings, requireMember, type Business } from "../_shared/tenant.ts";
import {
  buildBrand, extraVehiclesFor, langForCustomer, ownerRecipients, recipientLang, sendTenantEmail,
} from "../_shared/email.ts";
import { customerReminderEmail, formatDateLong, formatTime12hr, maintenanceDueEmail, maintenanceDueSubject, ownerNewBookingEmail, ownerReminderSubject, staleRequestEmail } from "../_shared/emailTemplates.ts";
import { sendOwnerPush } from "../_shared/ownerPush.ts";
import { requireOwnerReached, sendToEachOwner } from "../_shared/ownerFanout.ts";
import { businessSiteUrl, receiptUrl, unsubscribeUrl } from "../_shared/config.ts";
import { maintenanceVerdict, STAGES, stageDue } from "../_shared/maintenance.ts";
import { siteFor } from "../_shared/tenantSite.ts";
import { dateStrIn, hourIn, timeStrIn } from "../_shared/tz.ts";

// deno-lint-ignore no-explicit-any
type BookingRow = any;

const bizCache = new Map<string, Business>();
async function biz(id: string): Promise<Business> {
  if (!bizCache.has(id)) bizCache.set(id, (await businessById(id))!);
  return bizCache.get(id)!;
}

// ROADMAP 3.3 made this ASYNC, and that is the only reason it is: the
// receipt link now depends on whether this business has a verified domain of
// its own, which is a database fact rather than a constant. `siteFor` caches
// per invocation, so the sweep of every due reminder still costs one query.
async function emailDataFor(business: Business, b: BookingRow) {
  const tz = business.timezone;
  return {
    id: b.id,
    // ROADMAP 8.17 STAGE 2A — this sweep sends the CUSTOMER's reminder and
    // the CUSTOMER's thank-you as well as the owner's own nudges, and the
    // templates decide which audience they are for. Carrying the language
    // here means the customer's two get it and the owner's ignore it.
    lang: b.lang,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    customerEmail: b.customer_email,
    customerAddress: b.customer_address,
    // ROADMAP 2.8 FOLLOW-UP, 2026-09-20 — found missing, not deliberate.
    // `ownerWhereRow()` (shared by the owner's evening-before reminder and
    // the stale-request nudge below) reads these two off exactly the names
    // used here; without them it always sees `undefined` and both emails
    // silently print a plain address regardless of the real value. 2.8's own
    // writeup claimed the request nudge was covered via this shared helper —
    // it was proven on a screen with a PICKED address, where the row is
    // correctly blank either way, so the gap was never actually exercised.
    addressSource: b.address_source,
    travelZoneAddressMismatch: b.travel_zone_address_mismatch,
    dateStr: dateStrIn(tz, new Date(b.start_at)),
    startTime: timeStrIn(tz, new Date(b.start_at)),
    endTime: timeStrIn(tz, new Date(b.end_at)),
    serviceType: b.service_type,
    travelFee: Number(b.travel_fee) || 0,
    travelZone: b.travel_zone,
    adjustments: b.price_adjustments ?? [],
    vehicleSize: b.vehicle_size_label || b.vehicle_size,
    // ROADMAP 8.10 — the other cars on this same visit, or an empty list. The
    // owner reminder is the email a detailer reads while loading the van.
    extraVehicles: await extraVehiclesFor(b.id),
    vehicleModel: b.vehicle_model,
    customerNotes: b.customer_notes,
    serviceNames: [],
    addOnNames: [],
    subtotal: Number(b.subtotal),
    siteDiscount: 0,
    siteDiscountPercent: 0,
    promoCode: b.applied_promo_code,
    promoDiscount: Number(b.promo_discount) || 0,
    total: Number(b.total_price),
    receiptUrl: receiptUrl(await siteFor(supabase, business.id), b.id),
  };
}

// ---------------------------------------------------------------------------
// A REFUSED SEND IS A FAILURE AND MUST REACH THE CALLER'S `catch` — 2026-09-13
// ---------------------------------------------------------------------------
// **This one line is why the customer appointment reminder had sent ZERO emails
// across all 56 bookings the product has ever had.** `sendTenantEmail` returns
// `false` and does not throw — *"best-effort by design: an email failure must
// never fail a booking"*, which is correct on the booking path and exactly
// wrong here. Every caller in this file ignored the boolean, so a refused send
// fell through to `mark()`, the booking was stamped *reminded*, and the RPC can
// never return it again.
//
// **AND IT WAS INVISIBLE IN EVERY INSTRUMENT.** `results` said `sent: true`, the
// heartbeat summary counted it as sent, and the Plumbing tab drew it as sent.
// The reporting machinery for a failed reminder already existed and was simply
// never reached.
//
// **THROWING IS THE WHOLE FIX** because the `catch` around each loop already
// does the right three things: records `sent: false` with the error, leaves the
// marker alone so the next sweep tries again, and puts `*_failed` in the
// heartbeat summary. It is deliberately NOT a change to `sendTenantEmail`
// itself, which is called from thirty places where a booking must survive a
// dead relay.
function mustSend(ok: boolean, what: string) {
  if (!ok) throw new Error(`the email relay refused the ${what}. Not marking it as sent.`);
}

async function sendCustomerReminder(b: BookingRow, second = false) {
  const business = await biz(b.business_id);
  const settings = await getSettings(business.id);
  // THE SECOND REMINDER HAS ITS OWN SWITCH AND STILL RESPECTS THE FIRST'S.
  // `email_customer_reminder` is "does this business remind its customers at
  // all"; turning it off must silence both, or a detailer who switched
  // reminders off keeps getting the second one.
  //
  // **BOTH OF THESE ARE NOW ALSO IN THE RPC'S `where` CLAUSE** (migration
  // 20260913020000) and that is not redundancy for its own sake: a guard here
  // could only ever return early, and returning early still reached `mark()`.
  // A row that is not selected cannot be stamped. This stays as the second
  // half of a belt and braces on a money path, and as the guard for the
  // manual re-send below, which does not go through the RPC at all.
  if (!settings.email_customer_reminder) return false;
  if (second && !settings.customer_reminder_2_enabled) return false;
  const brand = await buildBrand(business, settings);
  const msg = customerReminderEmail(brand, await emailDataFor(business, b), second);
  mustSend(
    await sendTenantEmail({ bookingId: b.id, businessId: business.id, to: b.customer_email, subject: msg.subject, html: msg.html, text: msg.text }),
    second ? "second customer reminder" : "customer reminder",
  );
  return true;
}

async function sendOwnerReminder(b: BookingRow) {
  const business = await biz(b.business_id);
  const settings = await getSettings(business.id);
  const brand = await buildBrand(business, settings);
  const data = await emailDataFor(business, b);
  // The owner reminder reuses the owner notification layout — same info, new
  // subject line.
  // ROADMAP 97.5 — every address is tried and the push always goes after
  // them; this throws only if neither an email nor the push reached the
  // owner, so one bad address cannot hold the marker back and re-send to the
  // rest. See _shared/ownerFanout.ts for why a delivered push counts.
  const recipients = settings.email_owner_reminder ? ownerRecipients(business, settings) : [];
  const { sent, failed } = await sendToEachOwner(recipients, async (to) => {
    // ROADMAP 3.4 FAULT 4 — in each recipient's own dashboard language.
    const lang = await recipientLang(to, business.id);
    const msg = ownerNewBookingEmail(brand, data, false, undefined, lang);
    return await sendTenantEmail({ bookingId: b.id,
      businessId: business.id,
      to,
      // ROADMAP 99.2e — "Tomorrow at 6 PM: Maria Lopez, 1234 Oak St". This
      // was typed here with the raw 2026-10-03 date in it.
      subject: ownerReminderSubject(brand, data, lang),
      html: msg.html,
      text: msg.text,
    });
  });
  const pushed = settings.push_enabled ? await sendOwnerPush(business.id, {
    title: "Upcoming job reminder",
    body: `${b.customer_name} · ${formatTime12hr(data.startTime)}`,
    url: `/job/${b.id}`,
    tag: `booking-${b.id}`,
  }).then((r) => r.sent, (e) => { console.error("push failed", e); return 0; }) : 0;
  requireOwnerReached({ addresses: recipients.length, sent, pushed }, "owner reminder");
  return failed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  // Set once the manual branch is entered: only a member's own re-send may see
  // an error's text. The sweep's answer never carries one (ROADMAP 97.3).
  let manual = false;
  try {
    const body = await req.json().catch(() => ({}));

    // --- Manual mode: one booking, member-gated -----------------------------
    if (body.booking_id) {
      manual = true;
      const member = await requireMember(req, body.business_id ?? null);
      if (!member) return json({ error: "Unauthorized" }, 401);
      const { data: b } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", body.booking_id)
        .eq("business_id", member.businessId)
        .maybeSingle();
      if (!b) return json({ error: "Booking not found" }, 404);

      // ROADMAP 2.12 — NOT FOR A REQUEST NOBODY HAS ACCEPTED. The migration
      // took `pending` out of all four due-for-reminder RPCs; this is the same
      // send by hand, and a guard in the UI alone would leave the hole open to
      // anything else that ever calls this.
      if (b.status === "pending") {
        return json({ error: "Accept this request before reminding them about it." }, 409);
      }
      if (body.target === "customer") {
        if (!b.customer_email) return json({ error: "This booking has no customer email on file." }, 400);
        await sendCustomerReminder(b);
        return json({ success: true, count: 1 });
      }
      await sendOwnerReminder(b);
      await supabase.from("bookings").update({ owner_reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
      return json({ success: true, count: 1 });
    }

    // --- Scheduled sweep (idempotent; every send is marker-guarded) ---------
    // ROADMAP 97.3: only pg_cron, carrying the shared secret, may start it.
    const refused = cronRefusal(req);
    if (refused) return refused;
    const results: { id: string; kind: string; sent: boolean; error?: string }[] = [];

    // ROADMAP 97.4 — CLAIM FIRST, SEND SECOND. Every stage here used to send
    // and THEN write its marker, so two sweeps that overlapped (a slow run
    // still going when the next tick fired, or a hand-started one) both read
    // the same due rows and both sent every reminder. Now the marker is
    // written FIRST and only where it is still empty: one UPDATE, which
    // Postgres runs atomically, so of two sweeps exactly one gets the row back
    // and only that one sends. A failed or skipped send gives the claim back,
    // so the next sweep retries it exactly as before. The accepted cost: a run
    // killed between the claim and the send loses that one reminder rather
    // than sending it twice. `tests/reminder-claim.test.mjs` runs two sweeps
    // at once against this file.
    const claim = async (id: string, col: string) => {
      const stamp = new Date().toISOString();
      const { data, error } = await supabase.from("bookings")
        .update({ [col]: stamp }).eq("id", id).is(col, null).select("id");
      if (error) throw error;
      return data?.length ? stamp : null;
    };
    // Only OUR stamp is cleared, so a manual send that landed meanwhile keeps its own.
    const release = async (id: string, col: string, stamp: string) => {
      const { error } = await supabase.from("bookings")
        .update({ [col]: null }).eq("id", id).eq(col, stamp);
      if (error) throw new Error(`could not give the claim back, so the next sweep will not retry it: ${error.message}`);
    };
    // `send` returning false is a skip (reminders switched off), not a send.
    const once = async (id: string, col: string, kind: string, send: () => Promise<boolean | void>) => {
      let stamp: string | null = null;
      try {
        stamp = await claim(id, col);
        if (!stamp) return; // another sweep claimed it first
        if (await send() === false) {
          await release(id, col, stamp);
          results.push({ id, kind, sent: false, error: "reminders are switched off for this business" });
          return;
        }
        results.push({ id, kind, sent: true });
      } catch (e) {
        let error = String(e);
        if (stamp) await release(id, col, stamp).catch((r) => { error += ` / ${r}`; });
        results.push({ id, kind, sent: false, error });
      }
    };

    // THIS `Promise.all` IS WHERE THE SWEEP DIED — 2026-09-13. Seven calls
    // leave together, PostgREST answers ~1.1% of them 504 in bursts of three
    // to six, and the `throw` below is all-or-nothing, so ONE bad answer out
    // of seven aborted the entire run. Measured: 0 of 5 scheduled ticks
    // survived. All seven are read-only `get_*` functions, which is the only
    // reason they may be retried at all — see `retryRead` in _shared/db.ts.
    const [ownerDue, customerDue, nudgeDue, wrapupDue, finalizeDue, requestDue, secondDue] = await Promise.all([
      retryRead("due:owner", () => supabase.rpc("get_bookings_due_for_reminder", { target: "owner" })),
      retryRead("due:customer", () => supabase.rpc("get_bookings_due_for_reminder", { target: "customer" })),
      retryRead("due:nudge", () => supabase.rpc("get_bookings_due_for_nudge")),
      retryRead("due:wrapup", () => supabase.rpc("get_bookings_due_for_wrapup_nudge")),
      retryRead("due:finalize", () => supabase.rpc("get_bookings_due_for_finalize_nudge")),
      // ROADMAP 2.12 FOLLOW-UP, approved by the owner 2026-09-03.
      retryRead("due:request", () => supabase.rpc("get_requests_due_for_nudge")),
      // ROADMAP 2.18. Its own RPC rather than a `target` on the first one:
      // that function carries the EVENING-BEFORE rule, and a second reminder
      // must not inherit it or a business with both settings on gets two
      // evening-before sends racing on one marker. The RPC also refuses to run
      // before the first reminder has gone.
      retryRead("due:second", () => supabase.rpc("get_bookings_due_for_second_reminder")),
    ]);
    for (const r of [ownerDue, customerDue, nudgeDue, wrapupDue, finalizeDue, requestDue, secondDue]) {
      if (r.error) throw r.error;
    }

    for (const b of ownerDue.data || []) {
      await once(b.id, "owner_reminder_sent_at", "owner_reminder", async () => {
        const failed = await sendOwnerReminder(b);
        // The refused addresses are `failed` rows in the mail log already;
        // this puts them in the heartbeat summary too.
        if (failed.length) results.push({ id: b.id, kind: "owner_reminder", sent: false, error: `refused for ${failed.length} of the owner addresses` });
      });
    }
    // A SKIP IS NOT A SEND, SO IT DOES NOT KEEP THE MARKER EITHER: `once` gives
    // the claim back. The RPC now refuses to return a switched-off business at
    // all, so this should be unreachable from the sweep — it is handled because
    // a marker written for a reminder nobody sent is the fault that made this
    // whole item necessary, and "unreachable" is a claim about today's query.
    for (const b of customerDue.data || []) {
      await once(b.id, "customer_reminder_sent_at", "customer_reminder", () => sendCustomerReminder(b));
    }
    for (const b of secondDue.data || []) {
      await once(b.id, "customer_reminder_2_sent_at", "customer_reminder_2", () => sendCustomerReminder(b, true));
    }
    for (const b of nudgeDue.data || []) {
      await once(b.id, "owner_nudge_sent_at", "nudge", async () => {
        const business = await biz(b.business_id);
        await sendOwnerPush(business.id, {
          title: "Starting soon",
          body: `${b.customer_name} · ${formatTime12hr(timeStrIn(business.timezone, new Date(b.start_at)))}`,
          url: `/job/${b.id}`,
          tag: `booking-${b.id}`,
        });
      });
    }
    for (const b of wrapupDue.data || []) {
      await once(b.id, "owner_wrapup_nudge_sent_at", "wrapup", async () => {
        const business = await biz(b.business_id);
        await sendOwnerPush(business.id, {
          title: "Wrapping up soon",
          body: `${b.customer_name} · finalize the payment when you're done`,
          url: `/job/${b.id}`,
          tag: `booking-${b.id}`,
        });
      });
    }
    for (const b of finalizeDue.data || []) {
      await once(b.id, "owner_finalize_nudge_sent_at", "finalize", async () => {
        const business = await biz(b.business_id);
        await sendOwnerPush(business.id, {
          title: "Finalize payment",
          body: `${b.customer_name} · job ended, payment not finalized yet`,
          url: `/job/${b.id}`,
          tag: `booking-${b.id}`,
        });
      });
    }

    // A REQUEST NOBODY ANSWERED — the fifth nudge, and the only one that is
    // about the DETAILER owing somebody a reply rather than about a job. It
    // sends a push AND an email, unlike the other three nudges, which are push
    // only: those all fire within an hour of a job the detailer is already
    // thinking about, and this one can fire on a quiet Tuesday about a request
    // that arrived while their phone was in a pocket. Request mode's whole
    // promise is that the detailer answers; a notification nobody sees is the
    // feature not working.
    for (const b of requestDue.data || []) {
      await once(b.id, "owner_request_nudge_sent_at", "request_nudge", async () => {
        const business = await biz(b.business_id);
        const settings = await getSettings(business.id);
        const tz = business.timezone;
        const when = `${dateStrIn(tz, new Date(b.start_at))} at ${formatTime12hr(timeStrIn(tz, new Date(b.start_at)))}`;
        const waited = Math.round((Date.now() - new Date(b.created_at).getTime()) / 3600_000);
        const brand = await buildBrand(business, settings);
        const data = await emailDataFor(business, b);
        // ROADMAP 97.5 — same rule as the owner reminder: every address is
        // tried, the push always goes, and this throws only if NEITHER reached
        // the owner. Before 97.5 a refused address re-sent the push and every
        // other address's email each sweep; the first 97.5 version then threw
        // before the push, so a one-address business got NO push at all while
        // email was down. A delivered push now marks it, so it goes once.
        const recipients = ownerRecipients(business, settings);
        const { sent, failed } = await sendToEachOwner(recipients, async (to) => {
          // ROADMAP 3.4 FAULT 4 — in each recipient's own dashboard language.
          const msg = staleRequestEmail(brand, data, waited, await recipientLang(to, business.id));
          return await sendTenantEmail({ bookingId: b.id, businessId: business.id, to, subject: msg.subject, html: msg.html, text: msg.text });
        });
        const pushed = await sendOwnerPush(business.id, {
          title: "Still waiting on you",
          body: `${b.customer_name} asked for ${when} · ${waited}h ago, no answer yet`,
          url: `/job/${b.id}`,
          tag: `booking-${b.id}`,
        }).then((r) => r.sent, (e) => { console.error("push failed", e); return 0; });
        requireOwnerReached({ addresses: recipients.length, sent, pushed }, "stale request nudge");
        if (failed.length) results.push({ id: b.id, kind: "request_nudge", sent: false, error: `refused for ${failed.length} of the owner addresses` });
      });
    }

    // --- ROADMAP 2.23: MAINTENANCE DEADLINES, THE ONLY THING HERE THAT
    // ESCALATES. -----------------------------------------------------------
    //
    // Every other reminder in this sweep fires once, because the job happens
    // whether or not anybody reads the email. **A ceramic-coating warranty
    // does not**: miss the window and something the customer paid $1,500 for
    // is gone, permanently. So this one goes at 60, 30, 14 and 1 days, and
    // `reminded_stage` on the row is what stops a re-run of the sweep sending
    // the same step twice.
    //
    // IT ASKS FOR THE NEXT SIXTY DAYS AND DECIDES IN CODE. The stages, "is
    // this met" and "which step is due" all live in `_shared/maintenance.ts`
    // beside the screen's copy of the same arithmetic, so the email can never
    // call something missed that the detailer's screen still calls due.
    //
    // THE CUSTOMER IS THE ONE TOLD, not the detailer: the customer is who
    // loses something, the detailer has the whole list on their own screen,
    // and the email that gets the job booked is the one with the booking link
    // in it.
    {
      const horizon = new Date(Date.now() + STAGES[0] * 86_400_000).toISOString().slice(0, 10);
      const { data: deadlines } = await supabase
        .from("maintenance_deadlines")
        .select("id, business_id, customer_id, label, vehicle, due_on, repeat_months, last_done_on, reminded_stage, cancelled_at")
        .is("cancelled_at", null)
        .lte("due_on", horizon)
        .gte("due_on", new Date().toISOString().slice(0, 10));
      for (const d of deadlines ?? []) {
        const stage = stageDue(d);
        if (stage === null) continue;
        // ROADMAP 97.4 — the same claim as the bookings above, on the stage
        // counter: it moves only from the value THIS sweep read, so of two
        // overlapping sweeps one moves it and the other gets nothing back.
        let claimed = false;
        try {
          const business = await biz(d.business_id);
          const settings = await getSettings(business.id);
          // **ROADMAP 3.4 FINDING A — ITS OWN SWITCH, AND IT DEFAULTS OFF.**
          //
          // This block used to be gated on `email_customer_reminder` alone,
          // with the reasoning below: the same switch that silences every
          // other customer reminder should silence this one, because a
          // detailer who turned customer email off did not mean "except this
          // one". That reasoning is still right about REMINDERS. It was wrong
          // about this email, and the classification pass on 2026-09-21 is
          // what showed why: **this one is not a reminder, it is a sale.** It
          // asks the customer to "Book it in" for a service they have not
          // bought, and the comment forty lines above states the intent —
          // *"the email that gets the job booked is the one with the booking
          // link in it."*
          //
          // Andrew's ruling is older than this code and binding: **no
          // marketing email, ever; anything that sells goes by text.** The
          // "your coating is due" email is off under it. It was off in a chat
          // log and in nobody's code — so a detailer who simply wanted
          // appointment reminders was sending a sales email with them, every
          // fifteen minutes, against a live cron.
          //
          // **BOTH, AND IN THIS ORDER, SO THE REMINDER SWITCH CANNOT TURN
          // THIS ON.** The parent switch still silences it — turning customer
          // email off must still stop everything. But the parent can no
          // longer ENABLE it: that now takes
          // `email_customer_maintenance_due`, which defaults false in the
          // column, in `getSettings`'s fallback, and is written by no control
          // in the product.
          //
          // **AND ROADMAP 0.7, 2026-10-06:** the switches, then the same three
          // ways to be unreachable `send-campaign` asks about (no address,
          // opted out, bounced), then the business's MAILING ADDRESS — all in
          // `maintenanceVerdict`, which tests/maintenance-legal runs for real.
          if (!settings.email_customer_reminder) continue;
          if (!settings.email_customer_maintenance_due) continue;
          const { data: customer } = await supabase
            .from("customers")
            .select("name, email, unsubscribed_at, email_failed_at")
            .eq("id", d.customer_id).maybeSingle();
          const verdict = maintenanceVerdict({ settings, customer, mailingAddress: business.mailing_address });
          if (!verdict.send && verdict.reason !== "no_mailing_address") continue;
          // ROADMAP 8.17 — a deadline belongs to a CUSTOMER rather than to
          // one booking, so the language comes from the last thing they told
          // us. English for anybody who has never booked.
          const lang = await langForCustomer(d.customer_id);
          const dueOn = formatDateLong(d.due_on, lang);
          const won = await supabase.from("maintenance_deadlines")
            .update({ reminded_stage: stage + 1 }).eq("id", d.id).eq("reminded_stage", d.reminded_stage).select("id");
          if (won.error) throw won.error;
          if (!won.data?.length) continue; // another sweep claimed this stage first
          claimed = true;
          if (!verdict.send) {
            // **NO ADDRESS: SKIPPED, RECORDED, NEVER A PLACEHOLDER.** The same
            // `skipped` row `send-email` writes for an undeliverable address,
            // so it shows where every other unsent email shows. The stage is
            // advanced so a 15-minute cron writes ONE row per stage, not 96 a
            // day; that stage's letter is lost, and the row says why.
            const logged = await supabase.from("email_sends").insert({
              business_id: business.id,
              customer_id: d.customer_id,
              to_email: customer!.email,
              subject: maintenanceDueSubject({ customerName: customer!.name ?? "there" }, lang),
              status: "skipped",
              detail: verdict.detail,
            });
            // An unrecorded skip gives the stage back, so the next sweep
            // tries to record it again rather than losing the reason.
            if (logged.error) throw new Error(`could not record the skip: ${logged.error.message}`);
            results.push({ id: d.id, kind: "maintenance", sent: false, error: verdict.detail });
            continue;
          }
          const brand = await buildBrand(business, settings);
          const site = await siteFor(supabase, business.id);
          const msg = maintenanceDueEmail(brand, {
            customerName: customer!.name ?? "there",
            label: d.label,
            vehicle: d.vehicle,
            dueOn,
            daysLeft: STAGES[stage],
            bookUrl: businessSiteUrl(site, business.slug),
            unsubscribeUrl: unsubscribeUrl(site, d.customer_id),
            mailingAddress: verdict.mailingAddress,
          }, lang);
          mustSend(
            await sendTenantEmail({
              businessId: business.id, to: customer!.email,
              subject: msg.subject, html: msg.html, text: msg.text,
            }),
            "maintenance reminder",
          );
          // KEPT ONLY ON SUCCESS: the stage was claimed before the send (ROADMAP
          // 97.4; it used to be stamped after) and the `catch` gives it back,
          // so a bounced relay leaves the stage where it was and the next sweep
          // tries again. The alternative is a warranty lost because one email
          // failed at four in the morning.
          //
          // **THIS COMMENT USED TO SAY `sendTenantEmail` THROWS ON A HARD
          // FAILURE. IT NEVER HAS.** It returns `false` and this call site
          // ignored it, so the stage was advanced on a send that failed and the
          // customer was never told about a deadline they had paid for. Same
          // fault, same file, same day as the customer reminder above; `mustSend`
          // is what makes the sentence true rather than aspirational.
          results.push({ id: d.id, kind: "maintenance", sent: true });
        } catch (e) {
          let error = String(e);
          if (claimed) {
            const back = await supabase.from("maintenance_deadlines")
              .update({ reminded_stage: d.reminded_stage }).eq("id", d.id).eq("reminded_stage", stage + 1);
            if (back.error) error += ` / could not give the stage back, so the next sweep will not retry it: ${back.error.message}`;
          }
          results.push({ id: d.id, kind: "maintenance", sent: false, error });
        }
      }
    }

    // --- Morning digest: per business, once per local day, after that
    // business's own daily_digest_hour. ------------------------------------
    // A read, and the digest reaches NOBODY if it comes back 504 — the loop
    // below simply iterates an empty array and the sweep reports success.
    const { data: businesses } = await retryRead("digest:businesses", () =>
      supabase
        .from("businesses")
        .select("id, slug, name, status, timezone, contact_email, contact_phone, dropoff_address, service_area")
        .eq("status", "active"));
    for (const business of (businesses || []) as Business[]) {
      try {
        const settings = await getSettings(business.id);
        const tz = business.timezone;
        if (hourIn(tz) < settings.daily_digest_hour) continue;
        const today = dateStrIn(tz);
        // ROADMAP 97.4 — today's row is CLAIMED before the push rather than
        // written after it: inserted only if no sweep has inserted it yet, so
        // of two overlapping sweeps one gets it back and the other moves on.
        // A failed push deletes our own row so the next sweep tries again.
        const stamp = new Date().toISOString();
        const won = await supabase.from("owner_daily_digest_state").upsert(
          { business_id: business.id, digest_date: today, sent_at: stamp },
          { onConflict: "business_id,digest_date", ignoreDuplicates: true },
        ).select("business_id");
        if (won.error) throw won.error;
        if (!won.data?.length) continue;

        try {
          const dayStart = new Date();
          const { data: todays } = await supabase
            .from("bookings")
            .select("id, customer_name, start_at, end_at, total_price")
            .eq("business_id", business.id)
            .neq("status", "cancelled")
            .is("deleted_at", null)
            .gte("start_at", new Date(dayStart.getTime() - 24 * 3600_000).toISOString())
            .lte("start_at", new Date(dayStart.getTime() + 24 * 3600_000).toISOString());
          const jobsToday = (todays || []).filter((b) => dateStrIn(tz, new Date(b.start_at)) === today);
          if (jobsToday.length > 0) {
            jobsToday.sort((a, b) => a.start_at.localeCompare(b.start_at));
            const first = jobsToday[0];
            await sendOwnerPush(business.id, {
              title: `Today: ${jobsToday.length} job${jobsToday.length === 1 ? "" : "s"}`,
              body: jobsToday
                .map((b) => `${formatTime12hr(timeStrIn(tz, new Date(b.start_at)))} ${b.customer_name}`)
                .join(" · "),
              url: `/job/${first.id}`,
              tag: `digest-${today}`,
            });
          }
        } catch (e) {
          await supabase.from("owner_daily_digest_state").delete()
            .eq("business_id", business.id).eq("digest_date", today).eq("sent_at", stamp);
          throw e;
        }
      } catch (e) {
        console.error("digest failed for business", business.id, e);
      }
    }

    // Aggregate counts only. The sweep is public at the gateway (pg_cron has no
    // session; since ROADMAP 97.3 it must carry `x-cron-secret`), and in this system a booking's UUID IS the
    // credential for its receipt, cancel and reschedule pages. Returning ids
    // here would let anyone poll the sweep and harvest them. Per-booking
    // detail, including errors, goes to the function log instead.
    console.log("sweep results", JSON.stringify(results));
    const summary: Record<string, number> = {};
    for (const r of results) {
      const key = `${r.kind}_${r.sent ? "sent" : "failed"}`;
      summary[key] = (summary[key] ?? 0) + 1;
    }
    // ITEM D — THE HEARTBEAT, AND IT IS STAMPED HERE RATHER THAN IN THE CRON
    // STATEMENT. The scheduled job is a `net.http_post`, which succeeds the
    // moment the request is queued: stamping there would prove the scheduler
    // is alive and say nothing about whether the thing it calls still works —
    // which is the more likely of the two to break, and the one that broke in
    // roadmap 0.2 (a dead email relay whose only evidence was a console line
    // inside a function).
    //
    // AT THE END, so a stamp means the whole sweep got this far, and
    // BEST-EFFORT, because a heartbeat that could fail a sweep would be a
    // monitor that causes the outage it watches for.
    try {
      await supabase.rpc("note_heartbeat", {
        p_job: "send-owner-reminders",
        p_detail: { count: results.length, summary },
      });
    } catch (e) {
      console.error("heartbeat failed", e);
    }
    return json({ success: true, count: results.length, summary });
  } catch (err) {
    console.error(manual ? "manual reminder failed" : "reminder sweep failed", err);
    return json({ error: manual ? (err as Error).message : "The reminder sweep failed." }, 500);
  }
});
