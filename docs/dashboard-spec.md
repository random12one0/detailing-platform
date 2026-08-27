# Admin Dashboard Spec

The dashboard a detailer uses to run their business. One dashboard for
everyone — website customers see extra tabs, booking-only customers don't.

Built mobile-first. Detailers use this standing next to a car, on a phone,
with wet hands. Big tap targets, few clicks.

---

## Navigation

Five tabs at the bottom: **Today · Calendar · Money · Clients · More**

All at one URL so it works as a phone home-screen app without opening a browser.

---

## 1. Today

The screen they open twenty times a day. Should answer "what am I doing now"
in under two seconds.

- Greeting with their name
- Today's jobs in time order — customer name, service, time, address
- Next job highlighted
- Today's expected earnings
- Jobs finished but not paid — tappable, marks paid
- Tap any job to open its detail page

**Job detail page:**
- Customer name, phone, address
- Service, add-ons, price
- Notes
- Buttons: call, text (prefilled), directions, add to contacts, add to calendar
- Mark complete, collect payment, email the customer an update

---

## 2. Calendar

- Month view, days with jobs marked
- Tap a day to see that day's jobs
- Add a booking manually (walk-ins, phone bookings)
- Block a date off
- Block specific hours off
- Set special hours for one date

Keep this simple. The current version is the biggest file in the old codebase
and needs to be broken into smaller pieces.

---

## 3. Money

Two questions only: am I making money, and is this month better than last?

**Top — this month, four big numbers:**
- Money in
- Money out
- What's left
- Jobs done

Each shows change vs last month. Green up, red down.

**Middle — one chart.** Money in by month, last 6 months. Bars only.

**Also show:** average job value. One number. Drives behavior more than anything
else on this screen.

**Bottom — two lists:**
- Waiting to be paid (tappable, marks paid)
- Recent expenses, with an add button

**Adding an expense must take three taps.** Amount, category, done.
Categories are fixed: product, gas, equipment, supplies, other. No custom ones.

**Do not include:** profit margins, percentages, year-over-year, hourly wage,
anything that looks like accounting software.

---

## 4. Clients

- Searchable list
- Tap for: contact info, all past bookings, total spent, last visit
- Call, text, email buttons
- Add a note

Customers must be properly linked to bookings in the database — not matched by
comparing phone number text, which is how the old system did it.

---

## 5. More

A hub of settings pages. This is where the platform gets sold — everything is
theirs to change.

### Business info
Name, tagline, description, phone, email, service area, drop-off address,
website, social links.

### Branding
Logo, primary color, secondary color, hero image, owner photo, owner bio.
Colors come from a curated set of palettes, not a free color picker.

### Services
Flat list. Each service has: name, description, price, how long it takes,
vehicle size pricing, on/off, sort order.
Add-ons are a separate list with the same fields.

Services are turned **off**, never deleted, if bookings exist.

### Booking rules
- Buffer between jobs
- Minimum notice before someone can book
- How far ahead people can book
- Time slot spacing
- Max jobs per day
- Mobile only / shop only / both
- Travel radius and travel fee
- Ask about water and electric — on/off

Every one of these shows a **warning** if set outside recommended range.
Warnings explain what will happen and can be dismissed temporarily or permanently.
Warnings never block the setting.

Show a live count of available slots so they see the effect immediately.

### Hours
Weekly hours. Days off.

### Discounts
Promo codes — percentage or fixed, expiry, usage limit, once per customer, on/off.
Site-wide sale banner.

### Notifications
Which emails send. When reminders go out. Where owner alerts go.
Push notifications on/off.

### Review requests
Their Google review link, their Yelp link, follow-up email timing.

### Message templates
Prefilled text messages they send customers. Fully editable.

---

## Website-only tabs

These appear only for customers on the full website package.

### Page content
Home, about, FAQ, contact copy.

### Gallery
Upload and reorder before/after photos.

### Reviews
Add and edit testimonials shown on the site.

### Section order
Drag to reorder sections on the public site. **Not in the first version.**

---

## Rules that apply everywhere

**Nothing gets permanently deleted.** Bookings hide, services turn off.
Never a hard delete behind a single confirm box.

**One way to write data.** All changes go through the same server function
with the same validation. No screen writes directly to the database.

**Every setting is scoped to that business.** Changing one business's buffer
must never affect another's availability.

---

## Day one vs. later

**A new detailer must fill in:** business name, phone, email, at least one
service, their hours.

**Everything else has sensible defaults** and can be ignored until they care.
They should be able to take a booking within ten minutes of signing up.
