// The hosted preview link's rules (supabase/functions/_shared/sitePreview.js): the same module Deno serves.
import test from "node:test";
import assert from "node:assert/strict";
import { act, stateOf, PATH, TOKEN } from "../supabase/functions/_shared/sitePreview.js";

const spec = { pages: [{ path: "/", sections: [{ id: "hero", type: "hero" }, { id: "prices", type: "catalog" }] }] };
const review = { purpose: "review", expires_at: new Date(Date.now() + 86400000).toISOString(), revoked_at: null, view: { business: "A", spec, comments: [], thumbs: {}, from_website: [{ id: "A2", question: "About", value: "x", url: "https://a.test/" }] } };
const choose = { purpose: "choose", expires_at: review.expires_at, revoked_at: null, view: { looks: [{ letter: "A" }, { letter: "B" }] } };

test("missing, cancelled and expired links refuse; an unreadable date is expired", () => {
  assert.equal(stateOf(null).code, 404);
  assert.equal(stateOf({ ...review, revoked_at: new Date().toISOString() }).code, 410);
  assert.equal(stateOf({ ...review, expires_at: new Date(Date.now() - 1000).toISOString() }).code, 410);
  assert.equal(stateOf({ ...review, expires_at: "soon" }).code, 410);
  assert.equal(stateOf(review), null);
});

test("the address carries only a secret of the right shape", () => {
  const t = "a".repeat(43);
  assert.deepEqual(PATH.exec(`/site-preview/p/${t}/comment`).slice(1), [t, "comment"]);
  assert.equal(TOKEN.test(t), true);
  assert.equal(TOKEN.test("a".repeat(42)), false);
  assert.equal(PATH.exec(`/site-preview/p/${t}/delete`), null);
});

test("a comment lands on this link's own view, trimmed, and only on its own sections", () => {
  const r = act(review, "comment", { section: "prices", text: "  cheaper   please ", part: "price", at: { x: 5000, y: -3 }, site: "someone-else" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.event, { section: "prices", part: "price", at: { x: 1000, y: 0 }, text: "cheaper please" });
  assert.equal(r.view.comments.length, 1);
  assert.equal(review.view.comments.length, 0, "the stored row is not changed in place");
  assert.equal(act(review, "comment", { section: "nope", text: "x" }).code, 400);
  assert.equal(act(review, "comment", { section: "prices", text: 5 }).code, 400);
  assert.equal(act(review, "comment", { section: "website", part: "a2", text: "wrong" }).ok, true, "the from-your-website list takes comments");
  assert.equal(act({ ...review, view: { ...review.view, from_website: [] } }, "comment", { section: "website", text: "x" }).code, 400);
  const full = { ...review, view: { ...review.view, comments: Array.from({ length: 300 }, (_, i) => ({ id: i })) } };
  assert.equal(act(full, "comment", { section: "prices", text: "x" }).code, 429);
});

test("votes, happy and pick follow the link's purpose", () => {
  assert.deepEqual(act(review, "thumbs", { section: "hero", thumbs: "up" }).view.thumbs, { hero: "up" });
  assert.equal(act(review, "thumbs", { section: "website", thumbs: "up" }).code, 400);
  assert.ok(act(review, "happy", {}).view.approved_at);
  assert.equal(act(review, "pick", { letter: "A" }).code, 400);
  assert.equal(act(choose, "comment", { section: "hero", text: "x" }).code, 400);
  assert.equal(act(choose, "pick", { letter: "C" }).code, 400);
  assert.equal(act(choose, "pick", { letter: "B" }).view.picked, "B");
  assert.equal(act(review, "comment", null).code, 400);
});
