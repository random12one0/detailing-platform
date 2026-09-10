# DESIGN SCHEME — Ballantyne Mobile Detailing  *(site 3 · `ex3`)*

**Written BEFORE any HTML exists.** Started 2026-09-09 from Andrew's interview
answers. **§3's ground is PENDING his pick** — three frames were sent and he
answers with a letter. Nothing gets built until §1, §2, §3 and §9 have his yes.

## His four answers, and one of them was a correction

| Question | His answer |
|---|---|
| What kind of detailer? | **Rejected the question.** Every example site is an ordinary mobile detailer like him. *(now playbook rule 31)* |
| Light or dark? | **"can u gve me like an example of 3 visual"** — three rendered grounds, sent 2026-09-09, awaiting a letter |
| Which two of his 21? | **`fora.so` is his.** He refused the detailer half and told the session to go and find the one that LOOKS like fora |
| One page or several? | **Two pages — home + prices/book** |

**The pair, chosen by opening frames rather than reading verdicts:
`atelierdetail.netlify.app` × `fora.so`.** Both hold the hero photograph inside
one giant rounded card, float a pill nav above it, carry an availability pill,
and put the trust bar in its own rounded panel. **Atelier is that layout in warm
daylight; fora is it at night with fog.** Chicago Auto Pros was rejected by
Andrew for this slot, correctly — it shares no formal language with fora, and a
pair that shares nothing is not a tension, it is two briefs.

**The tension to resolve:** *Atelier's page is a showroom, fora's is weather.*
A driveway is neither — it is somebody's house on a Tuesday. The page has to
hold a soft, atmospheric ground **and** the plainest possible facts about
price, time and area, without the atmosphere making the facts feel like
marketing.

## The business

- **Ballantyne Mobile Detailing — Charlotte, NC.** A place plus the trade; no
  coinage, no mood. Ballantyne is a real Charlotte area, so the name says where
  as well as what.
- **Why not the other two sites' towns:** site 1 is North Seattle, site 2 is
  Mesa AZ. **Area is one of the six things Andrew listed as having to vary.**
- **Facts come off real sites** per `docs/tenant-site-source-data-2026-09-08.md`
  — service names, the three-size vehicle ladder, condition disclaimers and the
  five real FAQ anxieties. Invented: the business name, the towns, the review
  text, the stat figures (kept inside that file's § 5 range).

## 10. PHOTOGRAPHY — the shortlist, chosen by LOOKING at a contact sheet

Twelve candidates were rendered to one sheet and inspected. **The rejections
matter more than the picks and are named here so the next session does not
reach for them again:**

| Rejected | Why — seen in the frame, not in the alt text |
|---|---|
| `yA3Rb0krauM` | **another firm's logo on the detailer's shirt** (P&S Detail Products) — site j's exact failure |
| `Gu17tebrrV8` | branded workwear again, plus a two-post lift: that is a shop, not a mobile detailer |
| `nLfSk3dFpZ4` | a shelf of branded bottles and machines — a supplier's photo, and a fixed premises |
| `c-ebQX7w9FI` | garage bay, and a blade held against paint reads as risk |
| `Df9XCGX9Y2U` | grey cloth on near-black paint; muddy at any size |

| Kept | What it is for |
|---|---|
| **`B7hVEFTFUWs`** | **the hero.** Polisher on a dark bonnet beside a lit headlight; cinematic, no badges, no premises, works on a light OR a dark ground — which is why all three ground frames used it |
| `iXpjQNP__EQ` | red orbital buffer on a blue bonnet — the one shot with its own strong colour; a work row |
| `qy20XW0tSlw` | tan microfibre on deep blue paint, heavy reflections — the coating/protection band |
| `69clCDJbqrs` | hand and cloth, close, dark car — a process step |
| `OlFPYRK9xgM` | burgundy saloon outside a house with red shutters — **the service-area section**; this is what "we come to you" actually looks like |
| `LlQ1hfoLqdY` | blue hatchback in front of a garage door — an ordinary car at an ordinary house, for the same job |

**Every one is a SLOT.** `object-fit: cover` at a stated ratio, a scrim computed
against a white photograph, and a comment naming the tenant field that fills it.

## 3. THE TILE — pending

The three candidate grounds as sent, all measured off the rendered frame with
the sampler in `docs/schemes/measure/site3-contrast.mjs` (text colour from computed style,
ground colour from a real pixel):

| | Ground | Accent | Worst measured pair |
|---|---|---|---|
| **A** petrol night | `#0A1317` under a teal fog and a low amber glow | amber `#F5A524` | stat label 7.81:1 |
| **B** painted teal | `#10635F` → `#0B4A47`, cream `#F4EFE6` bands, 5px dot screen | butter `#FFD166` | nav link 4.55:1 |
| **C** cool daylight | `#EDF1F5` → `#DFE5EB` under a blue bloom | blue `#1F4FE0` | stat label 4.71:1 |

**Every pair in all three clears 4.5:1.** B is the tightest and the most
different from anything in `docs/tenant-sites/`; A is nearest fora and therefore
nearest site 2's family; C is the only light option that is not site 1's warm
bone.

**Recommendation sent: B.**

*(§§ 1, 2, 4–9 and 11 get filled once the ground is picked — they all depend on
it, and filling them first would be writing a scheme against three answers.)*
