import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { ownerDraft } from "../supabase/functions/_shared/ownerDraftAccess.js";
import { fixture, shop } from "./fixtures/pilotGemini.mjs";
import { websiteAnswers } from "../app/src/owner-draft/website.js";
import { inferSetup } from "../supabase/functions/_shared/setupInference.js";
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
  for (const ai of ["configure", "enabled", undefined]) {
    h.flags.ai = ai;
    for (const op of [
      "read",
      "save",
      "refresh",
      "remove",
      "activate",
      "manual",
    ]) {
      assert.equal((await h.send("settings", { op })).status, 404);
    }
    assert.equal((await h.send("suggest", { confirmed: true })).status, 404);
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
test("website form prefill preserves manual edits", () => {
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
});

test("draft interpretation preserves the charge scope and leaves unclear answers for review", async () => {
  const f = fixture();
  for (const [phrase, expected] of [
    ["once per booking", "purchase"],
    ["for each service", "service"],
  ]) {
    const { suggestions: v } = await inferSetup(
      {
        ...shop,
        size_details: shop.size_details.replace("once per booking", phrase),
      },
      {
        provider: "gemini",
        model: "gemini-3.8-flash",
        apiKey: f.key,
        send: f.deps.send,
        strictPilotEvidence: true,
      },
    );
    assert.equal(v.size_mode, expected);
    assert.deepEqual(
      v.vehicle_sizes.map(
        (x) => 100 + 50 + x.fee * (expected === "purchase" ? 1 : 2),
      ),
      expected === "purchase" ? [150, 165, 180] : [150, 180, 210],
    );
    assert.equal(v.cancellation_window_hours, undefined);
    assert.deepEqual(
      v.services.map((x) => x.name),
      ["Interior"],
    );
    assert.match(v.follow_up, /Exterior/);
  }
});
