// ROADMAP 2.14 STEP 3 — THE PLANS A DETAILER SELLS, ON A PAGE OF THEIR OWN.
// `/book/:slug/plans`.
//
// WHY IT IS A PAGE AND NOT A STEP, and it is the most-evidenced decision in
// this item: 7 of 7 real detailers in the research sample publish plans on
// their own page (`/membership`, `/maintenance-plan`), 5 of 6 booking products
// keep a plan beside the flow, and 0 of 6 sell one inside a booking form. The
// owner arrived at the same shape from his own business — *"it should just be
// one button where it's the monthly thing"* — and the second, harder reason is
// arithmetic: step 1 has TEN PIXELS of spare room at 1440x900 and that budget
// belongs to the detailer's catalogue, not to us.
//
// WHAT THE BUTTON DOES: starts the ordinary booking flow with the plan
// attached (`/book/:slug?plan=<id>`), which ends as a REQUEST the detailer
// accepts — the rail roadmap 2.12 already built, and the software version of
// the phone call five of the seven sampled businesses make. **The price is
// never computed here.** The plan's effect on the quote runs through
// `_shared/pricing.ts` and nowhere else; a plan price drawn on a page and not
// charged by `computeQuote` is the travel-fee defect for the third time.
//
// THE EMAIL BOX IS THE SAFE HALF OF THE OWNER'S OWN IDEA. He asked for a
// lookup that shows a customer their plan when they type their address; that
// is address enumeration — anyone could type a neighbour's. This takes the
// address and EMAILS the link, and says the same sentence either way.

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api.js";
import { money } from "../lib/format.js";
import { cadenceWords, priceWords, termWords, visitWords } from "../lib/plans.js";
import { BookingBusinessProvider, useBookingBusiness } from "./BookingBusinessContext.jsx";
import "./booking.css";

export default function PlansPage() {
  const { slug } = useParams();
  return (
    <BookingBusinessProvider slug={slug}>
      <PlansInner />
    </BookingBusinessProvider>
  );
}

function PlansInner() {
  const { status, business, branding, brandVars, plans, slug } = useBookingBusiness();
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState({ sending: false, sent: false });

  const sendLink = async () => {
    setLookup({ sending: true, sent: false });
    // The answer is deliberately not conditional on anything the server
    // found — see the endpoint's header. A failure is swallowed for the same
    // reason: "we couldn't find that" and "we couldn't send" are two different
    // sentences, and only one of them is safe to say.
    try { await api.emailPlanLink(slug, email.trim()); } catch { /* same answer either way */ }
    setLookup({ sending: false, sent: true });
  };

  if (status === "loading") {
    return <div className="bk" style={brandVars}><div className="bk-center"><div className="bk-spinner" /></div></div>;
  }
  if (status !== "ready") {
    return (
      <div className="bk" style={brandVars}>
        <div className="bk-center">
          <h1>Page not found</h1>
          <p className="bk-muted">This link doesn’t match a business.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bk" style={brandVars}>
      <header className="bk-header">
        <div className="inner">
          {branding?.logo_url && <img src={branding.logo_url} alt="" />}
          <div>
            <h1>{business.name}</h1>
            <div className="tagline">Plans</div>
          </div>
        </div>
      </header>

      <div className="bk-wrap">
        <div className="bk-step-head">
          <h2>{plans.length ? "Regulars get looked after" : "No plans just now"}</h2>
        </div>

        {plans.length === 0 ? (
          <div className="bk-note">
            {business.name} isn’t running any plans at the moment.
            {business.phone ? ` Call ${business.phone} if you’d like a regular slot.` : ""}
          </div>
        ) : (
          // A COLLECTION OF RECORDS IS A RULED LIST, NEVER A STACK OF CARDS —
          // the design system's own composition law, and this page is the
          // cleanest case of it in the product. It was built as four boxed
          // cards first, each with its own full-width button, and the
          // screenshot was the argument: four identical full-width panels down
          // a page with nothing dominant is the exact tell
          // `docs/design-knowledge.md` §1 names, and every button repeated the
          // name written 40px above it, which is the owner's own copy rule.
          // The rows also cost 96px each against 190px, which took the page
          // from 311px past the bottom at 1440x900 to fitting.
          //
          // ONE BUTTON PER PLAN IS STILL WHAT HE ASKED FOR: the row IS the
          // button. Nothing else on it is pressable, so there is no
          // interactive element nested inside an interactive one.
          <div className="bk-plans">
            {plans.map((p) => (
              <Link key={p.id} className="bk-plan-row" to={`/book/${slug}?plan=${p.id}`}>
                <div>
                  <div className="bk-plan-head">
                    <h3>{p.name}</h3>
                    {/* The figure is the thing plans are compared on, so it
                        rides the name's own line and lines up down the right
                        edge — the same move the service card makes. */}
                    <span className="bk-plan-price">{priceWords(p.price_kind, p.price_amount, money)}</span>
                  </div>
                  <div className="bk-muted bk-plan-meta">
                    {cadenceWords(p)}
                    {p.cadence_unit ? ` · ${visitWords(p)} each time` : ""}
                    {termWords(p) ? ` · ${termWords(p)}` : ""}
                  </div>
                  {p.description && <p className="bk-muted">{p.description}</p>}
                </div>
                <ChevronRight className="bk-plan-go" size={20} strokeWidth={2} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}

        {/* EMAIL IN, LINK OUT. Nothing about the address is reflected back,
            and the sentence below is the same one whether or not it belongs to
            a member. */}
        <div>
          <div className="bk-step-label" style={{ marginBottom: 8 }}>Already on a plan?</div>
          {lookup.sent ? (
            <p className="bk-muted">
              If that address is on a plan with us, your link is on its way. Check your inbox.
            </p>
          ) : (
            <>
              <div className="bk-row" style={{ gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  className="bk-btn inline"
                  onClick={sendLink}
                  disabled={lookup.sending || !email.trim().includes("@")}
                >
                  {lookup.sending ? "Sending" : "Send it"}
                </button>
              </div>
              <p className="bk-muted" style={{ marginTop: 8 }}>
                We’ll email your plan link rather than showing it here.
              </p>
            </>
          )}
        </div>

        <div>
          <Link className="bk-btn ghost inline" to={`/book/${slug}`}>
            <ArrowLeft size={20} strokeWidth={2} /> Book a one-off instead
          </Link>
        </div>
      </div>
    </div>
  );
}
