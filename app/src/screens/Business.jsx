// Business — the fifth tab, and the owner's own word for it. It replaces
// `More.jsx`. Roadmap 2.11 step 6, stage 6.
//
// THE ADMISSION TEST IS THE DESIGN, and it is written here rather than only
// in a document because that is the half that rots (screen designs §10):
//
//   > A ROW BELONGS ON BUSINESS ONLY IF IT CHANGES WHAT A CUSTOMER MEETS.
//   > If it changes how the app BEHAVES for the detailer, it goes behind the
//   > gear. Anything that fits neither is a new destination or is not built —
//   > it does not get filed here because there was room.
//
// Without that, "Business" is "More" with a better name and the same thing
// happens again in six months. It is the rule that replaces the one the old
// name carried for free.
//
// WHAT MOVED, AND WHY EACH ONE MOVED:
//   THE NAME     A screen titled "Settings" sat under a tab labelled "More".
//                Both are gone; the tab and the title are the same word.
//   THE LINK     The booking link was 1,156px down the old screen — the
//                single most-shared thing the business owns, below every
//                setting. It is the first thing on the page on a phone and
//                the resting content of the second column at a desk.
//   THE GROUPS   Eight headings for eleven rows, three of them owning one row
//                each, become THREE headings for eight. The other four rows
//                did not shrink — they failed the admission test and are
//                behind the gear (`GearMenu.jsx`).
//   THE SHEETS   A settings screen is a PAGE below --wrap and the second
//                column at or above it. It was a 640px floating box at every
//                width, and its own `›` had been promising a push and
//                delivering a peek since it was built. `SettingsHost.jsx`.
//   STAFF        They do not get this tab at all. Their whole Business screen
//                would be two rows, and the database refuses the save on one
//                of them (architecture audit §2c items 2 and 3). What a staff
//                session can actually use is behind the gear.
//
// ELEVEN ROWS AS OF ROADMAP 3.2(b), AND THE NINTH §10 DESIGNED IS FINALLY ONE
// OF THEM. Stage 6 shipped eight and deliberately left FAQ out: its storage
// landed in that same change and its screen did not, the owner's own split,
// and a row that opens nothing is the defect that stage was repairing on the
// push switch. What closed it is not this screen changing its mind — it is
// contract §6b: a TENANT SITE draws an FAQ section, so 3.2(b) published the
// column on the public profile, and a column a site can read that a detailer
// cannot fill in is that same defect one level down.
// (Monthly plans joined in 2.14 and How you get paid in 2.20 stage 1.)

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock, ChevronRight, ClipboardList, Globe, HelpCircle, Images, ListChecks,
  QrCode,
  MessageSquareQuote, Palette, Repeat, Store, Tag, Wallet, Wrench,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useWide } from "../hooks/useWide.js";
import SettingsHost from "../components/SettingsHost.jsx";
import BookingLink from "../components/BookingLink.jsx";
import PagePreview from "../components/PagePreview.jsx";
import { STEPS, setupProgress } from "../lib/setup.js";
import { stateOf } from "../lib/maintenance.js";
import { whereFrom } from "../lib/moneyAdvanced.js";
import { brandVarsFor } from "../lib/theme.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { appIntlLocale, t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// ROADMAP 8.17 STAGE 2B — derived, never typed. See BookingRules.jsx: a
// hard-coded English list is English by construction, and Spanish's own
// abbreviations are a different set in a different order.
const DAYS = () => [0, 1, 2, 3, 4, 5, 6].map((n) => new Date(Date.UTC(2026, 0, 4 + n))
  .toLocaleDateString(appIntlLocale(), { weekday: "short", timeZone: "UTC" }));
const time12 = (hm) => {
  if (!hm) return "";
  const [h, m] = hm.slice(0, 5).split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

// Collapse the open days into something a person would say: consecutive
// weekdays become a range, and identical hours are stated once.
function describeHours(rows) {
  const open = (rows ?? []).filter((r) => r.open_time).sort((a, b) => a.weekday - b.weekday);
  if (open.length === 0) return t("No days set · nobody can book");
  const same = open.every((r) => r.open_time === open[0].open_time && r.close_time === open[0].close_time);
  const days = open.map((r) => r.weekday);
  const consecutive = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  const label = consecutive && days.length > 1
    ? `${DAYS()[days[0]]}–${DAYS()[days[days.length - 1]]}`
    : days.map((d) => DAYS()[d]).join(", ");
  return same
    ? `${label} · ${time12(open[0].open_time)} – ${time12(open[0].close_time)}`
    : t("{days} · hours vary", { days: label });
}

// WHICH WAYS TO PAY ARE ON THE EMAILS, said the way a person would say it.
//
// PRESENCE ONLY, AND THAT IS THE WHOLE REASON THIS IS A LOCAL HELPER RATHER
// THAN AN IMPORT. What a handle DISPLAYS as, and whether it can safely become
// a tappable link, is decided once in `supabase/functions/_shared/payments.ts`
// — and an edge function's bundle cannot be imported from `app/`, so the only
// version of that logic this file could hold would be a SECOND one. It does
// not need it: a row summary answers "is anything set", never "what does it
// render as". Same order as the email's list, so the row and the email agree.
const describePayment = (s) => {
  const on = [
    s?.pay_venmo && "Venmo",
    s?.pay_cashapp && "Cash App",
    s?.pay_paypal && "PayPal",
    s?.pay_zelle && "Zelle",
    s?.pay_other && t("something else"),
    s?.pay_cash && t("cash"),
  ].filter(Boolean);
  // NAMED IN THE DETAILER'S TERMS, never "0 configured" (the state rule).
  // And not a scold: a detailer who takes cash at the door and has not said
  // so yet is the ordinary starting state, not a misconfiguration.
  if (on.length === 0) return t("Nothing on your emails yet");
  if (on.length === 1) return on[0];
  if (on.length === 2) return t("{a} & {b}", { a: on[0], b: on[1] });
  // TWO NAMES AND A COUNT, because `.now` is ONE clamped line and the full
  // list of six ran off the end of it as "Venmo, Cash App, PayPal, Zelle,
  // something els…". A summary that has to be truncated is not a summary; the
  // two it names are the two the email prints first.
  return t("{a}, {b} & {count} more", { a: on[0], b: on[1], count: on.length - 2 });
};

// ROADMAP 3.2(b). Two facts, not one: how many questions, AND whether the
// section is switched on. They are separate columns on purpose (a detailer
// halfway through writing an FAQ has not decided to publish it), so a summary
// that printed only the count would tell somebody with six questions and the
// switch off that nothing was wrong.
const describeFaq = (s) => {
  const list = Array.isArray(s?.faqs) ? s.faqs.filter((f) => f?.q && f?.a) : [];
  if (list.length === 0) return t("Nothing on your website yet");
  const many = t(list.length === 1 ? "{count} question" : "{count} questions", { count: list.length });
  return s?.faq_enabled ? many : t("{summary} · hidden", { summary: many });
};

const humanNotice = (mins) => {
  if (!mins) return t("no notice needed");
  if (mins % 1440 === 0) {
    const d = mins / 1440;
    return t(d === 1 ? "{count} day notice" : "{count} days notice", { count: d });
  }
  if (mins % 60 === 0) {
    const h = mins / 60;
    return t(h === 1 ? "{count} hour notice" : "{count} hours notice", { count: h });
  }
  return t("{count} min notice", { count: mins });
};

// The settings rows the guided tour used to stop at (retired in ROADMAP 9.15).
// A `data-tour` name is unique across the whole app, so the row's own key is
// the name.
const TOUR_ROWS = {
  catalog: "catalog",
  hours: "hours",
  payments: "payments",
  domain: "domain",
};

export default function Business({ onSetup, initial = null }) {
  useAppLocale();
  const { business, settings, branding, role, siteOrigin, reload: reloadTenant } = useBusiness();
  const wide = useWide();
  // ROADMAP 2.20 STAGE 3 — `initial` is how Stripe's own consent screen gets
  // back to the row that asked for it. Same prop and same one line as
  // `GearMenu`, which has carried it since the checkout deep link: a detailer
  // who has just come back from `connect.stripe.com` is holding a single-use
  // code, and landing them on this index instead of on the screen that reads
  // it loses the connection with nothing on screen saying so.
  const [open, setOpen] = useState(initial);
  const [counts, setCounts] = useState(null);
  /* ROADMAP 9.10 · THE WHOLE REFRESH MECHANISM, AND IT IS A NUMBER.
     The preview is an iframe keyed on this; React remounts it when the key
     changes, which reloads the page. It is bumped in ONE place - `onClose`,
     below, which is the moment a settings panel is dismissed after a save.
     **Nothing a detailer types can reach it**, which is 9.10's second
     judgement call satisfied by construction rather than by a debounce
     somebody has to keep correct. Closing a panel WITHOUT saving bumps it
     too, and that is harmless: it reloads the same unchanged page, which is
     still the honest current state. */
  const [previewKey, setPreviewKey] = useState(0);

  // One round trip for every summary line on the screen.
  const load = useCallback(async () => {
    const [h, s, a, p, g, r, pl, pm, dm, cp, cv, md] = await Promise.all([
      supabase.from("business_hours").select("weekday,open_time,close_time").eq("business_id", business.id),
      supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
      supabase.from("add_ons").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
      supabase.from("promo_codes").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
      supabase.from("gallery_images").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
      supabase.from("testimonials").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
      // Roadmap 2.14. TWO counts rather than one, because the row's real
      // question is whether anybody is ON a plan: a business with three
      // defined and nobody on them has not started, and "3 plans" says it
      // has.
      supabase.from("plans").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
      supabase.from("plan_members").select("id", { count: "exact", head: true }).eq("business_id", business.id).neq("status", "ended"),
      // ROADMAP 3.3. The verified address itself rather than a count: this
      // row's whole question is "what do my customers see", and the answer is
      // a string. Ordered the same way `business_canonical_host` orders, which
      // is what the EMAILS use — a row naming a different one of two verified
      // domains than the emails do would be worse than silence.
      supabase.from("business_domains").select("domain").eq("business_id", business.id)
        .not("verified_at", "is", null).order("created_at").limit(1),
      // ROADMAP 4.2. ACTIVE links only — a campaign turned off is not a
      // campaign running, and a row summary that counted it would tell a
      // detailer a flyer is live when it is not.
      // ROWS, NOT A HEAD COUNT — ROADMAP 5.4. Both of these used to be
      // `count: exact, head: true`, which is cheaper and was wrong: a count of
      // rows in `campaign_visits` counts visits belonging to NO link, and to
      // links that have been switched off. `whereFrom` needs the rows to tell
      // those apart. Two narrow columns each, for a detailer`s few hundred.
      // ALL campaigns, not just the live ones: `whereFrom` needs the dead ones
      // in order to EXCLUDE their visits, and the live count is taken from the
      // same rows below, so the two figures cannot come from different reads.
      supabase.from("campaigns").select("id, is_active")
        .eq("business_id", business.id),
      supabase.from("campaign_visits").select("campaign_id, visitor_id")
        .eq("business_id", business.id),
      // ROADMAP 2.23. THE COUNT THAT MATTERS IS WHAT IS ABOUT TO BE LOST, not
      // how many deadlines exist: a detailer with nine warranties on the books
      // and none due this quarter needs to see "nothing due", and "9
      // deadlines" would read as nine things wanting attention. Anything not
      // cancelled and not already covered, inside the first reminder window.
      supabase.from("maintenance_deadlines")
        .select("due_on, last_done_on, repeat_months, cancelled_at")
        .eq("business_id", business.id).is("cancelled_at", null),
    ]);
    // A null count means the query failed. Keep it null so the row shows a
    // dash rather than asserting zero — a wrong "0 people" reads as a real
    // answer and sent a session looking for a missing owner that was always
    // there.
    setCounts({
      hours: describeHours(h.data),
      hoursRows: h.data ?? [],
      services: s.count, addOns: a.count,
      promos: p.count, photos: g.count, reviews: r.count,
      plans: pl.count, planMembers: pm.count,
      // The setup form's own reading of the same rows. It asks whether ANY
      // day is open, which is the same question the blocking row below asks.
      hoursOpen: (h.data ?? []).some((r) => r.open_time),
      domain: dm.data?.[0]?.domain ?? null,
      campaigns: cp.data ? cp.data.filter((c) => c.is_active).length : null,
      // THE SAME FUNCTION MONEY READS, so the two screens cannot disagree
      // about the same links again — which is the whole of ROADMAP 5.4. No
      // period: this screen has no period control, so its figure is all time
      // and the wording below says so.
      campaignPeople: (cp.data && cv.data)
        ? whereFrom({ campaigns: cp.data, visits: cv.data }).linkPeople : null,
      // Counted through the SAME function the screen and the reminder use, so
      // three places can never disagree about whether one is missed.
      deadlinesSoon: (md.data ?? []).filter((d) => ["due", "missed"].includes(stateOf(d))).length,
      deadlinesMissed: (md.data ?? []).filter((d) => stateOf(d) === "missed").length,
      deadlines: (md.data ?? []).length,
    });
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const mode = settings?.mobile_enabled && settings?.dropoff_enabled ? t("Mobile & drop-off")
    : settings?.mobile_enabled ? t("Mobile only")
      : settings?.dropoff_enabled ? t("Drop-off only") : t("Nothing offered");

  const n = (v, one, many) => (v === null || v === undefined ? "—" : t(v === 1 ? one : many, { count: v }));

  // AT MOST ONE ROW SHOUTS, AND ONLY IF IT BLOCKS A BOOKING (§1b item 4,
  // ordered hours → services → business info). Three red rows on one screen
  // is a screen with no priority on it; the point of the order is that a
  // brand-new business is told the ONE thing standing between it and a
  // customer being able to book.
  //
  // NOT the `.lit` bloom §10 names, and the reason is a measurement rather
  // than a preference: `.lit`'s glow is an ::after at `z-index: -1`, which
  // puts it behind the `.card` these rows live inside — an invisible warning
  // is worse than none. It is the summary line in `--bad` instead, which is
  // §1c's own meaning for "this needs fixing" and needs no new vocabulary.
  const blocked = counts === null ? null
    : (counts.hoursRows ?? []).every((r) => !r.open_time) ? "hours"
      : counts.services === 0 ? "catalog"
        : !business.contact_phone && !business.contact_email ? "info" : null;

  // RESUMABLE, AND THIS ROW IS THE HALF THAT MAKES IT SO (§13a). It stands
  // until the seven are finished or the detailer says stop, and the number on
  // it is the same one the form's progress rule paints — one function, so the
  // bar and this line cannot disagree (component inventory §1b).
  //
  // It sits ABOVE the booking link, which stage 6 fought to put first on this
  // page. That is deliberate and it is a cost of about 70px: this row is
  // temporary and the link is permanent, and a nag under the thing you came
  // to copy is a nag nobody reads.
  const setup = counts ? setupProgress({ business, branding, settings, counts }) : null;
  // AND ONLY THE OWNER SEES IT — roadmap 2.13, found by signing in as the
  // demo's new "Detailer" role rather than reasoned about. Two reasons, and
  // the second is the one that would have bitten:
  //   1. It is the setup FORM's only door, and the form is already owner-only
  //      (App.jsx, and screen designs §13b: "staff are not setting up a
  //      business"). A door for a room they cannot enter is the defect stage 6
  //      spent a whole pass removing.
  //   2. FIVE OF THE SEVEN STEPS ARE DERIVED FROM THE DATABASE, so the count
  //      is only true for a session that can SEE all seven. A role with
  //      `settings` but not `marketing` reads zero promo codes and is told
  //      *5 of 7 done* about a business that is at 6 — a number that changes
  //      with who is looking, on the one row whose whole job is to be a
  //      number. Nothing in `setup.js` is wrong; it is being asked the
  //      question through a narrower window.
  const setupOpen = role === "owner" && setup && setup.count < setup.total && !settings?.setup?.dismissed;
  // THE FIRST STEP NOBODY HAS FINISHED, by the form's own order. `STEPS` is
  // §13a's order — what you sell, then when you work, then who you are — so
  // "next" is the next one a detailer should do and not merely the next one in
  // a list. It is `null` only when every step is done, which is the one case
  // `setupOpen` is already false for; both guards are on the render anyway,
  // because a row reading "Next: undefined" is worse than no row.
  const nextAt = setup ? STEPS.findIndex(([k]) => !setup.done.has(k)) : -1;
  const next = nextAt > -1 ? { index: nextAt, name: STEPS[nextAt][2] } : null;

  // **FOUR HEADINGS NOW, AND THEY ARE FOUR JOBS RATHER THAN FOUR CATEGORIES —
  // Andrew, 2026-09-13:** *"the settings below should group by what a person is
  // trying to do rather than by what the code calls them."*
  //
  // The three that were here were not code names, which is why this took a
  // second reading to see. **The fault was INSIDE them.** "Your page" held
  // seven unrelated things — who you are, what colour you paint it, your
  // photos, your reviews, your questions, your web address, and a REPORT on
  // where your customers came from — so the heading had stopped predicting
  // what was under it. And "What you sell" held two rows that are not offers:
  // how the money reaches you, and a date a customer is due back.
  //
  // TWO ROWS MOVED AND EACH ONE MOVED FOR ITS OWN REASON:
  //   MAINTENANCE  out of "What you sell" and into "When you can be booked".
  //                A deadline is a customer who should be on the calendar and
  //                is not, which is a booking question and not a price list.
  //   THE ADDRESS  out of "Your page" and into "Where customers come from",
  //                beside Tracking links. Those two are the only rows on this
  //                screen that change or measure THE LINK AT THE TOP, which is
  //                now the first thing on the page — so the group sits where a
  //                detailer looks after reading it.
  //
  // "How you get paid" stays with the money and is still LAST in its group,
  // for the reason its own comment already gives.
  const GROUPS = [
    ["What customers see", [
      ["info", "Business info", Store,
        blocked === "info" ? "No phone or email · customers can't reach you" : business.name],
      // A hex code as a summary reads like something a developer forgot to
      // finish. The colour itself says it in one glance.
      // AMERICAN, LIKE EVERY OTHER STRING A PERSON READS (CLAUDE.md). This row
      // said "Your colour" while the screen it opens says "Your color" — a
      // British spelling AND two names for one screen, which is the exact
      // thing his label note is about. The stored SETUP KEY is still `colour`
      // and must stay that way: renaming it resets every detailer's setup
      // progress. A key is not a word anybody reads.
      ["appearance", "Your color", Palette, "Used everywhere, including here",
        branding?.primary_color ?? null],
      ["gallery", "Photo gallery", Images, counts ? n(counts.photos, "{count} photo", "{count} photos") : "…"],
      ["reviews", "Reviews", MessageSquareQuote,
        counts ? (counts.reviews ? n(counts.reviews, "{count} review", "{count} reviews") : t("Nothing from a customer yet")) : "…"],
      // ROADMAP 3.2(b) — the NINTH row this screen's own header designed and
      // deliberately did not build, because its screen did not exist. It does
      // now. Under "Your page" and not the gear: an FAQ is read by a
      // CUSTOMER, which is this screen's admission test passed outright.
      //
      // THE SUMMARY SAYS THE SWITCH, not just the count. A detailer with six
      // questions and the section switched off is one press from a page that
      // shows none of them, and "6 questions" would tell them nothing is
      // wrong.
      ["faq", "FAQ", HelpCircle,
        settings ? describeFaq(settings) : "…"],
    ]],
    ["What you charge for", [
      ["catalog", "Services & add-ons", Wrench,
        blocked === "catalog" ? "Nothing to sell · your booking page is empty"
          : counts ? `${n(counts.services, "{count} service", "{count} services")} · ${n(counts.addOns, "{count} add-on", "{count} add-ons")}` : "…"],
      // A PLAN IS AN OFFER WITH A PRICE, which is exactly the admission test
      // this screen applies to the catalog — and step 3 puts the plans on the
      // booking page, so a customer meets them. The owner named the location
      // himself: "a way for them to set up their monthly plan within the
      // website, like in the More page or the business page".
      ["plans", "Monthly plans", Repeat,
        counts ? (counts.plans === 0 ? "Not offering one"
          : t("{members} on {plans}", {
            members: n(counts.planMembers, "{count} member", "{count} members"),
            plans: n(counts.plans, "{count} plan", "{count} plans") })) : "…"],
      ["promos", "Promo codes & sale", Tag,
        counts ? (settings?.site_discount_active
          ? t("Site sale on · {codes}", { codes: n(counts.promos, "{count} code", "{count} codes") })
          : n(counts.promos, "{count} active code", "{count} active codes")) : "…"],
      // ROADMAP 2.20 STAGE 1. Under "What you charge for" because it is about
      // the money on the job, and LAST in the group for
      // the same reason cash is last in the email's own list: it is what
      // happens once everything above it has been agreed.
      ["payments", "How you get paid", Wallet, settings ? describePayment(settings) : "…"],
    ]],
    ["When you can be booked", [
      ["hours", "Hours & days off", CalendarClock, counts ? counts.hours : "…"],
      // ClipboardList, not Store: Store is Business info's icon and two rows
      // on one screen wearing the same mark is the mark saying nothing.
      ["rules", "Booking rules", ClipboardList,
        settings ? `${mode} · ${humanNotice(settings.min_advance_minutes)}` : "…"],
      // ROADMAP 2.23. Under "When you can be booked" as of 2026-09-13, and it
      // moved out from beside plans. A plan is a rhythm and this is a date
      // with a consequence — but the consequence is that somebody should be
      // ON THE CALENDAR and is not, which is a booking question rather than
      // a price list one.
      //
      // IT IS THE ONE ROW HERE THAT CAN SHOUT WITHOUT BLOCKING A BOOKING, and
      // that is deliberate: a missed warranty costs a CUSTOMER something,
      // which is worth more than tidiness. `--bad` is the product's fixed red
      // and never the tenant's accent (law 11b).
      ["maintenance", "Visits due", CalendarClock,
        // **TWO OF THESE FOUR BRANCHES NEVER REACHED THE TRANSLATOR — fixed
        // 2026-09-21.** The two written as `t(...)` were translated; the bare
        // literal and the backtick one were not, so a Spanish dashboard read
        // "Visitas pendientes · 1 overdue". Nothing was missing from the
        // catalogue: a string that never calls `t()` is not a call site, so
        // the completeness check has no gap to report, and `i18n-survey.mjs`
        // matches quoted strings and JSX text WITHOUT interpolations, so a
        // backtick template is invisible to it as well.
        counts ? (counts.deadlines === 0 ? t("Nothing scheduled")
          : counts.deadlinesSoon === 0 ? t("{visits}, none due", {
            visits: n(counts.deadlines, "{count} visit", "{count} visits") })
            : counts.deadlinesMissed
              // **A PLURAL PAIR, AND THE REASON IS SPANISH RATHER THAN
              // ENGLISH.** "overdue" does not inflect, so one key looked
              // sufficient — but `atrasada`/`atrasadas` does, and a single
              // key would be wrong for one of the two counts. The noun is
              // carried so both languages can agree with it; the row's own
              // label already says "Visits due", so this reads as a
              // repetition in English only if you read it without the label.
              ? n(counts.deadlinesMissed, "{count} visit overdue", "{count} visits overdue")
              : t("{visits} coming up", {
                visits: n(counts.deadlinesSoon, "{count} visit", "{count} visits") })) : "…",
        // **THE FIFTH SLOT IS THE COLOUR SWATCH AND THIS WAS PUTTING A BOOLEAN
        // IN IT — found 2026-09-12.** `true` reached `brandVarsFor()`, so a
        // business with a missed deadline lost the row's clock icon and grew a
        // swatch of whatever that returns, while the shout this comment
        // promises never happened: `1 missed` was drawn in the same grey as
        // `0 photos`. The alarm is its own sixth argument now, and it paints
        // the SUMMARY rather than the icon — an alarm belongs on the words
        // that carry the news.
        null, counts ? counts.deadlinesMissed > 0 : false],
    ]],
    ["Where customers come from", [
      // ROADMAP 3.3. Under "Where customers come from" as of 2026-09-13: what it
      // changes is the address a CUSTOMER meets, in their own confirmation email
      // and on the card — which is the link printed at the top of this screen. THE SUMMARY IS THE ADDRESS ITSELF where there is
      // one, and the platform path where there is not — never "0 domains",
      // which tells a detailer nothing about what their customers see.
      ["domain", "Your web address", Globe,
        counts ? (counts.domain ?? `detailingplatform.com/book/${business.slug}`) : "…"],
      // ROADMAP 4.2 — a feature the rebuild LOST, not a new one. Under "Where
      // customers come from" beside the address, because both rows are about
      // the LINK at the top of this screen: this one is a version of it with
      // the discount already applied, and a count of who used it. The summary is the one
      // question a detailer has — did the flyer bring anybody — so it counts
      // LIVE links, never rows: a campaign turned off is not a campaign
      // running.
      // **NOT "CAMPAIGN LINKS" ANY MORE — his correction, 2026-09-10.** *"The
      // campaign is less of, like, a campaign... I want it to be more like a
      // way to know where customers are coming from. So I think that should be
      // more obvious as not a campaign."* Nothing about the feature changed;
      // the word was doing the damage. A detailer who wants to know whether
      // Yelp is worth it does not go looking for a row called Campaign links.
      ["campaigns", "Tracking links", QrCode,
        // ROADMAP 5.4 — WHAT THIS ROW SAYS, AND WHY IT IS NOT "OPENS".
        // "21 opens" was three wrong things in one word: page loads rather
        // than people, every visit rather than the ones that came through a
        // link, and switched-off links counted beside a total that claimed to
        // be live ones. Money said "None of your links were opened" about the
        // SAME rows and Money was right. It is people on live links now, from
        // `whereFrom` — the one arithmetic both screens read.
        // "SO FAR" IS THE LABEL, and it is load-bearing rather than padding.
        // Money`s figure moves with the period control at the top of that
        // screen; this one has no control and never will, so a number here
        // with no span on it invites exactly the comparison that opened this
        // item. Two words say all time without using the phrase.
        counts ? (counts.campaigns
          ? (counts.campaignPeople
            ? t("{links} · {people} so far", {
              links: n(counts.campaigns, "{count} link", "{count} links"),
              people: n(counts.campaignPeople, "{count} person", "{count} people") })
            : t("{links} · not opened yet", {
              links: n(counts.campaigns, "{count} link", "{count} links") }))
          : "Nothing tracked yet") : "…"],
    ]],
  ];

  const index = (
    <>
      <div>
        <h1 className="display">{t("Business")}</h1>
        <p className="quiet" style={{ marginTop: 2 }}>{business.name}</p>
      </div>

      {/* FIRST ON A PHONE, AND ONLY ON A PHONE. At a desk it is the second
          column's resting content, so rendering it here as well would print
          the most-shared thing the business owns twice on one screen.

          **IT IS ABOVE THE SETUP ROW NOW — Andrew, 2026-09-13:** *"this is the
          screen a detailer sends to customers from — their booking link lives
          here — so the link and its Share should be the first thing the eye
          lands on."* Stage 6 put the nag above it on purpose and costed the
          decision at about 70px, reasoning that the nag is temporary and the
          link is permanent. **That reasoning is right about the two things and
          backwards about which one wins:** a permanent thing somebody opens
          this tab TO USE outranks a temporary thing they are being reminded
          about, and the nag is one flick down rather than gone. */}
      {!wide && <BookingLink slug={business.slug} origin={siteOrigin} />}
      {/* STACKS BELOW THE LINK ON A PHONE - 9.10's fourth clause. The wide
          copy lives in `empty` below; `SettingsHost` renders that column
          only above --wrap, so exactly one of the two is ever on screen. */}
      {!wide && (
        <PagePreview slug={business.slug} origin={siteOrigin}
          counts={counts} refreshKey={previewKey} />
      )}

      {/* WHAT IS LEFT, AND WHICH ONE IS NEXT — his second note on this screen,
          2026-09-13: *"'Finish setting up · 3 of 11 done' should make the next
          unfinished step obvious rather than hiding it behind a chevron."*

          Two things were hidden and only one of them was the chevron. The row
          named no step, so *3 of 11* left a detailer to work out which eight
          were outstanding; and pressing it opened `SetupForm` at STEP ONE
          whatever was already done, so the answer was three or four presses of
          *I'll do this later* away even once they had guessed.

          **SO THE NEXT STEP IS THE ROW'S NAME**, in the same 16px the settings
          rows use, and the count drops to the summary line underneath it —
          which is the shape every other row on this screen already has: the
          thing, then where it stands. `.name` wraps and `.now` is one clamped
          line, so the long half is in the half that can take it.

          **AND IT OPENS ON THAT STEP.** `STEPS` is the same array the form
          walks and `setup.done` is the same set the count is taken from, so
          the name on this row and the heading of the step it lands on cannot
          disagree — one list, read twice. */}
      {setupOpen && next && (
        <div className="tight" data-tour="setup">
          <span className="label">{t("Finish setting up")}</span>
          <div className="card setting-card">
            <button className="nav-row" onClick={() => onSetup?.(next.index)}>
              <span className="ico"><ListChecks size={19} strokeWidth={2} /></span>
              <span className="txt">
                <span className="name">{t("Next: {name}", { name: t(next.name) })}</span>
                <span className="now">{t("{count} of {total} done", { count: setup.count, total: setup.total })}</span>
              </span>
              <span className="chev"><ChevronRight size={18} strokeWidth={2} /></span>
            </button>
          </div>
        </div>
      )}

      {GROUPS.map(([title, rows]) => (
        <div className="tight" key={title}>
          <span className="label">{t(title)}</span>
          <div className="card setting-card">
            {rows.map(([key, name, Icon, now, swatch, alarm]) => (
              // ROADMAP 2.24 — one row on this screen is worth a tour step,
              // and it is the one that decides whether the booking page works
              // at all. Every other row is a label and a live summary, and a
              // tour that read them back is exactly the weirdness he
              // complained about.
              <button className={`nav-row${blocked === key ? " blocking" : ""}${alarm ? " alarm" : ""}`} key={key}
                data-settings-key={key}
                // ROADMAP 2.24, SECOND PASS — five rows, not one. His note:
                // *"they need to be in-depth... analyze each tab, see what
                // wouldn't be needing guidance, and just kinda have something
                // for each thing on each tab."* The rows named here are the
                // five a detailer cannot finish setting up without; the rest
                // are a label and a live summary that read themselves back.
                data-tour={TOUR_ROWS[key]}
                aria-current={open === key ? "true" : undefined}
                onClick={() => setOpen(key)}>
                <span className="ico">
                  {/* The CORRECTED colour, not the raw one out of the
                      database: this row summarises a setting, and the
                      setting's effect is what the customer sees after
                      lib/theme.js has nudged it to stay legible. */}
                  {swatch
                    ? <span className="swatch" style={{ background: brandVarsFor(swatch)["--bk-accent"] }} />
                    : <Icon size={19} strokeWidth={2} />}
                </span>
                <span className="txt">
                  <span className="name">{t(name)}</span>
                  {/* A summary is EITHER one of this file's own phrases or a
                      value out of the database — the detailer's business name,
                      a colour, a count. `t()` returns anything it has never
                      seen unchanged, so one call is right for both. */}
                  <span className="now">{t(now)}</span>
                </span>
                <span className="chev"><ChevronRight size={18} strokeWidth={2} /></span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <SettingsHost
      splitClass="business"
      open={open}
      // The summaries are read from the same tables the screen just wrote to,
      // so closing one re-reads them — that is what makes a row answer itself
      // correctly the moment you come back out of it.
      onClose={() => { setOpen(null); load(); reloadTenant(); setPreviewKey((n) => n + 1); }}
      empty={(
        <>
          <BookingLink slug={business.slug} origin={siteOrigin} />
          <PagePreview slug={business.slug} origin={siteOrigin}
            counts={counts} refreshKey={previewKey} />
        </>
      )}
    >
      {index}
    </SettingsHost>
  );
}
