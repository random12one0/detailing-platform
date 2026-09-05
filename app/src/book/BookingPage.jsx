// Public booking page — /book/:slug. One page, every business, driven
// entirely by that business's configuration.
//
// The steps live in ./steps; this file owns the flow, the server quote, and
// submission. HOW MANY there are is not fixed — see stepsFor() below.
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
import { duration, money } from "../lib/format.js";
import { BookingBusinessProvider, useBookingBusiness } from "./BookingBusinessContext.jsx";
import StepServices from "./steps/StepServices.jsx";
import StepExtras from "./steps/StepExtras.jsx";
import StepVehicle from "./steps/StepVehicle.jsx";
import StepLocation from "./steps/StepLocation.jsx";
import StepWhen from "./steps/StepWhen.jsx";
import StepDetails from "./steps/StepDetails.jsx";
import StepReview from "./steps/StepReview.jsx";
import BookingConfirmed from "./BookingConfirmed.jsx";
import "./booking.css";

// Roadmap 2.7, W19: "add-ons get their own step, in the same format as the
// services step." Extras sits directly after Services because the two are the
// same question asked twice — what do you want, and anything else — and the
// vehicle is a fact about the car rather than another thing to buy.
//
// The list is BUILT, not fixed, and only for the reason W19 forces: a business
// with no add-ons configured would otherwise get an empty seventh step, and
// "Step 3 of 7" would be a lie for every one of them. Nothing else about the
// flow is conditional.
const stepsFor = (addOns) =>
  ["Services", ...(addOns.length ? ["Extras"] : []), "Vehicle", "Location", "When", "Details", "Review"];

// ROADMAP 2.14 STEP 3 — THE BROWSER REMEMBERS THE LAST CUSTOMER ON THIS
// DEVICE, AND THE OWNER ASKED FOR IT IN THOSE WORDS: *"we should definitely
// log people, log their browsers and with cookies."*
//
// It is the cheapest 90% of the problem the customer-account idea was really
// about. Most people rebook on the phone they booked on, so remembering three
// fields removes all the typing an account would have removed — with no
// password, no lookup endpoint and no security surface. A new device simply
// fills the form in as it always did, which is the whole failure mode.
//
// THE PLAN IS REMEMBERED TOO, and that is what makes the "auto-detect" he was
// reaching for work without anybody typing an address: if the last booking on
// this device carried a plan, the next one starts with it attached. **It is a
// HINT, never a grant** — `create-booking` re-reads the plan from the database
// and, if the customer is not actually a member, the booking arrives as a
// REQUEST for the detailer to look at. So the worst a stale or borrowed device
// can do is ask.
//
// Wrapped both ways: `localStorage` throws outright in some embedded and
// privacy contexts, and a booking page that cannot render because a
// convenience threw is a far worse defect than a form nobody pre-filled.
const REMEMBER_KEY = "bk.customer";
function recall(slug) {
  try {
    const raw = JSON.parse(localStorage.getItem(REMEMBER_KEY) || "null");
    return raw && raw.slug === slug ? raw : null;
  } catch { return null; }
}
function remember(slug, form, planId) {
  try {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({
      slug,
      name: form.customerName.trim(),
      email: form.customerEmail.trim(),
      phone: form.customerPhone.trim(),
      planId: planId || null,
    }));
  } catch { /* a device that will not remember is not an error */ }
}

export default function BookingPage() {
  const { slug } = useParams();
  return (
    <BookingBusinessProvider slug={slug}>
      <BookingFlow />
    </BookingBusinessProvider>
  );
}

function BookingFlow() {
  const ctx = useBookingBusiness();
  const { status, business, branding, settings, services, serviceGroups, addOns, plans, brandVars, slug } = ctx;
  const STEPS = useMemo(() => stepsFor(addOns), [addOns]);
  const [params] = useSearchParams();

  // WHO WE ALREADY KNOW, READ ONCE. Lazy state rather than a plain read: the
  // recognition must not change under the customer mid-flow, and this page
  // WRITES that key on submit — reading it every render would rename the
  // heading the instant they book.
  const [known] = useState(() => recall(slug));
  // The plan this booking is against, if any. The URL wins — that is somebody
  // who just pressed a plan button, or came in from their own plan link — and
  // the remembered device is the fallback that needs no typing.
  const planId = params.get("plan") || known?.planId || "";

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    serviceIds: [],
    addOns: [],
    vehicleSize: "",
    vehicleModel: "",
    vehicleCondition: "",
    serviceType: "",
    customerAddress: "",
    travelZone: "",
    // W22 — two answers where there was one, because water and power vary
    // independently. False is a real answer here, not a missing one: the
    // question is only ever drawn where the detailer asks it.
    hasWater: false,
    hasPower: false,
    bookingDate: "",
    startTime: "",
    // Pre-filled from this device's last booking, so a returning customer
    // never retypes their own name. Empty for everybody else, exactly as
    // before.
    customerName: known?.name ?? "",
    customerPhone: known?.phone ?? "",
    customerEmail: known?.email ?? "",
    customerNotes: "",
    promoCode: "",
  });
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [promoState, setPromoState] = useState({ checking: false, error: "", applied: null });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState(null);
  const topRef = useRef(null);

  // Default the service type once settings are known: if only one mode is
  // offered, it is chosen for the customer and that step is skipped.
  useEffect(() => {
    if (status !== "ready" || form.serviceType) return;
    setForm((f) => ({ ...f, serviceType: settings.mobile_enabled ? "mobile" : "dropoff" }));
  }, [status, settings, form.serviceType]);

  // The first travel zone is the default, the same way the first vehicle size
  // is: a detailer’s list is in their own order and the first entry is the
  // ordinary case.
  useEffect(() => {
    if (status !== "ready" || form.travelZone) return;
    const z = settings.travel_zones?.[0]?.key;
    if (z) setForm((f) => ({ ...f, travelZone: z }));
  }, [status, settings, form.travelZone]);

  // W9 — the sizes are the tenant's own list, so the default is THEIR first
  // one. Hardcoding "small" was safe while every business had our three; it is
  // a broken quote the moment a detailer names their base size anything else.
  useEffect(() => {
    if (status !== "ready" || form.vehicleSize) return;
    setForm((f) => ({ ...f, vehicleSize: settings.vehicle_sizes[0]?.key ?? "small" }));
  }, [status, settings, form.vehicleSize]);

  const selectedServices = useMemo(
    () => services.filter((s) => form.serviceIds.includes(s.id)),
    [services, form.serviceIds],
  );
  const selectedAddOns = useMemo(
    () => addOns.filter((a) => form.addOns.includes(a.id)),
    [addOns, form.addOns],
  );

  // --- The server quote. Errors are STATE, not a console line. ------------
  // ROADMAP 2.8c WIDENED THIS KEY, and that is the visible half of the whole
  // pricing change: the total now depends on WHEN the job is (a weekend or
  // evening rate, a short-notice fee), on WHERE it is (the travel area) and on
  // whether anybody travels at all. So the quote re-runs when the customer
  // picks a day, a time, an area or a way of working — not only when they
  // change what they are buying.
  // ROADMAP 2.14 joins the key too, and it is the same argument: a plan
  // changes what the job costs, so the ONE server quote has to be the thing
  // that says so. Nothing on this page computes a plan price.
  const quoteKey = JSON.stringify([
    form.serviceIds, form.addOns, form.vehicleSize, promoState.applied,
    form.serviceType, form.travelZone, form.bookingDate, form.startTime, planId,
  ]);
  const fetchQuote = useCallback(async () => {
    if (form.serviceIds.length === 0) {
      setQuote(null);
      setQuoteError("");
      return;
    }
    setQuoting(true);
    setQuoteError("");
    try {
      const r = await api.calculateBooking(slug, {
        service_ids: form.serviceIds,
        add_ons: form.addOns,
        vehicle_size: form.vehicleSize,
        applied_promo_code: promoState.applied || undefined,
        service_type: form.serviceType || undefined,
        travel_zone: form.travelZone || undefined,
        // Undefined until step 5. A time-based rule that cannot be evaluated
        // does not apply, so the price starts without it and the surcharge
        // appears with the day it depends on.
        booking_date: form.bookingDate || undefined,
        start_time: form.startTime || undefined,
        plan_id: planId || undefined,
      });
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

  // ROADMAP 2.8c — A SERVICE CAN RULE OUT A WAY OF WORKING. A ceramic coating
  // needs a garage and a controlled environment, so it cannot be done in a
  // driveway; the reverse exists too. Until now this was only ever a fact
  // about the business or about a date.
  //
  // Every chosen service has to allow the mode, so this is an AND across the
  // selection, and the service that rules it out is named — "you can't do
  // that" without saying why is the thing that makes a form feel broken.
  const blocksMobile = selectedServices.find((s) => s.allows_mobile === false);
  const blocksDropoff = selectedServices.find((s) => s.allows_dropoff === false);
  const modeLimit = blocksMobile
    ? { only: "dropoff", because: blocksMobile.name }
    : blocksDropoff
      ? { only: "mobile", because: blocksDropoff.name }
      : null;

  // If the selection narrows the mode, the form follows it rather than
  // leaving a choice that is going to be refused at submit.
  useEffect(() => {
    if (!modeLimit || form.serviceType === modeLimit.only) return;
    setForm((f) => ({ ...f, serviceType: modeLimit.only }));
  }, [modeLimit, form.serviceType]);

  // --- Step gating ---------------------------------------------------------
  const bothModes = settings.mobile_enabled && settings.dropoff_enabled && !modeLimit;
  const canAdvance = (() => {
    switch (STEPS[step]) {
      case "Services": return form.serviceIds.length > 0 && !!quote && !quoting;
      case "Vehicle": return !!quote && !quoting;
      case "Location":
        if (form.serviceType === "mobile" && !form.customerAddress.trim()) return false;
        // W22 — where a resource is REQUIRED, the customer cannot walk past
        // the question. This is the courteous half: it stops them filling in
        // four more steps before being told no. The half that holds is in
        // _shared/slotValidation.ts, on the server.
        if (form.serviceType === "mobile") {
          if (settings.water_requirement === "required" && !form.hasWater) return false;
          if (settings.power_requirement === "required" && !form.hasPower) return false;
        }
        return true;
      case "When": return !!form.bookingDate && !!form.startTime;
      case "Details":
        return form.customerName.trim() && form.customerPhone.trim() && form.customerEmail.trim();
      default: return true;
    }
  })();

  // W25 — THE CATEGORY'S RULE, APPLIED. A category with max_select 1 is
  // "pick one from this category": choosing a second one swaps the first out
  // rather than refusing the tap, because a control that does nothing when
  // pressed reads as broken. Written as a cap rather than as a boolean so
  // "up to two" needs no second implementation.
  //
  // THIS IS THE COURTESY COPY OF THE RULE, NOT THE ENFORCEMENT. The real one
  // is in create-booking, for the reason W4 found the hard way in roadmap 2.7:
  // a restriction that only exists in React is a restriction a stale page, a
  // second tab or a crafted request walks straight past.
  const toggleService = (id) => setForm((f) => {
    if (f.serviceIds.includes(id)) return { ...f, serviceIds: f.serviceIds.filter((x) => x !== id) };
    const groupOf = (sid) => services.find((s) => s.id === sid)?.group_id ?? null;
    const catOf = (sid) => { const g = groupOf(sid); return g ? serviceGroups.find((x) => x.id === g) : null; };
    const gid = groupOf(id);
    const cat = catOf(id);

    // ROADMAP 2.8c — A CATEGORY THAT IS THE WHOLE BOOKING. The owner asked for
    // this and a real menu proved it: Oregon Detail Co publishes complete
    // packages AND standalone interior and exterior work as three categories,
    // and with each obeying its own "pick one" a customer could book $1,645 of
    // work the $625 package already contained. A complete package supersedes
    // the parts, and only the CATEGORY knows that.
    //
    // Symmetric, and deliberately so: picking the package clears everything,
    // and picking anything else clears the package. A tap always does what it
    // looks like it does — the alternative is a control that goes dead, which
    // reads as broken and is the same complaint (W25) this whole thread began
    // with.
    if (cat?.is_exclusive) return { ...f, serviceIds: [id] };
    let ids = [...f.serviceIds, id].filter((x) => !catOf(x)?.is_exclusive || x === id);

    const cap = cat?.max_select ?? null;
    if (cap) {
      const siblings = ids.filter((x) => groupOf(x) === gid);
      const over = siblings.length - cap;
      // Oldest out first, so the one just tapped always survives.
      if (over > 0) {
        const drop = new Set(siblings.slice(0, over));
        ids = ids.filter((x) => !drop.has(x));
      }
    }
    return { ...f, serviceIds: ids };
  });

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
      const r = await api.createBooking(slug, {
        customer_name: form.customerName.trim(),
        customer_phone: form.customerPhone.trim(),
        customer_email: form.customerEmail.trim(),
        customer_address: form.customerAddress.trim() || null,
        service_type: form.serviceType,
        travel_zone: form.travelZone || null,
        vehicle_size: form.vehicleSize,
        vehicle_model: form.vehicleModel.trim() || null,
        vehicle_condition: form.vehicleCondition || null,
        service_ids: form.serviceIds,
        add_ons: form.addOns,
        booking_date: form.bookingDate,
        start_time: form.startTime,
        // Both new columns and the old one. The old pair is what every
        // already-deployed function still reads; the migration is append-only
        // and this is the pass that writes alongside it, not the one that
        // retires it.
        has_water: form.hasWater,
        has_power: form.hasPower,
        has_water_electric: form.hasWater && form.hasPower,
        customer_notes: form.customerNotes.trim() || null,
        applied_promo_code: promoState.applied || null,
        // An id. The name, the kind and the amount all come off the plan row
        // on the server — this page never names its own discount.
        plan_id: planId || null,
      });
      // Remembered only once the booking actually landed: a device that
      // remembers an abandoned form is remembering somebody who left.
      // `quote.plan_id` rather than `planId` on purpose — it is the id the
      // SERVER resolved, so a retired plan is not carried forward.
      remember(slug, form, quote?.plan_id);
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
  const recognition = attachedPlan
    ? { kind: "plan", text: attachedPlan.name }
    : known?.name
      ? { kind: "name", text: known.name.trim().split(" ")[0] }
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
