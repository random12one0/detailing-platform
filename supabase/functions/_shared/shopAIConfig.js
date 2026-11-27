import { providers, validModel, discoverModels } from "./setupProviders.js";
import { seal, unlock } from "./shopAISecrets.js";
async function readConfig(db) {
  const { data, error } = await db
    .from("shop_ai_config")
    .select("revision,preferred_provider,connections")
    .eq("singleton", true)
    .single();
  if (error || !data) throw Error("storage_unavailable");
  return data;
}
function metadata(s) {
  return {
    revision: s.revision,
    mode: "configure",
    preferredProvider: s.preferred_provider,
    providers: Object.fromEntries(
      providers.map((p) => {
        const c = s.connections[p];
        return [
          p,
          {
            hasKey: !!c?.sealed,
            models: (c?.models ?? [])
              .filter((m) => validModel(m.id))
              .map((m) => ({ id: m.id })),
            refreshedAt: c?.refreshedAt ?? null,
            model: c?.preferredModel ?? null,
          },
        ];
      }),
    ),
  };
}
const statuses = {
  invalid_request: 400,
  invalid_provider: 400,
  missing_key: 409,
  unsupported: 422,
  key_rejected: 422,
  provider_limit: 429,
  rate_limited: 429,
  conflict: 409,
  already_attempted: 409,
  incomplete_list: 503,
  provider_unavailable: 503,
  encryption_unavailable: 503,
  storage_unavailable: 503,
};
export async function manageShopAI(
  body,
  admin,
  { db, secret, mode, send = fetch },
) {
  const fail = (error, status) => ({ status, body: { error } });
  if (!admin?.id) return fail("Not found", 404);
  try {
    const { op, provider, revision, requestId } = body;
    if (mode !== "configure" || !secret)
      return op === "read"
        ? { status: 200, body: { mode: "off" } }
        : fail("Settings unavailable", 403);
    if (op === "read")
      return { status: 200, body: metadata(await readConfig(db)) };
    if (
      !providers.includes(provider) ||
      !["save", "remove", "refresh", "prefer"].includes(op) ||
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      !/^([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i.test(
        requestId,
      )
    )
      throw Error("invalid_request");
    if (
      op === "save" &&
      (body.confirmed !== true ||
        typeof body.key !== "string" ||
        !/^[\x21-\x7e]{8,2048}$/.test(body.key))
    )
      throw Error("invalid_request");
    if (op === "prefer" && !validModel(body.model))
      throw Error("invalid_request");
    const reservation = await db.rpc("reserve_shop_ai_edit", {
      p_id: requestId,
      p_actor: admin.id,
      p_revision: revision,
      p_operation: op,
      p_provider: provider,
    });
    if (reservation.error) throw Error("storage_unavailable");
    if (reservation.data === "denied") return fail("Not found", 404);
    if (!["done", "reserved"].includes(reservation.data))
      throw Error(reservation.data);
    const state = await readConfig(db);
    if (reservation.data === "done")
      return { status: 200, body: metadata(state) };
    if (state.revision !== revision) throw Error("conflict");
    let c = state.connections[provider],
      preferred = state.preferred_provider;
    if (op === "remove") {
      if (!c) throw Error("missing_key");
      if (preferred === provider) preferred = null;
    } else if (op === "prefer") {
      if (!c?.models.some((m) => m.id === body.model))
        throw Error("unsupported");
      preferred = provider;
      c = { ...c, preferredModel: body.model };
    } else {
      const key =
        op === "save"
          ? body.key
          : await unlock("back-office/shop-onboarding/" + provider, c, secret);
      const sealed =
        op === "save"
          ? await seal("back-office/shop-onboarding/" + provider, key, secret)
          : c.sealed;
      const models = (await discoverModels(provider, key, send)).filter(
        (m) =>
          !m.id.includes(key) &&
          !(
            provider === "gemini" &&
            ["gemini-3.5-flash", "gemini-3.7-flash"].includes(m.id)
          ),
      );
      const preferredModel =
        op === "refresh" && models.some((m) => m.id === c?.preferredModel)
          ? c.preferredModel
          : null;
      c = {
        sealed,
        models,
        refreshedAt: new Date().toISOString(),
        preferredModel,
      };
      if (preferred === provider && !preferredModel) preferred = null;
    }
    const result = await db.rpc("finish_shop_ai_edit", {
      p_id: requestId,
      p_actor: admin.id,
      p_preferred: preferred,
      p_connection: op === "remove" ? null : c,
    });
    if (result.error) throw Error("storage_unavailable");
    if (!result.data) throw Error("conflict");
    return { status: 200, body: metadata(await readConfig(db)) };
  } catch (e) {
    const code = Object.hasOwn(statuses, e?.message)
      ? e.message
      : "storage_unavailable";
    return fail(code, statuses[code]);
  }
}
