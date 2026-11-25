# Section library v1 (what a Studio site is made of)

Every site is a list of sections. Each section has a TYPE (fixed), a VARIANT (its layout), WORDING FIELDS (the
only things a change card can change) and BINDING SLOTS (filled from the dashboard; never changed by a card).

| Type | Plain name | Wording fields | Bound slots (from the dashboard) | Variants |
|---|---|---|---|---|
| hero | First screen | eyebrow (small line above the headline, optional), headline (required), sub (line under the headline, optional) | photo (a gallery photo), prices (a service group shown as a strip), cta (the booking form), call (the phone), area (the area served), sale | poster |
| catalog | Prices | title (required), intro (optional) | group (a service group with its prices), add_ons, plans, sale | ticket |
| proof | Photos and reviews | title (required), intro (optional) | gallery (best photos or one photo), reviews (top reviews) | wipe (a before-and-after slider) |
| visit | Hours and contact | title (required), intro (optional) | hours (the week), area, contact (the phone), faq, pay | board |
| booking | Booking | title (required), intro (optional) | book (the booking form) | inline |

## Bindings (read live; listed so you can recognise them, never write them)
service:<id>.<name|price|description|duration|features|sizes>, service_group:<id>, add_ons, plans, sale,
gallery:<id>, gallery.best(n), reviews.top(n), hours.week, area, contact.phone, faq, pay, book.

## What each wording field is for
- hero.eyebrow: who or where, in a few words ("Neighborhood auto care").
- hero.headline: the promise, in the customer's words.
- hero.sub: the next answer: where, how, or how prices work.
- catalog.title / intro: what the menu is and how to read it (by vehicle size, from prices).
- proof.title / intro: what the photos and reviews show; must be honest about what the pictures are.
- visit.title / intro: where and when they work.
- booking.title / intro: how booking works; the title matches the booking mode.

A required field cannot be emptied. A wording field that a section does not have yet cannot be added by a card
in v1: only the fields the parts list shows can change.
