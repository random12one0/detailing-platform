# Testing phones we do not own — the method

**Written 2026-09-25 for ROADMAP 8.6. This is a method, not a survey.** It ends
with one recommendation and a twenty-minute walk Andrew can follow without
thinking.

**The situation:** Andrew has **one iPhone 15 Pro Max**, a **Windows PC**, no Mac,
no Android, and **will not start a monthly subscription for this**. Everything
below is judged against that, not against what a funded QA team would do.

---

## 1. THE ONLY QUESTION THAT MATTERS: what breaks ONLY on hardware

Five things. Everything else a viewport can fake.

| | Why a desktop browser at 392px cannot see it |
|---|---|
| **The on-screen keyboard shoving the layout** | There is no keyboard. A real one takes ~40% of the screen and, on iOS, changes the visual viewport **without** a `resize` in the way you expect |
| **Safari's address bar eating the bottom** | The toolbar hides on scroll down and returns on scroll up, so the viewport height **changes mid-gesture**. `100vh` is wrong the whole time; `svh`/`dvh` behave differently from each other and from the desktop |
| **A real thumb on a real target** | A mouse pointer is one pixel and infinitely accurate. A thumb is ~9mm wide, arrives at an angle, and cannot reach the top of a 6.7" screen one-handed |
| **Reduced motion and large text** | These are **OS** settings. A browser flag emulates the media query; it does not reproduce a 200% system font reflowing a real layout |
| **Daylight glare** | Not reproducible by anything. ROADMAP 8.3 closed on Andrew reading a screen outdoors, and that was the only way |

**THIS REPO HAS ALREADY PAID FOR THAT LIST.** `docs/dashboard-phone-pass-2026-08-31.md`
says it plainly: *"It does not measure a real device. Everything is a headless
browser at a set viewport. A real phone has a notch, a home indicator, a URL bar
that comes and goes, and a keyboard — and `100dvh` behaves differently under all
four."*

**And then a real phone found four things no viewport had** — `DECISIONS.md`,
Andrew's own iPhone pass on the 1.4 page:

1. *"aren't just kinda there, it kind of animates in"* — reveals were **not
   firing**; a 4-second failsafe was showing the whole document.
2. The scroll weight was wrong in **two** ways at once.
3. *"The pinned section just doesn't work on iPhone. **It glitches out.**"* Two
   iOS Safari failure classes together: a sticky element sized in viewport
   units, and scroll progress measured against a viewport height that **changed
   as the URL bar hid and returned** — which also fired `resize` on nearly every
   gesture, re-measuring animations mid-flight.
4. Hover-only states, invisible to half the audience.

**Not one of those came from an emulator. The repo's own conclusion was written
as "This is disclosed as unverified. There is no iPhone here."** That sentence is
the reason 8.6 exists.

---

## 2. THE ROUTES, and which are emulators wearing a phone's name

### ✗ Chrome DevTools device mode — an emulator wearing a phone's name

**It is desktop Chrome at a phone's width.** No real keyboard, no Safari at all,
no toolbar that hides, no touch. **It is what this repo has been doing**, and it
is what missed all four findings above. Free, instant, and it answers **layout
only**. Keep using it for layout; never call it a device pass.

### ✗ iOS Simulator — needs a Mac. Out.

Xcode only. Andrew has no Mac, and a used Mac to run it is hundreds of dollars.
**Named so nobody spends an hour discovering it.**

### ~ Android Studio emulator — free, real Android, still not a phone

**Free, Windows-compatible, one-off install of roughly 30–60 minutes and several
GB.** It runs a **real Android OS with real Chrome**, so it genuinely reproduces:
the on-screen keyboard resizing the viewport, Chrome's toolbar behaviour, and
**OS-level reduced-motion and large-text settings**. That is three of the five.
**It cannot reproduce** a real thumb, real mid-range performance, or glare — and
it says nothing about Safari, which is where every failure above was.

### ~ Remote real-device cloud — real hardware, priced monthly

**BrowserStack has no permanent free tier**: a one-time trial of about **30
minutes**, then **$29–$49/month** for Live with mobile. **TestMu AI (formerly
LambdaTest)** does have a free plan — around **100 lifetime automation minutes**
— but those are *automation* minutes aimed at scripted runs, not twenty minutes
of poking a booking form. **AWS Device Farm** and **Firebase Test Lab** are
pay-per-minute with free quotas, both oriented at app testing.

**These are real devices and they do reproduce the keyboard and the toolbar.**
What they cannot give you is **thumb reach, one-handed use, or glare** — you are
driving a phone with a mouse through a video stream, and the stream's lag makes
judging *motion* unreliable, which is half of what the iPhone pass found.

> **Named and priced as instructed, and explicitly NOT the recommendation: it
> needs a subscription, and Andrew has said he will not start one for this.**

### ✓ Andrew's own iPhone — free, twenty minutes, and already proven here

All five categories, including the two nothing else reaches. **This is the route
that has actually produced findings in this project, twice.**

### ✓ A borrowed Android, ten minutes — free, covers the other half

He does not own one; somebody near him does. **Ten minutes on any mid-range
Android** answers more than the emulator does. If that is not available, a **used
mid-range Android is a one-off $40–80 and never a subscription** — and it becomes
a permanent asset rather than a rental.

---

## 3. WHAT DO WE PUT ON THE PHONE? — the part that nearly went wrong

**A real-device pass is only worth the twenty minutes if the phone is looking at
the code you want judged.** Three candidates, and the obvious one is the worst:

| | Verdict |
|---|---|
| **`detailingplatform.com`** (the live site) | **Worst option.** It is a week behind this checkout and, under the 2026-09-25 publishing deferral, **it only gets further behind.** A pass here judges code nobody wrote this week |
| **A Netlify deploy preview** | **Zero credits** and *"a real URL Andrew can open on his phone"* — `CLAUDE.md` § Publishing, and three other documents. **BUT `DECISIONS.md` says the Netlify site is deployed from an uploaded build of `app/`, NOT wired to the GitHub repo**, and automatic branch deploys were still listed as *"worth doing"*. **If the repo is not connected, previews do not exist.** Settling that is a 30-second look at Netlify's settings, and Netlify is Andrew's |
| **The dev server over his own Wi-Fi** | **Recommended.** `npm run dev --prefix app -- --host` publishes the dev server on the local network; he opens `http://<pc-ip>:5173` on the iPhone. **Current code, zero cost, no deploy, no Netlify, no subscription, and the publishing deferral is irrelevant** |

**HONESTLY LABELLED: the Wi-Fi route was NOT verified tonight** — this session had
no dev server by instruction. **Two things can break it and both are quick:** the
PC's firewall may block port 5173 inbound (allow Node for private networks once),
and Vite needs the `--host` flag or it binds to localhost only. A third, smaller
one: the page is served over **http**, so any browser feature requiring a secure
context behaves differently — this product has no service worker, so in practice
this affects nothing on the pages 8.2 lists.

---

## 4. THE RECOMMENDATION

> **Andrew spends twenty minutes on his own iPhone, against the dev server over
> his own Wi-Fi, following § 5. A borrowed Android for ten more minutes closes
> the other half. Nothing is bought and nothing is subscribed to.**

**Why this and not the others:** it is the only route that reaches all five
hardware-only categories; it is the only route that has ever produced a finding
in this project; it costs nothing; and it needs no Netlify setting confirmed and
no publish pressed. **The emulator and DevTools stay in use for layout — they are
just not a device pass, and the method now says so in those words.**

**What it cannot tell us, said plainly:**
* **Nothing about Android** until somebody lends a phone. Android Chrome's
  keyboard and toolbar differ from Safari's, and mid-range Android performance is
  this product's stated constraint.
* **Nothing about older iPhones.** A 15 Pro Max is a big, fast, current phone.
  A small screen and a slow one are both untested, and a 6.7" device **hides**
  thumb-reach problems that a 5.4" one shows.
* **Nothing repeatable.** A human pass is one person, one time. It finds things;
  it does not guard them. Anything it finds should become a check.

---

## 5. THE TWENTY MINUTES — a numbered walk, no thinking required

**Before he starts, somebody at the keyboard runs:** `npm run dev --prefix app -- --host`
and sends him the `Network:` URL Vite prints. **Phone and PC on the same Wi-Fi.**

**Set up (2 min).** Hold the phone **one-handed, as he would in a driveway.**

1. Open the URL. If it does not load: firewall, not the product — say so and stop.
2. **Settings → Accessibility → Motion → Reduce Motion ON.** Leave it on for the
   whole walk; turn it off at the end.

**The booking page, as a customer (8 min).** `/book/<the demo tenant's slug>` —
for the seeded demo that is `/book/demo-detail`. **The slug comes AFTER `/book`;
this line had it the other way round until 2026-10-08.** The wrong way round
does not error — measured 2026-10-08, `/demo-detail/book` returns HTTP **200**
and renders the app's own *"That page does not exist."* screen, so a mistyped
address looks like a broken product rather than a broken link.

**THE KEYBOARD QUESTION IS ASKED FOUR TIMES, NOT TWICE, AND THE STEPS BELOW ARE
IN THE ORDER THE FLOW ACTUALLY PUTS THEM.** Counted at 392x844 on `demo-detail`,
2026-10-08: **four of the seven steps carry a box that raises the keyboard, and
they hold eight boxes between them.** The order is Services, Extras, Vehicle,
Location, When, Details, Review (`core.js`, `stepsFor`), so the vehicle boxes
come BEFORE the address and the date comes BEFORE name-and-phone. **The previous
version of this walk asked for name/phone/email before the date, which the flow
does not allow, and declared the address and details steps "the two steps in the
whole flow with a text box" — it was four.**

3. Scroll the page down, then up. **Watch the bottom of the screen as Safari's
   address bar hides and comes back.** Anything cut off, jumping, or covered?
4. **The vehicle step — the first text boxes in the flow.** Tap **"What are you
   bringing?"** and type three letters. The keyboard comes up. **Can he still
   see what he is typing, AND the button he needs next?** Then, with the
   keyboard still up, **scroll** — does the page fight him? — and dismiss it:
   **is the layout where it was before?** Tap **"Year or estimate"** and ask the
   same thing. *Both boxes sit above the fold, and the four dirtiness chips
   under them are the controls ROADMAP 2.15 measured the footer covering 21px
   of, so this is the step where this item's only reproduced fault lived.*
5. **The address step.** Tap **"Where should we come?"** and type three letters
   of a real address. **Same two questions.**
6. Pick a **date**, then a **time**. On the date step the total can change —
   **does it say why, on screen, without scrolling?**
7. **The step that asks for name, phone and email — and the notes box under
   them.** Tap each of the four in turn. **With the keyboard up, can he see the
   box he is typing in AND the button he needs next?** — this step was added
   2026-09-25 because ROADMAP 2.15 needs exactly it; the notes box
   (*"Anything we should know?"*) was added 2026-10-08, having been missed.
8. **The review step — the promo box, and the tightest gap in the flow.** Tap
   **"Have a code?"**. **The button he needs next is "Apply", immediately beside
   it.** Same two questions. *Ask this one even if the others were fine: this
   step carries the tallest bar in the flow — 112px against 73px everywhere
   else once a plan name is attached — so it is where a bar that moves on the
   keyboard would cover the most.*
9. Reach the **fixed bar at the bottom**. **One-handed, thumb only: can he press
   it without shifting his grip?**
10. Complete the booking. On the confirmation, **press every link once.**

> **WHAT "WRONG" LOOKS LIKE AT STEPS 4, 5, 7 AND 8 — BOTH DIRECTIONS, BECAUSE
> THE CODE PREDICTS THE SECOND ONE.** 2.15 asks whether the bar **rides up and
> covers the field**. Measured in the source 2026-10-08: nothing in `app/src`
> references `visualViewport` (zero hits), the viewport meta sets no
> `interactive-widget` so the default `resizes-visual` applies, and `.bk-bar` is
> `position: sticky; bottom: 0` — anchored to the layout viewport, which the
> keyboard does not shrink. **So on Chrome the predicted behaviour is the
> opposite fault: the bar sits BEHIND the keyboard and the button he needs next
> is unreachable without dismissing it first.** iOS Safari is the one that does
> unpredictable things to a bottom bar with the keyboard up, which is exactly
> why this is on a phone and not in a script. **Report whichever happens — "the
> bar vanished under the keyboard" and "the bar jumped up over the box" are
> different answers and both close 2.15.**

**The dashboard, as the detailer (8 min).** `/app`, signed in as the demo owner —
whoever starts the server sends him the address; the password is not written down
here (`docs/platform-admins.md` says where it lives).

11. **Today.** Open a job. **Reach the action bar at the bottom one-handed.**
12. Press **Mark completed**. It asks first. **Is the question readable, and are
    both answers reachable by thumb?** Say no, then yes, then undo it.
13. **Is anything within about 10px of that button that he could hit by
    accident?** This is a known concern (ROADMAP 4.1) and a thumb is the only
    instrument for it.
14. **Calendar.** Tap a day. **Are the day cells big enough to hit first time?**
15. **Clients.** Open a customer. Press **Call**, then **Text** — the phone's own
    apps should open. Press back.
16. **Settings → Accessibility → Display & Text Size → Larger Text**, push it up
    two steps, then reopen Today and the job record. **Does anything overlap,
    clip, or become unreadable?** Put it back.

**Finish (2 min).**

17. Turn **Reduce Motion** off.
18. **One message back, in his own words, per thing that felt wrong.** *"The
    pinned section glitches out"* was worth more than any screenshot — he does
    not need to diagnose it, only to say what it did.

**A "nothing felt wrong" is a real result and should be recorded as one** —
ROADMAP 8.3 closed exactly that way.

---

## 6. WHAT THIS DOES TO 8.2

8.2 has been open on *"a real iPhone and a real Android"* for weeks with no
method. **It is now waiting on two specific, small things:** twenty minutes of
Andrew's time on § 5 for the iPhone half, and one borrowed Android for the
Android half. **Neither is a build, neither costs money, and neither needs a
publish.**
