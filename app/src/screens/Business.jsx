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
import { setupProgress } from "../lib/setup.js";
import { brandVarsFor } from "../lib/theme.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const time12 = (t) => {
  if (!t) return "";
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

// Collapse the open days into something a person would say: consecutive
// weekdays become a range, and identical hours are stated once.
function describeHours(rows) {
  const open = (rows ?? []).filter((r) => r.open_time).sort((a, b) => a.weekday - b.weekday);
  if (open.length === 0) return "No days set — nobody can book";
  const same = open.every((r) => r.open_time === open[0].open_time && r.close_time === open[0].close_time);
  const days = open.map((r) => r.weekday);
  const consecutive = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  const label = consecutive && days.length > 1
    ? `${DAYS[days[0]]}–${DAYS[days[days.length - 1]]}`
    : days.map((d) => DAYS[d]).join(", ");
  return same
    ? `${label} · ${time12(open[0].open_time)} – ${time12(open[0].close_time)}`
    : `${label} · hours vary`;
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
    s?.pay_other && "something else",
    s?.pay_cash && "cash",
  ].filter(Boolean);
  // NAMED IN THE DETAILER'S TERMS, never "0 configured" (the state rule).
  // And not a scold: a detailer who takes cash at the door and has not said
  // so yet is the ordinary starting state, not a misconfiguration.
  if (on.length === 0) return "Nothing on your emails yet";
  if (on.length <= 2) return on.join(" & ");
  // TWO NAMES AND A COUNT, because `.now` is ONE clamped line and the full
  // list of six ran off the end of it as "Venmo, Cash App, PayPal, Zelle,
  // something els…". A summary that has to be truncated is not a summary; the
  // two it names are the two the email prints first.
  return `${on[0]}, ${on[1]} & ${on.length - 2} more`;
};

// ROADMAP 3.2(b). Two facts, not one: how many questions, AND whether the
// section is switched on. They are separate columns on purpose (a detailer
// halfway through writing an FAQ has not decided to publish it), so a summary
// that printed only the count would tell somebody with six questions and the
// switch off that nothing was wrong.
const describeFaq = (s) => {
  const list = Array.isArray(s?.faqs) ? s.faqs.filter((f) => f?.q && f?.a) : [];
  if (list.length === 0) return "Nothing on your website yet";
  const many = `${list.length} question${list.length === 1 ? "" : "s"}`;
  return s?.faq_enabled ? many : `${many} · hidden`;
};

const humanNotice = (mins) => {
  if (!mins) return "no notice needed";
  if (mins % 1440 === 0) return `${mins / 1440} day${mins / 1440 > 1 ? "s" : ""} notice`;
  if (mins % 60 === 0) return `${mins / 60} hour${mins / 60 > 1 ? "s" : ""} notice`;
  return `${mins} min notice`;
};

export default function Business({ onSetup }) {
  const { business, settings, branding, role, siteOrigin, reload: reloadTenant } = useBusiness();
  const wide = useWide();
  const [open, setOpen] = useState(null);
  const [counts, setCounts] = useState(null);

  // One round trip for every summary line on the screen.
  const load = useCallback(async () => {
    const [h, s, a, p, g, r, pl, pm, dm, cp, cv] = await Promise.all([
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
      supabase.from("campaigns").select("id", { count: "exact", head: true })
        .eq("business_id", business.id).eq("is_active", true),
      supabase.from("campaign_visits").select("id", { count: "exact", head: true })
        .eq("business_id", business.id),
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
      campaigns: cp.count, campaignVisits: cv.count,
    });
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const mode = settings?.mobile_enabled && settings?.dropoff_enabled ? "Mobile & drop-off"
    : settings?.mobile_enabled ? "Mobile only"
      : settings?.dropoff_enabled ? "Drop-off only" : "Nothing offered";

  const n = (v, one, many) => (v === null || v === undefined ? "—" : `${v} ${v === 1 ? one : many}`);

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

  const GROUPS = [
    ["Your page", [
      ["info", "Business info", Store,
        blocked === "info" ? "No phone or email — customers can't reach you" : business.name],
      // A hex code as a summary reads like something a developer forgot to
      // finish. The colour itself says it in one glance.
      ["appearance", "Your colour", Palette, "Used everywhere, including here",
        branding?.primary_color ?? null],
      ["gallery", "Photo gallery", Images, counts ? n(counts.photos, "photo", "photos") : "…"],
      ["reviews", "Reviews", MessageSquareQuote,
        counts ? (counts.reviews ? n(counts.reviews, "review", "reviews") : "Nothing from a customer yet") : "…"],
      // ROADMAP 3.2(b) — the NINTH row this screen's own header designed and
      // deliberately did not build, because its screen did not exist. It does
      // now. Under "Your page" and not the gear: an FAQ is read by a
      // CUSTOMER, which is this screen's admission test passed outright.
      //
      // THE SUMMARY SAYS THE SWITCH, not just the count. A detailer with six
      // questions and the section switched off is one press from a page that
      // shows none of them, and "6 questions" would tell them nothing is
      // wrong.
      ["faq", "Common questions", HelpCircle,
        settings ? describeFaq(settings) : "…"],
      // ROADMAP 3.3. Under "Your page" for the same reason everything else
      // here is: what it changes is the address a CUSTOMER meets, in their own
      // confirmation email. THE SUMMARY IS THE ADDRESS ITSELF where there is
      // one, and the platform path where there is not — never "0 domains",
      // which tells a detailer nothing about what their customers see.
      ["domain", "Your web address", Globe,
        counts ? (counts.domain ?? `detailingplatform.com/book/${business.slug}`) : "…"],
      // ROADMAP 4.2 — a feature the rebuild LOST, not a new one. Under "Your
      // page" because what it changes is what a CUSTOMER meets: a link of
      // their own with the discount already applied. The summary is the one
      // question a detailer has — did the flyer bring anybody — so it counts
      // LIVE links, never rows: a campaign turned off is not a campaign
      // running.
      ["campaigns", "Campaign links", QrCode,
        counts ? (counts.campaigns
          ? `${n(counts.campaigns, "link", "links")} · ${n(counts.campaignVisits, "open", "opens")}`
          : "Nothing tracked yet") : "…"],
    ]],
    ["What you sell", [
      ["catalog", "Services & add-ons", Wrench,
        blocked === "catalog" ? "Nothing to sell — your booking page is empty"
          : counts ? `${n(counts.services, "service", "services")} · ${n(counts.addOns, "add-on", "add-ons")}` : "…"],
      // A PLAN IS AN OFFER WITH A PRICE, which is exactly the admission test
      // this screen applies to the catalog — and step 3 puts the plans on the
      // booking page, so a customer meets them. The owner named the location
      // himself: "a way for them to set up their monthly plan within the
      // website, like in the More page or the business page".
      ["plans", "Monthly plans", Repeat,
        counts ? (counts.plans === 0 ? "Not offering one"
          : `${n(counts.planMembers, "member", "members")} on ${n(counts.plans, "plan", "plans")}`) : "…"],
      // ROADMAP 2.20 STAGE 1. Under "What you sell" rather than "Your page"
      // because it is about the money on the job, and LAST in the group for
      // the same reason cash is last in the email's own list: it is what
      // happens once everything above it has been agreed.
      ["payments", "How you get paid", Wallet, settings ? describePayment(settings) : "…"],
      ["promos", "Promo codes & sale", Tag,
        counts ? (settings?.site_discount_active
          ? `Site sale on · ${n(counts.promos, "code", "codes")}`
          : n(counts.promos, "active code", "active codes")) : "…"],
    ]],
    ["When you can be booked", [
      ["hours", "Hours & days off", CalendarClock, counts ? counts.hours : "…"],
      // ClipboardList, not Store: Store is Business info's icon and two rows
      // on one screen wearing the same mark is the mark saying nothing.
      ["rules", "Booking rules", ClipboardList,
        settings ? `${mode} · ${humanNotice(settings.min_advance_minutes)}` : "…"],
    ]],
  ];

  const index = (
    <>
      <div>
        <h1 className="display">Business</h1>
        <p className="quiet" style={{ marginTop: 2 }}>{business.name}</p>
      </div>

      {setupOpen && (
        <div className="card setting-card">
          <button className="nav-row" onClick={() => onSetup?.()}>
            <span className="ico"><ListChecks size={19} strokeWidth={2} /></span>
            <span className="txt">
              <span className="name">Finish setting up</span>
              <span className="now">{setup.count} of {setup.total} done</span>
            </span>
            <span className="chev"><ChevronRight size={18} strokeWidth={2} /></span>
          </button>
        </div>
      )}

      {/* FIRST ON A PHONE, AND ONLY ON A PHONE. At a desk it is the second
          column's resting content, so rendering it here as well would print
          the most-shared thing the business owns twice on one screen. */}
      {!wide && <BookingLink slug={business.slug} origin={siteOrigin} />}

      {GROUPS.map(([title, rows]) => (
        <div className="tight" key={title}>
          <span className="label">{title}</span>
          <div className="card setting-card">
            {rows.map(([key, name, Icon, now, swatch]) => (
              <button className={`nav-row${blocked === key ? " blocking" : ""}`} key={key}
                data-settings-key={key}
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
                  <span className="name">{name}</span>
                  <span className="now">{now}</span>
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
      onClose={() => { setOpen(null); load(); reloadTenant(); }}
      empty={<BookingLink slug={business.slug} origin={siteOrigin} />}
    >
      {index}
    </SettingsHost>
  );
}
