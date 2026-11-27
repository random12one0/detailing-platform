import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
export const shop = {
  name: "Fixture Auto Detail",
  menu_notes: "Interior is $100 for 60 minutes. Exterior is $50.",
  size_details:
    "Small is base. Medium adds $15. Large adds $30. Charge once per booking.",
  policy_notes: "I sometimes charge for late cancellations.",
};
const row = (key, value, quote) => ({
  key,
  json_value: JSON.stringify(value),
  quote,
  url: "",
});
export function fixture() {
  const records = new Map(),
    calls = [];
  let now = 1_800_000_000_000,
    failure = 0;
  function put(key, data, options) {
    const old = records.get(key);
    if (
      (options.onlyIfNew && old) ||
      (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)
    )
      return { modified: false };
    const etag = randomUUID();
    records.set(key, { etag, data: structuredClone(data) });
    return { modified: true, etag };
  }
  const store = {
    getWithMetadata: async (key) => structuredClone(records.get(key) ?? null),
    setJSON: put,
    set: put,
  };
  const deps = {
    allowLocalTesting: true,
    getStorage: async () => store,
    clock: () => now,
    send: async (url, opts) => {
      calls.push({ url, body: opts.body ? JSON.parse(opts.body) : null });
      assert.ok(
        url.startsWith(
          "https://generativelanguage.googleapis.com/v1beta/models",
        ),
      );
      assert.equal(opts.redirect, "error");
      if (failure) return Response.json({}, { status: failure });
      if (opts.method === "GET")
        return Response.json({
          models: [
            "gemini-3.5-flash",
            "gemini-3.6-flash",
            "gemini-3.8-flash",
          ].map((id) => ({
            name: "models/" + id,
            supportedGenerationMethods: ["generateContent"],
          })),
        });
      const content = JSON.parse(opts.body);
      assert.ok(content.generationConfig.responseJsonSchema);
      assert.equal(content.tools, undefined);
      const input = content.contents[0].parts[0].text;
      let rows;
      if (input === "The shop name is Juniper Fixture.")
        rows = [row("name", "Juniper Fixture", "Juniper Fixture")];
      else {
        const { answers: a } = JSON.parse(input),
          per = a.size_details.includes("each service"),
          scope = per ? "each service" : "once per booking";
        rows = [
          row("size_mode", per ? "service" : "purchase", scope),
          row(
            "vehicle_sizes",
            [
              { label: "Small", fee: 0 },
              { label: "Medium", fee: 15 },
              { label: "Large", fee: 30 },
            ],
            a.size_details,
          ),
          row(
            "services",
            [{ name: "Interior", price: 100, minutes: 60 }],
            "Interior is $100 for 60 minutes.",
          ),
          row(
            "services",
            [{ name: "Exterior", price: 50, minutes: 50 }],
            "Exterior is $50.",
          ),
          row("cancellation_window_hours", 24, a.policy_notes),
        ];
      }
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [{ text: JSON.stringify({ suggestions: rows }) }],
            },
          },
        ],
      });
    },
  };
  return {
    records,
    calls,
    deps,
    key: "fixture-" + randomUUID(),
    secret: randomBytes(32).toString("base64"),
    later: () => {
      now += 65000;
    },
    fail: (s) => {
      failure = s;
    },
  };
}
