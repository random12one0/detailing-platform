# Build a paying detailer's site (first customers: built by us)

Issue #4. Updated 2026-11-25. The path from "the detailer sent their form" to "their site is on their own address" now
works end to end. The database part is live; steps 1 to 7 below are the order to follow.

## Before you start (once)

- Double-click `tools/studio-audit/START-STUDIO.cmd` (or run `node tools/studio-audit/server.mjs`). It opens
  http://127.0.0.1:5300/ with two tabs, **Studio** and **Audit**. Needs Node 22+ and `npm ci --prefix app` done once.
- In **Studio settings** set "Detailer links and website forms" to **live (detailingplatform.com)**. The Studio then
  reads and writes the platform database with the service key in the repo's own `.env` (never copied anywhere).
  Without this the Studio cannot see real businesses and cannot publish.

## The steps

1. **The detailer fills in the Website brief** after signing up (their dashboard, `site_intake` table). It counts as
   sent when it has a "sent" time. Prices, hours, photos and reviews are not in the brief: the site reads them live from
   their dashboard.
2. **The business must be ready.** Three things, all in the database (no screen for them yet, see "Still manual"):
   it is active, it has an **active website subscription** (paid), and it has a **verified web address**
   (Business > Web address in their dashboard). Publishing refuses until all three are true.
3. **Studio tab > "Start from a business".** Type the business's address name (the `slug`, for example `demo-detail`)
   and press the button. The Studio reads their brief and dashboard and makes **revision 1**: their own words from the
   brief where those words are allowed (no numbers, no claims like "insured"; the Studio refuses those), plain defaults
   otherwise. Every price, hour, photo and review is a live link to their dashboard, never typed in.
4. **Edit it** if you want: Editor (ask in plain words, each answer is a change card you apply or bin), Looks, and
   Detailer (a link they open on their phone to say "I'm happy with it").
5. **Check it.** Open the site, press the connection check. For a real business this checks the draft against their
   live dashboard (every link points at something that exists, nothing typed). The three-width layout gates only run
   on the offline demo, so they are not asked for here: open the live site on a phone yourself afterwards.
6. **Publish** (Publish section). It needs: the detailer's "I'm happy with it" (or your written reason, "Go without
   their yes"), the passed check, a paying website subscription, a verified address. Press Publish **twice**. The
   Studio writes the release into the database first; only if that works does it show as live.
7. **Look at it.** Open their address. The customer's browser asks the database which release is live for that address
   (function `get_published_site_by_host`) and draws the site. **Roll back** in the same section puts the previous
   release back in one press (prices and bookings are never touched).

## What the database does (so you can trust it)

Tables `sites`, `revisions`, `releases` (migration `20261125120000_published_sites.sql`, applied 2026-11-25).
Only the Studio's service key can write them; a detailer can read their own; the public cannot read them at all.
The one public door is `get_published_site_by_host(host)`: it answers only for a **verified address of an active,
paying business** whose release lists that address, and a site's spec must name **that business's own slug**, so one
detailer's site can never draw another's data. Releases cannot be edited or deleted, only marked rolled back.

## Proven 2026-11-25

On the fake demo business (Coastline Auto Detailing, since cleaned up): Start from a business, check, publish, then
the same edge code Netlify runs (`tenant-site.mjs`, served by the Vite dev server against the real database) returned
the site for the test address, with live prices ($65 Express Wash from the dashboard) and release number; another
host fell through to the normal page. Rollback and a second release also tested. Not yet proven: the same on a real
domain through Netlify itself (needs a real domain pointing at Netlify, see below).

## Still manual

- A real address must **point at Netlify** (DNS) and be **added to the Netlify site as a domain** before customers
  can open it. Nothing here does that.
- Adding the website subscription and verifying the address are database/dashboard steps (Stripe checkout sets the
  subscription; the verified address has no Studio screen).
- AI rewriting of the brief's words is not built: the first draft uses the detailer's own sentence where allowed.
- Hours, services and photos must already be in their dashboard; a business with no active service is refused.
- The nightly "does the live site match the dashboard" check and the three-width gates still only work on the
  offline demo business.

## The Audit tab

Findings no longer go to `ROADMAP.md`. "Create GitHub issue" on a confirmed finding runs `gh issue create` in this
repo. The cheap check is **Readiness > live check**, a read-only visit to detailingplatform.com (set `AUDIT_LIVE_URL`
for another address). The AI audit uses your own Claude or ChatGPT plan through their command-line tools.
