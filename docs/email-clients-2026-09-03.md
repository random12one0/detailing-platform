# Will these emails work everywhere? — 2026-09-03 (roadmap 2.18)

The owner approved the rebuilt look and then asked the right follow-up:

> *"do some resasserch into how emails and different services open it and make
> sure it will work globally."*

He is asking it about a **dark** email, which is the version of the question
with real teeth: dark is where email clients misbehave, and a design that looks
right in a browser can arrive inverted, greyed or unreadable.

**Short answer: it holds. The majority of opens render it as coded, the
minority that don't get a light version of the same email that is still
readable and still the right hue, and nothing anywhere renders it broken.**
Three changes were made because of this research and they are listed at the
bottom. One real defect was found that has nothing to do with dark mode.

---

## Who actually opens email

| Client | Share of opens | What it does to a DARK email in dark mode |
|---|---|---|
| **Apple Mail** (macOS, iPhone, iPad) | **~58–65%** | **Leaves it alone** — unless it finds pure `#ffffff` or `#000000`, which it reads as "this email has no opinion, invert it" |
| **Gmail** (all) | **~29%** | **Desktop web: leaves it alone.** Android: algorithmic, and explicitly-set backgrounds survive. **iOS app: the one real risk — it can fully invert an already-dark section** |
| **Outlook** (all) | **~4%** | **Windows desktop is the only Outlook that reliably auto-inverts.** Outlook.com and the mobile apps do *partial* inversion, which by definition leaves a dark background alone |
| Yahoo / AOL | small | No change to rendering |

Sources at the bottom. **Share figures are approximate and vary by source
between 58% and 65% for Apple**; the ordering does not vary, and the ordering
is what the decision rests on.

**The audience makes this better than the raw numbers suggest.** These emails go
to *car owners*, not to offices. Outlook Windows — the worst-behaved client of
the three — is overwhelmingly an enterprise desktop, and it is 4% of all opens
before that skew is applied.

---

## What actually happens to our email in the worst case

The failure mode people fear is *light text on a light background*. **That
cannot happen here**, and the reason is structural rather than lucky:

- **Every colour is set explicitly**, on the element that shows it. Nothing
  relies on transparency or on an inherited default. Inversion engines flip
  what they find; when the ground and the type are both declared, they flip
  **together** and stay in sync.
- **Full inversion flips BRIGHTNESS, not HUE.** This was the specific thing
  worth checking, because "flips brand colours to their opposites" appears in
  more than one guide and implies a green button arriving magenta. It does not:
  the hue is preserved and the lightness is mirrored.

So the worst case — Gmail's iOS app, in dark mode — is **a light-mode version of
the same email**: near-white ground, near-black text, the tenant's colour still
recognisably theirs, every contrast ratio still passing because a ratio is
symmetric under a brightness flip. **Not the design. Entirely readable.**

**There is a known hack that forces the dark rendering through Gmail** —
nested `mix-blend-mode: screen` / `difference` spans. **Not used, deliberately.**
It is fragile, it produces artefacts of its own when it half-applies, it has to
wrap every piece of text in two extra elements, and the thing it buys is
*"looks dark rather than light in one client"* — not *"is readable rather than
unreadable"*. **Add it only if he says the light rendering bothers him**, and
if he does, add it to the shell once rather than to eleven templates.

---

## What was changed because of this research

**1. Pure black and pure white are now impossible in the tenant's colour.**
`emailDarkBrandColors` maps `#ffffff` → `#fefefe` and `#000000` → `#010101`.
Those two exact values are Apple Mail's inversion trigger — **~60% of all
opens** — and they were reachable: a tenant who picks white gets `#ffffff` as
their accent, and crimson's button ink was `#ffffff`. The nudge costs about
0.1 of a contrast ratio and is asserted in `render-emails-new.mjs`. **Applied in
the dark wrapper only**, never in `inkFor`, which the 138-check white-paper
suite pins.

**2. The logo sits on a bone plate.** This one is not a dark-mode subtlety, it
is a straight defect the research direction surfaced: **a detailer's logo is
almost always dark artwork on a transparent or white background**, because it
was made for a white website. Dropped onto `--ink-0` it is *invisible*, and
nothing in this repo could ever detect that — an arbitrary PNG's contrast
cannot be measured, which is the same reason the logo was kept off a
tenant-coloured band. The plate makes every possible upload legible, including
the light-on-transparent one that would have been fine anyway. **Rendered and
looked at** with the worst case (`--logo` draws dark serif artwork on
transparent), because a code path nobody has drawn is a code path nobody has
checked — twice already this session.

**3. `bgcolor` attributes beside every background CSS property.** Outlook's Word
rendering engine reads the attribute more reliably than the property, and a
dark design that loses its ground is the one genuinely unreadable outcome.

---

## What was found that is NOT about dark mode

**THE EMAILS ARE SENT HTML-ONLY. There is no plain-text part.**
`supabase/functions/send-email/index.ts` builds its Resend payload with `html`
and nothing else. That matters for exactly the thing he asked about:

- **Spam filtering.** An HTML-only message with no text alternative is a
  long-standing negative signal, and it applies to every email the product
  sends — including the receipt, which is the one that must not go to junk.
- **Clients and contexts that want text**: smartwatches, screen readers falling
  back, notification previews, and the small tail of text-only setups.

**Fix it during the port, not before.** Each template already renders from a
list of blocks, so a `text` version is a second pass over the same list rather
than eleven hand-written twins — **and this is now the main thing the block
structure buys, since the editor it was originally built for has been
scrapped.**

**Gmail's 102KB clipping threshold is not a risk — measured, not assumed.**
The rebuilt emails are **9–10KB** each. There is two orders of magnitude of
headroom, and the check is worth re-running only if somebody embeds an image as
a data URI.

**Two cosmetic degradations in Outlook Windows, both accepted.**
`border-radius` is ignored, so the button and the logo plate become square
corners — the design leans on rules and space rather than rounded boxes, so it
survives. `letter-spacing` is ignored, so the uppercase labels lose their
tracking and stay legible. **Neither is worth a workaround.**

**"Globally" in the literal sense has one real gap and it is not in the
templates**: `formatDateLong` is hardcoded `toLocaleDateString("en-US")`, so a
date reads *"Thursday, September 17, 2026"* for every tenant in every country.
The product is US-only today and its timezone handling assumes that, so this is
**named rather than fixed** — but a session adding a second country starts here.
Character encoding is fine (`<meta charset="UTF-8">`, and every value is escaped
rather than transliterated).

---

## What is still NOT verified, and it is the honest limit of this file

**Nothing has been opened in a real email client.** Everything above is
research plus a browser rendering. A browser is not Outlook's Word engine, not
the Gmail iOS app, and not Apple Mail's dark-mode pass.

**The cheap next step is a real send**, once the port lands: one test to a
Gmail address, one to an Outlook address, one to an iCloud address, opened in
light and dark. That is twenty minutes and it is the only thing that turns this
file from "should work" into "does work" — which is the standing rule in
CLAUDE.md, and this file does not meet it yet.

---

## Sources

- Litmus — Email Client Market Share — https://www.litmus.com/email-client-market-share
- Litmus — The Ultimate Guide to Dark Mode for Email — https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers
- Email on Acid — Dark Mode for Email — https://www.emailonacid.com/blog/article/email-development/dark-mode-for-email/
- Stripo — Common Issues in Dark Mode and How to Work Around Them — https://support.stripo.email/en/articles/13375260-common-issues-in-dark-mode-and-how-to-work-around-them
- Dyspatch — Solving Gmail Greyscale Dark Mode Issues — https://www.dyspatch.io/blog/solving-gmail-greyscale-dark-mode-issues-in-email-design/
- Mail Designer 365 — Email Design for Dark Mode — https://www.maildesigner365.com/email-design-for-dark-mode/
