import {
  providers,
  discoverModels,
  verifyModel,
  validModel,
} from "./setupProviders.js";
import { seal, unlock } from "./ownerDraftSecrets.js";
import { inferSetup } from "./setupInference.js";
import { writtenAnswers } from "./ownerDraftInput.js";
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const modelEligible = (provider, id) =>
  validModel(id) &&
  (provider !== "gemini" ||
    !["gemini-3.5-flash", "gemini-3.7-flash"].includes(id));
const codes = {
  invalid_request: 400,
  conflict: 409,
  missing_key: 409,
  unsupported: 422,
  key_rejected: 422,
  verification_failed: 422,
  rate_limited: 429,
  provider_limit: 429,
  already_attempted: 409,
  provider_unavailable: 503,
  encryption_unavailable: 503,
  storage_unavailable: 503,
  website_unavailable: 422,
};
const failure = (code) => {
  throw Error(code);
};
function status(c) {
  return {
    revision: c.revision,
    active: c.active,
    providers: Object.fromEntries(
      providers.map((p) => {
        const v = c.providers[p] ?? {};
        return [
          p,
          {
            hasKey: !!v.sealed,
            models: v.models ?? [],
            model: v.model ?? null,
            verifiedAt: v.verifiedAt ?? null,
          },
        ];
      }),
    ),
  };
}
export async function ownerDraft(
  req,
  {
    flags,
    requireMember,
    markedPreview,
    storeFor,
    send = fetch,
    json,
    preflight,
    now = Date.now,
  },
) {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const deny = () => json({ error: "not_found" }, 404);
  try {
    if (
      req.headers.get("Origin") !==
        (flags.origin || "https://detailingplatform.com") ||
      flags.enabled !== "1" ||
      !uuid.test(flags.owner) ||
      !uuid.test(flags.business)
    )
      return deny();
    const raw = await req.text();
    if (raw.length > 64000) return json({ error: "too_large" }, 413);
    let b;
    try {
      b = JSON.parse(raw);
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
    if (b?.business_id !== flags.business) return deny();
    const m = await requireMember(req, flags.business, { allowUnpaid: true });
    if (
      m?.role !== "owner" ||
      m.userId !== flags.owner ||
      m.businessId !== flags.business
    )
      return deny();
    if (
      await markedPreview(
        (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""),
      )
    )
      return deny();
    const mode =
      flags.secret && ["configure", "enabled"].includes(flags.ai)
        ? flags.ai
        : "off";
    if (b.action === "access")
      return json({ owner: m.userId, business: m.businessId, mode });
    if (mode === "off" || !["settings", "suggest"].includes(b.action))
      return deny();
    const op = b.action === "suggest" ? "suggest" : b.op;
    if (
      ![
        "read",
        "save",
        "activate",
        "remove",
        "refresh",
        "manual",
        "suggest",
      ].includes(op) ||
      (op === "suggest" && b.action !== "suggest")
    )
      failure("invalid_request");
    const db = storeFor(m),
      stored = await db.read("config"),
      c = stored?.value ?? { revision: 0, active: "manual", providers: {} };
    if (op === "read") return json(status(c));
    const p = b.provider;
    if (!providers.includes(p) || !uuid.test(b.requestId))
      failure("invalid_request");
    if (b.revision !== c.revision) failure("conflict");
    if (
      op === "save" &&
      (typeof b.key !== "string" || !/^[\x21-\x7e]{8,2048}$/.test(b.key))
    )
      failure("invalid_request");
    const paid = ["suggest", "activate"].includes(op),
      connection = c.providers[p] ?? {},
      scope = m.businessId + "/" + m.userId + "/" + p;
    if (paid && (mode !== "enabled" || b.confirmed !== true)) return deny();
    if (
      paid &&
      (!modelEligible(p, b.model) ||
        !connection.models?.some((x) => x.id === b.model))
    )
      failure("unsupported");
    let answers;
    if (op === "suggest") {
      if (c.active !== p || b.model !== connection.model) failure("conflict");
      answers = writtenAnswers(b.answers ?? {});
      if (
        !Object.keys(answers).length ||
        Object.keys(b.answers).length !== Object.keys(answers).length
      )
        failure("invalid_request");
    }
    if (!["remove", "manual"].includes(op)) {
      if (!(await db.create("request/" + b.requestId, true)))
        failure("already_attempted");
      if (
        !(await db.create(
          "limit/" + op + "/" + Math.floor(now() / (paid ? 60000 : 5000)),
          true,
        ))
      )
        failure("rate_limited");
    }
    if (op === "manual") c.active = "manual";
    else if (op === "remove") {
      delete c.providers[p];
      if (c.active === p) c.active = "manual";
    } else if (op === "save" || op === "refresh") {
      const key =
        op === "save" ? b.key : await unlock(scope, connection, flags.secret);
      const sealed =
        op === "save"
          ? await seal(scope, key, flags.secret)
          : connection.sealed;
      const models = (await discoverModels(p, key, send))
        .filter((x) => modelEligible(p, x.id) && !x.id.includes(key))
        .map((x) => ({ id: x.id }));
      const keep =
        op === "refresh" && models.some((x) => x.id === connection.model);
      c.providers[p] = {
        sealed,
        models,
        model: keep ? connection.model : null,
        verifiedAt: keep ? connection.verifiedAt : null,
      };
      if (c.active === p && !keep) c.active = "manual";
    } else {
      const config = {
        provider: p,
        model: b.model,
        apiKey: await unlock(scope, connection, flags.secret),
        grounding: false,
        send,
      };
      if (op === "suggest") {
        const r = await inferSetup(answers, {
          ...config,
          strictPilotEvidence: true,
          language: b.language === "es" ? "Spanish" : "English",
        });
        if ((await db.read("config"))?.value.revision !== b.revision)
          failure("conflict");
        return json(r);
      }
      await verifyModel(config);
      c.providers[p] = {
        ...connection,
        model: b.model,
        verifiedAt: new Date(now()).toISOString(),
      };
      c.active = p;
    }
    c.revision++;
    if (!(await db.save("config", c, b.revision))) failure("conflict");
    return json(status(c));
  } catch (e) {
    const code = Object.hasOwn(codes, e?.message)
      ? e.message
      : "storage_unavailable";
    return json({ error: code }, codes[code]);
  }
}
