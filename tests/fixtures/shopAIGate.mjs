import { randomBytes } from "node:crypto";
import { mockProviders } from "./shopAIProviders.mjs";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { manageShopAI } from "../../supabase/functions/_shared/shopAIConfig.js";

// Run the actual Deno entry and its JWT/platform_admins/preview checks with local dependencies.
export function adminEntry({ db, secret, send, mode }) {
  const path = new URL(
    "../../supabase/functions/platform-admin/index.ts",
    import.meta.url,
  );
  const src = readFileSync(path, "utf8").replace(
    /^import\s[\s\S]*?;\s*$/gm,
    "",
  );
  let handler;
  const deno = {
    serve: (fn) => {
      handler = fn;
    },
    env: {
      get: (k) =>
        ({
          BACK_OFFICE_SHOP_AI_WRAPPING_KEY: secret,
          BACK_OFFICE_SHOP_AI_MODE: mode,
        })[k],
    },
  };
  new Function(
    "Deno",
    "supabase",
    "markedPreview",
    "json",
    "preflight",
    "manageShopAI",
    stripTypeScriptTypes(src),
  )(
    deno,
    db,
    async (token) => token === "preview-fixture",
    (v, status = 200) => Response.json(v, { status }),
    () => new Response(null, { status: 204 }),
    (b, a, opts) => manageShopAI(b, a, { ...opts, send }),
  );
  return handler;
}
export const adminId = "00000000-0000-4000-8000-000000000091";
export const ownerId = "00000000-0000-4000-8000-000000000092";
export function adminAuth(db) {
  return {
    ...db,
    auth: {
      getUser: async (token) => ({
        data: {
          user:
            token === "office-fixture" || token === "preview-fixture"
              ? { id: adminId, email: "admin@example.invalid" }
              : token === "stand-in"
                ? { id: ownerId }
                : null,
        },
      }),
    },
    from(table) {
      if (table !== "platform_admins") return db.from(table);
      return {
        select: () => ({
          eq: (_field, value) => ({
            maybeSingle: async () => ({
              data: value === adminId ? { user_id: adminId } : null,
            }),
          }),
        }),
      };
    },
  };
}

export function officeFixture() {
  let state = { revision: 0, preferred_provider: null, connections: {} };
  const ledger = new Map(),
    calls = [];
  const db = adminAuth({
    from(table) {
      if (table !== "shop_ai_config") throw Error("unexpected table");
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: structuredClone(state) }),
          }),
        }),
      };
    },
    async rpc(name, p) {
      if (name === "reserve_shop_ai_edit") {
        if (ledger.has(p.p_id))
          return {
            data: ledger.get(p.p_id).done ? "done" : "already_attempted",
          };
        if (state.revision !== p.p_revision) return { data: "conflict" };
        ledger.set(p.p_id, { ...p });
        return { data: "reserved" };
      }
      if (name !== "finish_shop_ai_edit") throw Error("unexpected rpc");
      const e = ledger.get(p.p_id);
      if (e.p_revision !== state.revision) return { data: false };
      state.revision++;
      state.preferred_provider = p.p_preferred;
      if (e.p_operation === "remove") delete state.connections[e.p_provider];
      else state.connections[e.p_provider] = p.p_connection;
      e.done = true;
      return { data: true };
    },
  });
  const fake = mockProviders();
  const send = (url, init) => {
    if (init.method !== "GET") throw Error("Unexpected generation request");
    calls.push(url);
    return fake(url, init);
  };
  const secret = randomBytes(32).toString("base64");
  const handler = (mode) => adminEntry({ db, secret, send, mode });
  return { handler, calls, state: () => structuredClone(state) };
}
