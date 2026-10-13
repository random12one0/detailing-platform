# Public image deletion — ROADMAP 0.11bd

Built locally; not published or live-proved. The box stays open.

The selected policy is to delete the R2 object, then purge its original public
URL from Cloudflare before returning `removed: true`. Short cache lifetimes
leave a period where a removed picture can still be downloaded, and new object
headers cannot clear an old cached copy. Cloudflare itself calls for purging
after deleting a cached R2 object: [R2 consistency and caching](https://developers.cloudflare.com/r2/reference/consistency/).

The implementation is `_shared/mediaCache.ts`, attached only to photo-door's
store in `supabase/functions/photo-door/index.ts`. A missing purge configuration
refuses media deletion before changing the origin. A rejected or unavailable
purge returns the door's existing error. Retrying deletes an already-absent
origin and tries the purge again. Private job photos and receipts use their
existing deletion paths.

## Andrew's account setup

This needs a Cloudflare API permission the R2 S3 upload credential does not
provide. Andrew handles the token; nobody should paste it into a conversation,
tracked file or command printed by a check.

1. In Cloudflare's `detailingplatform.com` zone, copy the **Zone ID**, not the
   Account ID. In that platform's Supabase project (`kguqylyzgyzfktkfnhjb`), save
   it as the function secret `CF_MEDIA_ZONE_ID`.
2. Create an API token with **Zone → Cache Purge → Purge**, restricted to the
   **detailingplatform.com** zone. Save it directly as the function secret
   `CF_CACHE_PURGE_TOKEN`. The [purge API](https://developers.cloudflare.com/api/resources/cache/methods/purge/)
   documents the endpoint and permission. The existing `R2_MEDIA_BASE` stays
   `https://media.detailingplatform.com`.
3. Publish **photo-door** with the new shared adapter. Publishing is Andrew's.
   This change adds no database migration and no new upload headers or CORS
   settings. Missing purge setup blocks media removal, so configure it first.

Only the original canonical URL is purged. If the media domain uses custom
cache keys or additional query-string variants, the policy must account for
them before claiming those variants are erased. This does not erase a file
somebody already downloaded.

## Repeat the proof from the repo root

These commands do not publish or change database structure. The live command
signs in as the demo owner, reads that business's ID, and writes disposable
images only to its R2 gallery folder. It removes each test object on exit.
No gallery row or customer record is written. Sign-in creates the ordinary
demo-owner auth session.

```powershell
node scripts/media-cache-delete.mjs --break=no-purge
node scripts/receipt.mjs receipts/media-cache-delete.sabotage.json
node scripts/media-cache-delete.mjs
node scripts/receipt.mjs receipts/media-cache-delete.json

# In this job's checkout, start its own server in a separate terminal:
npm run dev --prefix app -- --port 5180 --strictPort

node --env-file=.env scripts/media-cache-delete-live.mjs --break=cached-read
node scripts/receipt.mjs receipts/media-cache-delete-live.sabotage.json
node --env-file=.env scripts/media-cache-delete-live.mjs
node scripts/receipt.mjs receipts/media-cache-delete-live.json
```

The sabotage commands must fail with the named cached-read finding. The clean
commands must pass. Run sabotage before clean. Commit both JSON receipts and
their text artifacts after a committed product revision has been measured.

After the real browser upload, the live check PUTs the same disposable PNG
again through its signed URL with `Cache-Control: public, max-age=300`.
This deliberately gives only the test object the old cache lifetime; it
changes no Cloudflare bucket or domain setting and requires no browser CORS
header change. Ordinary test objects returned `REVALIDATED` on 2026-10-13,
which could not certify the cached-read case. This fixture reached a real HIT.

The local receipt declares thirteen scenario groups and carries a canary that
uses the original origin-only deletion. The live receipt declares four targets:
upload/read/delete and foreign-key refusal at each width. It requires uploaded
bytes and a **real `200 HIT` before deletion**, then immediately reads the exact
same public URL anonymously. It never changes that URL, adds a cache-busting
query, sends request `Cache-Control`, or waits for a post-delete 200 to expire.
If it cannot warm a HIT, the success target is incomplete, not a pass.
Cleanup separately reads a fresh query URL to diagnose whether the origin
object is gone. That diagnosis never replaces the warmed original URL proof.

Before publication, the live check reproduced the leak: the deployed door
acknowledged removal, a separate cleanup read returned 404, and the original
public URL still returned `200 HIT`. Its receipt correctly remains a failure.

The browser upload runs from a blank routed test page on the already-allowed
production origin. The check first loads this checkout's server at :5180;
the live bucket rejects :5180 as an upload origin. The fixture supplies only
the empty page, never the door, PUT, public reads or deletion answers. It
proves browser transport and reads the console, not the gallery screen's UI.

## Observed limitation at the gallery button

`app/src/screens/more/Gallery.jsx` currently removes only `gallery_images`'s
row. It does not call `removeBusinessPhoto`, so publishing this adapter alone
does not make that button erase an object. This item originated in deletion
through the deployed door and fixes that cache policy. Do not describe the
button as verified by either receipt. Connecting that screen's object removal
must preserve old Supabase URLs, external URLs and before/after image pairs;
it cannot safely be replaced with an arbitrary URL-to-key deletion.
