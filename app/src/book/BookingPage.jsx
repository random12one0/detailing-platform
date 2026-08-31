// Public booking page — /book/:slug. One page, every business, driven
// entirely by that business's configuration.
//
// The six steps live in ./steps; this file owns the flow, the server quote,
// and submission.
//
// THE OLD CRASH: the previous widget called calculate-booking, swallowed any
// failure with a console.error, and left its price state stale or null. The
// customer could walk to the final step and submit, which then threw. Here
// the quote is state with an explicit error, every step that depends on it
// is gated on `quote` existing, and a failed calculation surfaces with a
// retry instead of being silently ignored.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
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
  const { status, business, branding, settings, services, addOns, brandVars, slug } = ctx;
  const STEPS = useMemo(() => stepsFor(addOns), [addOns]);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    serviceIds: [],
    addOns: [],
    vehicleSize: "small",
    vehicleModel: "",
    serviceType: "",
    customerAddress: "",
    hasWaterElectric: false,
    bookingDate: "",
    startTime: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
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

  const selectedServices = useMemo(
    () => services.filter((s) => form.serviceIds.includes(s.id)),
    [services, form.serviceIds],
  );
  const selectedAddOns = useMemo(
    () => addOns.filter((a) => form.addOns.includes(a.id)),
    [addOns, form.addOns],
  );

  // --- The server quote. Errors are STATE, not a console line. ------------
  const quoteKey = JSON.stringify([form.serviceIds, form.addOns, form.vehicleSize, promoState.applied]);
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

  // --- Step gating ---------------------------------------------------------
  const bothModes = settings.mobile_enabled && settings.dropoff_enabled;
  const canAdvance = (() => {
    switch (STEPS[step]) {
      case "Services": return form.serviceIds.length > 0 && !!quote && !quoting;
      case "Vehicle": return !!quote && !quoting;
      case "Location":
        if (form.serviceType === "mobile" && !form.customerAddress.trim()) return false;
        return true;
      case "When": return !!form.bookingDate && !!form.startTime;
      case "Details":
        return form.customerName.trim() && form.customerPhone.trim() && form.customerEmail.trim();
      default: return true;
    }
  })();

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
        vehicle_size: form.vehicleSize,
        vehicle_model: form.vehicleModel.trim() || null,
        service_ids: form.serviceIds,
        add_ons: form.addOns,
        booking_date: form.bookingDate,
        start_time: form.startTime,
        has_water_electric: form.hasWaterElectric,
        customer_notes: form.customerNotes.trim() || null,
        applied_promo_code: promoState.applied || null,
      });
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

  return (
    <div className="bk" style={brandVars}>
      <header className="bk-header" ref={topRef}>
        <div className="inner">
          {branding?.logo_url && <img src={branding.logo_url} alt="" />}
          <div>
            <h1>{business.name}</h1>
            {branding?.tagline && <div className="tagline">{branding.tagline}</div>}
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
          </div>
          <h2>{headingFor(stepName, bothModes, settings)}</h2>
        </div>

        {/* Keyed on the step so React hands back a fresh element and the
            staggered rise in booking.css re-runs — the whole of the step
            motion, with no observer and nothing to fail. The wrapper is
            display:contents, so it changes the motion and nothing about the
            layout: its children stay direct flex items of .bk-wrap. */}
        <div className="bk-step" key={`step-${step}`}>
        {stepName === "Services" && (
          <StepServices
            selected={form.serviceIds}
            onToggle={(id) => setForm((f) => ({
              ...f,
              serviceIds: f.serviceIds.includes(id)
                ? f.serviceIds.filter((x) => x !== id)
                : [...f.serviceIds, id],
            }))}
          />
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
        {stepName === "Location" && <StepLocation form={form} setForm={setForm} />}
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
                <div className="bk-muted">
                  Estimated total{quote.total_duration ? ` · ${duration(quote.total_duration)}` : ""}
                </div>
                <strong>{money(quote.total)}</strong>
              </>
            ) : (
              <span className="bk-muted">{quoting ? "Working out your price…" : "Choose a service to start"}</span>
            )}
          </div>
          {isLast ? (
            <button className="bk-btn primary" disabled={submitting || !quote} onClick={submit}>
              {submitting ? "Booking…" : "Confirm booking"}
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

function headingFor(stepName, bothModes, settings) {
  switch (stepName) {
    case "Services": return "What can we do for you?";
    case "Extras": return "Anything to add?";
    case "Vehicle": return "Tell us about the vehicle";
    case "Location": return bothModes ? "Where should we do it?" : settings.mobile_enabled ? "Where are you?" : "Drop-off details";
    case "When": return "Pick a time";
    case "Details": return "How do we reach you?";
    default: return "Check everything over";
  }
}
