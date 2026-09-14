// Public booking page — /book/:slug. One page, every business, driven
// entirely by that business's configuration.
//
// ROADMAP 3.2 — THE RULES ARE NOT IN THIS FILE ANY MORE. The step sequence,
// the group rules, the mode limit, the step gating, both money payloads and
// what the device remembers all live in `./core.js`, which has no React and
// no markup in it, because every website-package tenant now draws its own
// booking form and the rules must not fork with the presentation. What is
// left here is the presentation: React state, wording, layout and motion.
// THIS PAGE IS ALSO THE CORE'S ONLY REAL TEST — a rule it stops calling is a
// rule that starts rotting.
//
// The steps live in ./steps; this file owns the flow, the server quote, and
// submission. HOW MANY there are is not fixed — see core.js's stepsFor().
//
// ---------------------------------------------------------------------------
// A STANDING RULE FROM ANDREW, 2026-09-13: **NO STEP THAT NEEDS A LOT OF
// SCROLLING. IF A STEP RUNS MUCH PAST A SCREENFUL, MAKE IT ANOTHER STEP.**
// ---------------------------------------------------------------------------
// It is the answer to the obvious way of shortening this flow, which is to
// merge two steps, and it says: do the opposite. An eighth step costs one tap;
// a step a customer has to scroll twice costs the choices below the fold,
// which on the add-ons step is the part of the booking the detailer earns most
// of the extra money from.
//
// **AND IT IS WHY ADD-ONS KEEP THEIR OWN STEP.** Folding them into Services
// was proposed on the same day and he overruled it in the same breath.
//
// `node scripts/sweep-booking-steps.mjs` prints a *spare room* figure per step
// at each width, and it is the instrument for this rule — a step whose figure
// goes negative has broken it.
//
// THE OLD CRASH: the previous widget called calculate-booking, swallowed any
// failure with a console.error, and left its price state stale or null. The
// customer could walk to the final step and submit, which then threw. Here
// the quote is state with an explicit error, every step that depends on it
// is gated on `quote` existing, and a failed calculation surfaces with a
// retry instead of being silently ignored.

import { getLocale, t } from "../lib/i18n.js";
import { useLocale } from "../hooks/useLocale.js";
import LanguagePicker from "./LanguagePicker.jsx";
import PlanRows from "./PlanRows.jsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { api } from "../lib/api.js";
import { tenantHost } from "../lib/host.js";
import { duration, money, phone } from "../lib/format.js";
// The door on step 1 names the cheapest plan, and the words for a price live
// in one place for every screen that prints one.
import { priceWords } from "../lib/plans.js";
import { BookingBusinessProvider, useBookingBusiness } from "./BookingBusinessContext.jsx";
import {
  blockers as coreBlockers,
  bookable, bookingRequests, campaignFor, closedUntil,
  groupedWith, initialForm,
  modeLimitFor, offersBothModes, quoteKey as coreQuoteKey, quoteRequest,
  recallCustomer, rememberCustomer, stepsFor, toggleService as coreToggleService,
  visitorIdFor,
} from "./core.js";
import StepServices from "./steps/StepServices.jsx";
import StepExtras from "./steps/StepExtras.jsx";
import StepVehicle from "./steps/StepVehicle.jsx";
import StepLocation from "./steps/StepLocation.jsx";
import StepWhen from "./steps/StepWhen.jsx";
import StepDetails from "./steps/StepDetails.jsx";
import StepReview from "./steps/StepReview.jsx";
import BookingConfirmed from "./BookingConfirmed.jsx";
import "./booking.css";

// ROADMAP 8.10 — how the message names a car whose slot went. Words, not
// digits: this sentence is the only place a customer meets the split booking
// going wrong, and "the 3th car" is how a form loses somebody's trust.
const NTH = [null, "second car", "third car", "fourth car", "fifth car",
  "sixth car", "seventh car", "eighth car", "ninth car", "tenth car"];

// Roadmap 2.7, W19 (the step sequence), and roadmap 2.14 step 3 (what the
// device remembers) both moved into ./core.js in roadmap 3.2, with their
// reasoning. A tenant site's own form needs the same order and the same
// recognition, and neither can be re-derived from looking at a screenshot.

// ROADMAP 3.3 — `byHost` is the same page reached from `/` on a detailer's
// own verified address. Nothing below this line knows the difference: the
// context resolves the business either way and hands the flow the SAME slug.
// `notFound` is what to draw when the host resolves to no business. On the
// slug path that is the page's own "this link doesn't match a business"
// message, which is the truth. On the HOST path the router hands in the
// marketing page instead, and that is the safe direction rather than a
// nicety: the day somebody buys a second platform domain and forgets to add
// it to `lib/host.js`, `/` shows the product rather than a dead end.
export default function BookingPage({ byHost = false, notFound = null }) {
  const { slug } = useParams();
  return (
    <BookingBusinessProvider
      slug={byHost ? undefined : slug}
      host={byHost ? tenantHost() : undefined}
    >
      <BookingFlow notFound={notFound} />
    </BookingBusinessProvider>
  );
}

function BookingFlow({ notFound = null }) {
  // Every component that renders translated text subscribes; see
  // `hooks/useLocale.js` for why one call at the root is not enough.
  useLocale();
  const ctx = useBookingBusiness();
  const { status, business, branding, settings, services, serviceGroups, addOns, plans, brandVars, slug, tx } = ctx;
  const STEPS = useMemo(() => stepsFor(addOns), [addOns]);
  // WHICH STEP CARRIES THE PLANS CHIP. The add-ons step when there is one, and
  // Services otherwise — the long note beside the chip itself has the reason.
  const planDoorStep = STEPS.includes("Extras") ? "Extras" : "Services";
  const [params, setParams] = useSearchParams();

  // WHO WE ALREADY KNOW, READ ONCE. Lazy state rather than a plain read: the
  // recognition must not change under the customer mid-flow, and this page
  // WRITES that key on submit — reading it every render would rename the
  // heading the instant they book.
  const [known] = useState(() => recallCustomer(slug));
  // ROADMAP 4.2 — WHICH PRINTED LINK BROUGHT THEM. Read once, for the same
  // reason `known` is: the URL is the truth at arrival and the remembered
  // value is what makes a booking two days after the scan still count.
  const [visitor] = useState(() => visitorIdFor());
  const [campaignSlug] = useState(() => campaignFor(globalThis.location?.search));
  // The plan this booking is against, if any. **THE ADDRESS IS THE ONLY
  // SOURCE, and the remembered device is no longer a fallback — 2026-09-11.**
  //
  // This read `params.get("plan") || known?.planId`, and `rememberCustomer`
  // wrote that id into `bk.customer` after every booking. One press of
  // **Choose this** on the public plans page therefore priced every later
  // booking from that browser at the plan rate, on a clean URL with no plan in
  // it. `core.js`'s `rememberCustomer` carries the full account; the short
  // version is that a price must never come out of the customer's own storage.
  //
  // A real member is not affected: they arrive on their emailed plan link,
  // which carries the plan in the address, and the server checks their
  // membership either way.
  const planId = params.get("plan") || "";
  // **DID THEY ARRIVE ON A PLAN, OR PICK ONE HERE?** The same `?plan=` in the
  // address means two different things, and only the FIRST one should hide the
  // list: somebody who came in on an emailed plan link has already chosen, the
  // price bar names it, and re-offering the four plans invites them to undo
  // what they arrived having done. Somebody who pressed a row on the add-ons
  // step is standing in front of that list and must keep it — to change their
  // mind, or to press the same row again and come off it.
  // Captured once, on mount, because `planId` itself changes when they pick.
  const fromLink = useRef(Boolean(params.get("plan"))).current;

  const [step, setStep] = useState(0);
  // The shape AND the three tenant defaults are the core's. Pre-filled from
  // this device's last booking, so a returning customer never retypes their
  // own name; empty for everybody else, exactly as before.
  const [form, setForm] = useState(() => initialForm(settings, known));
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [promoState, setPromoState] = useState({ checking: false, error: "", applied: null });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState(null);
  const topRef = useRef(null);

  // THE TENANT'S OWN DEFAULTS ARRIVE LATE, so they are re-applied once — the
  // profile is a round trip and the form mounts before it lands. Three
  // separate effects did this until roadmap 3.2; the rules themselves (a
  // single mode is chosen for the customer, the first travel zone and the
  // first vehicle size are the ordinary case) are `initialForm`'s now.
  //
  // ONCE, and latched in a ref rather than guarded on the fields being empty:
  // "small" is a legitimate value AND the fallback, so a guard cannot tell
  // "still unset" from "the tenant's first size really is small". It cannot
  // overwrite anything a customer typed, because the page draws a spinner
  // until this moment.
  const defaultsApplied = useRef(false);
  useEffect(() => {
    if (status !== "ready" || defaultsApplied.current) return;
    defaultsApplied.current = true;
    const d = initialForm(settings, null);
    setForm((f) => ({ ...f, serviceType: d.serviceType, travelZone: d.travelZone, vehicleSize: d.vehicleSize }));
  }, [status, settings]);

  // ROADMAP 4.2 — THE VISIT, RECORDED ONCE, AND THE CODE APPLIED WITHOUT
  // ANYBODY TYPING IT. The detailer's own comment on the old site names a
  // golf-course QR as the real case, and **a promo code somebody has to
  // remember off a sign is a code nobody uses** — the auto-apply is the
  // feature, the counting is the report on it.
  //
  // WHOLLY BEST-EFFORT. Every failure path here is a no-op: no campaign, a
  // dead function, a blocked request, a code that has since been retired. A
  // booking must never depend on an analytics call, and this one runs before
  // the customer has chosen anything.
  //
  // ONCE PER PAGE, latched in a ref — `status` and `slug` both settle after
  // the profile lands, and a visit counted twice is a scan that did not
  // happen.
  const visitLogged = useRef(false);
  useEffect(() => {
    // **EVERY VISIT, NOT ONLY A TAGGED ONE — his correction, 2026-09-10.**
    // *"What I meant by tracking everyone is that... I want it to be more like
    // a way to know where customers are coming from."*
    //
    // This read `|| !campaignSlug` and returned, so a visitor who simply typed
    // the address in was never counted at all — and the one thing he asked for
    // by name, *"the website should also track people"*, was the only thing
    // this did not do. The server has accepted an untagged visit since the day
    // it was written (`track-visit` writes `campaign_id: null` and the column's
    // own comment says "NULL = organic visit"); nothing had ever called it that
    // way. One clause.
    //
    // **AND `referrer` WAS ALREADY BEING SENT AND NEVER READ.** With this line
    // changed it becomes the whole of the "everyone else" half of the money
    // screen's new block: Google, Yelp, or typed in.
    if (status !== "ready" || !slug || visitLogged.current) return;
    visitLogged.current = true;
    api.trackVisit(slug, {
      visitor_id: visitor,
      slug: campaignSlug,
      referrer: globalThis.document?.referrer || null,
      path: globalThis.location?.pathname || null,
    }).then((r) => {
      // The code goes on ONLY if the campaign carries one and the customer
      // has not typed their own. Overwriting a code somebody entered by hand
      // with one they never saw is the version of this that loses trust.
      const code = r?.campaign?.promo_code;
      if (code) setPromoState((p) => (p.applied ? p : { checking: false, error: "", applied: code }));
    }).catch(() => { /* a visit nobody counted is not a booking lost */ });
  }, [status, slug, campaignSlug, visitor]);

  // THE CHEAPEST PLAN, FOR THE DOOR'S OWN LABEL — roadmap 8.9's sibling, his
  // review of 2026-09-11. Only the MONTHLY kinds are comparable by number:
  // "10% off" is not more or less than "$120 a month", and a percentage in a
  // "from" is a claim nobody can check. So a business selling only a member
  // discount gets the plain words back, which is the honest outcome.
  const cheapestPlan = useMemo(() => {
    const priced = (plans ?? []).filter((p) => p.price_kind !== "percent_off" && Number(p.price_amount) > 0);
    if (!priced.length) return null;
    return priced.reduce((a, b) => (Number(b.price_amount) < Number(a.price_amount) ? b : a));
  }, [plans]);

  const selectedServices = useMemo(
    () => services.filter((s) => form.serviceIds.includes(s.id)),
    [services, form.serviceIds],
  );
  const selectedAddOns = useMemo(
    () => addOns.filter((a) => form.addOns.includes(a.id)),
    [addOns, form.addOns],
  );

  // --- The server quote. Errors are STATE, not a console line. ------------
  // WHAT THE PRICE DEPENDS ON is `core.js`'s `quoteKey`, with the reasoning:
  // roadmap 2.8c put the day, the time, the travel area and the way of
  // working into it, and 2.14 the plan. Nothing on this page computes any
  // part of a price, plan discounts included.
  const quoteKey = coreQuoteKey(form, { planId, promoApplied: promoState.applied });
  const fetchQuote = useCallback(async () => {
    if (form.serviceIds.length === 0) {
      setQuote(null);
      setQuoteError("");
      return;
    }
    setQuoting(true);
    setQuoteError("");
    try {
      const r = await api.calculateBooking(slug, quoteRequest(form, { planId, promoApplied: promoState.applied }));
      if (!r?.quote) throw new Error(t("We couldn't work out a price for that selection."));
      // THE WEATHER RIDES ALONG ON THE QUOTE rather than in a second piece of
      // state, because it is answered by the same call, changes on exactly the
      // same facts, and is shown on the same card. `r.weather` is null far more
      // often than not — a booking past the forecast, or a place nothing has
      // resolved — and the confirm step renders nothing for it.
      setQuote({ ...r.quote, weather: r.weather ?? null });
    } catch (e) {
      setQuote(null);
      setQuoteError(e.message || t("We couldn't work out a price just now."));
    }
    setQuoting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, slug]);

  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  // WHY THE CODE WAS REFUSED, IN THE CUSTOMER'S WORDS RATHER THAN THE
  // SERVER'S — 2026-09-12, from an outside review of the booking page.
  //
  // The refusal branch was always here and always rendered; what it rendered
  // was `validate-promo-code`'s own sentence, *"Invalid or expired promo
  // code"*. Three things wrong with that. It is written for whoever reads a
  // log. It reaches a Spanish page in English, because `t()` can only
  // translate a string this codebase wrote. And it answers two different
  // questions at once — a code that does not exist and a code that has
  // expired are not the same news for somebody holding a flyer.
  //
  // **THE STATUS IS WHAT IS MATCHED, NOT THE SENTENCE** (`core.js`'s
  // `postFunction` carries it). 403 is the one refusal the server can be
  // specific about: the code is real, and this person has had it already.
  const promoMessage = (e) => {
    if (e?.status === 403) return t("You’ve used that code already. It’s one per customer.");
    if (e?.status === 404) return t("That code isn’t one of ours.");
    return t("We couldn’t check that code just now. Try again in a moment.");
  };

  const applyPromo = async () => {
    const code = form.promoCode.trim();
    if (!code) return;
    setPromoState({ checking: true, error: "", applied: null });
    try {
      await api.validatePromo(slug, code, form.customerEmail, form.customerPhone);
      setPromoState({ checking: false, error: "", applied: code });
    } catch (e) {
      setPromoState({ checking: false, error: promoMessage(e), applied: null });
    }
  };

  // ROADMAP 2.8c — a service can rule out a way of working; the rule and its
  // reasoning are `core.js`'s `modeLimitFor`.
  const modeLimit = modeLimitFor(selectedServices);

  // If the selection narrows the mode, the form follows it rather than
  // leaving a choice that is going to be refused at submit.
  useEffect(() => {
    if (!modeLimit || form.serviceType === modeLimit.only) return;
    setForm((f) => ({ ...f, serviceType: modeLimit.only }));
  }, [modeLimit, form.serviceType]);

  // --- Step gating ---------------------------------------------------------
  const bothModes = offersBothModes(settings, modeLimit);
  // **THE REASON, NOT JUST THE REFUSAL — 2026-09-12.** `blockers()` is what
  // `canAdvance` is now built from, so the button and the explanation cannot
  // drift: the same call answers both. It is handed to the step so the sentence
  // can sit NEXT TO THE MISSING FIELD rather than in the footer — a tooltip
  // would be no use on a phone, which is where this flow is used.
  const stepBlocks = coreBlockers(STEPS[step], { form, settings, quote, quoting });
  const canAdvance = stepBlocks.length === 0;

  // W25 and roadmap 2.8c's exclusive category — both are `core.js`'s
  // `toggleService`, with the reasoning. This page only decides that a tap
  // means "toggle".
  const toggleService = (id) => setForm((f) => ({
    ...f,
    serviceIds: coreToggleService(f.serviceIds, id, { services, serviceGroups }),
  }));

  const go = (delta) => {
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + delta)));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async () => {
    // Belt and braces: never submit without a server quote.
    if (!quote) {
      setSubmitError(t("We couldn't confirm the price. Please go back a step and try again."));
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      // ROADMAP 8.10 — ONE CALL, OR ONE PER CAR. `bookingRequests` is the
      // core's rule for which: cars on the same day are one booking, cars on
      // different days are one booking each, joined by naming the first.
      //
      // A LATER CALL FAILING IS NOT A ROLLBACK. Each one is a complete,
      // confirmed appointment the moment it returns — deleting it because the
      // NEXT car's slot went would throw away a booking the customer has
      // already been given. So the error names what happened and the first
      // booking stands.
      const payloads = bookingRequests(form, {
        planId, promoApplied: promoState.applied,
        // ROADMAP 4.2 — the attribution, resolved server-side against this
        // business's own campaigns. Sent on every booking; null on almost all
        // of them, which is what makes the ones that are not null worth
        // counting.
        campaignSlug, visitorId: visitor,
        // ROADMAP 8.17 STAGE 2A — read at SUBMIT rather than at render, so it
        // is whatever the person had chosen when they actually pressed the
        // button. Their emails follow it from here.
        lang: getLocale(),
      });
      let r = null;
      for (let i = 0; i < payloads.length; i++) {
        try {
          const one = await api.createBooking(
            slug, i === 0 ? payloads[0] : groupedWith(payloads[i], r?.booking?.id),
          );
          if (i === 0) r = one;
        } catch (e) {
          if (i === 0) throw e;
          setSubmitError(
            `Your first car is booked. The time for the ${NTH[i] ?? `car ${i + 1}`} `
            + `was taken while you were filling this in. Please book it separately. (${e.message})`,
          );
          setSubmitting(false);
          return;
        }
      }
      // Remembered only once the booking actually landed: a device that
      // remembers an abandoned form is remembering somebody who left.
      // `quote.plan_id` rather than `planId` on purpose — it is the id the
      // SERVER resolved, so a retired plan is not carried forward.
      rememberCustomer(slug, form, quote?.plan_id);
      setConfirmed(r.booking);
    } catch (e) {
      // A 409 here means the slot went while they were filling the form, or
      // a rule rejected it. Say so plainly and send them back to pick again.
      setSubmitError(e.message || t("We couldn't complete that booking."));
      setSubmitting(false);
    }
  };

  // --- Render --------------------------------------------------------------
  if (status === "loading") {
    return <div className="bk" style={brandVars}><div className="bk-center"><div className="bk-spinner" /></div></div>;
  }
  if (status === "not_found") {
    if (notFound) return notFound;
    return (
      <div className="bk" style={brandVars}>
        <div className="bk-center">
          <h1>{t("Page not found")}</h1>
          <p className="bk-muted">{t("This booking link doesn’t match a business.")}</p>
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="bk" style={brandVars}>
        <div className="bk-center">
          <h1>{t("Something went wrong")}</h1>
          <p className="bk-muted">{t("Please refresh and try again.")}</p>
        </div>
      </div>
    );
  }
  if (confirmed) {
    return <BookingConfirmed booking={confirmed} form={form} />;
  }
  // **STILL SETTING UP — roadmap 8.4, and it is an EXPLANATION rather than a
  // gate.** The gate already exists and needs no code: with neither mode
  // answered, `slotValidation` refuses every service type and `available-slots`
  // skips every slot, so nothing can be booked here whatever this page draws.
  //
  // What that produced without this block is the worst reading available — a
  // customer walking four steps to a calendar with **no times in it**, and
  // concluding the detailer is booked solid. That is a lost customer who
  // thinks they were too late, rather than one who knows to come back. Saying
  // it at the top costs them four steps less and says the true thing.
  //
  // It is NOT `status: "not_found"`: the business exists, the page is theirs,
  // and their branding is on it. A 404 here would also be the wrong answer for
  // the detailer, who is midway through setting up and needs their link to
  // look like something rather than like a mistake.
  // ROADMAP 8.13 — THE DETAILER IS AWAY, AND THE PAGE SAYS SO AND WHEN THEY
  // ARE BACK. Before this the only pause was the platform admin darkening the
  // whole business, and the page then 404'd: a customer met "page not found"
  // about a business that exists and is coming back in nine days.
  //
  // **IT IS ABOVE `bookable()` ON PURPOSE.** A detailer who has not finished
  // setting up AND is away should be told the more specific, more useful
  // thing — a return date — rather than "isn't taking bookings online yet",
  // which reads as never.
  //
  // The note is the detailer's own words and React escapes it; it is the same
  // human-typed, customer-facing boundary `campaignEmail` lives on.
  const away = closedUntil(business, business?.timezone);
  if (away) {
    const backOn = new Date(`${away}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    return (
      <div className="bk" style={brandVars}>
        <div className="bk-center">
          <h1>{business?.name} is closed until {backOn}</h1>
          {/* NO SENTENCE UNDER THE HEADING. "You can book from then — the page
              will be back on by itself" was there and it failed his own copy
              rule twice over: the heading already says when they can book, and
              the second half describes OUR plumbing, which is not a fact a
              customer has any use for. What is worth reading here is the
              detailer's own note, below. */}
          {business?.closed_note && (
            <p className="bk-body" style={{ marginTop: 10 }}>{business.closed_note}</p>
          )}
          {business?.phone && (
            <p className="bk-muted" style={{ marginTop: 10 }}>
              <a href={`tel:${business.phone}`}>{phone(business.phone)}</a>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!bookable(settings)) {
    return (
      <div className="bk" style={brandVars}>
        <div className="bk-center">
          {/* TRANSLATED 2026-09-11. `tests/spanish.test.mjs` 4a had been red
              on this block on a clean tree, and the heading beside it was
              untranslated too without the check being able to see it — an
              interpolated line reads to that check as a value rather than as
              prose. A customer who reached this page in Spanish met three
              English sentences on the one screen that exists to tell them
              something has gone wrong. */}
          <h1>{t("{business} isn’t taking bookings online yet", { business: business?.name ?? "" })}</h1>
          <p className="bk-muted">
            {t("They’re still setting this page up. Check back shortly, or get in touch with them directly.")}
          </p>
          {/* **`business.phone`, NOT `contact_phone` — and the email is not
              here at all.** The public profile renames it (`'phone',
              b.contact_phone` in the RPC) and carries no address: that is
              tenant-site-contract §6f, an open question with the owner about
              whether a detailer's email belongs on a public page. The first
              version of this block read both column names straight off
              `businesses` and rendered NOTHING — a fallback that looks like a
              feature and can never fire, found by opening the page rather
              than by any check. */}
          {business?.phone && (
            <p className="bk-muted"><a href={`tel:${business.phone}`}>{phone(business.phone)}</a></p>
          )}
        </div>
      </div>
    );
  }

  const stepName = STEPS[step];
  const isLast = step === STEPS.length - 1;
  // What step 1's heading says instead of its question, in priority order:
  // somebody who just pressed a plan button is here to do that one thing, and
  // somebody this device knows gets their name. Both fall back to the ordinary
  // question, which is what every first-time customer still meets.
  //
  // The plan is named from the PUBLIC PROFILE, not from the quote, and the
  // difference matters: the quote does not exist until a service is chosen, so
  // reading it here would leave somebody who just pressed a plan button
  // looking at the ordinary question until they tapped something. Naming a
  // plan is not a price promise — the PRICE is only ever the server's, and it
  // is drawn in the bar and on the receipt. A retired plan is absent from this
  // list, so it correctly stops being named at all.
  const attachedPlan = planId ? plans.find((p) => p.id === planId) ?? null : null;
  // THE NAME WINS WHERE WE HAVE ONE, and that is what makes this his own
  // approved sentence rather than half of it. He asked for *"Welcome back,
  // Marcus — your Bi-weekly plan applies"*; the name goes in the heading and
  // the plan is already named in the price bar, beside the number it moved.
  // A stranger arriving straight from a plan button has no name to use, so
  // they get the plan instead — which is the other half of the same sentence,
  // and the only half that is true of them.
  const recognition = known?.name
    ? { kind: "name", text: known.name.trim().split(" ")[0] }
    : attachedPlan
      ? { kind: "plan", text: tx(attachedPlan.name) }
      : null;

  return (
    <div className="bk" style={brandVars}>
      <header className="bk-header" ref={topRef}>
        <div className="inner">
          {branding?.logo_url && <img src={branding.logo_url} alt="" />}
          <div>
            <h1>{business.name}</h1>
            {/* THE NAME IS NEVER TRANSLATED AND THE TAGLINE ALWAYS IS, one
                line apart. We translate what a business SAYS, never what it is
                CALLED — and the database refuses a row for the name, so this
                is a rule about call sites rather than about the data. */}
            {branding?.tagline && <div className="tagline brand">{tx(branding.tagline)}</div>}
          </div>
          {/* ROADMAP 8.17 — IN THE MASTHEAD, WHICH IS THE ONE PLACE ON THIS
              PAGE THAT COSTS A STEP NOTHING. Every step's spare room is the
              detailer's budget (W16) and step 1's is TEN PIXELS at 1440x900,
              so a language control anywhere inside `.bk-wrap` would be height
              taken from a tenant's catalogue. The header is drawn once, above
              the flow, and does not move between steps. */}
          <LanguagePicker />
        </div>
      </header>

      <div className="bk-wrap">
        {/* One header unit: without the wrapper, bk-wrap's flex gap opens
            28px voids between rail, label and heading. */}
        {/* The rail and the words say the same thing, so they share a line
            rather than stacking — 15px of every step's budget, on all seven
            of them (W16). The rail keeps most of the width because it is what
            gets read at a glance; the words are what a screen reader gets. */}
        <div className="bk-step-head" key={`head-${step}`}>
          <div className="bk-row">
            <div className="bk-rail" aria-hidden="true">
              {STEPS.map((s, i) => (
                <span key={s} className={i < step ? "done" : i === step ? "current" : ""} />
              ))}
            </div>
            <div className="bk-step-label">{t("Step {n} of {total}", { n: step + 1, total: STEPS.length })}</div>
            {/* **THE PLAN CHIP THAT USED TO RIDE THIS ROW IS GONE — Andrew,
                2026-09-13.** It sat beside the step rail, and his words were
                unambiguous: *"it got put in the top part next to the steps…
                it should be underneath the add ons, like, pretty big and
                pretty visible… not a button to go to the screen, but just the
                whole screen."*

                **The move is not a demotion, it is the opposite.** A chip in
                the header is cheap in height and cheap in attention, which is
                exactly what he objected to twice — *"it's this small little
                text, probably the majority of people are going to miss it"*
                (2026-09-11). The real rows, full width, under the add-ons, are
                the pitch itself rather than a door to it.

                **AND THE ADD-ONS STEP KEEPS ITS OWN STEP.** Folding it into
                step 1 was proposed and he overruled it: a lot of the revenue
                is in the add-ons and he does not want them skipped past.

                `planDoorStep` still decides WHICH step carries it, and still
                falls back to Services for a business with no add-ons — the
                alternative is a detailer whose plans are unreachable from the
                booking page because of a catalogue decision that has nothing
                to do with plans. */}
          </div>
          {/* RECOGNITION IS SPENT ON A LINE THAT IS ALREADY DRAWN. The owner
              asked for a welcome at the top of step 1 — *"a welcome message
              would be cool"* — and the research's own condition was that the
              step budgets are MEASURED, so a new line there is real height on
              the tightest screen in the product. The heading is one line
              either way, and it is the top of the step. */}
          <h2>{headingFor(stepName, bothModes, settings, form.serviceType, step === 0 ? recognition : null)}</h2>
        </div>

        {/* Keyed on the step so React hands back a fresh element and the
            staggered rise in booking.css re-runs — the whole of the step
            motion, with no observer and nothing to fail. The wrapper is
            display:contents, so it changes the motion and nothing about the
            layout: its children stay direct flex items of .bk-wrap. */}
        <div className="bk-step" key={`step-${step}`}>
        {stepName === "Services" && (
          <StepServices selected={form.serviceIds} onToggle={toggleService} />
        )}
        {stepName === "Extras" && (
          <StepExtras
            selected={form.addOns}
            onToggle={(id) => setForm((f) => ({
              ...f,
              addOns: f.addOns.includes(id) ? f.addOns.filter((x) => x !== id) : [...f.addOns, id],
            }))}
          />
        )}
        {stepName === "Vehicle" && (
          <StepVehicle form={form} setForm={setForm} selectedServices={selectedServices} blocks={stepBlocks} />
        )}
        {stepName === "Location" && (
          <StepLocation form={form} setForm={setForm} modeLimit={modeLimit} blocks={stepBlocks} />
        )}
        {stepName === "When" && (
          <StepWhen
            form={form} setForm={setForm}
            durationMinutes={quote?.total_duration}
            // ROADMAP 8.10 — one length per car on a split booking, because a
            // truck and a hatchback do not need the same window. Absent on an
            // ordinary booking, and the step falls back to the whole job.
            durations={(quote?.per_vehicle ?? []).map((v) => v.durationMinutes)}
            // WHAT THE DAY AND THE TIME JUST ADDED. Every other step that
            // moves the price says so on the control that moves it — a size
            // card reads "+$15", a travel area reads "· +$40", a service and
            // an add-on carry their own price. This step was the only one that
            // changed the figure in the bar and said nothing: measured
            // 2026-09-13 on the demo, picking Saturday 8:00 AM took the total
            // from $65 to $95 with the words "Weekend rate" appearing for the
            // first time two steps later, on the receipt.
            //
            // **THE GUARD IS WHAT MAKES THIS HONEST, and it is not tidiness.**
            // `quote.adjustments` is three kinds of line glued together by
            // `_shared/pricing.ts` — the extra cars, the day-and-time rules,
            // and the plan — and only the middle kind was caused by anything
            // on this step. Slicing by POSITION would couple this file to the
            // order that array happens to be built in, which is the class of
            // check CLAUDE.md § (k) is about. So the list is passed only when
            // the other two kinds provably cannot be in it: one vehicle, no
            // plan. A split or plan booking shows nothing here, which is
            // exactly what it showed before.
            surcharges={quote && quote.vehicle_count === 1 && !quote.plan_name
              ? (quote.adjustments ?? []) : []}
            blocks={stepBlocks}
          />
        )}
        {stepName === "Details" && <StepDetails form={form} setForm={setForm} blocks={stepBlocks} />}
        {stepName === "Review" && (
          <StepReview
            form={form} setForm={setForm} quote={quote}
            services={selectedServices} addOns={selectedAddOns}
            promoState={promoState} onApplyPromo={applyPromo}
          />
        )}

        {/* ── THE MONTHLY PLAN, UNDER THE ADD-ONS, AT FULL WIDTH ────────────
            Andrew, 2026-09-13: *"it should be underneath the add ons, like,
            pretty big and pretty visible… like, just in the whole screen,
            like, not a button to go to the screen, but just the whole
            screen."*

            **IT IS THE REAL PITCH, NOT A LINK TO ONE.** `PlanRows` is the
            same component the plans page draws, so the prices, the cadence
            chips and the detailer's own words are one implementation. Pressing
            a row ATTACHES the plan here — it does not navigate — because
            `/book/:slug?plan=<id>` mid-flow would throw away every answer
            already given.

            **INSIDE `.bk-step`, WHICH IS WHERE THE MOTION IS.** That wrapper
            is `display: contents` and keyed on the step, so this arrives with
            the step's own staggered rise and needs no animation of its own —
            the rule CLAUDE.md § ANYTHING THAT OPENS records as *a component
            that renders as a child of the arriving container already HAS an
            entrance*.

            **AND IT IS ABSENT ONCE A PLAN IS ATTACHED FROM ELSEWHERE.**
            Somebody who arrived on a plan link is already on one; the price
            bar names it, and offering the list again would invite them to
            re-choose what they came here having chosen. */}
        {stepName === planDoorStep && plans.length > 0 && !fromLink && (
          <div className="bk-planpitch">
            <h3>{t("Or make it a monthly plan")}</h3>
            {/* ONE SENTENCE, AND IT SAYS THE THING THE ROWS DO NOT. The rows
                carry the price, the cadence and the term; what they cannot say
                is that choosing one changes THIS booking rather than starting
                a separate purchase. His copy rule: a sentence that repeats the
                control gets cut, and this one does not repeat it. */}
            <p className="bk-muted">
              {t("Regular visits at a set price. Pick one and it applies to this booking.")}
            </p>
            <PlanRows plans={plans} lang={getLocale()} tx={tx} chosen={planId || null}
              onPick={(id) => {
                const next = new URLSearchParams(params);
                if (id) next.set("plan", id); else next.delete("plan");
                // `replace` so the back button still means "the previous
                // STEP" rather than "undo the plan I just pressed".
                setParams(next, { replace: true });
              }} />
          </div>
        )}
        </div>

        {/* A failed price calculation is visible and recoverable — never a
            silent state that explodes at submit. */}
        {quoteError && (
          <div className="bk-error">
            {quoteError}{" "}
            <button className="bk-btn inline" style={{ minHeight: 34, padding: "0 16px", marginTop: 8 }}
              onClick={fetchQuote}>
              {t("Try again")}
            </button>
          </div>
        )}
        {submitError && <div className="bk-error">{submitError}</div>}
      </div>

      {/* W20 — BACK LIVES IN THE BAR NOW, and the call was ours: he asked for
          it and then doubted it himself against W17 ("figure out what it looks
          best"). Measured, it is not close. As a block at the foot of the
          column it cost 48px plus the 26px section gap above it — 74px of the
          budget on every step but the first — and W16, "every step should fit
          without having to scroll", is the rule this whole item is organised
          around. It also reaches: at the bottom of a scroll it was the one
          control you had to scroll to find.
          Icon-only, because the arrow beside Continue is unambiguous and a
          worded Back competes with the thing to press. */}
      <div className="bk-bar">
        <div className="inner">
          {step > 0 && (
            <button className="bk-btn ghost back" onClick={() => go(-1)} aria-label={t("Back a step")}>
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
          )}
          <div className="total">
            {quote ? (
              <>
                {/* W17 — the estimated TIME rides on the eyebrow, not beside
                    the figure. The figure is the thing being decided on and it
                    is the one mono number in the bar; putting a second number
                    next to it makes two leads. The qualifier line is where a
                    qualifier goes. */}
                {/* ROADMAP 2.14 — AND THE PLAN IS NAMED HERE, BESIDE THE
                    NUMBER IT MOVED. That is the strongest place in the product
                    to say it and it costs no height, because this line is
                    already drawn: a price promise belongs next to the price.
                    The receipt on the review step itemises the same plan by
                    name, so the customer is told twice and charged once. */}
                <div className="bk-muted">
                  {quote.plan_name
                    ? t("{plan} applied", { plan: quote.plan_name })
                    : t("Estimated total")}
                  {quote.total_duration ? ` · ${duration(quote.total_duration, getLocale())}` : ""}
                </div>
                <strong>{money(quote.total)}</strong>
              </>
            ) : (
              <span className="bk-muted">{quoting ? t("Working out your price…") : t("Choose a service to start")}</span>
            )}
          </div>
          {isLast ? (
            /* ROADMAP 2.12 — the button says what pressing it DOES. In
               request mode it does not confirm anything: the time is held and
               the detailer has to accept. Nothing else on this page changes,
               because the same times are open either way. */
            /* ROADMAP 2.14 — A PLAN SIGN-UP IS A REQUEST IN EITHER MODE, so
               the button has to say so. `create-booking` holds the real rule
               and it knows something this page cannot: whether the customer is
               ALREADY a member, in which case a reserve-mode booking still
               confirms. So a plan booking under-promises here rather than
               over-promising — the confirmation screen reads the status the
               server actually wrote, and is right either way. */
            <button className="bk-btn primary" disabled={submitting || !quote} onClick={submit}>
              {settings.booking_mode === "request" || attachedPlan
                ? (submitting ? t("Sending…") : t("Request this time"))
                : (submitting ? t("Booking…") : t("Confirm booking"))}
            </button>
          ) : (
            <button className="bk-btn primary" disabled={!canAdvance} onClick={() => go(1)}>
              {t("Continue")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function headingFor(stepName, bothModes, settings, serviceType, recognition) {
  switch (stepName) {
    case "Services":
      // ROADMAP 2.14 STEP 3. Two recognitions, and neither adds a line: a
      // plan booking says what is being set up, a returning customer gets
      // their name. Everybody else meets the question this step has always
      // asked.
      if (recognition?.kind === "plan") return t("Let’s set up your {plan}", { plan: recognition.text });
      if (recognition?.kind === "name") return t("Welcome back, {name}", { name: recognition.text });
      return t("Pick your services");
    case "Extras": return t("Add-ons");
    case "Vehicle": return t("Tell us about the vehicle");
    // Not `settings.mobile_enabled` any more: roadmap 2.8c lets a SERVICE
    // narrow the mode, and by the time this renders form.serviceType is
    // already the only one left. Ask the question that matches it.
    case "Location": return bothModes ? t("Pick a place")
      : serviceType === "mobile" ? t("Your address") : t("Drop-off details");
    case "When": return t("Pick a time");
    // A NOUN PHRASE, NOT A QUESTION — 2026-09-12. Every step's title is
    // rendered by THIS function and not by the step file, which is why a sweep
    // of `steps/` reported this one as already fixed when it was not.
    case "Details": return t("Your details");
    default: return t("Check everything over");
  }
}
