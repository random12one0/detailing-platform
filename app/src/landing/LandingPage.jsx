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

  // The phone nav. Closed on Escape as well as on a link, because it
  // covers the top of the page and a visitor who opened it by accident
  // should not have to find the button again.
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  /* ── THE HERO ROTATES, 2026-09-08 ────────────────────────────────────
     The owner's note: the page reads as a wall of text and the first screen
     is the worst of it, because the product is THREE things and the hero
     had one screen to name all three. It named them in a list — "the site,
     the booking page inside it, and the dashboard you run it from" — which
     is a sentence about a product rather than a thing that happens to a
     detailer.

     So: one thing at a time, three times. Each pane is a SCENE, which is
     the shape he signed off (five-moves § 07) — the reader has stood in it.
     The visual changes with the words, because a hero that swaps its
     headline over a fixed picture is a slideshow of captions.

     LAW 4 IS NOT SPENT HERE. The pane change uses the reveal preset the
     rest of the page already uses (`--t-reveal`, `--e-out`) at a shorter
     scale; it is not a third motion. Law 2 is satisfied by it rather than
     by anything new.

     ROTATION STOPS THE MOMENT SOMEBODY STEERS. Autoplay that fights the
     visitor is worse than no autoplay: they press *Your dashboard*, read
     two lines, and the page takes it away from them. One press and it is
     theirs; the pause control says so out loud for anybody reading with a
     screen reader, which is why the label is a real button and not an icon.
     Reduced motion never starts it at all. */
  const HERO = [
    {
      k: "site",
      tab: "Your website",
      lab: "For detailers",
      h: ["They look you up", "before they call."],
      p: "What they find is either a Facebook page from four years ago, or your own site — your work, your prices, your name in the address bar.",
      cta: "See it with your name on it",
    },
    {
      k: "book",
      tab: "Your booking page",
      lab: "Built into that page",
      h: ["Saturday", "fills itself."],
      p: "They pick a service and a time on your own page, in the middle of the night, and it is on your calendar before you wake up.",
      cta: "See how booking works",
    },
    {
      k: "dash",
      tab: "Your dashboard",
      lab: "And the room behind it",
      h: ["The whole day,", "in your pocket."],
      p: "Who is booked, what you are owed, what you spent. Change a price at a red light and your site changes with it.",
      cta: "Look inside the dashboard",
    },
  ];
  /* THE WALL'S TILES, AS DATA. The headline counts them, so the number on
     the page cannot drift from the number of pictures under it — this repo
     has had four different stale counts written into prose, and a marketing
     claim is a worse place for the fifth than a comment is.
     EIGHTEEN, EACH USED ONCE. Nine was the first set and every row repeated
     the same handful, which is the duplication the owner saw straight away.
     All from ex1/ex2/ex3 — the older `example*` mock-ups are out, including
     the orange one that kept catching the eye. */
  const WALL = [
    [["site-ex1-home", "A detailer's site"], ["book-5-time", "Picking a time"],
     ["dash-today", "Today"], ["site-ex2-mid", "Services and prices"],
     ["book-2-extras", "Adding extras"], ["dash-clients", "Their customers"]],
    [["site-ex2-home", "A detailer's site"], ["book-1-service", "Choosing a service"],
     ["dash-calendar", "The month"], ["site-ex3-prices", "Their prices"],
     ["book-6-contact", "Their details"], ["site-ex1-work", "Their work"]],
    [["site-ex3-home", "A detailer's site"], ["book-7-review", "Before they confirm"],
     ["dash-money", "The money"], ["site-ex1-prices", "Their prices"],
     ["book-3-vehicle", "Their vehicle"], ["book-4-where", "Where to go"]],
  ];
  const WALL_SPEED = ["46s", "58s", "40s"];

  const [pane, setPane] = useState(0);
  const [steered, setSteered] = useState(false);

  /* THE HEADLINE WRITES ITSELF, RUBS ITSELF OUT, AND WRITES THE NEXT ONE.
     The owner, 2026-09-09: *"the exact same animation as before, where it
     writes it out and then unwrites it and then writes it back… the reverse
     animation and then the animation again for the new text."*

     THE FIRST VERSION ONLY DID HALF OF IT. It typed the incoming line, but
     the outgoing one left with its pane, so there was no un-writing to
     watch. That is why this is ONE state machine and not a timer beside a
     typewriter: the erase has to FINISH before the pane may change, and two
     independent timers cannot agree on when that is.

         typing   chars climb to the end        17ms each
         holding  the line sits still           2200ms — the part he reads
         erasing  chars fall back to zero        9ms each; rubbing out is
                                                 always quicker than writing
         then, and only then, the pane advances and typing starts again.

     THE PANE CHANGES AT ZERO CHARACTERS, which is what makes it read as one
     movement rather than two: the label, the sentence and the picture all
     cross-fade at the moment the headline is empty, so nothing is ever seen
     changing underneath a written line.

     `steered` parks the machine in `holding` — somebody who pressed a tab
     wants to read that one, not watch it be erased. */
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState("typing");
  const total = HERO[pane].h.reduce((n, l) => n + l.length, 0);
  const lite = typeof document !== "undefined"
    && document.documentElement.classList.contains("lite");

  useEffect(() => {
    // `.lite` on <html> is main.jsx's single switch for BOTH `?lite=1` and
    // reduced motion. In lite the line is simply present and nothing runs.
    if (lite) { setChars(total); return; }
    let t = 0;
    if (phase === "typing") {
      if (chars < total) t = setTimeout(() => setChars(chars + 1), chars === 0 ? 90 : 17);
      else setPhase("holding");
    } else if (phase === "holding") {
      if (steered) return;
      t = setTimeout(() => setPhase("erasing"), 3000);   // +800ms, his ask
    } else {
      if (chars > 0) t = setTimeout(() => setChars(chars - 1), 9);
      else t = setTimeout(() => {
        setPane((k) => (k + 1) % HERO.length);
        setPhase("typing");
      }, 120);                       // a beat of empty ground between the two
    }
    return () => clearTimeout(t);
  }, [chars, phase, steered, total, lite, HERO.length]);

  const typed = Math.min(chars, total);

  const steer = (i) => { setPane(i); setSteered(true); setPhase("typing"); setChars(0); };

  return (
    <div className="ld">
      <Ground />

      <nav className="nav" id="nav" aria-label="Main">
        <span className="nav__g"><i></i></span>
        <a className="mk" href="#top">Detailing Platform</a>
        <a className="lk hide-s" href="#get">What you get</a>
        <a className="lk hide-s" href="#price">Pricing</a>
        <a className="lk" href="/app">Sign in</a>
        {/* ROADMAP 2.25 — "Get started" until 2026-09-06, and the owner is
            right that the pair did not read as a pair: at 392 the nav is the
            wordmark, this and *Sign in*, and one of the two did not name an
            account action at all.

            THE DESTINATION IS UNCHANGED AND THE LABEL IS NOT A LIE. It still
            goes to `/pricing`, whose rungs go on to account creation —
            choosing what you are signing up for IS the first step of signing
            up. Re-pointing it straight at the form would be a funnel
            decision, and it is his to make, not a rename's to smuggle.

            NO THIRD BUTTON, which the roadmap entry asks for in as many
            words: he already has both, and what was missing was the word. */}
        <a className="cta sm" href="/pricing">Sign up<span className="ar">→</span></a>

        {/* ── THE PHONE'S WAY IN, 2026-09-06 ────────────────────────────
            **Below 470px every `.lk` was hidden and NOTHING replaced them**,
            so a phone had the wordmark and *Sign up* and no way to sign in
            at all. The owner found it; the roadmap note above claims the
            opposite because it was written from the markup rather than
            measured.

            THE REASON THEY WERE HIDDEN IS STILL TRUE and is why this is a
            button rather than more links: the pill wrapped to two lines and
            broke the wordmark across *DETAILING / PLATFORM*. A 32px square
            costs less width than the word *Menu*, and far less than three
            links.

            **SIGN UP STAYS OUTSIDE IT.** The one action a first-time visitor
            is here to take does not go behind a menu they have to discover;
            what goes inside is everything else. */}
        <button className="burger" type="button" aria-label={navOpen ? "Close menu" : "Menu"}
          aria-expanded={navOpen} aria-controls="navmenu"
          onClick={() => setNavOpen((v) => !v)}>
          <i></i><i></i>
        </button>
      </nav>

      {/* Outside the <nav> so the pill's own width never has to hold it. */}
      <div id="navmenu" className={`navmenu${navOpen ? " on" : ""}`} hidden={!navOpen}>
        <a className="lk" href="#get" onClick={() => setNavOpen(false)}>What you get</a>
        <a className="lk" href="#price" onClick={() => setNavOpen(false)}>Pricing</a>
        <a className="lk" href="/app">Sign in</a>
      </div>

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
              {/* ALL THREE PANES ARE IN THE DOM AND STACKED IN ONE GRID CELL.
                  The tallest sets the height, so the page below never moves
                  as they swap — the failure the old typewriter line already
                  reserved two lines to avoid, now applying to a whole block.
                  `aria-live` is deliberately ABSENT: this rotates on a timer,
                  and a live region that announces every six seconds talks
                  over the person reading it. The tabs are the accessible
                  route in, and they are real buttons. */}
              <div className="hpanes">
                {HERO.map((s, i) => (
                  <div className={`hpane${i === pane ? " on" : ""}`} key={s.k}
                       aria-hidden={i === pane ? undefined : true}>
                    <span className="lab">{s.lab}</span>
                    {/* Only the LIVE pane types; the other two hold their
                        full text, which is what keeps the grid cell's height
                        constant while a line is still being written. The
                        caret sits after the last character typed so far, and
                        goes when the line is finished. */}
                    <h1 className="disp xl">
                      {s.h.map((line, li) => {
                        const before = s.h.slice(0, li).reduce((n, l) => n + l.length, 0);
                        /* AN INACTIVE PANE'S HEADLINE IS EMPTY, NOT FULL,
                           and that one word is the whole of his complaint:
                           *"even though it disappears, it reappears in the
                           last second just to fade out — this weird snappy
                           thing."* The outgoing pane kept its FULL text
                           while it faded, so the line you had just watched
                           being rubbed out flashed back complete for the
                           140ms of the cross-fade. Empty here means the
                           headline is only ever written or erased — never
                           faded — which is the separation he asked for,
                           without a second element to keep in step. The
                           `min-height` on `.hline` holds the two lines of
                           space open, so nothing moves while it is blank. */
                        const shown = i === pane ? line.slice(0, Math.max(0, typed - before)) : "";
                        const writing = i === pane && typed > before && typed < before + line.length;
                        return (
                          <span className="hline" key={line}>
                            {shown}
                            {writing && <i className="caret" aria-hidden="true"></i>}
                          </span>
                        );
                      })}
                    </h1>
                    <p className="lede">{s.p}</p>
                    <div className="ctas">
                      <a className="cta" href="/pricing" data-glow=""
                         tabIndex={i === pane ? undefined : -1}>
                        {s.cta}<span className="ar">→</span>
                      </a>
                      <span className="fine">
                        Built by a detailer who got tired<br />of booking jobs at 11pm.
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* The tab strip doubles as the progress indicator — the fill
                  IS the timer, so the page never runs a countdown the
                  visitor cannot see. It stops being animated the moment
                  somebody steers, because a bar that keeps filling after
                  autoplay has stopped is lying about what happens next. */}
              <div className="htabs" role="tablist" aria-label="What the product is">
                {HERO.map((s, i) => (
                  <button key={s.k} type="button" role="tab"
                          className={`htab${steered ? " held" : ""}`}
                          aria-selected={i === pane}
                          onClick={() => steer(i)}>
                    {s.tab}
                    <i className="htab-bar" aria-hidden="true"></i>
                  </button>
                ))}
              </div>
            </div>

            {/* THE VISUAL CHANGES WITH THE WORDS, and that is the whole
                reason this is not a slideshow of captions. Three panes,
                stacked in one grid cell like the text, so the column has one
                height and the fold never moves.

                Every one of them is the PRODUCT, never a photograph of a
                car — law 10, and it is the distinction that survives this
                rebuild unchanged: the photo inside pane one is a picture of
                a CLIENT's website, which is what a detailer's site is made
                of, and it is the only photograph on the page.

                `aria-hidden` on all three: the words beside them already say
                everything these draw, and a screen reader walking three
                decorative mock-ups is three times the noise for none of the
                meaning. The reveal sits on the WRAPPER, not on `.float` —
                `.float` owns its own transform for the parallax and the two
                would overwrite each other. */}
            <div data-rv="lift" style={{ "--i": 2 }}>
              <div className="float" data-parallax="18" aria-hidden="true">
                <div className="hvis">

                  {/* THE OWNER'S OWN SCREENSHOTS, 2026-09-09.

                      Two builds preceded this one and both were wrong, in
                      opposite directions. First: hand-drawn mock-ups, which
                      he called fake. Then: the REAL components rendered live
                      and scaled down, which is the version that sounds right
                      in a commit message and looked, in his words, *"pretty
                      horrible… the booking page is just horrible, what even
                      is that?"* — and he was right. A 392px screen shrunk to
                      .61 is not the screen; the type goes to 8px, the touch
                      targets go to nothing, and every proportion the real
                      layout is built on stops holding.

                      SO THE LESSON IS NOT "SCREENSHOTS BEAT COMPONENTS". It
                      is that a MINIATURE OF A PHONE SCREEN IS UNREADABLE, and
                      that a picture cropped to what actually matters beats
                      both. His three are shot at roughly square, close in on
                      the part worth seeing, and are legible at the size this
                      column really is.

                      What they cost is the thing I flagged before and it is
                      still true: they go stale when the screens change. That
                      is a real trade, made knowingly, and the fix when it
                      comes due is four fresh screenshots — not a rebuild. */}

                  {/* 1 · a real tenant site. */}
                  <div className={`hv${pane === 0 ? " on" : ""}`}>
                    <div className="hframe">
                      <img src="/img/pane-site.webp" width="531" height="459"
                           loading="lazy" decoding="async" alt="" />
                    </div>
                  </div>

                  {/* 2 · the real booking page, step 1 of 7. */}
                  <div className={`hv${pane === 1 ? " on" : ""}`}>
                    <div className="hframe">
                      <img src="/img/pane-booking.webp" width="443" height="462"
                           loading="lazy" decoding="async" alt="" />
                    </div>
                  </div>

                  {/* 3 · the real dashboard. */}
                  <div className={`hv${pane === 2 ? " on" : ""}`}>
                    <div className="hframe">
                      <img src="/img/pane-dashboard.webp" width="530" height="500"
                           loading="lazy" decoding="async" alt="" />
                    </div>
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

        {/* ══ 2b · THE FIGURES ═══════════════════════════════════════════
            BORROWED FROM voiceflow.com — three numbers that roll up from
            zero as they arrive. A number is read in a glance; the sentence
            it replaces takes four seconds, and this page's whole problem
            is that it asks for too many of those four seconds.

            EVERY ONE OF THESE IS ALREADY CLAIMED IN PROSE FURTHER DOWN.
            That is the point: nothing new is being asserted, three of the
            page's existing claims are just being said in the form people
            actually read. Voiceflow's own version of this strip is
            customer counts and message volumes, which we do not have and
            will not invent — so ours are facts about the deal instead.

            THE COUNTER IS THE PAGE'S OWN, `data-count` in thread.js, which
            already drives the two prices in the pricing section. It starts
            when the row reveals, so the numbers cannot run before anybody
            is looking at them. */}
        <section className="figs wrap" aria-label="What the deal is">
          <div className="fig3" data-rv="" data-count-host="">
            <div className="fig3-i">
              <div className="fig3-n"><span data-count="0" data-suffix="%">0%</span></div>
              <p className="fig3-c">Commission on every job you take. A fully
                booked month costs the same as a slow one.</p>
            </div>
            <div className="fig3-i">
              <div className="fig3-n"><span data-count="24" data-suffix="/7">24/7</span></div>
              <p className="fig3-c">Your page keeps taking bookings while you
                are under a car, or asleep.</p>
            </div>
            <div className="fig3-i">
              <div className="fig3-n"><span data-count="3" data-suffix="">3</span></div>
              <p className="fig3-c">The site, the booking page and the screen
                you run both from. One build, one bill.</p>
            </div>
          </div>
        </section>

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
                        alt="A detailer working along the hood of a dark car"
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

        {/* ══ 3b · THE WALL ══════════════════════════════════════════════
            BORROWED FROM pryzm.design, the last of the five. Theirs is a
            slow-drifting field of their own work behind quiet type, and the
            reason it works is that the work IS the argument — you do not
            have to be told they are good at backgrounds.

            OURS IS NINE REAL SCREENS, PHOTOGRAPHED FROM THE RUNNING
            PRODUCT — not mock-ups, not stock, and not photographs of cars,
            which law 10 keeps off this page because we sell software. Three
            detailer sites we have actually built, three steps of the real
            booking flow, three tabs of the real dashboard. Every one was
            captured by driving the live app and cropping to the part that
            sells; the recipe is a script, so refreshing the set is a run
            rather than a design job.

            WHICH NINE, AND WHY THOSE: the owner asked to prioritise what
            earns the most marketing. Picking a time and the month view are
            the two screens that answer "can it really handle my diary";
            the three sites answer "will mine look generic"; Money and the
            review step answer the two things detailers ask about last.
            Deliberately NOT here: settings, empty states, and the five
            other booking steps, which are the product being thorough
            rather than the product being good. */}
        <section className="wall" aria-labelledby="wallh">
          {/* THREE ROWS THAT NEVER STOP MOVING, which is the correction to
              the version before this: that one was a static grid with a
              slow 58-second nudge, and the owner is right that it read as
              a picture of a wall rather than a wall.

              MEASURED OFF pryzm.design RATHER THAN REMEMBERED. Their tiles
              are 14px-rounded and come in four widths (175/195/215/235)
              across three aspects (4:3, 1:1, 3:4), and the whole field is
              one transformed layer. What they do NOT do is auto-scroll —
              theirs answers the pointer — but he asked for constant travel,
              so this is their grammar on a marquee.

              EACH ROW CARRIES THE NINE TWICE and slides exactly -50%, so
              the loop closes on itself with no jump. The three rows run at
              92s, 116s and 78s, the middle one reversed, and each shuffles
              the nine into a different order — three rows at one speed in
              one order is a grid that happens to be moving.

              HOVER STOPS THE ROW IT IS IN. A tile that lifts while its own
              row keeps sliding out from under the pointer is a thing you
              cannot actually look at.

              EIGHTEEN TILES, EACH USED EXACTLY ONCE ACROSS THE THREE ROWS.
              The first set was nine, which meant every row repeated the
              same handful and the duplicates were the first thing the owner
              saw. Eighteen is enough that a tile's second appearance is its
              loop copy, half a row away.

              AND THEY ALL COME FROM ex1/ex2/ex3 NOW. The orange one that
              kept catching the eye was `example4`, one of the older
              mock-ups; the current three are the only sites in here, shot
              at several points down each page — a hero, a prices table, a
              work gallery — so one site yields three genuinely different
              tiles rather than three copies of its own header. */}
          <div className="wallrows" aria-hidden="true">
            {WALL.map((row, i) => (
              <div key={i} className={`wrow r${i + 1}`} data-rev={i === 1 ? "" : undefined}
                   style={{ "--dur": WALL_SPEED[i] }}>
                {/* THE NINE ARE LAID DOWN TWICE and the track slides exactly
                    -50%, so the loop closes on itself with no jump. Any
                    other figure and it stutters once a minute — a defect no
                    screenshot ever catches. */}
                <div className="wtrack">
                  {[...row, ...row].map(([file, cap], j) => (
                    <figure className="wt" key={`${file}-${j}`}>
                      <img src={`/img/wall/${file}.webp`} loading="lazy" decoding="async" alt="" />
                      <figcaption>{cap}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* OVER the field, not beside it. His note: *"text elements above
              them, not like their own section, so they're more integrated
              into the background."* The scrim is local to the words — a
              soft pool behind this block only — so the screens either side
              of it stay at full brightness and legible, which is the whole
              reason they are here. */}
          <div className="wrap wallcopy">
            {/* THE COPY MAKES THE CLAIM; THE PICTURES ARE THE EVIDENCE.
                It read the other way round until the owner caught it,
                2026-09-09: *"Why is it just explaining what the pictures
                are? It should be… advertising what we provide, not
                advertising that I've prebuilt some stuff."* He is right,
                and the eyebrow was the worst of it — "Already built" sold
                OUR preparation, which is not a thing anybody is buying.

                SO THE WALL IS NOW A WITNESS TO A SENTENCE ABOUT THE READER.
                "Every one of these was built for one person" turns eighteen
                screenshots from a list of contents into proof of the only
                claim that matters here — that nothing is picked off a
                shelf — and "yours will be too" is the turn that makes them
                about him rather than about us.

                AND THE COUNT IS GONE WITH IT. A number was the right fix
                while the headline was a caption; a headline that no longer
                counts anything cannot go stale at all, which is better. */}
            <span className="lab" data-rv="">What gets built</span>
            <h2 className="disp" id="wallh" style={{ marginTop: 12 }}>
              <span className="mask"><span>Every one of these</span></span>
              <span className="mask" style={{ "--i": 1 }}><span>was built for one person.</span></span>
            </h2>
            <p className="lede" data-rv="" style={{ "--i": 2 }}>
              Yours will be too. A site designed around the work you actually
              do, the booking page living inside it, and the screen you run
              the week from — not a template with your name dropped into it.
            </p>
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

        {/* ══ 4b · THE FIGURE ════════════════════════════════════════════
            THE OWNER'S CUT-OUT, BUILT INTO THE PAGE RATHER THAN PLACED ON
            IT. His brief, 2026-09-09: *"I wanted it to be integrated into
            the site so we could take advantage of the fact that he's cut
            out — so we have text underneath him or overlaid, and things
            going around him."*

            FOUR RULES CAME OUT OF THE VERSION HE REJECTED, and they are
            what this section is shaped by:

            1. **NO CROP THROUGH HIS BODY.** The image is used WHOLE. Its
               own alpha is the only edge: transparent above the hat, down
               both sides, and his legs stop at the picture's bottom, which
               is put flush with the band's bottom so he stands ON it.
               Nothing is sliced, so nothing needs hiding.
            2. **NO LINEAR FADE.** *"Don't do this kind of angled. Do a more
               circular fade."* There is no fade at all here, which is
               better than a good one — the only softening is a radial
               shadow pooled under his feet, and that is a shadow, not a
               mask.
            3. **THE TEXT GOES BEHIND HIM.** That is the whole reason to
               have a cut-out instead of a photograph, so the headline runs
               under his arm on purpose. It is the LAST line that is
               overlapped — never a first line and never the lede, because
               a sentence you cannot finish reading is not a design.
            4. **THINGS AROUND HIM.** Three real fragments of the product,
               at three depths: one behind his shoulder, two in front. They
               are the same components the dashboard uses. */}
        <section className="figband" aria-labelledby="figh">
          <div className="wrap figgrid">
            <div className="figcopy">
              <span className="lab" data-rv="">Where you actually work</span>
              <h2 className="disp" id="figh" style={{ marginTop: 14 }}>
                <span className="mask"><span>Your back office</span></span>
                <span className="mask" style={{ "--i": 1 }}><span>fits in one hand.</span></span>
              </h2>
              <p className="lede" data-rv="" style={{ "--i": 2 }}>
                Between two cars, in somebody&apos;s driveway, at a red light.
                Mark a job done, take the money for it, move tomorrow&apos;s
                booking — without going home first.
              </p>
              <div className="figlist" data-rv="" style={{ "--i": 3 }}>
                <div className="figrow"><span>Take a card payment</span><span className="mono">on the driveway</span></div>
                <div className="figrow"><span>Mark a job complete</span><span className="mono">one tap</span></div>
                <div className="figrow"><span>Move a booking</span><span className="mono">they get told</span></div>
              </div>
            </div>

            <div className="figman" aria-hidden="true">
              {/* BEHIND HIM — the one card the figure overlaps, which is
                  what sells the depth. Anything important would be a
                  mistake here; this is the oldest of the three events and
                  the one you are meant to read past. */}
              <div className="figcard back" data-parallax="10">
                <span className="lab ac">Booked · 9:41pm</span>
                <div className="figcard-t">Sunday, 10:30 — Interior Reset</div>
              </div>

              <div className="figwin">
                <img className="figimg" src="/img/detailer-phone.webp"
                     width="941" height="1672" loading="lazy" decoding="async" alt="" />
              </div>

              {/* IN FRONT — pinned to his forearm and to the ground he
                  stands on, so they read as the phone's own output rather
                  than as page furniture. */}
              {/* His right, behind him — the balancing card. */}
              <div className="figcard back next" data-parallax="12">
                <span className="lab">Tomorrow</span>
                <div className="figcard-t">8:00 — Express Wash · $65</div>
              </div>

              <div className="figcard front pay" data-parallax="-16">
                <div className="figcard-t">$95 · paid by card</div>
                <span className="figcard-s">Marcus Hill · Wash &amp; Wax</span>
              </div>
              <div className="figcard front done" data-parallax="-8">
                <span className="tick" aria-hidden="true">✓</span>
                <div className="figcard-t">Marked complete</div>
              </div>
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
          {/* aria-hidden: every one of these four is said in full somewhere
              above, and a screen reader reading the page's closing argument
              should not have to walk four fragments of shorthand first. */}
          <div className="corners" aria-hidden="true">
            <span className="corner tl">// what it is<br />site <b>·</b> booking <b>·</b> dashboard</span>
            <span className="corner tr">// commission<br /><b>0%</b> · always</span>
            <span className="corner bl">// setup<br />no migration</span>
            <span className="corner br">// cancel<br />any time · data is yours</span>
          </div>
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
      {/* TWO LATTICES, ONE SHOWN. `.dots` is the CSS one — a repeating
          background drifting on the compositor, which is free and is what a
          phone and the reduced-motion path keep. `#dotfield` is the canvas
          that reacts to the pointer, and `thread.js` only turns it on for a
          FINE pointer with motion allowed; when it does, it puts `.field` on
          the ground and the CSS one hides. A phone has no cursor for dots to
          avoid, so there is nothing to degrade to. */}
      <span className="dots"></span>
      <canvas className="dotfield" id="dotfield"></canvas>
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
