# Making the website brief easier to answer — a pass over every question

Brainstorm, 2026-09-10, at his ask:

> *"Brainstorm ideas to make any part of the form easier to complete, more
> interactable, easier to visualise for the detailer. One example may be the
> animations actually showing… a more in-depth view of, here's an animation or
> a look. Maybe they could choose if they like harsh corners… I remember you
> guys kinda showed some things about animations, but it was kinda hard to
> really visualise it, and it looks kinda weird. So just stuff being more
> obvious… think of examples for every single question. If it could be easier,
> if it could be more interactive, a different way of showing it. If not, skip
> it."*

**He is right about the thing he named, and it is the worst control on the
screen.** The three either/ors draw a "page" out of four grey bars. Nobody
looks at four grey bars and knows whether they want movement. That control was
built to satisfy a research finding — *the two options must look plainly
different* — and it satisfies it in the way a diagram does, not in the way a
page does.

**§1 is the seven ideas that apply across the whole form** and are worth more
than any single question's fix. **§2 walks all 73 questions.** **§3 is what to
add.** **§4 is the order I would build it in.**

---

## 1 · Seven mechanisms, each of which fixes many questions at once

### 1.1 · A LIVE PREVIEW THAT BUILDS AS THEY ANSWER — the big one

A small pane, pinned on a desk and a swipe-up sheet on a phone, showing a
skeleton of *their* site. It fills in as they go: the business name lands in
the header, the colour paints the accent, the first uploaded photo becomes the
hero, *"prices: a from price"* changes the price block's shape, *"phone number
on every page"* puts a number in the bar.

**Why this beats every other idea here:** it converts the form from *questions
about a website* into *the website, being assembled*. A detailer who cannot
answer "serious or friendly" in the abstract can see which one their own name
looks right in. It also makes the form feel like it is producing something,
which is the difference between a survey and a tool.

**It does not need the real site builder.** One skeleton page, six or seven
slots, driven off the answers already in state.

### 1.2 · A MICROPHONE ON EVERY LONG ANSWER

**The single biggest reduction in effort available, and it is nearly free.**
Browser speech recognition is built into Chrome and Safari — no service, no
key, no cost. There are 21 open text boxes in this form and a detailer standing
in a driveway with wet hands will talk for a minute and will not type for one.

His own longest and most useful answers to me have all been spoken.

### 1.3 · "START FROM ONE OF THESE"

Every long question offers three or four **real sentences taken from the 52
detailer sites already surveyed** (`docs/tenant-site-research-2026-09-10.md`).
Tap one, it drops into the box, edit it.

**This is the fix for the questions people leave blank**, which the survey
named precisely: a rain policy exists on **one site in fifty-two**, a
cancellation policy on seven. Those are not questions people refuse — they are
questions people do not know how to start. An empty box asks somebody to write
policy from nothing; a real sentence asks them to correct one, which anybody
can do.

### 1.4 · ANSWER BY POINTING AT THE PAGE

For anything positional — what the first screen does, where the phone number
goes, how loud the plans are — draw a little page and let them **tap the
region**. A chip that says *"Footer only"* is a description of a place; the
place itself is on screen and can be pressed.

### 1.5 · SHOW THE SENTENCE THE ANSWER PRODUCES

Under an answer that becomes published words, print it as it will appear:

> *You picked "within the hour". Your site will say: **Usually replies within
> the hour.***

**It makes a promise feel like a promise.** The survey found detailers making
claims they had not thought about; this is the cheapest possible check, and it
costs one line per question.

### 1.6 · FILL IT IN FOR THEM WHERE WE CAN

Three sources, ranked by effort:

- **Their old website** — paste the address, we read the About, the area, the
  phone, the socials, the existing wording. Everything shown as *"we found
  this — right?"*, nothing adopted silently.
- **Their Google listing** — the rating, the review count, the hours, the
  photos. The API is free but gated on an approval that takes weeks; a pasted
  Maps link gets most of the value on day one.
- **Their logo** — uploaded, we pull the colours out of it and offer them.

### 1.7 · SAY WHEN THEY CAN STOP

Once the twelve that matter are answered, mark it: *"That is enough to build
you a site. Everything from here makes it better."* **Nothing in the form
currently tells somebody they have crossed the line from necessary to
optional**, so the only two options a tired detailer has are finish all 73 or
feel like they quit.

---

## 2 · Every question

**Skipped where a chip is already the right control.** A question missing from
this list is a question I could not improve.

### The look — where his complaint lands

| # | Now | Instead |
|---|---|---|
| **H1** movement or still | four grey bars, one animating | **Two real mini-pages, both showing the same car photo.** One actually parallaxes and reveals as it scrolls under the cursor; the other is dead still. Same content, same colours — only the behaviour differs, which is the thing being asked about. Drawn bars cannot show motion because there is nothing to move. |
| **H2** photos big or facts big | four grey bars | **The same real photograph and the same real price list**, arranged two ways. |
| **H3** dark or light | four grey bars | **Same page, two grounds, real type.** |
| **NEW** corners | — | **His idea, and it is a good one.** Two identical cards, one at 16px radius and one at 0. It is the most visible single decision in a design system and it takes one tap. |
| **NEW** type | — | Their own business name set two ways: heavy condensed caps, and a plain lowercase grotesque. Two taps, and it decides more of the page's character than colour does. |
| **H6** serious or friendly | three chips | **The same sentence written both ways**, using their own business name: *"Concours-level detailing, by appointment"* against *"We'll make your car look unreal."* An adjective is abstract; a headline is not. |
| **H5** colours | picker + hex | Keep, and add: **pull the colours out of their logo or their van photo automatically** and offer them as swatches. Most detailers have a colour and have never written it down as a number. Plus paint the live preview with it. |

### You, and what you promise

| # | Now | Instead |
|---|---|---|
| **A1** business name | text box | Show it **rendered in the site's own header type** as they type, three ways — all caps, title case, with the LLC. They pick. This is a real decision they can only make by seeing it. |
| **A2** how long, how you started | textarea | **Microphone.** Plus three real About paragraphs from other detailers to start from. |
| **A3** what makes yours different | textarea | Microphone, plus three real ones. This is the question people freeze on. |
| **A5** face and name | three chips | **Three mini headers**: with a portrait, name only, neither. |
| **A6** insured | three chips | Keep. Optionally: attach the certificate — never published, but it means we can print the claim without asking twice. |
| **A7** what do you guarantee | textarea | **Start-from-one-of-these**, with the four real guarantee shapes the survey found. Then show the sentence as it will appear. |
| **A12** must never say | textarea | Microphone, plus common ones as chips to tick: *cheap, budget, the best, guaranteed, showroom*. |

### Where you work

| # | Now | Instead |
|---|---|---|
| **A4** towns you cover | textarea | **A map.** Type a town, it drops a pin and becomes a chip; or drag a radius and it lists the towns inside for them to prune. The service area is on **94%** of real sites — the nearest thing to a universal — and it is currently the most tedious box in the form. |
| **B2** travel charge | text box | **A ring on that same map** with a slider: free inside, then £X. |
| **B3** can people come to you | three chips | Three small drawings: a van at a house, a unit with a car outside, both. |
| **B4** what you need on arrival | text chips | **Icons** — a tap, a plug, a driveway, shade, a parking space. Faster to scan than six text pills. |
| **B5** where you won't work | text chips | Icons again: a flat car park, a street, a multi-storey. |
| **B8** how far booked ahead | five chips | **A slider along a calendar strip.** |

### The work

| # | Now | Instead |
|---|---|---|
| **C3** ceramic / correction / PPF | chips | Keep, but add a **photograph of each result** — water beading, a corrected panel, film on an edge. Detailers know these instantly by sight. |
| **C5** anything unusual | chips + Other | **Photo chips** — a boat, a bike, an RV, an engine bay, a headlight. The long tail is where a small detailer wins and a text list under-collects it. |
| **C7** how loud the plans are | four chips | Three mini pages: plans front and centre, mentioned, hidden. |

### Proof

| # | Now | Instead |
|---|---|---|
| **A10** photos | upload | **Thumbnails after upload, dragged into two columns: BEFORE and AFTER.** Two thirds of real sites have no before-and-afters at all — the pairing is the whole value, and asking for it at upload time is the only moment anybody knows which is which. |
| **D3** reviews and rating | text box | **Paste a Google Maps link** — we read the rating and count. Removes a typing job and gets the number right. |
| **D4** quote reviews by name | four chips | **A review card rendered three ways**: *Sarah M.*, *Sarah*, *A customer*. |
| **D6** video | three chips | Upload it. |

### The policies — where start-from-a-sentence matters most

| # | Now | Instead |
|---|---|---|
| **E1** damage | textarea | Start from one of three real ones, then show the sentence as published. |
| **E3** rain | textarea | Same. **One site in fifty-two has this.** Nobody is refusing — they do not know how to start. |
| **E4** car much worse than described | textarea | Same. |
| **E6** brand-new / leases / wraps / PPF / matte | chips | Photo chips — matte paint and a wrap are recognised by sight, not by name. |
| **F1** cancellation | textarea | Start-from-one-of-these, then the published sentence. |
| **F3** how people pay | text chips | **The actual logos.** |

### Contact

| # | Now | Instead |
|---|---|---|
| **G2** where the number goes | four chips | **Tap the page diagram** — the bar, the footer, nowhere. |
| **G5** reply speed | four chips | Keep, and **show the sentence it produces**. It is a public promise and should read like one before they pick it. |
| **G8** Spanish | three chips | Show the mini page flipping language. |

### Launch

| # | Now | Instead |
|---|---|---|
| **I1 / I2** web address | two text boxes | **Check availability as they type.** A real tool moment inside a form, and it turns the single most common launch-stall into a two-minute job. |
| **I3** existing site | textarea | Paste it → we read it and offer to fill in five other answers (§1.6). |
| **I5** Google profile claimed | three chips | Search their name and **show what we found**, so "don't know" stops being an answer. |
| **I7** logo | four chips | Upload it, show it on a mini header, pull its colours into H5. |

### The open boxes

**K3 must have, K4 must not have, K1 anything missed, K2 anything unclear, C1,
C2, D5, D7, G6, I8, J2, J4, B6** — all of them get the **microphone**, and
nothing else. They are open on purpose.

---

## 3 · Questions worth adding

Ranked by what the answer changes.

1. **Corners: rounded or sharp.** His idea, one tap, highly visible.
2. **Type: heavy condensed, or plain.** Decides more character than colour.
3. **Who are your customers, mostly?** Daily drivers, enthusiasts, dealerships,
   fleets. It changes the photographs and the words. *This was in the original
   short intake and I dropped it building the long one — that was a mistake.*
4. **What do people ask you before they book?** Three or four questions, and
   they are the FAQ. **44% of real sites have one.** Also dropped from the
   short intake, also a mistake.
5. **One page, or a page per service?** Structural, and detailers have a view.
6. **Should your opening hours be on the site?** Some want the phone to decide.
7. **Do you want a tips-and-advice section?** Aftercare, winter, what a ceramic
   coating actually needs. It is what earns search traffic for a local trade,
   and it is a commitment to writing — so it has to be asked, not assumed.
8. **Is same-day or emergency work a thing you want to advertise?**
9. **Whose name is the business in — yours, or a trading name?** Decides the
   footer, the legal line and the email address.

---

## 4 · What I would build, in order

1. **Real mini-pages for the three either/ors, plus corners and type.** This is
   the complaint he actually raised and it is the most visible fix.
2. **The microphone on every long box.** Cheapest large win in the whole list.
3. **Start-from-one-of-these on the eight policy questions.** Turns the
   blank-box questions into edits, and those are the ones the survey proved
   nobody answers.
4. **Before/after pairing at upload.** The biggest content gap in the trade.
5. **The live preview.** The most valuable and the most work; worth doing once
   the answers above are settled, because it needs them to have something to
   show.
6. **The map for the service area.**
7. **Paste-your-old-site and paste-your-Google-link.**
8. **The nine new questions.**

Nothing above needs a new dependency except the map, and the browser's own
speech and colour APIs cover two of the top four.
