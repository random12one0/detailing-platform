# Build a paying detailer's site (first customers: built by us)

Refs #4. Written 2026-11-25 after moving the Website Studio into `tools/studio-audit/`.

**Short version: the Studio, the intake form and the page that draws a site all work. The last step, putting a
finished site on the detailer's own address, does not work yet. Section 4 says exactly what is missing.**

## 1. Start the tool

Double-click `tools/studio-audit/START-STUDIO.cmd` (or `node tools/studio-audit/server.mjs`). It opens
http://127.0.0.1:5300/ with two tabs, **Studio** and **Audit**. Needs Node 22+ and `npm ci --prefix app` done once.

The Studio works on a *copy* of the repo at `C:\studio-work\s1` and refuses the real checkout. The cmd file makes the
copy the first time. Everything the tool saves goes in `tools/studio-audit/data/` (not committed).

## 2. What the detailer does: the website brief

1. The detailer signs in at detailingplatform.com and fills in the **Website brief** (`app/src/screens/SiteIntake.jsx`,
   questions in `app/src/lib/siteIntake.js`). It saves into the `site_intake` table: one row per business, `answers`
   (JSON, one entry per question id such as `A1`, `D3`) and `submitted_at`.
2. Prices, hours, photos and reviews are **not** in the brief. They come live from the detailer's dashboard.
3. The brief counts as sent when `submitted_at` is set. Check in Supabase: `select business_id, submitted_at from
   site_intake where submitted_at is not null`.

## 3. What we do in the Studio

1. **Studio tab, "Website forms".** Open Studio settings and turn on "Detailer links and website forms" and choose *live*. The Studio then
   reads `site_intake` read-only, using the service key in this repo's own `.env` (never copied anywhere). Each sent
   form appears with the answers found; "Read their website" asks Claude to fill gaps from their old site, and every
   answer must quote the page word for word.
2. **Make the site.** Today the only site the Studio can create is the **Brightline example** ("Add the Brightline
   example"). It loads `app/src/site/specs/brightline.json`. There is no button yet that turns a real form into a
   spec. For a real detailer, copy that spec file to `app/src/site/specs/<slug>.json`, rewrite its words from the
   intake answers (headline, about, FAQ, tone; never a price, hour or review, the validator refuses typed facts), and
   and change `SPEC_REL` in `tools/studio-audit/studio.mjs` (it is hard-wired to the Brightline file). This hand step is the gap between "form sent" and "first draft".
3. **Edit.** Open the site: *Editor* (ask in plain words or tap a part; each answer is a change card you apply or bin),
   *Looks* (three looks and a ChatGPT critic), *Detailer* (a link they open on their phone to say "I'm happy with
   it"), *Publish*.
4. **Check.** Run the connection check and the gates (three screen widths) on the exact revision.
5. **Publish** needs: the detailer's yes (or your written reason), a passed check, passed gates, an active website
   subscription, a verified address in Business > Web address. Pressed twice. This works in the Studio.

## 4. How publishing is meant to work, and what is broken

Meant: the Studio records a *release* in the database. A customer opens the detailer's own address, the Netlify edge
function `app/netlify/edge-functions/tenant-site.mjs` asks the database function `get_published_site_by_host` for that
host, and if there is a live release it serves `site.html`, which `app/src/site/Published.jsx` draws with the same
renderer the detailer approved.

Checked 2026-11-25:

| Piece | State |
|---|---|
| Edge function file | Exists (`app/netlify/edge-functions/tenant-site.mjs`, base dir `app`). Not found anywhere else. |
| `site.html` and `/p/<link>` on detailingplatform.com | Both answer 200. |
| `Published.jsx` | Exists, wired in `app/src/site/main.jsx`. |
| **`get_published_site_by_host` in the live database** | **Missing.** The live API answers 404 "function not found". No file in `supabase/migrations/` creates it. |
| **Tables it reads (`sites`, `revisions`, `releases`)** | **Missing from `supabase/migrations/`.** The drafts are the planned migrations from the retired belt: `docs/studio/S8-planned-migration.sql` (releases and the function) and the S3 one (sites, revisions), never applied. |
| **Studio writing releases to the database** | **Missing.** Publish only writes `tools/studio-audit/data/studio/published.json` on this laptop. |
| Real businesses in the Studio | The business, subscription and address facts the Studio checks come from the offline *example* dashboard, not the real one. |

Effect today: the edge function's lookup fails, it swallows the error and passes the request on, so a detailer's own
address shows their booking page, not the Studio site. Nothing breaks for customers; the site simply never appears.

To finish (separate issue): apply the S3 and S8 migrations through `scripts/apply-migrations.mjs`; make the Studio
read the real business facts and write `sites`, `revisions`, `releases` rows with the service key at publish and
rollback; then test with one `.test`-style host and one real verified domain.

## 5. The Audit tab

Findings no longer go to `ROADMAP.md`. "Create GitHub issue" on a confirmed finding runs `gh issue create` in this
repo. The cheap check is **Readiness > live check**, a read-only visit to detailingplatform.com (set `AUDIT_LIVE_URL`
for another address). The AI audit uses your own Claude or ChatGPT plan through their command-line tools.
