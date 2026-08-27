# Dashboard spec — gap report

What was built against `docs/dashboard-spec.md`, as of this branch. No fixes
applied; this is the list.

## Matches the spec

**Navigation** — five bottom tabs (Today · Calendar · Money · Clients ·
More) at one URL, mobile-first, large tap targets.

**Today** — jobs in time order with name, service, time; today's expected
earnings; unpaid jobs surfaced; tap a job for its detail sheet. Job detail
has call, text, directions, mark complete, collect payment, and email the
customer an update.

**Calendar** — month view with job markers, tap a day for its jobs, add a
booking manually, block dates, block hours, special hours for one date.
Built as small files (`Calendar.jsx` ~150 lines) rather than the old
monolith.

**Money** — money in / money out / what's left / jobs done; unpaid list;
recent expenses with an add button. No margins, percentages, year-over-year
or hourly-wage figures, per the "do not include" list.

**Clients** — searchable list, contact info, past bookings, total spent,
last visit, call/text/email, notes. Customers are linked to bookings by a
real `customer_id` foreign key, not phone-number text matching.

**More** — business info, branding, services (flat list with vehicle-size
pricing, on/off, sort order), add-ons, booking rules (all nine settings,
each with a dismissable warning that never blocks, plus the live slot
count), hours, promo codes and the site-wide sale, gallery, review links.

**Rules that apply everywhere** — nothing is hard deleted (bookings
soft-delete, services deactivate); every booking write goes through one
server function with one set of validation; every setting is scoped to its
business, proven by the isolation suite.

**Day one** — a new detailer needs name, phone, email, one service and
hours; everything else has defaults.

## Gaps — in the spec, not built

1. **Greeting with their name** (Today). The header shows the business
   name, not "Morning, Andrew". No `first_name` is stored for a user.
2. **Next job highlighted** (Today). Jobs are listed in order with no
   emphasis on the next one.
3. **Unpaid jobs are not tappable-to-mark-paid** (Today and Money). They are
   listed as a warning; marking paid goes through the job's Finalize flow.
4. **Add to contacts** button (job detail). The old app attached a vCard to
   the owner email; neither that nor a button was ported.
5. **Add to calendar** button (job detail). No `.ics` generation exists in
   the new build.
6. **Money — change vs last month** on each of the four numbers, green up /
   red down. Current numbers have no comparison.
7. **Money — the 6-month bar chart.** Not built.
8. **Money — average job value.** Not built. (The spec calls this the number
   that drives behavior most.)
9. **Money — three-tap expense entry with fixed categories.** Entry works
   but takes more than three taps, and the categories are
   supplies/fuel/equipment/marketing/insurance/other rather than the spec's
   product/gas/equipment/supplies/other.
10. **Clients — last visit** is not shown (visit count and total spent are).
11. **Notifications settings page.** Which emails send, reminder timing,
    where owner alerts go, push on/off. The underlying settings columns all
    exist; there is no screen for them.
12. **Message templates page.** Prefilled, editable customer texts. Not
    built; the text button opens an empty SMS.
13. **Website-only tabs** (page content, reviews/testimonials) and the
    website-vs-booking-only package distinction. Gallery exists but is shown
    to every business; there is no package flag.
14. **Business info fields**: description and website are not on the form
    (name, tagline, phone, email, service area, drop-off address, socials
    are).
15. **Owner photo and owner bio** (branding). Logo, hero, colors, tagline
    and about copy exist; a separate owner photo/bio pair does not.

## Divergences — built differently on purpose

- **Branding colors: the spec says "a curated set of palettes, not a free
  color picker."** Both are offered — eight curated presets *and* a custom
  picker, with automatic contrast correction so no custom choice can render
  unreadably. If the intent was to forbid custom colors entirely, remove the
  picker; the contrast machinery makes it safe either way.
- **"All Bookings" is folded into Calendar** as a List mode with status
  filters, rather than existing as its own screen. This was an explicit
  instruction in the Phase 2 brief and matches the spec's "keep this
  simple".
- **Appearance & theme** (light/dark toggle) is a More section the spec
  doesn't mention — added per a later instruction.
- **Team & access** (staff invites and roles) is a More section the spec
  doesn't mention — added per a later instruction.
- **Services are deactivated always, not only "if bookings exist."** The
  spec allows deletion when no bookings reference a service; the build never
  deletes. Simpler, and consistent with the never-hard-delete rule.
- **Money's date range is selectable (7/30/90/365 days)** rather than fixed
  to "this month". The month comparison in gap 6 would still need building.
