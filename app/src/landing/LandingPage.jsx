// detailingplatform.com — the marketing page.
//
// THIS IS A PORT. The reference rendering
// docs/design-directions/5-the-thread.html *is* this page: the owner
// approved it as this page, over fifteen rounds of his corrections. So the
// markup below is that document's markup, in JSX, and the running order,
// the copy and the mechanics are not open here. Where this file and that
// page disagree, the page is right (DESIGN.md, docs/design-system.md).
//
// WHAT A REAL PAGE HAS THAT A STATIC FILE CANNOT, and the only substantive
// differences from the reference:
//   · the founding offer's remaining count is READ FROM THE DATABASE and
//     fails closed, so a spot already taken is never advertised. A static
//     file cannot know that number, so it states the starting figure.
//   · every price comes from ./pricing.js, never from the markup —
//     tests/landing-pricing.test.mjs pins that.
//   · THE CALLS TO ACTION POINT AT /pricing (roadmap 2.20 stage 2,
//     2026-09-05) — not at #price as the reference has it, and no longer at
//     /app?plan=… as this file had it until then. The owner's words:
//     "when you say take founding spot, that shouldn't bring you to a sign
//     up or a payment screen. That should take you to a pricing page." A
//     visitor who has not chosen between three ways to pay is not ready for
//     a signup form, and /pricing is also where California's AB 2863
//     disclosures have to sit — before any billing detail is asked for.
//     Only "Sign in" still goes to /app. tests/route-contract.test.mjs
//     fails if a plan button drifts back.
//
// The nine sections and their skeletons (law 1 — no two alike):
//   1 hero .............. left-heavy asymmetric, one floating object
//   2 the thread ........ two columns, pinned, animated transfer
//   3 your own website .. LIGHT ground, the website breaking the band edge
//   4 what you get ...... full-width ruled list, no boxes at all
//   5 what you're using . LIGHT ground, the page's only table
//   6 pricing ........... asymmetric pair + a ruled terms list
//   7 questions ......... two columns of native disclosures
//   8 the last word ..... accent ground, centred, once
//   9 footer ............ mono facts
//
// All of the motion lives in ./thread.js — one module, no library (law 13).

import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { PRICING, livePricing } from "./pricing.js";
import { SUPPORT_EMAIL, SUPPORT_LINE } from "./legal.js";
import { initThread } from "./thread.js";
import "./landing.css";

export default function LandingPage() {
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
  // ROADMAP 4.4 STAGE 4 — the prices come from the database when the owner has
  // overridden them, and from `pricing.js` otherwise, which is the ordinary
  // case and the fallback for anything malformed. **Every figure on this page
  // reads `P`**; a `PRICING.` left behind would print one number from the file
  // beside another from the row, which is worse than either.
  const [P, setP] = useState(PRICING);
  useEffect(() => {
    let live = true;
    api.platformPrices().then((raw) => { if (live) setP(livePricing(raw)); });
    return () => { live = false; };
  }, []);


  // The page's whole motion system, mounted once and torn down on the way
  // out — this is a route in an SPA, so every listener and timer it opens
  // has to close again.
  useEffect(() => initThread(), []);

  const setup = founding ? P.founding.setup : P.website.setup;
  const monthly = founding ? P.founding.monthly : P.website.monthly;

  return (
    <div className="ld">
      <Ground />

      <nav className="nav" id="nav" aria-label="Main">
        <span className="nav__g"><i></i></span>
        <a className="mk" href="#top">Detailing Platform</a>
        <a className="lk hide-s" href="#get">What you get</a>
        <a className="lk hide-s" href="#price">Pricing</a>
        <a className="lk" href="/app">Sign in</a>
        <a className="cta sm" href="/pricing">Get started<span className="ar">→</span></a>
      </nav>

      <main id="top">

        {/* ══ 1 · HERO ═══════════════════════════════════════════════════
            Line one is FIXED and never leaves the screen — that is the
            promise; the rotating line under it is the proof stacking up
            behind it. Its height is reserved for two lines at narrow
            widths, because a phrase that wraps mid-rotation would shove the
            whole page down and up every few seconds. */}
        <section className="hero">
          <div className="wrap grid">
            <div>
              <span className="lab" data-rv="">For detailers</span>
              <h1 className="disp xl">
                <span className="mask"><span>A real website</span></span>
                <span className="mask"><span>for your detailing</span></span>
                <span className="mask"><span>business.</span></span>
              </h1>
              <p className="tail" data-rv="" style={{ "--i": 1 }}>
                <span id="tw"></span><i className="caret" aria-hidden="true"></i>
              </p>
              <p className="lede" data-rv="" style={{ "--i": 2 }}>
                One build: the site your customers land on, the booking page
                inside it, and the dashboard you run it from. Your services,
                your prices, your hours.
              </p>
              <div className="ctas" data-rv="" style={{ "--i": 3 }}>
                <a className="cta" href="/pricing" data-glow="">
                  See it with your name on it<span className="ar">→</span>
                </a>
                <span className="fine">
                  Built by a detailer who got tired<br />of booking jobs at 11pm.
                </span>
              </div>
            </div>

            {/* The product doing its own selling: the same lit job card the
                real dashboard uses, shown as a booking that arrived on its
                own. The reveal lives on a WRAPPER, not on .float — .float
                owns its own transform for the parallax and the two would
                overwrite each other. */}
            <div data-rv="lift" style={{ "--i": 2 }}>
              <div className="float" data-parallax="18" aria-hidden="true">
                <div className="litcard" data-tilt="">
                  <span className="lab ac">New booking · just now</span>
                  <div className="rowline" style={{ marginTop: 10 }}>
                    <div>
                      <div className="wght-620" style={{ fontSize: 17 }}>
                        Saturday, 9:00 AM — Full Detail
                      </div>
                      <div style={{ color: "var(--fog)", fontSize: 13, marginTop: 3 }}>
                        Marcus Hill · booked himself at 9:41 last night
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 24 }}>$240</div>
                  </div>
                </div>
                <div className="substack">
                  <div className="plain rowline">
                    <span style={{ color: "var(--fog)", fontSize: 14 }}>Sunday, 10:30 AM — Interior Reset</span>
                    <span className="mono" style={{ fontSize: 15 }}>$120</span>
                  </div>
                  <div className="plain rowline">
                    <span style={{ color: "var(--fog)", fontSize: 14 }}>Monday, 8:00 AM — Express Wash</span>
                    <span className="mono" style={{ fontSize: 15 }}>$65</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ 2 · THE THREAD ════════════════════════════════════════════
            THE signature move: each message flies to the position of its own
            row in the dashboard and dissolves as that row solidifies. Same
            content, same pixels, sorted. The bubbles and the rows are both
            built in thread.js from ONE array, and the tiles SUM from it —
            change a price there and the whole section moves. */}
        <section className="wrap" style={{ padding: "clamp(20px,5vh,60px) 0 0" }} aria-labelledby="thr">
          <span className="lab" data-rv="">Right now</span>
          <h2 className="disp" id="thr" style={{ marginTop: 14 }}>
            <span className="mask"><span>Stop booking jobs</span></span>
            <span className="mask" style={{ "--i": 1 }}><span>in your DMs.</span></span>
          </h2>
          <p className="lede" data-rv="" style={{ "--i": 2 }}>
            Four jobs came in this morning. None of them are in a calendar.
          </p>
        </section>

        <div className="thread-wrap" id="threadWrap">
          <div className="stage">
            <div className="wrap cols">
              {/* #thread itself is created by thread.js and moved between
                  this column and .jobshold as the layout changes. It is
                  deliberately NOT rendered here: React must never be asked
                  to remove a node that has been re-parented out from under
                  it. */}
              <div className="side lft" id="lft">
                <div className="sidelab"><i className="pip"></i><span className="lab">In your phone</span></div>
              </div>
              <div className="side rgt" id="rgt">
                <div className="sidelab" id="dashLab"><i className="pip"></i><span className="lab">In the dashboard</span></div>
                <div className="dash">
                  <div className="hd">Saturday, March 14</div>
                  <div className="hq" id="dashQ">Morning, Andrew · nothing booked</div>
                  <div className="tiles">
                    <div className="tile">
                      <span className="lab">Jobs today</span>
                      <div className="fig" id="tCount">0</div>
                      <div className="q" id="tCountQ">Nothing booked</div>
                    </div>
                    <div className="tile">
                      <span className="lab">Expected</span>
                      <div className="fig" id="tMoney">$0</div>
                      <div className="q" id="tMoneyQ">Nothing collected yet</div>
                    </div>
                  </div>
                  <span className="lab" style={{ display: "block" }}>Next up</span>
                  {/* The empty state, DRAWN rather than left as a hole. The
                      job rows are always in the DOM at opacity 0 so the card
                      never changes height, which meant the start of the
                      transfer was a titled void. This sits over exactly that
                      reserved space and fades on the FIRST job's own
                      progress value, so the empty state leaves as the day
                      arrives rather than on a timer. */}
                  <div className="jobshold">
                    <div className="jobs" id="jobs"></div>
                    <div className="nojobs" aria-hidden="true">Nothing yet.<br />Your Saturday is still in your phone.</div>
                  </div>
                  <p className="dashnote">Same screen: what you collected, what you spent, what's still owed.</p>
                </div>
              </div>
            </div>
            <div className="divider" id="divider" aria-hidden="true"><i></i></div>
            {/* This label is the pin's honesty: it tells you what the
                section is about to charge you. If .thread-wrap's height
                changes, change this. */}
            <div className="cost" id="cost" aria-hidden="true">holds for 3.0 screens · then releases</div>
          </div>
        </div>

        {/* ══ 3 · YOUR OWN WEBSITE ═══════════════════════════════════════
            The ground goes light and the object breaks the top edge of the
            band. It shows the WEBSITE, in a window with the detailer's own
            address in it, with the booking panel INSIDE that page — a
            phone-shaped widget on its own is a picture of a booking tool,
            which is the commodity this product is trying not to be filed
            next to. */}
        <section className="band" aria-labelledby="seeh">
          <div className="wrap duo">
            <div className="cp">
              <span className="lab" data-rv="">What your customers see</span>
              <h2 className="disp sm" id="seeh" style={{ marginTop: 14 }}>
                <span className="mask"><span>Your own website,</span></span>
                <span className="mask" style={{ "--i": 1 }}><span>at your own address.</span></span>
              </h2>
              <p className="lede" data-rv="" style={{ "--i": 2 }}>
                What you do, what it costs, where you work, your photos. The
                booking is part of the page, so nobody gets sent off to a
                different website to pick a time.
              </p>
              {/* Staggered per item rather than the whole list at once: four
                  lines arriving one after another is the difference between
                  a block appearing and a list being written. */}
              <ul className="ticks">
                <li data-rv="" style={{ "--i": 3 }}>Your own address on Google, not somebody else's listing</li>
                <li data-rv="" style={{ "--i": 4 }}>Built for a phone, because that's where they'll open it</li>
                <li data-rv="" style={{ "--i": 5 }}>Only shows times you can actually work</li>
                <li data-rv="" style={{ "--i": 6 }}>They move or cancel it themselves</li>
              </ul>
            </div>

            <div>
              <div className="widget-hold" data-parallax="14">
                {/* A window with an address bar, not a phone. That frame is
                    the whole argument of the section in one shape. */}
                <div className="site" data-rv="lift">
                  <div className="chrome" aria-hidden="true">
                    <i></i><i></i><i></i><span className="url">andrewsdetail.com</span>
                  </div>
                  <div className="scr">
                    <div className="sitenav">
                      <span className="biz">Andrew's Auto Detail</span>
                      <span className="lks"><i>Services</i><i>Gallery</i><i>Book</i></span>
                    </div>
                    {/* The one photograph on the page, and the distinction
                        matters so a later session does not "fix" it by
                        deleting it: law 10 bans car photography as the
                        LANDING PAGE's own subject, because we sell software.
                        This photo is not the landing page's subject — it is
                        inside a picture of a CLIENT's website, where
                        photographs of their own work are the single thing a
                        detailer's site is actually made of. The owner asked
                        for it directly: the sites he referenced "have tons
                        of photos".
                        Unsplash, Deniz Demirci, photo dlJelFmdpOc, 840x270
                        at q68 = 41 KB. Shipped as a file rather than the
                        reference page's data URI — that was forced by the
                        artifact host's CSP, and a real deploy would rather
                        cache it than inline it into the bundle. */}
                    <div className="sitehero">
                      <img
                        className="shot"
                        src="/img/tenant-site-hero.jpg"
                        width="840" height="270" loading="lazy" decoding="async"
                        alt="A detailer working along the bonnet of a dark car"
                      />
                      <div className="sitehero-t">
                        <h3>Mobile detailing, Tacoma and south.</h3>
                        <p>We come to your driveway. Most cars, about three hours.</p>
                      </div>
                    </div>
                    {/* The booking panel, bordered, sitting in the page's own
                        column — the visible form of "built in, not linked
                        to". */}
                    <div className="bd">
                      <span className="bl">Booking · on this page</span>
                      <div className="q">What can we do for you?</div>
                      <div className="svc">
                        <div><div className="n">Full Detail</div><div className="d">3 hr 30 min · inside and out</div></div>
                        <div className="p">$240</div>
                      </div>
                      <div className="svc">
                        <div><div className="n">Wash &amp; Wax</div><div className="d">1 hr 30 min</div></div>
                        <div className="p">$95</div>
                      </div>
                      <div className="go">Pick a time</div>
                    </div>
                    <div className="sitefoot">Andrew's Auto Detail · Tacoma, WA · Mon–Sat, 8–6</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ 4 · WHAT YOU GET ═══════════════════════════════════════════
            A full-width ruled list: an enumeration is a ruled list, and four
            parallel capabilities are not four objects you pick between.
            The ORDER is the argument — it leads with getting booked. */}
        <section className="getsheet wrap" id="get" aria-labelledby="geth">
          <span className="lab" data-rv="">What you get</span>
          <h2 className="disp" id="geth" style={{ marginTop: 14 }}>
            <span className="mask"><span>Not a page builder.</span></span>
            <span className="mask" style={{ "--i": 1 }}><span>The whole front door.</span></span>
          </h2>
          <p className="lede" data-rv="" style={{ "--i": 2 }}>
            The site out front and the room behind it, both run from your phone.
          </p>

          <div className="ruled">
            <div className="r" data-rv="">
              <div className="ix">01</div>
              <h3>They book while you're under a car</h3>
              <p>
                No phone tag, no "still there?" at 7am. They pick a service and
                a time on your site, and it's on your calendar before you've
                dried your hands. Most of it happens at night, after you've
                stopped answering.
              </p>
            </div>
            <div className="r" data-rv="" style={{ "--i": 1 }}>
              <div className="ix">02</div>
              <h3>The calendar refuses double bookings</h3>
              <p>
                Your hours, your drive time, your notice period. It won't sell a
                slot you can't work — so nobody has to be told at 9pm that
                Saturday's gone.
              </p>
            </div>
            <div className="r" data-rv="" style={{ "--i": 2 }}>
              <div className="ix">03</div>
              <h3>Fewer people forget</h3>
              <p>
                Confirmation when they book, reminder before you drive out, and
                a link to move it themselves. A booking on a screen gets kept. A
                booking in a text thread gets forgotten.
              </p>
            </div>
            <div className="r" data-rv="" style={{ "--i": 3 }}>
              <div className="ix">04</div>
              <h3>Change a price, it's changed</h3>
              <p>
                Raise a price, add a service, block off a week. What your
                customers see changes the second you save it. No emailing a web
                guy and waiting until Thursday.
              </p>
            </div>
          </div>
        </section>

        {/* ══ 5 · WHAT YOU'RE USING NOW ══════════════════════════════════
            The ground goes light for the second and last time, and it is a
            table — the only one on the page. A comparison of four options
            across two axes is genuinely tabular.

            NO COMPETITOR PRICES, on the owner's instruction: every row says
            what the thing LEAVES YOU WITH. That is not only tone — a wrong
            competitor price is the one claim on this page a THIRD PARTY
            would object to, and two of the four were auction-priced leads
            with no fixed figure to quote. */}
        <section className="vs" aria-labelledby="vsh">
          <div className="wrap">
            <span className="lab" data-rv="">Honestly</span>
            <h2 className="disp" id="vsh" style={{ marginTop: 14 }}>
              <span className="mask"><span>You already pay</span></span>
              <span className="mask" style={{ "--i": 1 }}><span>for something.</span></span>
            </h2>

            <div className="vstable" id="vstable" role="table" aria-label="What you are using now, against this">
              <div className="vsrow" role="row">
                <span className="nm" role="cell">Yelp, Thumbtack</span>
                <span className="gt" role="cell">You pay for the lead whether it books or not, and the customer stays theirs.</span>
              </div>
              <div className="vsrow" role="row">
                <span className="nm" role="cell">Booking software</span>
                <span className="gt" role="cell">It takes the booking. It still gives you nowhere to send anyone.</span>
              </div>
              <div className="vsrow" role="row">
                <span className="nm" role="cell">A site you paid for once</span>
                <span className="gt" role="cell">Right for the year you bought it. Changing a price means finding whoever built it.</span>
              </div>
              <div className="vsrow" role="row">
                <span className="nm" role="cell">A Facebook page</span>
                <span className="gt" role="cell">Free, and it is the first thing they find when they look you up.</span>
              </div>
              <div className="vsrow mine" role="row">
                <span className="nm" role="cell">This</span>
                <span className="gt" role="cell">The site, the booking and the screen you run both from — one thing, and you change it yourself.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ══ 6 · PRICING ════════════════════════════════════════════════
            An asymmetric pair, then a ruled terms list. Two plans of very
            different weight, not two matching cards. Every figure comes from
            ./pricing.js; the remaining founding count comes from the
            database and fails closed. */}
        <section className="price wrap" id="price" aria-labelledby="prh">
          <span className="lab" data-rv="">Pricing</span>
          <h2 className="disp" id="prh" style={{ marginTop: 14 }}>
            <span className="mask"><span>Two ways in.</span></span>
          </h2>
          <p className="lede" data-rv="" style={{ "--i": 1 }}>Both run the same booking engine.</p>
          <p className="lede" data-rv="" style={{ "--i": 2 }}>
            Booking software doesn't come with a website. This does.
          </p>

          <div className="plans">
            <article className={`plan lead${founding ? " has-offer" : ""}`} data-rv="lift">
              {founding && (
                <span className="flag">
                  Founding price · {offer.left} of {offer.total} left
                </span>
              )}
              <span className="lab">Website + dashboard</span>
              <div className="amount">
                {/* The list price is struck ONLY while a genuine founding
                    discount is live — never an anchor invented to make a
                    number look smaller. */}
                {founding && <s className="was">${P.website.setup}</s>}
                <span key={setup} data-count={setup} data-prefix="$">${setup}</span>
                <small> to build it</small>
              </div>
              <div className="then mono">
                {/* The literal space matters: the reference page has one
                    here as well as the .28em margin on .was, and without it
                    the struck price sits noticeably tighter. */}
                then ${monthly}/month{" "}
                {founding && <s className="was">${P.website.monthly}</s>}
              </div>
              <p>
                A site built for you under your own name, and the dashboard that
                runs it. Not a template you fill in yourself at midnight, and
                not the thousands an agency charges — then charges again every
                time a price changes.
              </p>
              {founding && (
                <p className="lock">
                  Founding pricing is locked for the life of the account. It
                  never rises while the account stays open.
                </p>
              )}
              <div className="pfoot">
                <a className="cta block" href="/pricing" data-glow="">
                  {founding ? "Take a founding spot" : "Start the website plan"}
                  <span className="ar">→</span>
                </a>
                {/* THE ANNUAL LINE MOVED TO /pricing ON 2026-09-05, and the
                    ORDER was the load-bearing half of the owner's own
                    instruction: "you don't even need to say six hundred a
                    year paid once, because that'll be shown inside the
                    pricing page" — so it stayed here until the page that
                    carries it existed, or the only mention of the annual
                    option would have disappeared before its replacement.
                    Two plans on this page, three ways to pay on that one.
                    The "2 months free" framing and the check that keeps it
                    honest (a WHOLE number of months, inside the 15-20% band
                    the category uses) went with it —
                    tests/landing-pricing.test.mjs now reads PricingPage.jsx
                    for both.
                    AND THE PRICE ITSELF IS GONE FROM THIS LINE, not just the
                    sentence: he said "you don't even need to SAY six hundred a
                    year paid once", so a teaser reading "from $600 a year"
                    would have kept the exact thing he asked us to drop. What
                    stays is the FACT the card cannot carry on its own — this
                    card quotes one of three ways to pay, and without a pointer
                    the landing page presents that one as the only one. */}
                <p className="alt">
                  Three ways to pay.{" "}
                  <a className="softlink" href="/pricing">See them all</a>
                </p>
              </div>
            </article>

            <article className="plan" data-rv="lift" style={{ "--i": 1 }}>
              <span className="lab">Booking page only</span>
              <div className="amount">
                <span data-count={P.bookingOnly.monthly} data-prefix="$">
                  ${P.bookingOnly.monthly}
                </span>
                <small>/month</small>
              </div>
              <div className="then mono">no setup fee</div>
              <p>
                Just the booking page, at a link that's yours. Keep the website
                you have — or run from your bio until you want one.
              </p>
              <div className="pfoot">
                <a className="cta gh block" href="/pricing#booking" data-glow="">Start with booking</a>
              </div>
            </article>
          </div>

          {/* Term 01 is the claim rescued from the 01/02/03 rail, cut on the
              owner's instruction because it cost 4.07 screens at 1920 to pan
              three cards sideways twice. Its second half is also what stops
              the lead card ("we build it for you") from contradicting
              section 4. */}
          <ul className="terms">
            <li data-rv=""><span className="k">01</span><span>No setup wizard and no migration — you are bookable the same day, and the site is built out with you from there</span></li>
            <li data-rv="" style={{ "--i": 1 }}><span className="k">02</span><span>No commission — a fully booked month costs the same as a slow one</span></li>
            <li data-rv="" style={{ "--i": 2 }}><span className="k">03</span><span>Your customers and their numbers are yours, always</span></li>
            <li data-rv="" style={{ "--i": 3 }}><span className="k">04</span><span>Unlimited services, bookings and photos</span></li>
            <li data-rv="" style={{ "--i": 4 }}><span className="k">05</span><span>Cancel any time; your data leaves with you</span></li>
          </ul>
        </section>

        {/* ══ 7 · QUESTIONS ══════════════════════════════════════════════
            <details>/<summary> — the browser's own disclosure element. No
            script, no ARIA to get wrong, keyboard and screen-reader
            behaviour free, and it survives every script on the page failing.
            The first two are open on load, so the section never reads as
            eight closed doors. */}
        <section className="faq wrap" id="faq" aria-labelledby="faqh">
          <span className="lab" data-rv="">Before you ask</span>
          <h2 className="disp" id="faqh" style={{ marginTop: 14 }}>
            <span className="mask"><span>Questions.</span></span>
          </h2>
          <div className="qs">
            <details data-rv="" open>
              <summary>Do I need to already have a website?</summary>
              <p>No. A Facebook page and a phone number is the normal starting point.</p>
            </details>
            <details data-rv="" style={{ "--i": 1 }} open>
              <summary>I have a website, it's just old. Can you use it?</summary>
              <p>No, and you don't want me to. You get a new one — same business, same name, built for a phone. Send me the old one and I'll pull the photos and wording worth keeping.</p>
            </details>
            <details data-rv="" style={{ "--i": 2 }}>
              <summary>Who owns the domain?</summary>
              <p>You do. It's in your name and it leaves with you.</p>
            </details>
            <details data-rv="" style={{ "--i": 3 }}>
              <summary>How long until I'm taking bookings?</summary>
              <p>Same day. Name, hours, one service is enough.</p>
            </details>
            <details data-rv="" style={{ "--i": 4 }}>
              <summary>What happens to my customers if I cancel?</summary>
              <p>You export them and go. The list was always yours.</p>
            </details>
            <details data-rv="" style={{ "--i": 5 }}>
              <summary>Do you take a cut of my jobs?</summary>
              <p>No. A $600 coating costs you the same as a $65 wash.</p>
            </details>
            <details data-rv="" style={{ "--i": 6 }}>
              <summary>Can I change my prices myself?</summary>
              <p>Yes, from your phone, and the site updates the second you save.</p>
            </details>
            <details data-rv="" style={{ "--i": 7 }}>
              <summary>What if I have staff?</summary>
              <p>They get their own login and see only their jobs, not your money.</p>
            </details>
          </div>
        </section>

        {/* ══ 8 · THE LAST WORD ══════════════════════════════════════════
            The page's third ground — the accent, brought up for the only
            time it carries a whole section. Centred exactly once, at the
            end: centred everywhere is the tell, centred once against ten
            sections that are not is a full stop. */}
        <section className="end" aria-labelledby="endh">
          <div className="wrap">
            <h2 className="disp" id="endh">
              <span className="mask"><span>Your next customer is</span></span>
              <span className="mask" style={{ "--i": 1 }}><span>looking you up right now.</span></span>
            </h2>
            <p className="lede" data-rv="" style={{ "--i": 2 }}>
              Whatever they find is your website. Might as well be a good one.
            </p>
            <div className="ctas" data-rv="" style={{ "--i": 3 }}>
              <a className="cta" href="/pricing" data-glow="">
                {founding ? "Take a founding spot" : "Start the website plan"}
                <span className="ar">→</span>
              </a>
              <a className="softlink" href="/pricing#booking">Or just the booking page<span className="ar">→</span></a>
            </div>
          </div>
        </section>

        {/* ══ 9 · FOOTER ════════════════════════════════════════════════ */}
        <Foot />
      </main>
    </div>
  );
}

/* ── Shared by every `.ld` page ───────────────────────────────────────
   THE PRICING PAGE IS THE SECOND ONE (roadmap 2.20 stage 2), and these two
   are exported rather than copied for the ordinary reason: the ground is
   law 2 in its cheap form and the footer is the page's only mono facts, so
   a copy that drifts means one page quietly stops carrying the system.
   The NAV is deliberately not here — the pricing page's differs, because a
   "Get started" button on the page you get started from is a button that
   points at itself. */

/* One continuous ground under the whole page: two slow lights, a dot
   lattice, the pointer light and grain. Law 2 — something is always
   animating — in its cheap form: transform and opacity only, no renderer,
   no canvas. The ids are what thread.js binds the pointer light to. */
export function Ground() {
  return (
    <div className="ground" id="ground" aria-hidden="true">
      <b></b><b></b>
      <span className="dots"></span>
      <span className="cursor" id="cursorGlow"></span>
      <i></i>
    </div>
  );
}

export function Foot() {
  return (
    <footer className="wrap foot" data-rv="">
      <span className="mk">Detailing Platform</span>
      <span>Built for the people who never rush a car.</span>
      {/* ROADMAP 7.1 — THE SUPPORT POLICY, not a "contact us" link. What a
          person wants to know before handing a business over is who picks it
          up and how long they wait, and both fit on one line. The two
          documents sit beside it because this is where a reader looks for
          them, and a page that cannot be found is a page that was not
          published. */}
      <span className="footsup">
        {SUPPORT_LINE}{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        {" · "}<a href="/terms">Terms</a>
        {" · "}<a href="/privacy">Privacy</a>
      </span>
    </footer>
  );
}
