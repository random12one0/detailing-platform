// detailingplatform.com/pricing — every option in one place.
//
// WHY THIS PAGE EXISTS, and it is not "a nicer pricing section". The owner
// asked for it on 2026-09-04:
//
//   "When you say take founding spot, that shouldn't bring you to a sign up
//    or a payment screen. That should take you to a pricing page… it shows
//    basically all my options and all the different things, and they click
//    the one that they want."
//
// Every plan button on the landing page used to go straight to
// /app?plan=website&offer=founding, which is a SIGNUP FORM. Somebody who has
// not yet chosen between three ways to pay is not ready for one.
//
// AND IT IS THE LEGALLY LOAD-BEARING HALF OF THE CHECKOUT, which is the part
// a later session must not treat as decoration. California's AB 2863 (in
// force 1 July 2025) requires the auto-renewal terms, the twelve-month
// commitment and the early-exit fee to be clear and conspicuous BEFORE
// billing details are taken. This page is where "before" happens, so:
//
//   · NEITHER PLAN AND NO TERM IS PRE-SELECTED. That was the first thing the
//     FTC named in its June 2024 complaint against Adobe — which was about
//     the PRESENTATION of an early-exit fee, not about the fee. There is no
//     selection state on this page at all: every option is its own button,
//     so there is nothing that could be defaulted. Do not "improve" this
//     into a radio group with a sensible default.
//   · THE TERM AND THE FEE ARE IN PLAIN TEXT AT READING SIZE, in § Before
//     you pay, not in fine print, not behind a hover icon and not behind a
//     link to a policy. The other two Adobe items.
//   · The tick — express affirmative consent — belongs to the CHECKOUT, not
//     here, and that is a decision rather than an omission: consent has to
//     be captured and stored with the subscription at the moment of
//     purchase, and consent collected on a marketing page and then carried
//     through a signup flow is consent that can be lost. See docs/roadmap.md
//     2.20 stage 2.
//
// EVERY FIGURE COMES FROM ./pricing.js, including the term and the exit-fee
// share, because the checkout will CHARGE what this page PRINTS and two
// files reading one number is the only way those can never disagree.
// tests/landing-pricing.test.mjs pins that, the ladder's own pricing rules,
// and the presence of each disclosure.
//
// The skeletons, law 1 — no two sections alike, and none of them is the
// landing page's asymmetric pair:
//   1 head ............ left-ranged, the offer as a full-width strip
//   2 website plan .... a split head over a ruled ladder of three rungs
//   3 booking only .... one horizontal bar, price and button at its ends
//   4 before you pay .. a two-column definition list, no numbers
//   5 closer .......... one sentence
//
// Motion is initThread()'s, unchanged and shared — see the note at the top
// of ./thread.js about why this page does not get its own.

import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { PRICING } from "./pricing.js";
import { initThread } from "./thread.js";
import { Ground, Foot } from "./LandingPage.jsx";
import "./landing.css";

export default function PricingPage() {
  // Counted in the database, never declared — same as the landing page, and
  // failing CLOSED for the same reason: advertising a spot that is already
  // taken is a promise we cannot keep, and "we couldn't reach the server" is
  // not a reason to make one.
  const [offer, setOffer] = useState(null);
  useEffect(() => {
    let live = true;
    api.foundingOffer()
      .then((o) => { if (live) setOffer(o); })
      .catch(() => { if (live) setOffer({ total: 0, left: 0 }); });
    return () => { live = false; };
  }, []);
  const founding = offer && offer.left > 0;

  useEffect(() => initThread(), []);

  // ONE TABLE, TWO COLUMNS OF PRICES. Which column applies is decided once,
  // here, rather than at each of the eleven places a figure is printed —
  // eleven ternaries is eleven chances to print a founding price beside a
  // list one.
  const p = founding ? PRICING.founding : { ...PRICING.website, annual: PRICING.annual, monthToMonth: PRICING.monthToMonth };
  const monthsFree = (p.monthly * 12 - p.annual) / p.monthly;
  // A WORKED EXAMPLE OF THE EXIT FEE, not a second rule: half of the months
  // still to run, shown at the halfway point because "half of what's left"
  // is the sentence people misread as "half the whole thing".
  const exitAtHalfway =
    p.monthly * (PRICING.term.months / 2) * PRICING.term.exitFeeShare;

  // Where a chosen option goes TODAY: the signup form, carrying the choice.
  // There is no checkout yet (roadmap 2.20 stage 2's second half, which
  // cannot go live before 2 December anyway) and no Stripe key is needed for
  // any of this page. `term` is read by nothing yet and is here so the
  // choice made on this page survives the step after it — Auth.jsx already
  // switches to "create an account" on the presence of `plan`.
  const buy = (term) =>
    `/app?plan=website&term=${term}${founding ? "&offer=founding" : ""}`;

  return (
    <div className="ld pricepage">
      <Ground />

      {/* The landing page's nav, minus its "Get started" pill: on the page
          you get started FROM, that button points at itself. */}
      <nav className="nav" id="nav" aria-label="Main">
        <span className="nav__g"><i></i></span>
        <a className="mk" href="/">Detailing Platform</a>
        <a className="lk hide-s" href="/#get">What you get</a>
        <a className="lk hide-s" href="/#faq">Questions</a>
        <a className="lk" href="/app">Sign in</a>
      </nav>

      <main id="top">

        {/* ══ 1 · HEAD ═══════════════════════════════════════════════════ */}
        <section className="phead wrap">
          <a className="backlink" href="/" data-rv="">
            <span className="ar back" aria-hidden="true">→</span>Back to the site
          </a>
          <span className="lab" data-rv="" style={{ "--i": 1 }}>Pricing</span>
          <h1 className="disp" style={{ marginTop: 14 }}>
            <span className="mask"><span>Two plans.</span></span>
            <span className="mask" style={{ "--i": 1 }}><span>Three ways to pay.</span></span>
          </h1>
          <p className="lede" data-rv="" style={{ "--i": 2 }}>
            Every price, and exactly what each one commits you to. Nothing on
            this page is chosen for you.
          </p>

          {/* THE REVEAL GOES ON THE WRAPPER, NEVER ON THE CONDITIONAL NODE,
              and this cost a real defect on this page's first run.
              thread.js collects its revealables with ONE querySelectorAll at
              mount, and that returns a STATIC list — so a node React adds
              later, when the founding lookup answers, is in no list, is
              never given `.in`, and sits at opacity 0 for ever. The strip
              carrying the whole scarcity claim was invisible.
              **It is invisible to every check this repo has.** `?lite=1`
              reveals everything, so the lite path looked right; an
              opacity-0 element still has a full box, so the width sweep
              measured it and printed clean; and no contrast test can see a
              colour nobody is shown. The wrapper is always in the DOM, so
              it reveals, and opacity inherits to whatever is inside it.
              The landing page has never had this bug because its founding
              flag and lock line sit inside `.plan`, which is unconditional
              and carries the `data-rv` — by luck rather than by rule, so
              tests/landing-pricing.test.mjs now holds the rule. */}
          <div data-rv="" style={{ "--i": 3 }}>
          {founding && (
            <p className="offerbar">
              <b>Founding price</b>
              <span>
                {offer.left} of {offer.total} spots left. It is locked for the
                life of the account and never rises while that account stays
                open. When the third one goes, this page shows the standard
                prices instead.
              </span>
            </p>
          )}
          </div>
        </section>

        {/* ══ 2 · THE WEBSITE PLAN ═══════════════════════════════════════
            A split head — what it is on the left, the one-time build fee on
            the right, because that number is the one nobody expects and
            burying it under three monthly figures is the thing this page
            exists not to do. Then the ruled ladder. */}
        <section className="planblock wrap" id="website" aria-labelledby="wsh">
          <div className="planhead">
            <div>
              <span className="lab" data-rv="">Plan one</span>
              <h2 className="disp sm" id="wsh" style={{ marginTop: 12 }}>
                <span className="mask"><span>Website + dashboard</span></span>
              </h2>
              <p className="lede" data-rv="" style={{ "--i": 1 }}>
                Your own site under your own name, the booking page inside it,
                and the dashboard you run the whole thing from.
              </p>
            </div>
            <div className="setupfee" data-rv="lift" style={{ "--i": 1 }}>
              <span className="lab">To build it</span>
              <div className="amount">
                {founding && <s className="was">${PRICING.website.setup}</s>}
                <span key={p.setup} data-count={p.setup} data-prefix="$">${p.setup}</span>
              </div>
              <p className="fine">
                Once, at the start. It is not part of the monthly price and it
                is not charged again.
              </p>
            </div>
          </div>

          <ul className="incl" data-rv="" style={{ "--i": 2 }}>
            <li>A site built for you — not a template you fill in at midnight</li>
            <li>The booking page, the calendar, reminders, receipts and invoices</li>
            <li>Unlimited services, bookings, photos and staff logins</li>
            <li>Changes whenever you ask, for as long as you are on it</li>
            <li>No commission — a booked-out month costs the same as a slow one</li>
          </ul>

          <span className="lab laddercap" data-rv="">Then pick how you pay</span>

          {/* THE THREE RUNGS, cheapest per year first. The headline figure on
              each is WHAT ACTUALLY LEAVES THE BANK, never an "effective
              monthly" — printing $50/mo on a plan that takes $600 in one go
              is the small dishonesty this whole page is a correction to.
              Annual-paid-monthly is the visual middle by POSITION, which is
              all "the visual middle" may mean here: no highlight, no badge,
              no "most popular" (we have no customers to be popular with),
              and nothing pre-selected. */}
          <ul className="ladder">
            <li className="rung" data-rv="">
              <div className="rungwhat">
                <span className="rt">Annual, paid up front</span>
                <span className="rw">
                  One payment for the year — {monthsFree} months free against
                  paying monthly. No term and no exit fee: the year is already
                  paid for.
                </span>
              </div>
              <div className="rungfig">
                <span className="mono fig">${p.annual}</span>
                <small>a year</small>
              </div>
              <a className="cta gh" href={buy("annual-upfront")} data-glow="">
                Choose this<span className="ar">→</span>
              </a>
            </li>

            <li className="rung" data-rv="" style={{ "--i": 1 }}>
              <div className="rungwhat">
                <span className="rt">Annual, paid monthly</span>
                <span className="rw">
                  ${p.monthly * 12} over {PRICING.term.months} months. This one
                  is a {PRICING.term.months}-month commitment, and leaving
                  early costs half of the months still to run. The other two
                  do not.
                </span>
              </div>
              <div className="rungfig">
                <span className="mono fig">${p.monthly}</span>
                <small>a month</small>
              </div>
              <a className="cta gh" href={buy("annual-monthly")} data-glow="">
                Choose this<span className="ar">→</span>
              </a>
            </li>

            <li className="rung" data-rv="" style={{ "--i": 2 }}>
              <div className="rungwhat">
                <span className="rt">Month to month</span>
                <span className="rw">
                  No commitment at all. Cancel any month and pay nothing
                  extra. It costs more because the risk of a short stay is
                  ours instead of yours.
                </span>
              </div>
              <div className="rungfig">
                <span className="mono fig">${p.monthToMonth}</span>
                <small>a month</small>
              </div>
              <a className="cta gh" href={buy("monthly")} data-glow="">
                Choose this<span className="ar">→</span>
              </a>
            </li>
          </ul>

          {/* Same wrapper, same reason as the strip above. */}
          <div data-rv="">
          {founding && (
            <p className="standard">
              Founding prices. The standard ones are ${PRICING.annual} a year,
              ${PRICING.website.monthly} a month and ${PRICING.monthToMonth} a
              month, with a ${PRICING.website.setup} build fee.
            </p>
          )}
          </div>
        </section>

        {/* ══ 3 · BOOKING ONLY ═══════════════════════════════════════════
            One bar. Deliberately lighter than the block above it — the
            weight difference is the honest one, and two matching blocks
            would be the section skeleton repeating (law 1). */}
        <section className="onlybar wrap" id="booking" aria-labelledby="boh">
          <div className="onlysay">
            <span className="lab" data-rv="">Plan two</span>
            <h2 className="disp sm" id="boh" style={{ marginTop: 12 }}>
              <span className="mask"><span>Booking page only</span></span>
            </h2>
            <p className="lede" data-rv="" style={{ "--i": 1 }}>
              Just the booking page, at a link that is yours. Keep the website
              you have — or run from your bio until you want one.
            </p>
            <p className="fine" data-rv="" style={{ "--i": 2 }}>
              Same booking engine, same dashboard, same reminders. What you do
              not get is the website and the changes to it.
            </p>
          </div>
          <div className="onlybuy" data-rv="lift" style={{ "--i": 1 }}>
            <div className="amount">
              <span data-count={PRICING.bookingOnly.monthly} data-prefix="$">
                ${PRICING.bookingOnly.monthly}
              </span>
              <small>a month</small>
            </div>
            <div className="then mono">no build fee · no term</div>
            <a className="cta gh block" href="/app?plan=booking" data-glow="">
              Start with booking<span className="ar">→</span>
            </a>
          </div>
        </section>

        {/* ══ 4 · BEFORE YOU PAY ═════════════════════════════════════════
            The AB 2863 disclosures. A definition list, at reading size, on
            the page that comes before any billing detail is asked for.
            NOT a link to a policy, and not a numbered rail — the landing
            page already has one of those, and numbered markers on a set of
            unrelated facts is a named tell (docs/design-knowledge.md §1). */}
        <section className="legal wrap" id="terms" aria-labelledby="tmh">
          <span className="lab" data-rv="">Before you pay</span>
          <h2 className="disp sm" id="tmh" style={{ marginTop: 14 }}>
            <span className="mask"><span>The terms, in full.</span></span>
          </h2>
          <p className="lede" data-rv="" style={{ "--i": 1 }}>
            Not a link to a policy page. This is all of it.
          </p>

          <dl>
            <div data-rv="">
              <dt>It renews by itself</dt>
              <dd>
                Whichever plan you pick renews automatically, at the price you
                signed up at, until you cancel it. The annual plans renew once
                a year on the day you started; month to month renews on the
                same date every month.
              </dd>
            </div>
            <div data-rv="" style={{ "--i": 1 }}>
              <dt>What you will be charged</dt>
              <dd>
                ${p.annual} a year, ${p.monthly} a month, or ${p.monthToMonth} a
                month — whichever one you chose above — plus sales tax in the
                states that charge it. The price does not change on renewal.
              </dd>
            </div>
            <div data-rv="" style={{ "--i": 2 }}>
              <dt>Only one plan is a commitment</dt>
              <dd>
                Annual paid monthly means {PRICING.term.months} months. The
                other two have no term of any kind: the up-front year is
                already paid for, and month to month ends whenever you say so.
              </dd>
            </div>
            <div data-rv="" style={{ "--i": 3 }}>
              <dt>Leaving that one early</dt>
              <dd>
                You pay half of the months still to run, charged that day to
                the card on file. On {PRICING.term.months} months at $
                {p.monthly} a month, walking away halfway through costs $
                {exitAtHalfway}. Nothing else, and nothing after it.
              </dd>
            </div>
            <div data-rv="" style={{ "--i": 4 }}>
              <dt>How you cancel</dt>
              <dd>
                One button in your own account, any time, in the same place you
                signed up. No phone call, no email and nobody to talk out of
                it. You keep everything you have already paid for until that
                period ends.
              </dd>
            </div>
            <div data-rv="" style={{ "--i": 5 }}>
              <dt>The build fee is separate</dt>
              <dd>
                The ${p.setup} to build the site is charged once, at the start,
                and is not part of the subscription. It stops being refundable
                once work on your site begins, and you are told on the day that
                happens.
              </dd>
            </div>
            <div data-rv="" style={{ "--i": 6 }}>
              <dt>If a payment fails</dt>
              <dd>
                We try the card again over the following two weeks and email
                you each time. If it still has not gone through after that, the
                site goes offline until it is paid. Nothing is deleted and it
                comes straight back.
              </dd>
            </div>
            <div data-rv="" style={{ "--i": 7 }}>
              <dt>When you leave</dt>
              <dd>
                Cancelling stops the next charge. Your customers, their numbers
                and your photos are yours — you export them and go. The domain
                is in your name and leaves with you.
              </dd>
            </div>
          </dl>
        </section>

        {/* ══ 5 · CLOSER ═════════════════════════════════════════════════ */}
        <section className="closer wrap">
          <p data-rv="">
            Every plan runs the same software. The only thing that changes is
            how long you commit for, and what that saves you.
          </p>
        </section>

        <Foot />
      </main>
    </div>
  );
}
