# Customer #1: Andrew's Auto Detail (GitHub issue #5)

Written 2026-11-25 for Andrew. Plain steps for when you are back. Nothing here has been
published, and nothing was written to any database. Payments are still in test mode (issue #6), so
nothing you do in step 3 charges real money yet.

## What was prepared

Everything your public site (andrewsdetail.com) says was copied into one file on the build
computer: `tools/studio-audit/data/drafts/andrews-auto-detail.json`. That folder is not
committed, so it stays local. Only text your own site publishes is in it. Where your site says nothing, the file
says "null" instead of guessing.

It holds: business name, Lakewood service area, phone, email, 9 services with "starting at" prices
($30 to $80, three exterior, three interior, three add-ons), the monthly plan (15% off), your about text, your
payment methods, 3 Yelp reviews, your logo, owner photo and 4 gallery photo links, and your Instagram, YouTube,
Yelp and Google links.

The Studio could not build a draft without a real business account on the platform, so there is no
rendered preview yet. That is on purpose: it starts the moment you sign up.

## Your steps (about 20 minutes, on your phone)

1. Open detailingplatform.com and sign up as Andrew's Auto Detail. Use the email you want to log in with.
2. Choose the **Website plan**. It is the only plan that includes a website. The pricing page shows each way to pay and
   does not pre-pick one for you. List price is $999 setup plus $60 a month; the founding offer is $499 plus
   $40 a month. Check the pricing page for what is offered today. The 12-month term and the early-exit fee are
   printed on that page before you pay. Read them; this is your call.
3. Pay in Billing (test mode for now, so use the Stripe test card the page shows).
4. In your dashboard, fill in the **Website brief** and press send. Prices, hours, photos and reviews are not in
   the brief; the site reads them from your dashboard, so enter those in the dashboard too.
5. Tell Claude you are done. It then takes the prepared file and does steps 6 to 8.

## What the AI does with the draft

6. Enters your services, prices, hours and reviews into your dashboard from the file (you check them), and builds
   revision 1 of your site in the Studio from your brief and the file.
7. Sends you a link to open on your phone. You tap "I'm happy with it" or tell it what to change.
8. Checks the site against your dashboard. Publishing needs your yes, a paid website plan and a verified web address.
   Pointing a web address (DNS) at the site is still done by hand, once, and needs you or a DNS token (see
   `docs/BUILD-A-SITE.md`). Which address you want to use is your decision: your current andrewsdetail.com,
   or a new one. Keep your current site live until the new one is checked.

## Blanks: what your site does not say (please supply)

- A street address or exact service radius (it only says "Lakewood, California").
- The fee for travel outside Lakewood (it says "may include an additional fee").
- Whether prices change by vehicle size. Every price is "starting at".
- Your real hours. Your page says weekdays after 3:30 PM, weekends flexible. Hidden data on the page says
  Mon to Fri 3:00 to 6:00 PM, Sat 10 to 6, Sun 1 to 6. Tell us which is right.
- Anything about insurance or licensing, if you want it stated.
- Before-and-after photos with a short caption. Your 4 gallery photos have no captions.
- Google reviews. Your site only shows Yelp reviews. If you want Google ones on the site, paste the text
  you are happy to show, with the name as shown.
- Your review count. The site says "5.0" but no number of reviews.
- Photos at full size. The prepared links are your own site's images, scaled down to 400 pixels.
  Send the originals from your phone if you want them sharp.

## Things we found on the way

- Your site's hidden search data lists a placeholder phone number (XXX), and says its address is
  andrewsautodetail.com, not andrewsdetail.com. Google may be reading that. Worth fixing on the old site too.
- The same hidden data lists ceramic coating and waxing as services. Your visible price list does not, so they were
  left out.
