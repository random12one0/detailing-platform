// ROADMAP 0.11be — which stored gallery addresses become a storage key, and
// which never do. Credential-free; imports only `photo-rules.js`.
//
//   node --test tests/gallery-remove-keys.test.mjs
//
// The browser half (the real Remove button, refusal, retry, both pair members)
// is `scripts/gallery-remove-browser.mjs`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { MEDIA_PUBLIC_BASE, storedMediaAt } from "../app/src/lib/photo-rules.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const F = "33333333-3333-4333-8333-333333333333";
const SB = "https://kguqylyzgyzfktkfnhjb.supabase.co";
const OLD = `${SB}/storage/v1/object/public/business-media/`;
const at = (url) => storedMediaAt(url, { businessId: A, oldBase: OLD });

test("this business's own objects become their exact key, on the right store", () => {
  assert.deepEqual(at(`${MEDIA_PUBLIC_BASE}/${A}/gallery/${F}.png`), { kind: "r2", key: `${A}/gallery/${F}.png` });
  assert.deepEqual(at(`${OLD}${A}/gallery/${F}.jpg`), { kind: "supabase", key: `${A}/gallery/${F}.jpg` });
  // The old path took the extension off the file name.
  assert.deepEqual(at(`${OLD}${A}/intake/${F}.jpeg`), { kind: "supabase", key: `${A}/intake/${F}.jpeg` });
});

test("another business's object on either store is foreign, never a key", () => {
  assert.deepEqual(at(`${MEDIA_PUBLIC_BASE}/${B}/gallery/${F}.png`), { kind: "foreign" });
  assert.deepEqual(at(`${OLD}${B}/gallery/${F}.jpg`), { kind: "foreign" });
});

test("external addresses are never guessed into keys, even when the path looks like one", () => {
  for (const url of [
    `https://cdn.example.test/${A}/gallery/${F}.png`,
    `https://images.unsplash.com/photo-1?w=800`,
    `https://media.detailingplatform.com.evil.test/${A}/gallery/${F}.png`,
    `http://media.detailingplatform.com/${A}/gallery/${F}.png`,
    `${MEDIA_PUBLIC_BASE}/${A}/gallery/${F}.png?x=1`,
    `${MEDIA_PUBLIC_BASE}/${A}/gallery/${F}.png#y`,
    `${MEDIA_PUBLIC_BASE}/${A}/gallery/../../${B}/gallery/${F}.png`,
    `${MEDIA_PUBLIC_BASE}/${A}/gallery%2F${F}.png`,
    `${MEDIA_PUBLIC_BASE}/${A}/secrets/${F}.png`,
    `${MEDIA_PUBLIC_BASE}/${A}/gallery/${F}.heic`,
    `${MEDIA_PUBLIC_BASE}/whatever.png`,
    `${SB}/storage/v1/object/public/job-photos/${A}/gallery/${F}.jpg`,
    "not a url", "", null, undefined,
  ]) assert.deepEqual(at(url), { kind: "external" }, String(url));
});

test("without a business id nothing is ours", () => {
  assert.deepEqual(storedMediaAt(`${MEDIA_PUBLIC_BASE}/${A}/gallery/${F}.png`, { oldBase: OLD }), { kind: "foreign" });
});
