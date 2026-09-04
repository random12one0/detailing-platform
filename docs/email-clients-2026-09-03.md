# Will these emails work everywhere? — 2026-09-03 (roadmap 2.18)

The owner approved the rebuilt look and then asked the right follow-up:

> *"do some resasserch into how emails and different services open it and make
> sure it will work globally."*

He is asking it about a **dark** email, which is the version of the question
with real teeth: dark is where email clients misbehave, and a design that looks
right in a browser can arrive inverted, greyed or unreadable.

> **CORRECTED THE SAME DAY, AFTER HE TESTED IT. The conclusion below was
> wrong, and the way it was wrong is the lesson.**
>
> This file predicted Gmail's inversion correctly and then reasoned — rather
> than measured — that the result would be "readable". The owner opened the
> real sends: Apple Mail perfect in both modes, Gmail's dark mode broken.
> **Measured afterwards by applying Gmail's actual transform to our palette:
> the accent as words falls to 1.99:1 and the button's ink to 1.77:1**, on a
> 4.5:1 floor. Unreadable, not merely off-brand.
>
> **The emails are LIGHT-FIRST now**, with the dark design behind
> `prefers-color-scheme` for the clients that honour it. Everything below about
> WHICH clients do what is accurate and still worth reading; only the verdict
> in the next paragraph was wrong.
>
> *A prediction plus a plausible consequence is not a measurement. The numbers
> took ten minutes and would have caught it before the send.*

**~~Short answer: it holds.~~** The majority of opens render it as coded, the
minority that don't get a light version of the same email — **and that version
was NOT still readable, which is what the correction above is about.**

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

~~So the worst case is a light-mode version of the same email… entirely
readable.~~ **THIS WAS THE WRONG CONCLUSION AND IT IS WORTH KEEPING VISIBLE.**

The reasoning was: a contrast ratio is symmetric under a brightness flip, so
flipping everything preserves every ratio. **The flaw is that inversion does
not flip everything by the same amount.** It is an HSL *lightness* mirror, so a
mid-lightness accent barely moves (green L≈55% → 45%) while its near-black ink
swings from L≈8% to L≈92%. The pair does not travel together, and the pair is
what contrast measures.

MEASURED AFTERWARDS, which is what should have happened first:

| | before | after Gmail |
|---|---|---|
| accent as words on the ground | 10.07:1 | **1.99:1** |
| ink on the accent button | 10.88:1 | **1.77:1** |
| the 11px labels | 5.16:1 | 3.68:1 |

**Unreadable, not off-brand.** Checked across four accents including crimson and
violet — every one fails, so it is unfixable by palette.

**THE FIX WAS TO MOVE THE DESIGN, NOT THE COLOURS: light-first, with the dark
palette behind `prefers-color-scheme`.** Gmail then darkens a LIGHT email,
which is the one thing its algorithm is actually tuned for, and Apple Mail —
~60% of opens — still shows the real dark design. See `emailKit.ts`'s header.

**The `mix-blend-mode` hack that forces dark through Gmail is still NOT used**,
and light-first removes the reason to want it: what it buys is "looks dark
rather than light", and light is now the intended rendering rather than a
degradation.

*The transferable part: a prediction plus a plausible consequence is not a
measurement, and this file shipped one as if it were.*

---

## What was changed because of this research

**1. Pure black and pure white are now impossible in the tenant's colour, IN
BOTH PALETTES.** `#ffffff` → `#fefefe`, `#000000` → `#010101`. Those two exact
values are Apple Mail's inversion trigger — **~60% of all opens** — and they
were reachable: a tenant who picks white gets `#ffffff` as their accent, and
crimson's and violet's button ink are `#ffffff`. **It was applied to the dark
wrapper only at first, which left the LIGHT path — the one every client now
sees by default — still able to hand Apple Mail its own trigger.** That is the
one way to make Apple Mail behave like Gmail, and it was one line from
shipping. Asserted in both palettes by `render-emails.mjs`.

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

---

## The spam answer — measured on both domains, 2026-09-03

The owner's report: *"it went to my spam folder… because my Andrews detail one
doesn't go to spam."*

**Checked rather than guessed, which settles what it is and is not:**

| | `email.detailingplatform.com` (the platform) | `andrewsdetail.com` (his business) |
|---|---|---|
| DKIM (`resend._domainkey`) | present | present |
| SPF on the sending subdomain | present | present |
| DMARC | `v=DMARC1; p=none;` | `v=DMARC1; p=none;` |
| Resend infrastructure | `forge.rmta.net`, hardcoded shared IPs | `feedback-smtp.us-east-1.amazonses.com` |
| History of real, engaged mail | almost none | months of it |

**AUTHENTICATION IS NOT THE PROBLEM. The two are configured the same way**, and
both pass. Verifying anything further buys nothing, which is the useful half of
this answer — it stops the obvious next move being a wasted afternoon of DNS.

**Two real differences.** The domains sit on **different Resend sending pools**:
his on the long-established Amazon SES one, the platform on Resend's newer
own-MTA pool whose shared IPs have less history. And — much more heavily
weighted by Gmail — **his domain has months of real mail to real people who open
and reply to it, while the platform subdomain has sent almost nothing ever.** A
first-ever message from an unknown domain to a personal Gmail account is a
textbook cold-start classification, and it is what this is.

**One genuine gap: `detailingplatform.com` (the ROOT) has no SPF record at all.**
It does not affect these sends, which come from the subdomain — but a domain
that never states what may send for it is a weaker domain, and it is free to
fix. `v=spf1 -all` on the root says "nothing sends from the bare name", which is
true and also blocks spoofing.

### What actually moves the needle, in order

1. **Mark it "Not spam" and drag it to the inbox.** Fixes his own view
   immediately and teaches Gmail for his account. Does nothing for customers.
2. **Root SPF and a DMARC `rua=` address.** Small, free, and the reporting gives
   visibility nobody has today.
3. **Time and engagement.** This is the actual answer and it cannot be bought:
   reputation is earned by mail that real people open and reply to. It arrives
   with real tenants sending real confirmations, not with test sends to oneself.
4. **The plain-text part**, added the same day, is a real positive signal that
   was missing for the whole life of the product.

**NOT DONE, DELIBERATELY: a `List-Unsubscribe` header.** It is a
legitimate-sender signal and it is the wrong tool here — these are transactional
emails, and a customer who unsubscribes stops receiving their own receipts.
Gmail's one-click requirement applies to bulk senders; this is not one.

**Worth knowing and not acted on:** the platform and the live business share one
Resend account, so platform test sends accumulate against the same reputation as
Andrew's Auto Detail's real customer mail. A separate account for the platform
before real tenants exist was flagged in Phase 0 and is still the right move.
