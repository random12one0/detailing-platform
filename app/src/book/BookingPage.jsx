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
// THE OLD CRASH: the previous widget called calculate-booking, swallowed any
// failure with a console.error, and left its price state stale or null. The
// customer could walk to the final step and submit, which then threw. Here
// the quote is state with an explicit error, every step that depends on it
// is gated on `quote` existing, and a failed calculation surfaces with a
// retry instead of being silently ignored.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../lib/api.js";
import { tenantHost } from "../lib/host.js";
import { duration, money } from "../lib/format.js";
import { BookingBusinessProvider, useBookingBusiness } from "./BookingBusinessContext.jsx";
import {
  bookingRequest, campaignFor, canAdvance as coreCanAdvance, initialForm,
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
  const ctx = useBookingBusiness();
  const { status, business, branding, settings, services, serviceGroups, addOns, plans, brandVars, slug } = ctx;
  const STEPS = useMemo(() => stepsFor(addOns), [addOns]);
  const [params] = useSearchParams();

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
  // The plan this booking is against, if any. The URL wins — that is somebody
  // who just pressed a plan button, or came in from their own plan link — and
  // the remembered device is the fallback that needs no typing.
  const planId = params.get("plan") || known?.planId || "";

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
    if (status !== "ready" || !slug || !campaignSlug || visitLogged.current) return;
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
      if (!r?.quote) throw new Error("We couldn't work out a price for that selection.");
      setQuote(r.quote);
    } catch (e) {
      setQuote(null);
      setQuoteError(e.message || "We couldn't work out a price just now.");
    }
    setQuoting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, slug]);

  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  const applyPromo = async () => {
    const code = form.promoCode.trim();
    if (!code) return;
    setPromoState({ checking: true, error: "", applied: null });
    try {
      await api.validatePromo(slug, code, form.customerEmail, form.customerPhone);
      setPromoState({ checking: false, error: "", applied: code });
    } catch (e) {
      setPromoState({ checking: false, error: e.message || "That code isn't valid.", applied: null });
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
  const canAdvance = coreCanAdvance(STEPS[step], { form, settings, quote, quoting });

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
      setSubmitError("We couldn't confirm the price. Please go back a step and try again.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const r = await api.createBooking(slug, bookingRequest(form, {
        planId, promoApplied: promoState.applied,
        // ROADMAP 4.2 — the attribution, resolved server-side against this
        // business's own campaigns. Sent on every booking; null on almost all
        // of them, which is what makes the ones that are not null worth
        // counting.
        campaignSlug, visitorId: visitor,
      }));
      // Remembered only once the booking actually landed: a device that
      // remembers an abandoned form is remembering somebody who left.
      // `quote.plan_id` rather than `planId` on purpose — it is the id the
      // SERVER resolved, so a retired plan is not carried forward.
      rememberCustomer(slug, form, quote?.plan_id);
      setConfirmed(r.booking);
    } catch (e) {
      // A 409 here means the slot went while they were filling the form, or
      // a rule rejected it. Say so plainly and send them back to pick again.
      setSubmitError(e.message || "We couldn't complete that booking.");
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
          <h1>Page not found</h1>
          <p className="bk-muted">This booking link doesn’t match a business.</p>
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="bk" style={brandVars}>
        <div className="bk-center">
          <h1>Something went wrong</h1>
          <p className="bk-muted">Please refresh and try again.</p>
        </div>
      </div>
    );
  }
  if (confirmed) {
    return <BookingConfirmed booking={confirmed} form={form} />;
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
      ? { kind: "plan", text: attachedPlan.name }
      : null;

  return (
    <div className="bk" style={brandVars}>
      <header className="bk-header" ref={topRef}>
        <div className="inner">
          {branding?.logo_url && <img src={branding.logo_url} alt="" />}
          <div>
            <h1>{business.name}</h1>
            {branding?.tagline && <div className="tagline brand">{branding.tagline}</div>}
          </div>
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
            <div className="bk-step-label">Step {step + 1} of {STEPS.length}</div>
            {/* THE DOOR TO THE PLANS, AND IT COSTS THE STEP NOTHING. It rides
                the row the rail and the step label already share, so its
                height is the label's height — which matters, because step 1's
                spare room at 1440x900 is TEN PIXELS and that budget is the
                detailer's catalogue, not ours. Step 1 only: somebody on step 5
                has decided, and offering them a plan there is a way out of a
                form they are most of the way through. */}
            {step === 0 && plans.length > 0 && !attachedPlan && (
              <Link className="bk-plans-door" to={`/book/${slug}/plans`}>
                {plans.length === 1 ? "See the plan" : "See the plans"}
              </Link>
            )}
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
          <StepVehicle form={form} setForm={setForm} selectedServices={selectedServices} />
        )}
        {stepName === "Location" && (
          <StepLocation form={form} setForm={setForm} modeLimit={modeLimit} />
        )}
        {stepName === "When" && (
          <StepWhen form={form} setForm={setForm} durationMinutes={quote?.total_duration} />
        )}
        {stepName === "Details" && <StepDetails form={form} setForm={setForm} />}
        {stepName === "Review" && (
          <StepReview
            form={form} setForm={setForm} quote={quote}
            services={selectedServices} addOns={selectedAddOns}
            promoState={promoState} onApplyPromo={applyPromo}
          />
        )}
        </div>

        {/* A failed price calculation is visible and recoverable — never a
            silent state that explodes at submit. */}
        {quoteError && (
          <div className="bk-error">
            {quoteError}{" "}
            <button className="bk-btn inline" style={{ minHeight: 34, padding: "0 16px", marginTop: 8 }}
              onClick={fetchQuote}>
              Try again
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
            <button className="bk-btn ghost back" onClick={() => go(-1)} aria-label="Back a step">
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
                  {quote.plan_name ? `${quote.plan_name} applied` : "Estimated total"}
                  {quote.total_duration ? ` · ${duration(quote.total_duration)}` : ""}
                </div>
                <strong>{money(quote.total)}</strong>
              </>
            ) : (
              <span className="bk-muted">{quoting ? "Working out your price…" : "Choose a service to start"}</span>
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
                ? (submitting ? "Sending…" : "Request this time")
                : (submitting ? "Booking…" : "Confirm booking")}
            </button>
          ) : (
            <button className="bk-btn primary" disabled={!canAdvance} onClick={() => go(1)}>
              Continue
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
      if (recognition?.kind === "plan") return `Let’s set up your ${recognition.text}`;
      if (recognition?.kind === "name") return `Welcome back, ${recognition.text}`;
      return "What can we do for you?";
    case "Extras": return "Anything to add?";
    case "Vehicle": return "Tell us about the vehicle";
    // Not `settings.mobile_enabled` any more: roadmap 2.8c lets a SERVICE
    // narrow the mode, and by the time this renders form.serviceType is
    // already the only one left. Ask the question that matches it.
    case "Location": return bothModes ? "Where should we do it?"
      : serviceType === "mobile" ? "Where are you?" : "Drop-off details";
    case "When": return "Pick a time";
    case "Details": return "How do we reach you?";
    default: return "Check everything over";
  }
}
