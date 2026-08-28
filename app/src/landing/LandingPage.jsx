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

import { CalendarCheck2, Smartphone, Wallet } from "lucide-react";
import "./landing.css";

export default function LandingPage() {
  return (
    <div className="ld">
      <div className="wrap">
        <nav className="ld-nav" aria-label="Main">
          <a className="ld-mark" href="/">DETAILING PLATFORM</a>
          <div className="links">
            <a href="/app">Sign in</a>
            <a className="ld-cta quiet" href="/app">Start free</a>
          </div>
        </nav>

        <header className="ld-hero">
          <div>
            <span className="lab">For detailers</span>
            <h1 className="disp" style={{ marginTop: 14 }}>
              Put your work in the&nbsp;light.
            </h1>
            <p className="sub">
              A real website with booking built in. Your services, your prices,
              your hours, your rules — customers pick an open slot and book
              themselves while you're still buffing the last car.
            </p>
            <div className="ctas">
              <a className="ld-cta big" href="/app">See it with your name on it</a>
              <span className="fine">Free for your first 30 days. No card.</span>
            </div>
          </div>

          <div className="ld-demo" aria-hidden="true">
            <div className="ld-card">
              <span className="lab" style={{ color: "var(--ac)" }}>New booking · just now</span>
              <div className="ld-row" style={{ marginTop: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 17 }}>Saturday, 9:00 AM — Full Detail</div>
                  <div style={{ color: "var(--i2)", fontSize: 13, marginTop: 3 }}>
                    Marcus Webb · booked himself at 9:41 last night
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 24 }}>$240</div>
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
          <h2 className="disp" id="get">What you get</h2>
          <p className="lede">
            Not a page builder. Not a directory listing. The whole front door of
            your business, run from your phone.
          </p>
          {/* A ruled spec sheet, not a card grid: boxes on this page are
              reserved for the product's own artifacts (the demo cards). */}
          <dl className="ld-specs">
            <div className="row">
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
            <div className="row">
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
            <div className="row">
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
          <h2 className="disp" id="how">Live before your next job</h2>
          <p className="lede">No setup wizard, no migration, no designer.</p>
          {/* The same progress rail a customer sees while booking — the
              product's own motif doing the explaining. No boxes. */}
          <ol className="ld-rail3">
            <li>
              <span className="n">01</span>
              <h3>Name, hours, one service</h3>
              <p>That's enough to be bookable. Add the rest whenever.</p>
            </li>
            <li>
              <span className="n">02</span>
              <h3>Send one link</h3>
              <p>
                Your page lives at your own address. Put it in your bio, on your
                cards, on the van.
              </p>
            </li>
            <li>
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
          <div className="ld-price">
            <span className="lab">One price</span>
            <div className="amount" style={{ marginTop: 12 }}>
              $29<small>/month</small>
            </div>
            <ul>
              <li>No commission — a fully booked month costs the same as a slow one</li>
              <li>Your customers and their numbers are yours, always</li>
              <li>Unlimited services, bookings and photos</li>
              <li>Cancel any time; your data leaves with you</li>
            </ul>
            <a className="ld-cta big" href="/app">Start your 30 free days</a>
          </div>
        </section>

        <footer className="ld-foot">
          <span className="ld-mark" style={{ fontSize: 13 }}>DETAILING PLATFORM</span>
          <span>Built for the people who never rush a car.</span>
        </footer>
      </div>
    </div>
  );
}
