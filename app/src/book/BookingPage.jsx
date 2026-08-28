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
import { money } from "../lib/format.js";
import { BookingBusinessProvider, useBookingBusiness } from "./BookingBusinessContext.jsx";
import StepServices from "./steps/StepServices.jsx";
import StepVehicle from "./steps/StepVehicle.jsx";
import StepLocation from "./steps/StepLocation.jsx";
import StepWhen from "./steps/StepWhen.jsx";
import StepDetails from "./steps/StepDetails.jsx";
import StepReview from "./steps/StepReview.jsx";
import BookingConfirmed from "./BookingConfirmed.jsx";
import "./booking.css";

const STEPS = ["Services", "Vehicle", "Location", "When", "Details", "Review"];

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
        <div className="bk-step-head">
          <div className="bk-rail" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s} className={i < step ? "done" : i === step ? "current" : ""} />
            ))}
          </div>
          <div className="bk-step-label">Step {step + 1} of {STEPS.length}</div>
          <h2>{headingFor(stepName, bothModes, settings)}</h2>
        </div>

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

        {/* A failed price calculation is visible and recoverable — never a
            silent state that explodes at submit. */}
        {quoteError && (
          <div className="bk-error">
            {quoteError}{" "}
            <button className="bk-btn ghost inline" style={{ minHeight: 32, textDecoration: "underline" }}
              onClick={fetchQuote}>
              Try again
            </button>
          </div>
        )}
        {submitError && <div className="bk-error">{submitError}</div>}

        {step > 0 && (
          <button className="bk-btn ghost" style={{ marginTop: 14 }} onClick={() => go(-1)}>
            <ArrowLeft size={18} strokeWidth={2} /> Back
          </button>
        )}
      </div>

      <div className="bk-bar">
        <div className="inner">
          <div className="total">
            {quote ? (
              <>
                <div className="bk-muted" style={{ fontSize: "0.75rem" }}>Estimated total</div>
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
    case "Vehicle": return "Tell us about the vehicle";
    case "Location": return bothModes ? "Where should we do it?" : settings.mobile_enabled ? "Where are you?" : "Drop-off details";
    case "When": return "Pick a time";
    case "Details": return "How do we reach you?";
    default: return "Check everything over";
  }
}
