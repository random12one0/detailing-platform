/* All of the motion on the marketing page. Roadmap 2.2.
   ==================================================================
   A PORT of the script in docs/design-directions/5-the-thread.html — the
   page the owner approved — with the reasoning comments kept, because
   almost every number in here was measured against something and the note
   says against what.

   No library, no CDN, no licence to audit (law 13). All of this together
   is smaller than Lenis alone.

   THREE THINGS DIFFER FROM THE REFERENCE SCRIPT, all of them because this
   runs inside a single-page app rather than in a document that is thrown
   away on navigation:

   1. It is mountable and, more importantly, UNMOUNTABLE. Everything it
      opens — listeners, timers, animation frames, the nodes it builds — is
      registered and closed by the teardown this returns. A route that
      leaks a wheel handler onto window makes the dashboard feel broken and
      nobody would connect the two.
   2. `.lite` is READ, not decided. app/src/main.jsx owns that class for the
      whole app: it sets it from ?lite=1 and from prefers-reduced-motion,
      which is the system's single-code-path rule (docs/design-system.md,
      Degradation). This module only adds it as its own load-timeout safety
      net, and takes that back on the way out.
   3. The message bubbles' container is CREATED here rather than rendered
      by React. It is re-parented between the left column and the dashboard
      as the layout changes, and React must never be asked to remove a node
      that has been moved out from under it. The job rows are appended into
      a container React renders and never re-renders. */

/* Mount the page's motion. Returns a teardown function. */
export function initThread() {
  const html = document.documentElement;
  const qs = new URLSearchParams(location.search);
  const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
  const FINE = mm("(hover: hover) and (pointer: fine)");
  /* main.jsx has already decided this for the whole app. */
  const LITE = html.classList.contains("lite");

  /* Everything that has to be undone on the way out. */
  const cleanup = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanup.push(() => target.removeEventListener(type, fn, opts));
  };
  let dead = false;

  /* The safety net. If anything below throws, or the fonts never arrive,
     the page still shows all of its content. A landing page that hides its
     own copy is worse than one that does not animate. */
  let netted = false;
  const net = () => {
    if (netted) return;
    netted = true;
    if (!html.classList.contains("lite")) {
      html.classList.add("lite");
      cleanup.push(() => html.classList.remove("lite"));
    }
  };
  const netTimer = setTimeout(net, 6000);
  cleanup.push(() => clearTimeout(netTimer));

  try {
    /* ── The one source of truth ──────────────────────────────────────
       The thread and the dashboard are rendered from THIS, and the money
       totals are summed from it — the honesty rule. Change a price here
       and the tiles and the rows all move. */
    const JOBS = [
      { at: "9:00",  who: "Marcus Hill", svc: "Wash & Wax",     amt: 95,  msg: "u free sat?",          when: "11:42 PM" },
      { at: "11:30", who: "Dana Ruiz",   svc: "Full Detail",    amt: 240, msg: "how much for a Tahoe", when: "6:08 AM"  },
      { at: "1:30",  who: "Ali Nasser",  svc: "Interior Reset", amt: 120, msg: "still there?",         when: "7:15 AM"  },
      { at: "4:00",  who: "Priya Shah",  svc: "Express Wash",   amt: 65,  msg: "can we do 9 instead",  when: "8:31 AM"  },
    ];
    const TOTAL = JOBS.reduce((s, j) => s + j.amt, 0);
    const usd = (n) => "$" + n.toLocaleString("en-US");

    const id = (n) => document.getElementById(n);
    const threadWrap = id("threadWrap");
    const jobsEl = id("jobs");
    const lft = id("lft");
    const rgt = id("rgt");
    const divider = id("divider");
    const cost = id("cost");
    const dashLab = id("dashLab");
    const dashQ = id("dashQ");
    const tCount = id("tCount");
    const tCountQ = id("tCountQ");
    const tMoney = id("tMoney");
    const dash = document.querySelector(".ld .dash");
    const stage = document.querySelector(".ld .stage");
    const jobsHold = document.querySelector(".ld .jobshold");

    /* Created here, not rendered by React — see the header note 3. */
    const thread = document.createElement("div");
    thread.className = "thread";
    lft.appendChild(thread);
    cleanup.push(() => { thread.remove(); jobsEl.replaceChildren(); });

    const bubs = [], rows = [];
    JOBS.forEach((j, i) => {
      const b = document.createElement("div");
      b.className = "bub";
      b.innerHTML = '<span></span><span class="t"></span>';
      b.firstChild.textContent = j.msg;
      b.lastChild.textContent = j.when;
      thread.appendChild(b);
      bubs.push(b);

      const r = document.createElement("div");
      r.className = "job" + (i === 0 ? " next" : "");
      r.innerHTML =
        '<div class="l1"><div><span class="nm"></span><div class="sv"></div></div><span class="amt"></span></div>' +
        (i === 0 ? '<div class="acts"><span>Navigate</span><span>Call</span><span>Text</span><span>Mark complete</span></div>' : "");
      r.querySelector(".nm").textContent = j.at + " — " + j.who;
      r.querySelector(".sv").textContent = j.svc;
      r.querySelector(".amt").textContent = usd(j.amt);
      jobsEl.appendChild(r);
      rows.push(r);
    });

    /* Figures roll up when they arrive instead of being there already. The
       final string is measured first and its width reserved in `ch`, so
       counting never nudges the layout; the figures are mono and tabular
       for the same reason. */
    function roll(el) {
      const to = +el.getAttribute("data-count");
      const pre = el.getAttribute("data-prefix") || "";
      const final = pre + to.toLocaleString("en-US");
      el.style.display = "inline-block";
      el.style.minWidth = final.length + "ch";
      if (LITE) { el.textContent = final; return; }
      /* A generation token, because the figure can be re-entered while a
         previous count is still running — scroll up and down quickly and
         two loops would otherwise write to the same element and fight. */
      const gen = (el._gen = (el._gen || 0) + 1);
      let t0 = 0;
      requestAnimationFrame(function tick(t) {
        if (dead || el._gen !== gen) return;
        if (!t0) t0 = t;
        const p = Math.min(1, (t - t0) / 900);
        const e2 = 1 - Math.pow(1 - p, 3);            // decelerate into place
        el.textContent = pre + Math.round(to * e2).toLocaleString("en-US");
        if (p < 1) requestAnimationFrame(tick);
      });
    }

    /* Where the page holds still, in document coordinates. Used by the
       weighted scroll to refuse to bank more than half a screen of
       momentum inside a beat. */
    const pinZones = [];
    function computePinZones() {
      pinZones.length = 0;
      const r = threadWrap.getBoundingClientRect();
      const top = r.top + window.scrollY;
      /* Starts a third of a screen EARLY, so you decelerate into the lock
         instead of arriving at full speed. */
      pinZones.push([top - window.innerHeight * 0.33, top + r.height]);
    }
    const insidePin = (y) => pinZones.some(([a, b]) => y > a && y < b);

    /* On a phone the thread lives INSIDE the dashboard, over the space the
       job rows reserve, so a message turns into its row where it stands
       instead of flying half a screen to get there. Re-parented rather
       than duplicated: one set of bubbles, one source of truth. */
    const PHONE = window.matchMedia("(max-width: 820px)");
    function placeThread() {
      const host = PHONE.matches ? jobsHold : lft;
      if (thread.parentNode !== host) host.appendChild(thread);
    }

    /* Each message is parked ON its own row, not stacked evenly above
       them. The rows are not the same height — the first carries Navigate
       / Call / Text — so an evenly spaced stack drifts, and by the third
       message it was sitting over the SECOND row. Read the row, place the
       message on it. Only on a phone; the desktop layout has them in
       separate columns on purpose. */
    function alignBubbles() {
      const onPhone = PHONE.matches;
      const hb = onPhone ? jobsHold.getBoundingClientRect() : null;
      for (let i = 0; i < bubs.length; i++) {
        if (onPhone) {
          bubs[i].style.position = "absolute";
          bubs[i].style.left = "0px";
          bubs[i].style.top = (rows[i].getBoundingClientRect().top - hb.top).toFixed(1) + "px";
        } else {
          bubs[i].style.position = "";
          bubs[i].style.left = "";
          bubs[i].style.top = "";
        }
      }
    }

    function measure() {
      placeThread();
      alignBubbles();
      bubs.forEach((b, i) => {
        b.style.setProperty("--dx", "0px");
        b.style.setProperty("--dy", "0px");
        const a = b.getBoundingClientRect(), z = rows[i].getBoundingClientRect();
        b.style.setProperty("--dx", (z.left + z.width / 2 - (a.left + a.width / 2)).toFixed(1) + "px");
        b.style.setProperty("--dy", (z.top + z.height / 2 - (a.top + a.height / 2)).toFixed(1) + "px");
      });
      /* How far the dashboard has to travel to sit in the middle of the
         screen once the thread's column has emptied. Zero once the columns
         have stacked on a phone, because it is already centred there. */
      rgt.style.setProperty("--shift", "0px");
      const d = rgt.getBoundingClientRect();
      rgt.style.setProperty("--shift", (window.innerWidth / 2 - (d.left + d.width / 2)).toFixed(1) + "px");
      cacheReveals();
      computePinZones();
    }

    /* ── Two scroll presets and nothing else ──────────────────────────
       One shared rAF-throttled listener, and a progress value 0..1 written
       to a CSS variable so the paint stays on the compositor. */
    const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

    /* The curve, solved rather than approximated. A scrubbed beat needs
       the SAME easing a CSS transition would use, but CSS cannot ease
       something driven by scroll position. Binary subdivision, twelve
       steps, which lands well inside a pixel and costs nothing once per
       frame. Mirrors `--e-out`; if one changes the other has to. */
    function bezier(x1, y1, x2, y2) {
      const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
      const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
      const sx = (t) => ((ax * t + bx) * t + cx) * t;
      const sy = (t) => ((ay * t + by) * t + cy) * t;
      return (x) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        let lo = 0, hi = 1, t = x;
        for (let i = 0; i < 12; i++) {
          if (sx(t) < x) lo = t; else hi = t;
          t = (lo + hi) / 2;
        }
        return sy(t);
      };
    }
    const easeOut = bezier(0.16, 0.84, 0.34, 1);

    /* ── How a pinned beat reads its own progress ──────────────────────
       `pause` is a stretch at each end of the hold where the section is
       locked and NOTHING happens — you arrive, it stops, and for four
       tenths of a screen it just sits there before it begins. That is what
       absorbs a flick that arrives with momentum.

       WHAT THIS RETURNS IS LINEAR, deliberately. Easing the WHOLE hold and
       then carving each message out of the eased value crushes them
       together: measured, the four ended up 0.10 to 0.18 of a screen apart
       inside a 3-screen hold, with a screen of dead air at each end. The
       easing belongs on each BEAT, not on the hold (law 7).

       `window.innerHeight` DOES NOT APPEAR HERE, and that is the iOS fix.
       The denominator is the wrapper's height minus the STAGE's height —
       both svh-based, both still while you scroll. */
    function pinProgress(el, stageH) {
      const r = el.getBoundingClientRect();
      const run = Math.max(1, r.height - stageH);
      const pause = stageH * 0.40;
      return clamp((-r.top - pause) / Math.max(1, run - pause * 2));
    }

    const scrubs = [];
    const addScrub = (el, fn) => scrubs.push({ el, fn });

    addScrub(threadWrap, (el) => {
      const p = pinProgress(el, stage.getBoundingClientRect().height);
      divider.style.setProperty("--p", p.toFixed(4));
      /* The beat is finished by 0.87 rather than 0.98: the last stretch of
         the hold is deliberately still, so the finished day sits there for
         about half a screen of scrolling before the section lets go. */
      const c = easeOut(clamp((p - 0.87) / 0.11)).toFixed(3);
      lft.style.setProperty("--c", c);
      rgt.style.setProperty("--c", c);
      divider.style.setProperty("--c", c);
      cost.style.setProperty("--c", c);

      /* Each bubble's own window. Staggered, so the four land one after the
         other rather than all at once — and the bubble leaving and the row
         arriving share a window, which is what makes it read as ONE event
         instead of two. 0.20 of the animated middle each, about 0.44 of a
         screen per message, and each one eases itself on the way through. */
      let landed = 0, money = 0;
      for (let i = 0; i < bubs.length; i++) {
        const s = 0.05 + i * 0.20, e = s + 0.22;
        const f = easeOut(clamp((p - s) / (e - s)));
        bubs[i].style.setProperty("--f", f.toFixed(3));
        rows[i].style.setProperty("--f", f.toFixed(3));
        if (i === 0) dash.style.setProperty("--f0", f.toFixed(3));
        if (f > 0.5) { landed++; money += JOBS[i].amt; }
      }
      setSummary(landed, money);
    });

    /* The header and the two tiles always describe the rows that are
       actually showing. Pulled out because the lite path never runs a
       scroll frame, and without this it rendered "0 jobs · $0" above four
       visible jobs — the dashboard contradicting itself in the one mode a
       reduced-motion visitor ever sees. */
    function setSummary(landed, money) {
      dashLab.classList.toggle("on", landed > 0);
      tCount.textContent = String(landed);
      tCountQ.textContent = landed === 0 ? "Nothing booked" : landed + " to go";
      tMoney.textContent = usd(money);
      dashQ.textContent = landed === 0
        ? "Morning, Andrew · nothing booked"
        : "Morning, Andrew · " + landed + " of " + landed + " still to do";
    }
    if (LITE) { setSummary(JOBS.length, TOTAL); dash.style.setProperty("--f0", "1"); }

    /* The ruled rows light themselves on a touch screen, where there is no
       cursor to do it. Only registered when the device cannot hover, so a
       desktop keeps the hover behaviour and never fights it. */
    if (!FINE) {
      const ruled = [...document.querySelectorAll(".ld .r")];
      addScrub(document.querySelector(".ld .ruled"), (el, vh) => {
        let best = null, bestD = Infinity;
        for (const row of ruled) {
          const b = row.getBoundingClientRect();
          const d = Math.abs(b.top + b.height / 2 - vh * 0.5);
          if (d < bestD) { bestD = d; best = row; }
        }
        /* Only while the list is actually on screen — otherwise a row stays
           lit off-screen and is lit before you ever reach it. */
        for (const row of ruled) row.classList.toggle("near", row === best && bestD < vh * 0.3);
      });
    }

    /* Opening a question moves everything below it down the document, and
       the reveal rule compares against CACHED positions — so without this,
       every element after the FAQ would be measured against where it used
       to be and could sit visible-but-hidden for the rest of the session
       (law 5). Twice, because the answer SLIDES open over 380ms: the
       positions at the moment of the toggle are the positions mid-slide. */
    for (const d of document.querySelectorAll(".ld .qs details")) {
      on(d, "toggle", () => {
        cacheReveals(); onScroll();
        const t = setTimeout(() => { cacheReveals(); onScroll(); }, 430);
        cleanup.push(() => clearTimeout(t));
      });
    }

    /* ── The comparison table wipes itself in ─────────────────────────
       Each row gets its own 0..1 as it crosses the lower part of the
       screen: the rule draws left to right, the text slides in behind it,
       and the lit row is clipped from the left so its whole panel arrives
       like a shutter. The window is set so a row is FINISHED wiping by the
       time it reaches the part of the screen you read from — the first
       attempt ran until 0.88 of the viewport and a phone caught rows still
       at 39% opacity inside the reading zone, measured at 1.80:1, which is
       not an animation, it is unreadable text. */
    const vstable = id("vstable");
    if (vstable) {
      const vrows = [...vstable.children];
      addScrub(vstable, (el, vh) => {
        for (const r of vrows) {
          const b = r.getBoundingClientRect();
          r.style.setProperty("--rp", clamp((vh - b.top) / (b.height + vh * 0.16)).toFixed(3));
        }
      });
    }

    /* ── The closing glow gathers ─────────────────────────────────────
       Over the section's own approach rather than over the whole page, so
       it is the same on a long page and a short one. */
    const endSec = document.querySelector(".ld .end");
    if (endSec) {
      addScrub(endSec, (el, vh) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--ep", clamp((vh - r.top) / (r.height * 0.62 + vh * 0.38)).toFixed(3));
      });
    }

    /* Depth: an element drifts a little slower than the page it sits on. A
       dozen pixels — enough to feel nearer than the ground, not enough to
       read as an effect. */
    for (const el of document.querySelectorAll(".ld [data-parallax]")) {
      const k = parseFloat(el.getAttribute("data-parallax")) || 14;
      addScrub(el, (e, vh) => {
        const r = e.getBoundingClientRect();
        e.style.setProperty("--py", ((0.5 - (r.top + r.height / 2) / vh) * 2 * k).toFixed(1) + "px");
      });
    }

    /* The nav gives screen back on the way down and returns on the way up.
       A phone-first pattern; the governing value is screen. */
    const nav = id("nav");
    let lastY = window.scrollY;
    let ticking = false;
    function frame() {
      ticking = false;
      if (dead) return;
      const vh = window.innerHeight, y = window.scrollY;
      /* The scrubs are skipped in LITE, not just the reveal sweep: the
         listener is only attached when !LITE, but ready() calls onScroll()
         once unconditionally — so a reduced-motion visitor would get
         exactly one scrub frame, at progress 0, writing "0 jobs · $0" over
         four fully visible job rows. Every scrub target is overridden by
         .lite CSS anyway. */
      if (!LITE) {
        sweep(vh);
        for (const s of scrubs) s.fn(s.el, vh);
      }
      nav.classList.toggle("scr", y > 40);
      nav.classList.toggle("hid", y > 220 && y > lastY);
      lastY = y;
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

    if (!LITE) {
      on(window, "scroll", onScroll, { passive: true });
      /* WIDTH only. On iOS Safari the URL bar hiding and returning fires a
         resize on almost every scroll gesture, and re-measuring the flight
         paths in the middle of the flight is a visible jump. Nothing
         measured here depends on height. */
      let lastW = window.innerWidth;
      on(window, "resize", () => {
        if (window.innerWidth === lastW) { onScroll(); return; }
        lastW = window.innerWidth;
        measure();
        onScroll();
      });
      on(window, "orientationchange", () => {
        lastW = 0;
        const t = setTimeout(() => { lastW = window.innerWidth; measure(); onScroll(); }, 250);
        cleanup.push(() => clearTimeout(t));
      });
    }

    /* ── Reveal on approach ───────────────────────────────────────────
       ONE mechanism, driven by the scroll frame that already runs.
       Position-driven and REVERSIBLE: an element is hidden ONLY while its
       top is still below 82% of the screen — that is, only while it is in
       the strip at the very bottom you have not read yet. Land anywhere,
       reload anywhere, follow a link into the middle of the page and
       everything you can actually read is already in its end state.

       Positions are cached rather than measured per frame: 42 elements ×
       getBoundingClientRect on every scroll frame is a layout read the
       phone does not need to do. They are re-cached whenever the layout
       can actually have changed — fonts arriving, a width change, an
       orientation change, a <details> toggle. */
    const revealables = document.querySelectorAll(".ld [data-rv], .ld .mask, .ld [data-count]");
    const counted = [];
    const figuresIn = (n) =>
      n.hasAttribute("data-count") ? [n] : [...n.querySelectorAll("[data-count]")];
    function reveal(n) {
      n.classList.add("in");
      /* A figure inside something that reveals starts counting with it. */
      for (const c of figuresIn(n)) {
        if (counted.indexOf(c) > -1) continue;
        counted.push(c);
        roll(c);
      }
    }

    const rvPos = [];
    function cacheReveals() {
      rvPos.length = 0;
      for (const el of revealables) rvPos.push(el.getBoundingClientRect().top + window.scrollY);
    }
    function sweep(vh) {
      /* If a scroll frame beats the first measure, cache now rather than
         compare against nothing — an undefined position would read as
         "below the line" and hide the whole page. */
      if (rvPos.length !== revealables.length) cacheReveals();

      /* THE BOTTOM OF THE PAGE NEEDS THE LINE TO MOVE: at maximum scroll,
         anything sitting in the last 18% of the screen is below the reveal
         line AND there is no scroll left to bring it above — so the second
         pricing card, three of the terms and the whole footer were on
         screen and permanently invisible. Over the final stretch the line
         eases from 82% down to the full viewport height, so everything can
         always finish arriving. */
      const maxY = Math.max(0, document.documentElement.scrollHeight - vh);
      const tail = vh * 0.18;
      const slack = tail > 0 ? clamp((window.scrollY - (maxY - tail)) / tail) : 1;
      const line = window.scrollY + vh * (0.82 + 0.18 * slack);

      /* HYSTERESIS. Inside that last stretch the line is eased, which means
         it moves at roughly TWICE the scroll delta — so scrolling UP 120px
         dropped it ~240px, back past elements it had only just revealed,
         and the footer oscillated. So the line an element ARRIVES on and
         the line it LEAVES on are no longer the same line: it arrives at
         82% of the screen, and it does not leave until it is past the
         bottom edge — a band exactly as wide as the easing can travel, so
         the two can never cross (law 5). */
      for (let i = 0; i < revealables.length; i++) {
        const el = revealables[i];
        const isIn = el.classList.contains("in");
        const shown = rvPos[i] < (isIn ? line + vh * 0.18 : line);
        if (isIn === shown) continue;                        // nothing to do
        if (shown) {
          reveal(el);
        } else {
          el.classList.remove("in");
          /* Let its figures count again next time it comes back. */
          for (const c of figuresIn(el)) {
            const k = counted.indexOf(c);
            if (k > -1) counted.splice(k, 1);
          }
        }
      }
    }
    if (LITE) revealables.forEach(reveal);

    /* ── The rotating tail ────────────────────────────────────────────
       70 + random*40 ms per character so it never reads as a machine, 2200
       ms holding the full phrase, and deleting faster than typing (exits
       faster than entrances). Under reduced motion it prints the first
       phrase and stops — a looping <h1> is the single most disruptive
       thing on a page for that visitor. */
    const TAILS = [
      "Booking built in.",
      "Prices you change yourself.",
      "It can't double-book you.",
      "Nobody else's name on it.",
      "No commission, ever.",
    ];
    const tw = id("tw");
    if (LITE) {
      tw.textContent = TAILS[0];
    } else {
      let wi = 0, ci = 0, del = false, twTimer = 0;
      cleanup.push(() => clearTimeout(twTimer));
      (function tick() {
        if (dead) return;
        const w = TAILS[wi];
        ci += del ? -1 : 1;
        tw.textContent = w.slice(0, ci);
        let wait = 70 + Math.random() * 40;
        if (!del && ci === w.length) { del = true; wait = 2200; }
        else if (del && ci === 0) { del = false; wi = (wi + 1) % TAILS.length; wait = 400; }
        else if (del) { wait = 34; }
        twTimer = setTimeout(tick, wait);
      })();
    }

    /* ── Fine-pointer only, by construction ───────────────────────────
       A cursor tilt on a phone just fights the scroll, and there is no
       cursor to follow anyway. */
    if (FINE && !LITE) {
      /* The light LERPS toward the cursor rather than tracking it exactly:
         the small lag is the difference between a lit surface and a torch
         taped to the mouse. One composited layer moved by transform, so it
         costs a frame of compositing and nothing else. */
      const ground = id("ground");
      const glow = id("cursorGlow");
      let gx = window.innerWidth / 2, gy = window.innerHeight / 2;
      let tx = gx, ty = gy, graf = 0;
      cleanup.push(() => cancelAnimationFrame(graf));
      function gstep() {
        if (dead) return;
        gx += (tx - gx) * 0.09;
        gy += (ty - gy) * 0.09;
        glow.style.setProperty("--gx", gx.toFixed(1) + "px");
        glow.style.setProperty("--gy", gy.toFixed(1) + "px");
        graf = (Math.abs(tx - gx) < 0.5 && Math.abs(ty - gy) < 0.5)
          ? 0 : requestAnimationFrame(gstep);
      }
      on(window, "pointermove", (e) => {
        tx = e.clientX; ty = e.clientY;
        ground.classList.add("awake");
        if (!graf) graf = requestAnimationFrame(gstep);
      }, { passive: true });

      for (const el of document.querySelectorAll(".ld [data-glow]")) {
        on(el, "pointermove", (e) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--mx", (e.clientX - r.left) + "px");
          el.style.setProperty("--my", (e.clientY - r.top) + "px");
        });
      }
      for (const el of document.querySelectorAll(".ld [data-tilt]")) {
        let f = 0;
        cleanup.push(() => cancelAnimationFrame(f));
        on(el, "pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
          cancelAnimationFrame(f);
          f = requestAnimationFrame(() => {
            el.style.setProperty("--rx", (-py * 5).toFixed(2) + "deg");
            el.style.setProperty("--ry", (px * 5).toFixed(2) + "deg");
            el.style.setProperty("--lx", ((px + 0.5) * 100).toFixed(1) + "%");
            el.style.setProperty("--ly", ((py + 0.5) * 100).toFixed(1) + "%");
          });
        });
        on(el, "pointerleave", () => {
          cancelAnimationFrame(f);
          el.style.setProperty("--rx", "0deg");
          el.style.setProperty("--ry", "0deg");
        });
      }
    }

    /* ── The weighted scroll ──────────────────────────────────────────
       The owner's #1 stated preference, named first and unprompted:
       "there's a velocity to the scroll". Thirty lines instead of Lenis's
       3 KB, and it moves the REAL scroll position rather than translating a
       wrapper, so position:sticky keeps working — which matters, because
       the thread section is built on it.

       Desktop and fine-pointer only. A phone's one-to-one finger scroll is
       the interaction phones get exactly right. ?smooth=0 turns it off so
       both can be felt on the same machine in one sitting.

       WHEEL is distance per notch — how far one gesture carries you. LERP
       is how much of the remaining gap is closed each frame, so a SMALLER
       number is a longer, slower tail. Below about 0.04 this stops feeling
       weighted and starts feeling broken. */
    if (FINE && !LITE && qs.get("smooth") !== "0") {
      const WHEEL = 1.22, LERP = 0.055;
      let target = window.scrollY, cur = target, raf = 0;
      cleanup.push(() => cancelAnimationFrame(raf));
      const maxY = () => document.documentElement.scrollHeight - window.innerHeight;
      on(window, "wheel", (e) => {
        if (e.ctrlKey) return;                     // leave browser zoom alone
        e.preventDefault();
        /* Inside a locked beat one notch of wheel carries a little over half
           as far as it does on open page. That is the ramp — the page gets
           heavier as you enter the section and light again when you leave
           it — and it is what stops a single trackpad flick from spending
           the whole beat. */
        const heavy = insidePin(cur);
        const d = e.deltaY * (e.deltaMode === 1 ? 18 : 1) * WHEEL * (heavy ? 0.5 : 1);
        target = Math.max(0, Math.min(maxY(), target + d));

        /* A FLICK CANNOT CLEAR A LOCKED BEAT. The weighted scroll banks the
           whole gesture into `target` and then eases toward it, so one hard
           flick on a trackpad can bank two thousand pixels — more than the
           entire beat. Inside a pinned section the target may not run more
           than about half a screen ahead of where you actually are. It is a
           speed limit, not a barrier. */
        if (heavy) {
          const cap = window.innerHeight * 0.55;
          if (target - cur > cap) target = cur + cap;
          else if (cur - target > cap) target = cur - cap;
        }
        if (!raf) raf = requestAnimationFrame(step);
      }, { passive: false });
      function step() {
        if (dead) { raf = 0; return; }
        cur += (target - cur) * LERP;
        if (Math.abs(target - cur) < 0.25) { cur = target; raf = 0; }
        else raf = requestAnimationFrame(step);
        window.scrollTo(0, cur);
      }
      /* Any scroll from somewhere else — keyboard, scrollbar, an anchor —
         resyncs, so the two never fight each other. */
      on(window, "scroll", () => { if (!raf) { cur = target = window.scrollY; } }, { passive: true });
    }

    /* Measure once the display face has actually arrived, so the flight
       paths are computed against the real text metrics rather than the
       fallback's. Capped, because a font CDN can hang. */
    const ready = () => {
      if (dead) return;
      clearTimeout(netTimer);
      netted = true;
      measure();
      onScroll();
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(ready)).catch(ready);
      const t = setTimeout(ready, 2500);
      cleanup.push(() => clearTimeout(t));
    } else {
      ready();
    }
  } catch (err) {
    net();
    if (window.console) console.error("landing:", err);
  }

  return () => {
    dead = true;
    for (const undo of cleanup) {
      try { undo(); } catch { /* teardown is best-effort */ }
    }
    cleanup.length = 0;
  };
}
