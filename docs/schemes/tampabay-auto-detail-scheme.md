# DESIGN SCHEME — Gandy Mobile Detailing (site 5)

**Tampa Bay, FL.** Filled 2026-09-09 from the two references the owner sent
that night. This file is the RECORD; `docs/schemes/gandy-styleguide.html` is
the ASK — playbook rule 91.

**THE PAIR, both measured off the live thing, not remembered:**

| | What it is | What was taken |
|---|---|---|
| **A** | Dribbble shot 27167430, *"Professional Detailing Website Design"*, DamiraDovlatova — a New York studio concept, one screen | The world: red / black / white, a heavy ITALIC condensed headline at poster size, one giant round-cornered panel holding a full-bleed car photograph, tiny all-caps micro-labels, a glass product card, a hanging "EXPLORE MORE ↓" tab |
| **B** | `carolinamobilecarwash.com`, Summerville SC — a real working detailer | The CONTENT and the skeleton: segmentation by vehicle TYPE not size, per-foot pricing, monthly plans, a 14-town service area, the deposit/weather/no-rush policies, *"If it drives, we detail it"* |

**His instruction for B, verbatim:** *"use all of the information that's on
their website. Like, literally every single thing… obviously don't make an
exact copy of their website."* So the FACTS are ported wholesale and the LOOK
is not: Carolina is Barlow Condensed + DM Sans on white, and none of that
appears here.

---

## 1. WORDS — who this business is

- **Gandy Mobile Detailing**, Tampa Bay, Florida. Named for Gandy Boulevard,
  the same way site 4 was named for a Chicago street.
- Fully mobile. Brings its own water and power. No shop.
- **Serves everything that drives**, which is the whole point of the vehicle
  switch: daily drivers, trucks and duallys, vans, RVs, boats, golf carts,
  semis and trailers, and business fleets.
- Licensed and insured in Florida.
- One operator plus a crew for fleet days. 6 years. 82 reviews.

## 2. SUBJECT — what this page is a picture of

**It is a DEPOT BOARD.** The sign bolted to the wall of a yard: one loud
panel at the top, and under it everything they will wash and what it costs.

That single noun decides the section order, which is the thing the 2026 slop
recipe actually is. A poster has no catalogue in it; a catalogue has no
poster. **The poster is the first screen and never returns; from the second
screen down the page is the board, and the join between them is the switch.**

**THE TENSION, written as a sentence with a wrong answer:** the reference that
sets the LOOK is a single perfect screen with nothing behind it, and the
reference that sets the CONTENT is twenty-two services across eight vehicle
types. Resolve it wrong and you get either a beautiful page that cannot quote
a price, or Carolina's catalogue in a red shirt.

## 3. THE TILE

### Colour — near-black lacquer, one loud red, one light band

Every figure below is COMPUTED by the sheet against the real rendered ground
and printed beside its swatch. None is typed from judgement — the four times
this repo did that, three were wrong.

| Token | Value | Job |
|---|---|---|
| `--ground` | `#0B0B0C` | the page |
| `--ground-2` | `#141416` | a panel on the page |
| `--surface` / `--surface-2` | white at .05 / .10 | glass, composited before measuring |
| `--ink` | `#F6F3F1` | headings and body |
| `--ink-2` | `#BAB5B1` | secondary |
| `--ink-3` | `#948E8A` | micro-caps labels |
| `--accent` | `#E10E1F` | a FILL. Never text on the dark ground. |
| `--accent-text` | `#FF6A63` | the same idea as TEXT, a second token |
| `--band` / `--band-ink` | `#F2EFE9` / `#131314` | the light band cut into the black |

**Two tokens for one red, on purpose.** A red that passes as a button fill
with white on it does not pass as small red text on near-black. Site 4 learned
this with blue; the shape of the fault is identical.

**The page switches ground.** His five references all do it and not one of my
five pages did (`docs/TASTE-NOTES.md` § BATCH 4). The ceramic-coating band and
the monthly-plan band are `--band` on `--band-ink`; everything else is black.

### Type — Kanit, Epilogue, Azeret Mono

| Face | Weight | Job | Why |
|---|---|---|---|
| **Kanit** | 900 italic | the poster headline, section headings, the vehicle names | The Dribbble headline is a heavy italic condensed. Kanit is the only Google face with a true 900 italic that leans this hard. **Used in 0 of the 28 pages in `docs/tenant-sites`.** |
| **Epilogue** | 400/500/600 | every sentence | A grotesque with real italics and enough character to stand beside Kanit. Not Inter, not DM Sans (Carolina's), not Instrument Sans (6 of 28 here). |
| **Azeret Mono** | 400/700 | prices, per-foot figures, micro-caps labels, the readouts | The catalogue is the point and a catalogue needs tabular figures. Boxy and heavy, so a price reads as a stamped number rather than as body text. |

**Banned here by name:** Barlow Condensed and DM Sans (Carolina's own faces —
using them is the copy he told me not to make), Archivo / JetBrains Mono
(ours), Inter / Roboto / Arial / system-ui / Space Grotesk (never-defaults),
and Bai Jamjuree / Familjen Grotesk / Spline Sans Mono (site 4's, and *"different
everything"* is his brief).

### The two or three things that carry the look

1. **The italic.** Everything display-sized leans. Nothing else on the page
   does — the italic is the brand, so it must not leak into body copy.
2. **The big corner.** `--r-panel: 28px`. Site 4 was 2px everywhere. This is
   the most visible single difference between the two sites and it is
   deliberate.
3. **One red, loud, and only as a fill.**

## 4. GROUND — never a flat fill

**His own note, 2026-09-07:** *"a very plain colored black background… maybe a
gradient animation, a little pattern, something just to make it feel more
professional."* All three of the previous night's pages shipped a flat
`background: var(--ink)` and passed every check in this repo.

**Site 5's ground is LACQUER** — what a red car's flank does under a lamp:
a wide soft red bloom low-left, a cold white bloom top-right, a slow vertical
falloff, and a fine grain over the whole thing. Four layers, one fixed
element, no animation loop.

**It is a different KIND of ground from every other site in the set:** site 4
is a dot lattice on a 4.2° slant, `k-cedar` is ruled paper, `f-sudsy` is
painted yellow, `i-apex` is lit glass, `j-northside` is ruled paper.

**A gradient behind text is a NEW GROUND and every ratio has to be taken
again** — five tokens across three pages failed the moment the ground stopped
being flat while still reading correct against the token they were corrected
on. The sheet samples five points per element and takes the median.

## 5. SHAPE — round, and the only square thing is a price

The exact inversion of site 4, which was square everywhere with one round
badge.

| Token | Value | Where |
|---|---|---|
| `--r-panel` | 28px | the hero panel, section panels, the switchboard |
| `--r-card` | 16px | cards, the vehicle tiles, the glass card |
| `--r-inset` | 10px | inputs, small controls |
| `--r-pill` | 999px | buttons and chips — the Dribbble's are capsules |
| `--r-cell` | 0 | **the price cell, and nothing else.** A number in a table wants a corner. |

`--hair: 1px` is a decorative rule; `--edgew: 1.5px` is a control's edge and
needs 3:1. **They are two tokens** — conflating them is playbook rule 107 and
it has cost a real failure here.

## 6. SPACING & LAYOUT

- `--wrap: 1140px`. 8px scale.
- The phone is a re-layout, not a squeeze: the switchboard goes from a
  four-across row to a two-across grid at 560px and stays two-across at 320px.
- 320 is the floor and it is swept, not reasoned about.

## 7. MOTION — a different mechanism from site 4, not a different duration

Site 4's arrival is one 70ms stagger of eight beats on translateY. Copying it
with new numbers is exactly what *"different everything"* rules out.

| Name | What moves | Numbers |
|---|---|---|
| **The unmask** | the hero panel's `clip-path` opens from a centred band to the full rounded rect | 620ms, `cubic-bezier(.16,1,.3,1)` |
| **The italic wipe** | each headline word is revealed by an edge cut at the type's own -12° lean, sweeping left to right | 520ms, second word +90ms |
| **The settle** | chips, micro-labels and the button fade and rise 10px | 380ms, +40ms each, after the wipe |
| **The reveal** | sections arrive on scale .985 → 1 with opacity — **not** a translate | 460ms, scroll-linked, no timers |
| **The gloss** | a specular band travels across a panel as it crosses the viewport | one scroll progress number, 0→1 |
| **The swap** | the ladder's rows re-key and rise 8px | 180ms, 20ms stagger, capped 160ms |
| **Hover / exit** | 180ms both |

**Rules carried in from earlier sites and not re-litigated:** anything that
opens ships its exit in the same change; nothing animates twice; a swap is
never a direct child of the arrival container; the hidden state of a reveal is
added by script, never by the stylesheet; a drifting layer needs
`overflow: hidden`; a marker class a script writes is namespaced.

## 8. COMPONENTS

Button (primary pill / ghost pill), the hanging tab, chip, vehicle tile
(rest / hover / selected), price row + price cell, glass card, input
(rest / focus / error), select, the review card, the plan card, the policy
disclosure. **Every one is drawn in every state on the sheet** — that is what
the sheet is for.

## 9. DEVICES — what is actually on the page

1. Poster hero: full-bleed photograph inside one round panel, two-word italic
   headline over it, a pill, a rating chip, a location line, a glass card.
2. The hanging "SEE THE BOARD ↓" tab under the panel.
3. **THE VEHICLE SWITCHBOARD — the signature.** Eight vehicle types as
   photo tiles; picking one swaps the ladder beneath in place. **Nothing else
   moves** — one heading, one sentence, held still (rule 99).
4. The ladder itself: name, one line, price, per-foot where per-foot is how it
   is sold.
5. What is in a detail — the eight-line checklist, ported from Carolina's
   maintenance plan.
6. Ceramic coating, on the light band.
7. Monthly plan, on the light band: two ladders, four vehicle classes.
8. Where we roll: 14 towns, home base marked.
9. Reviews: real-shaped, with the count.
10. **Our booking widget**, in this site's skin.
11. Footer with the policies — deposit, weather, no-rush. **No site in the set
    has ever shown the small print, and every real detailer's site does.**

**BANNED ON THIS PAGE SPECIFICALLY:**
- **No footer wordmark.** It is on 6 of 28 pages and all 6 are sites 1–4 —
  the same shape as the drawn connector line he retired at 14 of 26.
- **No marquee / ticker band.** In 6 of 28, and those 6 are sites 1, 2 and 3.
  Carolina has one (*"IF IT DRIVES… WE DETAIL IT!"*) and it is still refused,
  because a device on half the set is a house tell.
- **No drawn connector line, no numbered step rail** (rule 98, retired).
- No rating/years/cars-done proof row (rule 36).
- No platform branding of any kind.

## 10. THE FACTS — off Carolina, converted to Tampa

Prices, packages, the plan ladders, the checklist, the policies and the FAQ
are ported from `carolinamobilecarwash.com` as instructed. The service area is
Tampa Bay's 14 communities rather than the Lowcountry's, and the phone,
address and email are this tenant's.

**A number PRINTED is not a number CHARGED.** These are an example page's
figures, not a live tenant's; a real tenant's ladder comes from the platform,
never from the file.

## 11. PHOTOGRAPHY

Nine candidates were rendered to a contact sheet and looked at
(`.tmp-site5/contact.png`), because alt text does not mention badges.

- **Hero: Unsplash `1VDPJNOxCHs`** — a bright red bonnet running into the
  headlight, one long diagonal for the italic to sit along. No badge, no
  logo, no plate.
- **The work: `MTeoQOv_F14`** — a real person washing a real red car in a real
  garage. Foam, not a showroom.
- **Paint correction: `B7hVEFTFUWs`** — a polisher on black paint.
- **Interior: `5SmPnmCjwcU`** — a brush on a dashboard.
- **REJECTED, and why:** `F6romjSOMRU` is a detailer over a **Bugatti** with
  another firm's logo on his shirt — the exact fault site j shipped;
  `8a4l57Vj3qI` is dull and cluttered at the wheel; `w8RT-3E61Ys` reads as a
  car advertisement rather than a detail.

---

# THE APPROVAL — the four questions

1. **The words.** Gandy Mobile Detailing, Tampa Bay, everything that drives.
2. **The subject.** A depot board: one loud poster, then the whole catalogue.
3. **The tile.** Near-black lacquer, one loud red, one light band; Kanit 900
   italic over Epilogue and Azeret Mono; 28px corners.
4. **The devices.** Eleven, above — and the signature is the vehicle switch.

---

# APPENDIX — THE CAROLINA CONTENT, CRAWLED 2026-09-09

Ported at his instruction (*"literally every single thing"*). Eight pages read
in the browser, not from the home page's text — **their home page prints the
prices shifted one row against the titles**, which is their bug and must not be
copied. Prices converted to Tampa where a Tampa number would differ; the
structure is theirs.

## Packages (sedan / SUV / van / dually)

| Service | Their price | What it is |
|---|---|---|
| Exterior only premium wash | $55 | Foam bath, filtered water, bugs and droppings, gas cap area, dried with microfibre, inner fender wells pressure washed, rims and tyres, ceramic spray sealant |
| Express super clean | $110 | Wash plus a full interior |
| Express seats | $200 | Deep seat cleaning plus premium exterior wash |
| Express carpets | $200 | Deep carpet shampoo plus exterior protection |
| Deluxe wax | $195 | Full interior and exterior with machine buff wax |
| Deluxe interior | $300 | Comprehensive interior |
| Paint correction detail | $395 | Exterior-only correction |
| Super detail | $390 | The full interior and exterior job |
| Express ceramic maintenance | $195 | Keeps an existing coating performing |
| Ceramic coating (exterior only) | $750 | Molecular bond over clear coat or PPF |
| Headlight restoration | — | Lifetime service on yellowed lenses |

## By vehicle type

- **RV, per foot:** detail wash **$11/ft**; wash & wax **$35/ft**; wash, wax &
  compound **$40/ft** (adds oxidation removal for chalky sides); standard/full
  interior **$18/ft**; deep/premium interior **$25/ft**.
- **Semi:** trailer washout **$80**; day cab exterior **$175**; sleeper cab
  exterior **$400**; interior and exterior **$685**; interior only **$400**.
- **Golf cart:** **$125** interior and exterior.
- **Bus:** from **$11/ft**.
- **Boat:** from **$210**.

## Monthly plans — twelve months, one service a calendar month

| Class | Wash plan | Maintenance plan |
|---|---|---|
| Sedan | $95 | $45 |
| SUV | $135 | $55 |
| Van | $135 | $55 |
| Dually & trucks | $135 | $55 |

Included: detailed foam bath; filtered water; bugs and bird droppings; gas cap
area cleaned; dried with microfibre towels; inner fender wells scrubbed and
pressure washed; rims and tyres; ceramic spray sealant.

## Fleet

Per-vehicle discounted quote by count and service. Payment on completion by
cash or card; invoicing on request and approval. Offered: exterior wash and
detail, interior cleaning, headlight restoration, tyre and wheel detailing,
engine bay cleaning. Also an **employee car day** — the crew comes to the
business and does the staff cars during the working day, employer paying all or
part.

## Service area — theirs 14 towns, ours 14 around Tampa Bay

Theirs: Summerville (home base), Charleston, North Charleston, Del Webb Nexton,
Moncks Corner, Goose Creek, Ladson, Ridgeville, St George, Santee, John's
Island, Mount Pleasant, James Island, Hollywood.

The structure to keep: **a home base marked as such**, a list, and a line
saying to call if your town is not on it.

## The policies — no site in our set has ever shown these

- **Deposit:** non-refundable, $25 for a wash and $25 and up by package, taken
  off the final bill. The reason is stated plainly: a forgotten or
  late-cancelled slot cannot be refilled and the waiting list loses it.
- **Weather:** they call and reschedule for rain or excessive heat, next
  available day.
- **No rush:** they will not shorten a job to fit; if the diagnosis changes the
  customer is told during the work.
- **Access:** the van carries its own water and power.

## The FAQ, six questions

Why choose us (licensed and insured in the state); how to book (online or
phone); what services (customised to the vehicle — *"if it drives, we detail
it"*: cars, trucks, ATVs, aircraft, motorcycles, RVs, trailers); how long the
clean lasts (paint, glass and plastic sealants applied generously); do I drop
the vehicle off (no — they come to you); no water or electricity (the unit
carries both).

## Their proof, and the shape to keep

"EXCELLENT, based on 82 reviews", named reviewers with the vehicle in the text
(a 2012 4Runner, two Corvettes at a car show, a vintage Harley-Davidson, a
golf cart at a retirement community). **Specific vehicles are what makes a
review read as real.**

## APPENDIX 2 — THE REST OF IT (his correction, 2026-09-09)

*"Just make sure it isn't only just the price plan policy and FAQ. Make sure
it's all of the details that they have — their warnings, kind of things that
they advertise and whatnot… everything from where they serve to the stats that
they have on their page. Basically, the entire website."*

**THE CATALOGUE HAS THREE NAMED TIERS, and that is how a detailer thinks about
their own menu.** Express Levels (wash, super clean, seats, carpets) ·
Executive Levels (deluxe wax, deluxe interior, paint correction, super detail) ·
Premium Add-ons (ceramic maintenance, ceramic coating, headlight restoration).
**This is what makes "a full detail AND my windows done" two taps instead of a
radio button** — one pick from a level, as many add-ons as you like.

**THE STATS, read out of the counters rather than off the rendered page** (they
animate from zero, so a text scrape reports `0`): **1,000+** happy clients,
**20+** years in business, **100%** serving the Lowcountry, **100%** completed
projects. Plus **82 reviews** and an "EXCELLENT" rating.

**WHAT THEY ADVERTISE — five claims, each a two-line pair:** Premium quality /
Elite Auto Care · Mobile Convenience / We Come to You · Certified experts /
Trusted Professionals · Range of services / Full-Service Detailing · South
Carolina's Best / Local. Reliable. Exceptional.

**THE WARNINGS AND SMALL PRINT, which is the part no site in our set has ever
shown:**
- **Non-refundable deposit**, $25 and up by package, taken off the final bill.
- **You are charged in full** if the vehicle cannot be detailed on arrival —
  including nobody being there.
- **Hazards must be declared before the appointment** — needles, drugs, fuel,
  chemicals, or a recent COVID exposure. The customer is responsible for any
  health or safety issue arising from their vehicle.
- **Weather** — they call and reschedule for rain or excessive heat.
- **No rush** — they will not shorten a job to fit; if the diagnosis changes,
  the customer is told during the work.
- Terms effective 29 September 2021; separate cancellation and privacy pages.

**FLEET, the four benefits they sell on:** mobile (no transport), flexible
scheduling (weekly / bi-weekly / monthly), customisable by fleet size, licensed
and insured. Plus three reasons: professional image, protection against wear,
vehicle longevity. And the **employee car day**.

**THE FURNITURE:** business hours (Mon–Fri 10–6, Sat 10–3, Sun closed) shown in
a bar at the very top of every page; phone and email everywhere; Facebook,
Instagram, X and **Yelp**; gift cards; a **payments page that takes Venmo and
Cash App** as well as a card, with a tip field; a customer login; a blog; and a
footer that lists all fourteen towns again.

**HOW THE STATS GO ON OUR PAGE WITHOUT BREAKING RULE 36.** That rule bans the
three-evenly-spaced ratings/years/cars-done proof row. His own references put
**numbers everywhere as decoration as much as information** (`TASTE-NOTES.md`
§3), so the figures go in a **red band at display size** — four of them, in the
page's own italic — not as three cards on a white ground.
