// ROADMAP 2.14 STEP 3 — "YOUR PLAN". `/plan/:memberId`.
//
// THIS PAGE IS THE ANSWER TO THE OWNER'S CUSTOMER-ACCOUNT IDEA. He asked
// whether plan customers should sign in with Google or a password, see their
// plan and cancel it. The verdict (round 3 of the plans research) was "good
// idea, one step early": everything he wanted is a property of KNOWING WHO
// SOMEBODY IS, and a link already does that here twice — `/booking/:id`, where
// the booking UUID is the credential, and 2.12's quote acceptance. So this is
// the same page an account would have shown, without a second kind of human in
// `auth.users`, without passwords to reset, and without "log in or continue as
// guest" costing bookings on step 1.
//
// **The account is this page with a door on it later**, and putting a login in
// front of a page that exists is a much smaller job than inventing both.
//
// THE ARITHMETIC IS `lib/plans.js` AND NOT THIS FILE. `plan-link` returns the
// two halves of the ledger raw — grants from `plan_visits`, uses counted off
// `bookings.plan_member_id` — because the owed figure is the one number this
// whole feature exists to print, and a number a screen computes inline is a
// number nothing can ever check. `tests/plans.test.mjs` holds it.

import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarClock, X } from "lucide-react";
import { api } from "../lib/api.js";
import { dateLong, money } from "../lib/format.js";
import { STATUS_WORDS, cadenceWords, ledgerFor, priceWords, termWords, visitWords } from "../lib/plans.js";
import { BookingBusinessProvider, useBookingBusiness } from "./BookingBusinessContext.jsx";
import "./booking.css";

export default function PlanMemberPage() {
  const { memberId } = useParams();
  const [state, setState] = useState({ status: "loading", data: null });

  const load = useCallback(async () => {
    try {
      const r = await api.planMember(memberId);
      if (!r?.member) throw new Error("not_found");
      setState({ status: "ready", data: r });
    } catch {
      setState({ status: "not_found", data: null });
    }
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  if (state.status === "loading") {
    return <div className="bk"><div className="bk-center"><div className="bk-spinner" /></div></div>;
  }
  if (state.status === "not_found") {
    return (
      <div className="bk">
        <div className="bk-center">
          <h1>Plan not found</h1>
          <p className="bk-muted">This link may be out of date. Ask your detailer to send it again.</p>
        </div>
      </div>
    );
  }

  // Branding comes from the same public profile the booking page uses, so this
  // page carries the detailer's colour rather than the platform's.
  return (
    <BookingBusinessProvider slug={state.data.business.slug}>
      <PlanInner data={state.data} onChanged={load} />
    </BookingBusinessProvider>
  );
}

function PlanInner({ data, onChanged }) {
  const { status: brandStatus, business, branding, brandVars, slug } = useBookingBusiness();
  const { member, plan, visits, used: usedBookings, customer_name: customerName } = data;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Ending a plan cannot be undone from here, so it asks first — inline and
  // naming the plan, which a native confirm() cannot do. Same pattern as the
  // manage page's cancel.
  const [confirmEnd, setConfirmEnd] = useState(false);

  // ONE IMPLEMENTATION OF THE LEDGER, and it is the one `tests/plans.test.mjs`
  // holds. The endpoint hands back the two raw halves — grants from
  // `plan_visits`, uses from the member's own bookings — precisely so this
  // page can call the tested function rather than add the numbers up itself.
  // `nextDue` is null for a paused or ended member, which is the point of
  // pausing, and for a plan with no rhythm at all.
  const { owed, used, nextDue } = ledgerFor(member, plan, visits, usedBookings);
  const ended = member.status === "ended";

  const endPlan = async () => {
    setBusy(true);
    setError("");
    try {
      await api.cancelPlanMember(member.id);
      await onChanged();
    } catch (e) {
      setError(e.message || "We couldn’t end that just now.");
    }
    setBusy(false);
    setConfirmEnd(false);
  };

  // THE PROVIDER IS A SECOND ROUND TRIP AND IT HAS NOT LANDED YET. This page
  // has its own data before the branding arrives — `plan-link` answered, then
  // the public profile is fetched from the slug it returned — so `business` is
  // null on the first render and reading a name off it takes the whole page to
  // the error boundary. Found by looking, not by reasoning: the sweep timed
  // out waiting for a card that was never going to appear.
  if (brandStatus !== "ready" || !business) {
    return <div className="bk"><div className="bk-center"><div className="bk-spinner" /></div></div>;
  }

  return (
    <div className="bk" style={brandVars}>
      <header className="bk-header">
        <div className="inner">
          {branding?.logo_url && <img src={branding.logo_url} alt="" />}
          <div>
            <h1>{business.name}</h1>
            <div className="tagline">Your plan</div>
          </div>
        </div>
      </header>

      <div className="bk-wrap">
        {/* THE ONE LIT OBJECT: the plan itself. Everything under it is paper —
            the same composition the review step uses for the appointment. */}
        <div className={`bk-card${ended ? "" : " selected"}`}>
          <div className="bk-step-label">{ended ? "Ended" : STATUS_WORDS[member.status]}</div>
          <h3 style={{ marginTop: 4 }}>{plan.name}</h3>
          <p className="bk-muted" style={{ marginTop: 4 }}>
            {cadenceWords(plan)}
            {plan.cadence_unit ? ` · ${visitWords(plan)} each time` : ""}
            {termWords(plan) ? ` · ${termWords(plan)}` : ""}
          </p>
          {plan.description && <p className="bk-muted" style={{ marginTop: 10 }}>{plan.description}</p>}
        </div>

        {/* OWED IS THE NUMBER THIS PAGE EXISTS FOR. The research found it is
            the most valuable thing on Housecall Pro's plans dashboard, for the
            reason the whole research opened with: the sale and the schedule
            are two separate acts, so somebody has to say what is outstanding.
            Here it is the customer's copy of that. */}
        {!ended && owed > 0 && (
          <div>
            <div className="bk-step-label" style={{ marginBottom: 6 }}>Visits waiting for you</div>
            <div className="bk-owed">{owed}</div>
            <p className="bk-muted" style={{ marginTop: 8 }}>
              Book whenever suits — these don’t expire while your plan is running.
            </p>
          </div>
        )}

        <div className="bk-receipt bk-facts">
          <div className="line">
            <span>{ended ? "You paid" : "You pay"}</span>
            <span className="bk-price">{priceWords(member.price_kind, member.price_amount, money)}</span>
          </div>
          <div className="line">
            <span>Member since</span>
            <span>{dateLong(member.started_on)}</span>
          </div>
          {nextDue && (
            <div className="line">
              <span>Next visit due</span>
              <span>{dateLong(nextDue)}</span>
            </div>
          )}
          {ended && member.ended_on && (
            <div className="line">
              <span>Ended</span>
              <span>{dateLong(member.ended_on)}</span>
            </div>
          )}
          <div className="line">
            <span>Visits used</span>
            <span>{used}</span>
          </div>
        </div>

        {error && <div className="bk-error">{error}</div>}

        {ended ? (
          <div className="bk-note">
            This plan has ended{customerName ? `, ${customerName.split(" ")[0]}` : ""}. You can still book any time,
            and {business.name} can put you back on a plan whenever you like.
          </div>
        ) : (
          <div className="bk-actions">
            {/* The button carries the plan, so the price the customer is shown
                is the plan's — computed by the same engine that will charge
                it, never by this page. */}
            <a className="bk-btn primary" href={`/book/${slug}?plan=${plan.id}`}>
              <CalendarClock size={20} strokeWidth={2} /> Book my next visit
            </a>
            <div className="bk-exits">
              {confirmEnd ? (
                <>
                  <button className="bk-btn danger" disabled={busy} onClick={endPlan}>
                    {busy ? "Ending…" : `Yes, end ${plan.name}`}
                  </button>
                  <button className="bk-btn ghost" disabled={busy} onClick={() => setConfirmEnd(false)}>
                    Keep it
                  </button>
                </>
              ) : (
                <>
                  <button className="bk-btn danger bare" onClick={() => setConfirmEnd(true)}>
                    <X size={20} strokeWidth={2} /> End this plan
                  </button>
                  {business.phone && (
                    <a className="bk-btn ghost" href={`tel:${business.phone}`}>{business.phone}</a>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
