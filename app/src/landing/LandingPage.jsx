// detailingplatform.com — the showroom.
//
// The audience is a detailer with a bad website or none. The pitch is the
// concrete thing they get — a professional website with booking built in —
// in their own register (see docs/design-system.md, "Copy rules"). No
// "streamline your workflow". Dark only: the inspection bay at night, and
// the one surface allowed the full glow.
//
// The hero's demo card is the product doing its own selling: the same lit
// job card the dashboard uses, shown as a booking arriving on its own.

import { useEffect, useState } from "react";
import { CalendarCheck2, Smartphone, Wallet } from "lucide-react";
import { api } from "../lib/api.js";
import { PRICING } from "./pricing.js";
import {
  CountUp, useIntro, useParallax, usePointerGlow, useReveal, useScrollProgress,
  useTilt,
} from "./motion.jsx";
import "./landing.css";

export default function LandingPage() {
  // The opening sequence waits on the display face so the headline never
  // swaps typeface mid-animation (see motion.jsx).
  const ready = useIntro();
  useScrollProgress();

  // The founding offer is counted in the database, not declared here. Until
  // it answers — and if it ever fails — the page shows standard pricing.
  // Failing CLOSED matters: advertising a spot that is already taken is a
  // promise we cannot keep, and "we couldn't reach the server" is not a
  // reason to make one.
  const [offer, setOffer] = useState(null);
  useEffect(() => {
    let live = true;
    api.foundingOffer()
      .then((o) => { if (live) setOffer(o); })
      .catch(() => { if (live) setOffer({ total: 0, left: 0 }); });
    return () => { live = false; };
  }, []);
  const founding = offer && offer.left > 0;

  const demo = useTilt();
  const demoDepth = useParallax(16);
  const getLede = useReveal();
  const howLede = useReveal();
  const priceLede = useReveal();
  const foot = useReveal();
  const heroCta = usePointerGlow();
  const priceCta = usePointerGlow();
  const specs = useReveal();
  const rail = useReveal();
  const plans = useReveal();
  const terms = useReveal();
  const getHead = useReveal();
  const howHead = useReveal();
  const priceHead = useReveal();

  return (
    <div className={`ld${ready ? " ready" : ""}`}>
      <div className="ld-progress" aria-hidden="true" />
      <div className="wrap">
        <nav className="ld-nav" aria-label="Main">
          <a className="ld-mark" href="/">DETAILING PLATFORM</a>
          <div className="links">
            <a href="/app">Sign in</a>
            <a className="ld-cta quiet" href="/app">Get started</a>
          </div>
        </nav>

        <header className="ld-hero">
          <div>
            <span className="lab">For detailers</span>
            <h1 className="disp" style={{ marginTop: 14 }}>
              {/* data-text carries the clipped specular layer; the real
                  headline underneath is always present and readable. */}
              <span className="ld-sweep" data-text="Put your work in the light.">
                Put your work in the&nbsp;light.
              </span>
            </h1>
            <p className="sub">
              A real website with booking built in. Your services, your prices,
              your hours, your rules — customers pick an open slot and book
              themselves while you're still buffing the last car.
            </p>
            <div className="ctas">
              <a className="ld-cta big" href="/app?plan=website" ref={heroCta}>
                See it with your name on it
              </a>
              <span className="fine">
                From ${PRICING.bookingOnly.monthly}/month. No commission, ever.
              </span>
            </div>
          </div>

          <div className="ld-demo" aria-hidden="true" ref={demoDepth}>
            <div className="ld-card" ref={demo}>
              <span className="ld-shine" />
              <span className="ld-pass" />
              <span className="lab" style={{ color: "var(--ac)" }}>New booking · just now</span>
              <div className="ld-row" style={{ marginTop: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 17 }}>Saturday, 9:00 AM — Full Detail</div>
                  <div style={{ color: "var(--i2)", fontSize: 13, marginTop: 3 }}>
                    Marcus Webb · booked himself at 9:41 last night
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 24 }}>
                  <CountUp value={240} prefix="$" />
                </div>
              </div>
            </div>
            <div className="ld-plain" style={{ marginTop: 12 }}>
              <div className="ld-row">
                <span style={{ color: "var(--i2)", fontSize: 14 }}>Sunday, 10:30 AM — Interior Reset</span>
                <span className="mono" style={{ fontSize: 15 }}>$120</span>
              </div>
            </div>
            <div className="ld-plain" style={{ marginTop: 10 }}>
              <div className="ld-row">
                <span style={{ color: "var(--i2)", fontSize: 14 }}>Monday, 8:00 AM — Express Wash</span>
                <span className="mono" style={{ fontSize: 15 }}>$65</span>
              </div>
            </div>
          </div>
        </header>

        <section aria-labelledby="get">
          <h2 className="disp" id="get" data-reveal="mask" ref={getHead}>
            <span className="ld-line"><span>What you get</span></span>
          </h2>
          <p className="lede" data-reveal ref={getLede}>
            Not a page builder. Not a directory listing. The whole front door of
            your business, run from your phone.
          </p>
          {/* A ruled spec sheet, not a card grid: boxes on this page are
              reserved for the product's own artifacts (the demo cards). */}
          <dl className="ld-specs" ref={specs}>
            <div className="row" data-reveal style={{ "--i": 0 }}>
              <dt>
                <CalendarCheck2 size={18} strokeWidth={2} aria-hidden="true" />
                <span className="lab">Booking</span>
                <h3 className="disp">Guards your day</h3>
              </dt>
              <dd>
                Your hours, your travel buffer, your notice period. Double
                bookings are impossible — the calendar refuses them, not you at
                9 PM by text.
              </dd>
            </div>
            <div className="row" data-reveal style={{ "--i": 1 }}>
              <dt>
                <Smartphone size={18} strokeWidth={2} aria-hidden="true" />
                <span className="lab">On the job</span>
                <h3 className="disp">Runs from the driveway</h3>
              </dt>
              <dd>
                Today's jobs with Navigate, Call and Text on every card. Mark a
                job done and record the money with wet hands, one thumb.
              </dd>
            </div>
            <div className="row" data-reveal style={{ "--i": 2 }}>
              <dt>
                <Wallet size={18} strokeWidth={2} aria-hidden="true" />
                <span className="lab">The books</span>
                <h3 className="disp">Your money, plainly</h3>
              </dt>
              <dd>
                What you collected, what you spent, what's still owed — and how
                much you sold standing in the driveway versus up front.
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="how">
          <h2 className="disp" id="how" data-reveal="mask" ref={howHead}>
            <span className="ld-line"><span>Live before your next job</span></span>
          </h2>
          <p className="lede" data-reveal ref={howLede}>No setup wizard, no migration, no designer.</p>
          {/* The same progress rail a customer sees while booking — the
              product's own motif doing the explaining. No boxes. */}
          <ol className="ld-rail3" ref={rail}>
            <li style={{ "--i": 0 }}>
              <span className="n">01</span>
              <h3>Name, hours, one service</h3>
              <p>That's enough to be bookable. Add the rest whenever.</p>
            </li>
            <li style={{ "--i": 1 }}>
              <span className="n">02</span>
              <h3>Send one link</h3>
              <p>
                Your page lives at your own address. Put it in your bio, on your
                cards, on the van.
              </p>
            </li>
            <li style={{ "--i": 2 }}>
              <span className="n">03</span>
              <h3>Watch bookings arrive</h3>
              <p>
                Confirmations, reminders and receipts go out on their own.
                Customers reschedule themselves — your phone stays in your
                pocket.
              </p>
            </li>
          </ol>
        </section>

        <section aria-labelledby="price">
          <h2 className="disp" id="price" data-reveal="mask" ref={priceHead}>
            <span className="ld-line"><span>Pricing</span></span>
          </h2>
          <p className="lede" data-reveal ref={priceLede}>Two ways in. Both run the same booking engine.</p>

          <div className="ld-plans" ref={plans}>
            {/* The website plan is the section's one lit object: the bar,
                the wash and the bloom mark it the way the dashboard marks
                the next job. The other plan is a real choice, not a foil,
                so it stays a proper card — just an unlit one. */}
            <article
              className={`ld-plan featured${founding ? " has-offer" : ""}`}
              data-reveal="soft"
              style={{ "--i": 0 }}
            >
              {founding && (
                <span className="flag">
                  Founding price · {offer.left} of {offer.total} left
                </span>
              )}
              <span className="lab">Website + booking</span>

              <div className="amount">
                {/* $900 is the real, current list price — struck only while
                    a genuine founding discount is live, never as an anchor
                    invented to make a number look smaller. */}
                {founding && <s className="was">${PRICING.website.setup}</s>}
                <CountUp
                  value={founding ? PRICING.founding.setup : PRICING.website.setup}
                  prefix="$"
                />
                <small> setup</small>
              </div>
              <div className="then mono">
                then ${founding ? PRICING.founding.monthly : PRICING.website.monthly}/month
                {founding && <span className="was inline">${PRICING.website.monthly}</span>}
              </div>

              <p>
                A complete site under your own name — services, prices, photos,
                service area — with booking built in. The setup fee covers
                building it with you.
              </p>
              {founding && (
                <p className="lock">
                  Founding pricing is locked for the life of the account. It
                  never rises while the account stays open.
                </p>
              )}

              {/* The footer is pinned to the bottom of the card, so two
                  cards of different length still line their buttons up. */}
              <div className="cardfoot">
                <a
                  className="ld-cta big block"
                  href={founding ? "/app?plan=website&offer=founding" : "/app?plan=website"}
                  ref={priceCta}
                >
                  {founding ? "Take a founding spot" : "Start the website plan"}
                </a>
                <p className="alt">
                  Or ${PRICING.annual}/year paid once — $
                  {PRICING.website.monthly * 12 - PRICING.annual} less than paying
                  monthly.
                </p>
              </div>
            </article>

            <article className="ld-plan" data-reveal="soft" style={{ "--i": 1 }}>
              <span className="lab">Booking page only</span>
              <div className="amount">
                <CountUp value={PRICING.bookingOnly.monthly} prefix="$" />
                <small>/month</small>
              </div>
              <div className="then mono">no setup fee</div>
              <p>
                Just the booking page, at a link that's yours. Keep the website
                you have — or run from your bio until you want one.
              </p>
              <div className="cardfoot">
                <a className="ld-ghost block" href="/app?plan=booking">
                  Start with booking
                </a>
              </div>
            </article>
          </div>

          <div className="ld-price" ref={terms}>
            <span className="lab">Every plan</span>
            <ul>
              <li data-reveal style={{ "--i": 0 }}>No commission — a fully booked month costs the same as a slow one</li>
              <li data-reveal style={{ "--i": 1 }}>Your customers and their numbers are yours, always</li>
              <li data-reveal style={{ "--i": 2 }}>Unlimited services, bookings and photos</li>
              <li data-reveal style={{ "--i": 3 }}>Cancel any time; your data leaves with you</li>
            </ul>
          </div>
        </section>

        <footer className="ld-foot" data-reveal ref={foot}>
          <span className="ld-mark" style={{ fontSize: 13 }}>DETAILING PLATFORM</span>
          <span>Built for the people who never rush a car.</span>
        </footer>
      </div>
    </div>
  );
}
