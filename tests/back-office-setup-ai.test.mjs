import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { officeFixture } from "./fixtures/shopAIGate.mjs";
import { ids } from "./fixtures/shopAIProviders.mjs";
import { keyHint } from "../app/src/admin/office/places/modelProvider.js";
test("the real platform-admin entry refuses signed-out, ordinary owner, preview and preview origins", async () => {
  const f = officeFixture(),
    handle = f.handler("configure");
  for (const op of ["read", "save", "refresh", "prefer", "remove"]) {
    for (const [token, origin] of [
      ["", "https://detailingplatform.com"],
      ["stand-in", "https://detailingplatform.com"],
      ["preview-fixture", "https://detailingplatform.com"],
      ["office-fixture", "https://preview.invalid"],
    ]) {
      const r = await handle(
        new Request("https://fixture.invalid", {
          method: "POST",
          headers: { origin, authorization: "Bearer " + token },
          body: JSON.stringify({ action: "shop_ai_settings", op }),
        }),
      );
      assert.equal(r.status, 404);
    }
  }
  assert.equal(f.calls.length, 0);
});
test("admin-only configuration is opt-in, redacted, and can only list models", async () => {
  const f = officeFixture(),
    key = "fictional-" + randomUUID();
  let mode,
    revision = 0;
  const call = async (op, extra = {}) => {
    const handle = f.handler(mode);
    return handle(
      new Request("https://fixture.invalid", {
        method: "POST",
        headers: {
          origin: "https://detailingplatform.com",
          authorization: "Bearer office-fixture",
        },
        body: JSON.stringify({
          action: "shop_ai_settings",
          op,
          provider: "gemini",
          requestId: randomUUID(),
          revision,
          ...extra,
        }),
      }),
    );
  };
  assert.deepEqual(await (await call("read")).json(), { mode: "off" });
  assert.equal((await call("save", { key, confirmed: true })).status, 403);
  assert.equal(f.calls.length, 0);
  mode = "configure";
  assert.equal((await call("save", { key })).status, 400);
  const mutate = async (op, options) => {
    const r = await call(op, options);
    const d = await r.json();
    assert.equal(r.status, 200, JSON.stringify(d));
    assert.equal(r.headers.get("cache-control"), "private, no-store");
    assert(!JSON.stringify(d).includes(key));
    revision = d.revision;
    return d;
  };
  for (const [provider, model] of Object.entries(ids)) {
    const id = randomUUID();
    const saved = await mutate("save", {
      provider,
      key,
      confirmed: true,
      requestId: id,
    });
    assert.equal(saved.providers[provider].hasKey, true);
    assert(!JSON.stringify(f.state()).includes(key));
    const calls = f.calls.length;
    const replay = await call("save", {
      provider,
      key,
      confirmed: true,
      requestId: id,
      revision: revision - 1,
    });
    assert.equal(replay.status, 200);
    assert.equal(f.calls.length, calls);
    const preferred = await mutate("prefer", { provider, model });
    assert.equal(preferred.preferredProvider, provider);
    assert.equal(preferred.providers[provider].model, model);
    assert.equal(f.calls.length, calls);
    await mutate("refresh", { provider });
    assert.equal(f.calls.length, calls + 1);
    assert.equal(
      (await call("prefer", { provider, model: "missing" })).status,
      422,
    );
    for (const op of ["activate", "suggest", "verify"]) {
      assert.equal(
        (await call(op, { provider, model, confirmed: true })).status,
        400,
      );
    }
    const removed = await mutate("remove", { provider });
    assert.equal(removed.preferredProvider, null);
    assert.equal(removed.providers[provider].hasKey, false);
  }
  assert.equal(f.calls.length, 6);
  assert(f.calls.every((url) => !url.includes(key)));
  assert.equal(keyHint("sk-ant-fixture"), "anthropic");
  assert.equal(keyHint("ambiguous"), "");
});
