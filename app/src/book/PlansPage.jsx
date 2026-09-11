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
import { cadenceWords, priceParts, termWords, visitWords } from "../lib/plans.js";
import { t } from "../lib/i18n.js";
import { useLocale } from "../hooks/useLocale.js";
import LanguagePicker from "./LanguagePicker.jsx";
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
  // ROADMAP 8.17 STAGE 1B. The picker is HERE NOW, and until this stage it was
  // deliberately absent: a control that promises a language the page cannot
  // speak is worse than no control. `tests/spanish.test.mjs` § 4b used to fail
  // if one appeared and now fails if this page carries hard-coded English
  // instead — the promise and the delivery moved together.
  const lang = useLocale();
  const { status, business, branding, brandVars, plans, slug } = useBookingBusiness();
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState({ sending: false, sent: false });

  const sendLink = async () => {
    setLookup({ sending: true, sent: false });
    // The answer is deliberately not conditional on anything the server
    // found — see the endpoint's header. A failure is swallowed for the same
    // reason: "we couldn't find that" and "we couldn't send" are two different
    // sentences, and only one of them is safe to say.
    try {
      await api.emailPlanLink(slug, email.trim(), lang);
    } catch { /* same answer either way */ }
    setLookup({ sending: false, sent: true });
  };

  if (status === "loading") {
    return <div className="bk" style={brandVars}><div className="bk-center"><div className="bk-spinner" /></div></div>;
  }
  if (status !== "ready") {
    return (
      <div className="bk" style={brandVars}>
        <div className="bk-center">
          <h1>{t("Page not found")}</h1>
          <p className="bk-muted">{t("This link doesn’t match a business.")}</p>
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
            <div className="tagline">{t("Plans")}</div>
          </div>
          <LanguagePicker />
        </div>
      </header>

      <div className="bk-wrap">
        <div className="bk-step-head">
          <h2>{plans.length ? t("Regulars get looked after") : t("No plans just now")}</h2>
        </div>

        {plans.length === 0 ? (
          <div className="bk-note">
            {t("{name} isn’t running any plans at the moment.", { name: business.name })}
            {business.phone ? ` ${t("Call {phone} if you’d like a regular slot.", { phone: business.phone })}` : ""}
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
          // ── REBUILT 2026-09-11, AND NOT BACK INTO CARDS ──────────────
          // His review: *"it just feels like a ton of text kind of thrown up
          // on the screen."* He is describing three lines per plan at the same
          // weight, four times, with nothing but a hairline between them — and
          // he is right.
          //
          // **THE ROW STAYS.** Everything the comment above says is still
          // true: four full-width panels with nothing dominant is the tell
          // `design-knowledge.md` §1 names, a button under each one repeats the
          // name written 40px above it, and cards cost 190px against 96px,
          // which put this page 311px past the bottom of a 1440x900 screen.
          // Rebuilding that would be undoing a decision for a reason that is
          // not the reason it was made.
          //
          // **WHAT WAS ACTUALLY WRONG IS THAT NOTHING ON THE ROW HAD ANY
          // WEIGHT**, so here is where the weight went:
          //   THE PRICE IS THE BIGGEST THING ON THE ROW, in the figure face.
          //     It is what a person picks on, and it was the same size as
          //     everything around it.
          //   THE CADENCE BECAME CHIPS. "Every 2 weeks · 1 visit each time ·
          //     1-year term" was one grey sentence of run-on facts; three
          //     small bordered tokens are read at a glance instead of parsed.
          //     This is the single biggest part of "a ton of text".
          //   THE ROW HAS A GROUND. A hairline says "next item"; a surface
          //     says "another one of these" — an object you choose between,
          //     which is what these are.
          //   AND TWO ACROSS AT A DESK. There was 60% of a 1440 screen empty
          //     beside a narrow column, and using it makes the page SHORTER,
          //     which is the old height objection answered rather than
          //     ignored.
          <div className="bk-plans">
            {plans.map((p) => (
              <Link key={p.id} className="bk-plan-row" to={`/book/${slug}?plan=${p.id}`}>
                <div className="bk-plan-body">
                  <h3>{p.name}</h3>
                  {/* EVERY FACT ITS OWN TOKEN. `.filter(Boolean)` because a
                      plan with no cadence and no term is a bare discount, and
                      an empty chip row is worse than none. */}
                  <div className="bk-plan-chips">
                    {[
                      cadenceWords(p, lang),
                      p.cadence_unit ? t("{visits} each time", { visits: visitWords(p, lang) }) : null,
                      termWords(p, lang),
                    ].filter(Boolean).map((chip) => (
                      <span className="bk-plan-chip" key={chip}>{chip}</span>
                    ))}
                  </div>
                  {p.description && <p className="bk-muted">{p.description}</p>}
                </div>
                {/* **THE PRICE AND THE ACTION SHARE A LINE**, and that is
                    height as much as meaning: on its own row the price cost
                    every plan about 30px, which took a phone from 1,041px to
                    1,339px — a page that had fitted, scrolling by 59% of the
                    screen. Measured, then fixed. It also reads better: the
                    number you are deciding on sits beside the thing that acts
                    on it. */}
                <span className="bk-plan-foot">
                  <span className="bk-plan-price">
                    {/* THE NUMBER IS THE FIGURE AND THE UNIT IS NOT. At title
                        size "$120.00 a month" wrapped onto two lines and read
                        as a broken card; the unit belongs underneath it, small,
                        the way every price in this product is drawn. */}
                    <span className="amt">{priceParts(p.price_kind, p.price_amount, money, lang).big}</span>
                    <span className="per">{priceParts(p.price_kind, p.price_amount, money, lang).small}</span>
                  </span>
                  <span className="bk-plan-pick">
                    <span className="label-text">{t("Choose this")}</span>
                    <ChevronRight className="bk-plan-go" size={17} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* EMAIL IN, LINK OUT. Nothing about the address is reflected back,
            and the sentence below is the same one whether or not it belongs to
            a member. */}
        <div>
          <div className="bk-step-label" style={{ marginBottom: 8 }}>{t("Already on a plan?")}</div>
          {lookup.sent ? (
            <p className="bk-muted">
              {t("If that address is on a plan with us, your link is on its way. Check your inbox.")}
            </p>
          ) : (
            <>
              <div className="bk-row" style={{ gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  placeholder={t("you@example.com")}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  className="bk-btn inline"
                  onClick={sendLink}
                  disabled={lookup.sending || !email.trim().includes("@")}
                >
                  {lookup.sending ? t("Sending") : t("Send it")}
                </button>
              </div>
              <p className="bk-muted" style={{ marginTop: 8 }}>
                {t("We’ll email your plan link rather than showing it here.")}
              </p>
            </>
          )}
        </div>

        <div>
          <Link className="bk-btn ghost inline" to={`/book/${slug}`}>
            <ArrowLeft size={20} strokeWidth={2} /> {t("Book a one-off instead")}
          </Link>
        </div>
      </div>
    </div>
  );
}
