import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { ownerDraft } from "../supabase/functions/_shared/ownerDraftAccess.js";
import { fixture, shop } from "./fixtures/pilotGemini.mjs";
import { websiteAnswers } from "../app/src/owner-draft/website.js";
import { keyHint } from "../app/src/owner-draft/modelProvider.js";
function harness(providerSend) {
  const f = fixture(),
    rows = new Map(),
    owner = randomUUID(),
    business = randomUUID();
  const flags = {
    enabled: "1",
    owner,
    business,
    ai: "enabled",
    secret: f.secret,
  };
  const member = { userId: owner, businessId: business, role: "owner" };
  const scope = { member, preview: false, reads: 0 };
  const db = {
    read: async (k) => {
      scope.reads++;
      return structuredClone(rows.get(k));
    },
    create: async (k, value) => {
      if (rows.has(k)) return false;
      rows.set(k, { value: structuredClone(value), revision: 1 });
      return true;
    },
    save: async (k, value, rev) => {
      if ((rows.get(k)?.revision ?? 0) !== rev) return false;
      rows.set(k, { value: structuredClone(value), revision: rev + 1 });
      return true;
    },
  };
  const send = async (
    action,
    params = {},
    origin = "https://detailingplatform.com",
  ) => {
    const req = new Request("https://fixture.invalid", {
      method: "POST",
      headers: { origin },
      body: JSON.stringify({ business_id: business, action, ...params }),
    });
    return ownerDraft(req, {
      flags,
      requireMember: async (_r, id, options) => {
        assert.equal(id, business);
        assert.deepEqual(options, { allowUnpaid: true });
        return scope.member;
      },
      markedPreview: async () => scope.preview,
      storeFor: () => db,
      send: providerSend ?? f.deps.send,
      now: f.deps.clock,
      json: (v, status = 200) => Response.json(v, { status }),
      preflight: () => new Response(null, { status: 204 }),
    });
  };
  return { ...f, flags, owner, business, member, scope, send, rows };
}
test("owner and tenant admission applies to every action before storage", async () => {
  const h = harness();
  for (const action of ["access", "settings", "suggest"]) {
    for (const member of [
      null,
      { ...h.member, userId: randomUUID() },
      { ...h.member, businessId: randomUUID() },
      { ...h.member, role: "staff" },
    ]) {
      h.scope.member = member;
      assert.equal((await h.send(action)).status, 404);
    }
    h.scope.member = h.member;
    h.scope.preview = true;
    assert.equal((await h.send(action)).status, 404);
    h.scope.preview = false;
    assert.equal(
      (await h.send(action, { business_id: randomUUID() })).status,
      404,
    );
    assert.equal(
      (await h.send(action, {}, "https://preview.invalid")).status,
      404,
    );
    h.flags.enabled = "";
    assert.equal((await h.send(action)).status, 404);
    h.flags.enabled = "1";
  }
  h.flags.ai = undefined;
  assert.deepEqual(await (await h.send("access")).json(), {
    owner: h.owner,
    business: h.business,
    mode: "off",
  });
  assert.equal((await h.send("settings", { op: "read" })).status, 404);
  assert.equal((await h.send("suggest")).status, 404);
  assert.equal(h.scope.reads, 0);
  assert.equal(h.calls.length, 0);
});
test("reviewed Gemini model, redaction, retries, manual fallback and evidence", async () => {
  const h = harness(),
    model = "gemini-3.8-flash";
  let rev = 0;
  const params = (op, extra) => ({
    op,
    provider: "gemini",
    revision: rev,
    requestId: randomUUID(),
    ...extra,
  });
  const update = async (op, extra = {}) => {
    const response = await h.send("settings", params(op, extra));
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    rev = body.revision;
    assert.ok(!JSON.stringify(body).includes(h.key));
    return body;
  };
  const saved = await update("save", { key: h.key });
  assert.equal(saved.active, "manual");
  assert.ok(saved.providers.gemini.models.some((x) => x.id === model));
  assert.ok(
    !saved.providers.gemini.models.some((x) => x.id === "gemini-3.5-flash"),
  );
  assert.equal(saved.providers.gemini.verifiedAt, null);
  assert.ok(!JSON.stringify([...h.rows]).includes(h.key));
  assert.equal(
    (await h.send("settings", params("activate", { model }))).status,
    404,
  );
  const active = await update("activate", { confirmed: true, model });
  assert.equal(active.active, "gemini");
  const p = params("suggest", { confirmed: true, model, answers: shop });
  const r = await h.send("suggest", p);
  assert.equal(r.status, 200);
  const { suggestions: v } = await r.json();
  assert.equal(v.size_mode, "purchase");
  assert.deepEqual(
    v.vehicle_sizes.map((x) => x.fee),
    [0, 15, 30],
  );
  assert.deepEqual(
    v.services.map((x) => [x.name, x.minutes]),
    [["Interior", 60]],
  );
  assert.deepEqual(
    v.vehicle_sizes.map((x) => 100 + 50 + x.fee),
    [150, 165, 180],
  );
  assert.equal(v.cancellation_window_hours, undefined);
  assert.match(v.follow_up, /Exterior/);
  assert.match(v.follow_up, /cancellation/i);
  assert.equal((await h.send("suggest", p)).status, 409);
  assert.equal(
    (await h.send("suggest", { ...p, requestId: randomUUID() })).status,
    429,
  );
  h.later();
  const per = await h.send(
    "suggest",
    params("suggest", {
      confirmed: true,
      model,
      answers: {
        ...shop,
        size_details: shop.size_details.replace(
          "once per booking",
          "for each service",
        ),
      },
    }),
  );
  assert.equal((await per.json()).suggestions.size_mode, "service");
  const before = h.calls.length;
  assert.equal(
    (
      await h.send(
        "suggest",
        params("suggest", {
          confirmed: true,
          model,
          answers: { ...shop, customers: ["fictional"] },
        }),
      )
    ).status,
    400,
  );
  assert.equal(h.calls.length, before);
  h.later();
  h.fail(503);
  assert.notEqual(
    (await h.send("suggest", { ...p, requestId: randomUUID() })).status,
    200,
  );
  h.fail(0);
  assert.equal(
    (await (await h.send("settings", { op: "read" })).json()).active,
    "gemini",
  );
  const removed = await update("remove");
  assert.equal(removed.active, "manual");
  assert.equal(removed.providers.gemini.hasKey, false);
});
test("website form prefill preserves manual edits and ambiguous keys need a choice", () => {
  assert.deepEqual(
    websiteAnswers(
      {
        name: "Juniper",
        website: "https://fixture.invalid",
        service_area: "Mesa",
      },
      { A1: "My edit" },
    ),
    { A1: "My edit", oldsite: "https://fixture.invalid", A4: "Mesa" },
  );
  assert.equal(keyHint("fixture"), "");
  assert.equal(keyHint("sk-ant-fictional"), "anthropic");
  assert.equal(keyHint("sk-proj-fictional"), "openai");
  assert.equal(keyHint("AIza" + "x".repeat(22)), "gemini");
});

import { ids, mockProviders } from "./fixtures/shopAIProviders.mjs";
test("each provider uses its own confirmed key and verified model", async () => {
  const calls = [];
  const h = harness(mockProviders((url) => calls.push(new URL(url).host)));
  let revision = 0;
  for (const [provider, model] of Object.entries(ids)) {
    const expected = {
      openai: "api.openai.com",
      anthropic: "api.anthropic.com",
      gemini: "generativelanguage.googleapis.com",
    }[provider];
    for (const op of ["save", "activate"]) {
      h.later();
      const res = await h.send("settings", {
        op,
        provider,
        requestId: randomUUID(),
        revision,
        key: h.key,
        model,
        confirmed: true,
      });
      const result = await res.json();
      assert.equal(res.status, 200, JSON.stringify(result));
      revision = result.revision;
      assert.equal(calls.at(-1), expected);
      if (op === "activate") {
        assert.equal(result.providers[provider].model, model);
        assert.equal(result.active, provider);
      }
    }
  }
  const old = revision;
  const rejected = await h.send("settings", {
    op: "remove",
    provider: "gemini",
    requestId: randomUUID(),
    revision: old - 1,
  });
  assert.equal(rejected.status, 409);
});
