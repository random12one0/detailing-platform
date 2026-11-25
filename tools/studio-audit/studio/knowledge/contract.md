# The detailer site contract (what every Studio site owes the dashboard)

From the platform's tenant-site contract. A Studio site is presentation only. The detailer's dashboard is the one
source of truth, and the site reads it live through one call, the detailer's public profile.

## What a site may change
Layout, sections, wording, imagery choices, palette, motion, typography, page count, domain.

## What a site may never contain
Any business logic or fact: prices, availability, slot maths, discounts, validation, the booking write. A site
asks the platform; it never computes. A site that adds prices up itself will one day print a number the server
does not charge; a site that works out open days will offer a time the server refuses.

## The twelve things every site shows, all read live from the dashboard
1. The booking form, built into the site in its own design: Services, Extras, Vehicle, Location, When, Details,
   Review. A clear route to it from every page. The price comes from the booking system, the times too.
2. The service catalogue: every active service in its group, with price, "from" prices, the vehicle-size
   ladder, duration, what is included and notes.
3. Add-ons, if the detailer has them.
4. Monthly plans, if any.
5. The site-wide sale, while one runs.
6. The gallery: real photos of their work; before-and-after where they have pairs. Never invented results.
7. Reviews, with their source, shown the way the detailer chose (first name and initial, first name, none).
8. The FAQ, if any.
9. How to pay.
10. Hours and the area served.
11. Name, phone (call and text), email, socials.
12. Never contradict the booking mode: if bookings are requests, the wording promises a request ("Request a
    time"), not a confirmed booking ("Book instantly").

Each appears somewhere a customer can reach without asking. If the dashboard lacks one, the section disappears;
the site never fills the gap with made-up text.

## How the Studio enforces it
- The spec (what a revision holds) has no field for a fact. Facts appear only as bindings, short allow-listed
  addresses the renderer looks up when a customer opens the page.
- Any digit, currency sign, percent sign, Roman numeral or number word typed into wording is refused on save.
- A binding to something the dashboard no longer has fails the save.
- Every applied change runs the quick check (fits the dashboard, nothing spills sideways at phone width, no
  errors) before it becomes a revision.
