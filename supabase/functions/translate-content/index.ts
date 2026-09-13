// TRANSLATE WHEN THE DETAILER SAVES — roadmap item 3, 2026-09-13.
//
//   POST { dry_run?: boolean, lang?: "es" }
//
// Called by the dashboard after a successful save, and NOT awaited: the save has
// already happened, and a detailer's work must never fail because DeepL is
// having an afternoon.
//
// ── WHY IT SWEEPS THE WHOLE BUSINESS AND NOT THE FIELD THAT CHANGED ─────────
// A save site that forgets to say WHICH field it changed is a save site that
// quietly stops translating. Sweeping everything means the next save from
// anywhere catches up whatever an earlier one missed, and it costs one read plus
// some hashing when nothing has changed — no API call, because an unchanged
// string is an unchanged sha256 and therefore a row that already exists.
//
// ── IT NEVER TRUSTS TEXT FROM THE BROWSER ───────────────────────────────────
// The body carries no strings. Everything translated is re-read here from
// `get_public_business_profile` — the same document the customer's page gets.
//
// ── AND IT NEVER ANSWERS "UP TO DATE" WHEN IT CANNOT TELL ───────────────────
// Andrew's condition, 2026-09-13. `up_to_date` is `true`, `false`, or **null**,
// and null means *a field reached the customer that nothing has classified, so
// this instrument does not know*. A dashboard showing a tick for null has
// broken the contract; the handover to lane B says so in as many words.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { retryRead, supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { businessById, requireMember } from "../_shared/tenant.ts";
import { BATCH, sha256hex, translateBatch } from "../_shared/translate.ts";
import { classify, REVIEW_PATHS } from "../_shared/translatable.ts";

const LANGS = new Set(["es"]);

/** Both gauge rows. Spending zero still rolls Google's month, so this cannot
 *  report last month's total. */
const usage = async () => {
  const out = [];
  for (const provider of ["deepl", "google"]) {
    const { data, error } = await supabase.rpc("translation_spend", {
      p_provider: provider,
      p_chars: 0,
    });
    // A gauge that cannot be read says so. It does not report zero, which would
    // draw an empty bar and read as "plenty left".
    out.push(error ? { provider, unreadable: String((error as { message?: string }).message ?? error) } : data);
  }
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "POST" }, 405);

  const member = await requireMember(req);
  if (!member) return json({ error: "Not found" }, 404);

  const body = await req.json().catch(() => ({}));
  const dryRun = !!(body as { dry_run?: unknown }).dry_run;
  const lang = String((body as { lang?: unknown }).lang ?? "es");
  if (!LANGS.has(lang)) return json({ error: "unsupported language" }, 400);

  const business = await businessById(member.businessId);
  if (!business) return json({ error: "Not found" }, 404);

  // 1 · The exact document the customer's page receives.
  const prof = await retryRead("translate-content/profile", () =>
    supabase.rpc("get_public_business_profile", { p_slug: business.slug }));
  if (prof.error || !prof.data) {
    // NOT a quiet "nothing to do". If the payload cannot be read, the honest
    // answer is that we do not know what needs translating.
    return json({
      ok: false,
      reason: "profile_unreadable",
      up_to_date: null,
      detail: String((prof.error as { message?: string } | null)?.message ?? "no payload"),
    }, 502);
  }

  // 2 · Sort every string in it. `unknown` is the loud part.
  const { texts, unknown, byPath } = classify(prof.data);

  // 3 · What we already have. The hash IS the "has this changed" test, so there
  // is no timestamp comparison to get wrong and no clock to disagree about.
  const hashes = await Promise.all(texts.map(sha256hex));
  const existing = await retryRead("translate-content/existing", () =>
    supabase.from("translations")
      .select("source_hash, source_text, machine_text, human_text")
      .eq("business_id", business.id).eq("lang", lang));
  if (existing.error) {
    return json({ ok: false, reason: "cache_unreadable", up_to_date: null }, 502);
  }
  const have = new Map<string, { machine_text: string | null; human_text: string | null; source_text: string }>();
  for (const r of existing.data ?? []) have.set(r.source_hash, r);

  const gaps: { text: string; hash: string }[] = [];
  texts.forEach((t, i) => { if (!have.has(hashes[i])) gaps.push({ text: t, hash: hashes[i] }); });

  // 4 · Translate the gaps, in batches, unless this is a status read.
  let wrote = 0;
  const tried: unknown[] = [];
  const refused: { text: string; reason: string }[] = [];
  if (!dryRun) {
    for (let i = 0; i < gaps.length; i += BATCH) {
      const chunk = gaps.slice(i, i + BATCH);
      const r = await translateBatch(chunk.map((g) => g.text));
      if (r.tried.length) tried.push(...r.tried);

      for (let k = 0; k < chunk.length; k++) {
        const out = r.texts[k];
        // NO ROW when no provider answered. That absence is what makes the
        // customer read the detailer's English — not a catch block and not a
        // placeholder. An answer that happens to equal the English IS stored:
        // `_shared/translate.ts` § `usable` has why, and it is the difference
        // between three correct words and three permanent false alarms.
        if (!out) continue;
        const put = await supabase.rpc("translation_put", {
          p_business: business.id,
          p_lang: lang,
          p_hash: chunk[k].hash,
          p_source: chunk[k].text,
          p_machine: out,
          p_by: r.by,
        });
        if (put.error) {
          // The two reasons this fires are both deliberate refusals by the
          // database: a hash that does not match its source, and a NAME
          // (`translations_never_a_name`). Both are recorded rather than
          // swallowed, and neither stops the rest of the batch.
          refused.push({ text: chunk[k].text, reason: String((put.error as { message?: string }).message ?? put.error) });
        } else {
          wrote++;
          have.set(chunk[k].hash, { machine_text: out, human_text: null, source_text: chunk[k].text });
        }
      }

      if (r.by && r.chars) {
        await supabase.rpc("translation_spend", { p_provider: r.by, p_chars: r.chars });
      }
      // Both providers refused this batch; the next one will refuse too.
      if (!r.by) break;
    }
  }

  // 5 · The first-run review — Andrew's condition. NULL `translation_reviewed_at`
  // plus anything actually translated means the detailer has never been told
  // their page has a Spanish version. The pairs are computed here and never
  // stored.
  const settings = await retryRead("translate-content/reviewed", () =>
    supabase.from("business_settings").select("translation_reviewed_at")
      .eq("business_id", business.id).maybeSingle());
  const reviewedAt = settings.data?.translation_reviewed_at ?? null;

  const pairs: { path: string; english: string; spanish: string; by: string }[] = [];
  for (const path of REVIEW_PATHS) {
    for (const english of byPath[path] ?? []) {
      const row = have.get(await sha256hex(english));
      const spanish = row?.human_text ?? row?.machine_text;
      if (spanish) {
        pairs.push({ path, english, spanish, by: row?.human_text ? "human" : "machine" });
      }
    }
  }

  const pending = texts.filter((_t, i) => !have.has(hashes[i])).length;
  const classified = unknown.length === 0;

  return json({
    ok: true,
    lang,
    // TRUE only when every field is classified AND nothing is pending.
    // NULL — not false — when a field reached the customer that nothing here
    // has classified, because then this function does not know the answer.
    up_to_date: classified ? pending === 0 : null,
    classified: classified ? "all" : "incomplete",
    // Non-empty means somebody added a publishable field and nobody decided
    // whether it is prose. Fix the lists in `_shared/translatable.ts`.
    unknown_paths: unknown,
    translatable: texts.length,
    translated: texts.length - pending,
    pending,
    wrote,
    dry_run: dryRun,
    // Why a provider did not answer. Empty on a clean run.
    providers_refused: tried,
    // Rows the DATABASE refused, with its reason. A name is the expected one.
    rows_refused: refused,
    usage: await usage(),
    first_run: {
      needed: reviewedAt === null && pairs.length > 0,
      reviewed_at: reviewedAt,
      pairs,
    },
  });
});
