// THE PROVIDER SEAM — roadmap item 3, 2026-09-13.
//
// Two translation APIs, tried in order, and the caller never learns which one
// answered except as a label on the row. DeepL first: its million characters
// are a LIFETIME allowance that expires rather than renewing, so a character
// not spent there is a character lost, and its Spanish is the best of the
// three. Google second: 500,000 a month, recurring, so it is the one that is
// still there next month.
//
// ── NO IMPORTS, ON PURPOSE — the `retryRead.ts` posture ─────────────────────
// A Node test can load and RUN this file, with a stubbed `fetch`, because it
// imports nothing. That is the only way the failure ladder below gets checked
// at all: there is no Deno on this machine, so an untestable version of this
// file would be a guess. **Adding an import here silently disarms
// `tests/translations.test.mjs`** — which is why that suite asserts this file
// has none.
//
// ── THE KEYS ────────────────────────────────────────────────────────────────
// `DEEPL_API_KEY` and `GOOGLE_TRANSLATE_API_KEY` live in the Supabase secret
// store and are read ONLY here, ONLY through `Deno.env.get`. Neither name may
// ever appear under `app/`. Nothing in this file logs, returns or echoes a key;
// the furthest it goes is choosing a HOST from whether the DeepL key ends in
// `:fx`, which is a fact about the tier rather than about the secret.
//
// ── WHAT THIS FILE REFUSES TO DO ────────────────────────────────────────────
// It never returns the source text as a translation. A cache row holding the
// English as its Spanish is indistinguishable from a success and would never be
// retried — the eighth costume, in a table. A string this file cannot translate
// comes back as `null` and NO ROW IS WRITTEN, which is exactly what makes the
// customer see the detailer's English.
//
// It never throws. A save must not fail because DeepL is down. But a swallowed
// error is how an instrument goes quiet, so every attempt is reported back in
// `tried[]` with a reason — the caller logs it and the status endpoint shows it.

/** Why one provider did not answer. Reported, never swallowed. */
export type Reason =
  | "missing_key"   // the secret is not in the store for this project
  | "exhausted"     // the provider says the allowance is gone or the key is dead
  | "transient"     // rate limit, 5xx, network — worth trying again later
  | "bad_response"; // 200 with a body this file does not recognise

export type Attempt = { provider: string; reason: Reason; status?: number };

export type Translated = {
  /** Which provider answered, or null when none did. */
  by: string | null;
  /** Same length and order as the input. `null` = no translation, write no row. */
  texts: (string | null)[];
  /** Characters actually handed to `by`. 0 when nobody answered. */
  chars: number;
  /** Every provider that did not answer, and why. */
  tried: Attempt[];
};

type ProviderResult =
  | { ok: true; texts: (string | null)[] }
  | { ok: false; reason: Reason; status?: number };

/** The secret, and the only way it is ever read. */
const secret = (name: string): string | undefined => {
  // deno-lint-ignore no-explicit-any
  const d = (globalThis as any).Deno;
  const v = d?.env?.get(name);
  return v && String(v).trim() ? String(v).trim() : undefined;
};

/** A provider's answer is a translation only if it has words in it and is not
 *  simply the English handed back. Both cases become `null` — no row. */
const usable = (out: unknown, source: string): string | null => {
  const s = typeof out === "string" ? out.trim() : "";
  if (!s) return null;
  if (s === source.trim()) return null;
  return s;
};

// ---------------------------------------------------------------------------
// DeepL
// ---------------------------------------------------------------------------
// 456 is DeepL's own "quota exceeded". 401/403 mean the key is dead, which for
// a lifetime allowance that EXPIRES is the same outcome as spent — both are
// `exhausted`, because both mean "stop asking this provider".
const deepl = async (texts: string[]): Promise<ProviderResult> => {
  const key = secret("DEEPL_API_KEY");
  if (!key) return { ok: false, reason: "missing_key" };

  // A free-tier key ends in `:fx` and is served by a DIFFERENT HOST. Sending a
  // free key to the pro host returns 403, which reads exactly like a dead key —
  // so this would look like "DeepL is exhausted" for ever, on a working key.
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";

  let res: Response;
  try {
    res = await fetch(`https://${host}/v2/translate`, {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: texts,
        target_lang: "ES",
        // The detailer's words are a menu, not prose to be re-punctuated.
        preserve_formatting: true,
      }),
    });
  } catch {
    return { ok: false, reason: "transient" };
  }

  if (res.status === 456 || res.status === 401 || res.status === 403) {
    return { ok: false, reason: "exhausted", status: res.status };
  }
  if (!res.ok) return { ok: false, reason: "transient", status: res.status };

  const body = await res.json().catch(() => null);
  const list = body && Array.isArray(body.translations) ? body.translations : null;
  // A 200 whose body is not the shape we expect, or is the wrong LENGTH, is not
  // a partial success to be salvaged: pairing translations with sources by index
  // is only safe when the counts agree, and a mis-pairing would put one
  // service's Spanish under another's name.
  if (!list || list.length !== texts.length) return { ok: false, reason: "bad_response" };

  return { ok: true, texts: list.map((t: { text?: unknown }, i: number) => usable(t?.text, texts[i])) };
};

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------
const google = async (texts: string[]): Promise<ProviderResult> => {
  const key = secret("GOOGLE_TRANSLATE_API_KEY");
  if (!key) return { ok: false, reason: "missing_key" };

  let res: Response;
  try {
    // The key goes in the body, not the query string: a URL is the one part of
    // a request that ends up in logs and error messages by default.
    res = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": key },
      body: JSON.stringify({ q: texts, target: "es", format: "text" }),
    });
  } catch {
    return { ok: false, reason: "transient" };
  }

  if (res.status === 403 || res.status === 401) {
    return { ok: false, reason: "exhausted", status: res.status };
  }
  if (!res.ok) return { ok: false, reason: "transient", status: res.status };

  const body = await res.json().catch(() => null);
  const list = body?.data && Array.isArray(body.data.translations) ? body.data.translations : null;
  if (!list || list.length !== texts.length) return { ok: false, reason: "bad_response" };

  return {
    ok: true,
    texts: list.map((t: { translatedText?: unknown }, i: number) =>
      usable(unescapeEntities(t?.translatedText), texts[i])
    ),
  };
};

/** GOOGLE HTML-ESCAPES ITS OUTPUT EVEN WITH `format: "text"`. An apostrophe
 *  comes back as `&#39;`, so "the car's interior" would reach a customer with
 *  `&#39;` printed in it — React escapes text nodes, so it would render the
 *  entity literally rather than an apostrophe. Nothing downstream would catch
 *  it: it is a valid string that passes every check in this repo. */
export const unescapeEntities = (v: unknown): string => {
  const s = typeof v === "string" ? v : "";
  return s
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // `&amp;` LAST, or `&amp;#39;` would become an apostrophe instead of the
    // literal `&#39;` the detailer typed.
    .replace(/&amp;/g, "&");
};

/** In order. DeepL's allowance expires; Google's renews. */
const PROVIDERS: { name: string; run: (t: string[]) => Promise<ProviderResult> }[] = [
  { name: "deepl", run: deepl },
  { name: "google", run: google },
];

/** The most texts handed to one provider in one request. DeepL accepts 50 and
 *  Google 128; 40 keeps both comfortable and keeps a single failure from
 *  costing a whole business's prose. */
export const BATCH = 40;

/**
 * Translate a batch. Never throws. Never invents a translation.
 *
 * The handover is invisible by construction: the caller gets `texts` and a
 * label, and has no branch for "DeepL was down" to forget to write.
 */
export const translateBatch = async (texts: string[]): Promise<Translated> => {
  const tried: Attempt[] = [];
  if (!texts.length) return { by: null, texts: [], chars: 0, tried };

  for (const p of PROVIDERS) {
    const r = await p.run(texts);
    if (r.ok) {
      // Characters are counted from what was SENT, which is what both providers
      // bill, and only when one of them actually answered.
      const chars = texts.reduce((n, t) => n + t.length, 0);
      return { by: p.name, texts: r.texts, chars, tried };
    }
    tried.push({ provider: p.name, reason: r.reason, status: r.status });
  }

  // Both refused. No rows get written, so every one of these strings keeps
  // showing the detailer's English — the specified behaviour, arrived at by
  // there being nothing to read rather than by a catch block choosing it.
  return { by: null, texts: texts.map(() => null), chars: 0, tried };
};

/** sha256 hex of a string's UTF-8 bytes. MUST agree with Postgres's
 *  `encode(sha256(convert_to(t,'UTF8')),'hex')` — `translation_put` refuses any
 *  row where it does not, so a disagreement is loud instead of being a cache
 *  that misses for ever. */
export const sha256hex = async (s: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};
