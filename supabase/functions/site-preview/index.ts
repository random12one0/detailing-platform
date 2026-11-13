// SITE PREVIEW — the detailer's preview link, hosted: detailingplatform.com/p/<link> (app/src/site/Detailer.jsx).
//
// The Website Studio on Andrew's laptop sends each link's snapshot to `preview_links` (keyed by the SHA-256 of the
// link's secret; the secret is never stored). This public function answers ONLY for the link whose secret it is
// handed: GET shows that link's snapshot; POST …/comment, …/thumbs, …/happy, …/pick update it and record an event the
// Studio pulls back and applies with its own rules. Nothing in a request can name a site, revision or other link.
// Cancelled and expired links answer 410. Writes are accepted only from the platform's own pages (PREVIEW_ORIGINS).
// It never books: booking in a preview is stopped inside the page (installPreviewGuard), and nothing here writes a
// booking. Migration 20261113120000_preview_links.sql.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { ipOf, LIMITS, withinLimits } from "../_shared/rateLimit.ts";
import { act, MAX_BODY, PATH, stateOf, TOKEN, WORDS } from "../_shared/sitePreview.js";

const ORIGINS = (Deno.env.get("PREVIEW_ORIGINS") || "https://detailingplatform.com,https://www.detailingplatform.com")
  .split(",").map((s) => s.trim()).filter(Boolean);

const sha256 = async (t: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const cors: Record<string, string> = ORIGINS.includes(origin)
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", Vary: "Origin" }
    : {};
  const send = (code: number, o: unknown) => new Response(JSON.stringify(o), {
    status: code,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" },
  });
  // a 204 must have no body (Deno refuses one), or the browser's preflight fails and every press is blocked
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    if (!await withinLimits(supabase, [{ ...LIMITS.publicCeiling, bucket: "site-preview", key: ipOf(req) }])) {
      return send(429, { ok: false, said: "Too many tries. Wait a minute and try again." });
    }
    const m = PATH.exec(new URL(req.url).pathname);
    if (!m || !TOKEN.test(m[1])) return send(404, { ok: false, said: WORDS.none });
    if (req.method === "POST" && !ORIGINS.includes(origin)) return send(403, { ok: false, said: "That did not come from the preview page." });
    if (req.method === "GET" && m[2]) return send(405, { ok: false });
    if (req.method !== "GET" && req.method !== "POST") return send(405, { ok: false });

    const hash = await sha256(m[1]);
    const read = async () => (await supabase.from("preview_links").select("token_hash, purpose, view, expires_at, revoked_at").eq("token_hash", hash).maybeSingle()).data;
    const row = await read();
    const bad = stateOf(row);
    if (bad) return send(bad.code, { ok: false, said: bad.said });
    if (req.method === "GET") return send(200, { ...row!.view, ok: true, purpose: row!.purpose, expires_at: row!.expires_at });
    if (!m[2]) return send(405, { ok: false });

    const text = await req.text();
    if (text.length > MAX_BODY) return send(413, { ok: false, said: "That is too long. Keep a comment to a few sentences." });
    let body: unknown = null;
    try { body = JSON.parse(text || "{}"); } catch { /* answered below */ }
    // ponytail: read, change, write the view; two presses in the same instant can drop one from the VIEW, never from the
    // events (each is its own row), and the Studio's next snapshot puts it back. A row lock if that is ever seen.
    const r = act(row, m[2], body);
    if (!r.ok) return send(r.code || 400, { ok: false, said: r.said });
    const ev = await supabase.from("preview_events").insert({ token_hash: hash, kind: m[2], body: r.event });
    if (ev.error) throw ev.error;
    const up = await supabase.from("preview_links").update({ view: r.view, updated_at: new Date().toISOString() }).eq("token_hash", hash).is("revoked_at", null);
    if (up.error) throw up.error;
    return send(200, { ok: true, said: r.said });
  } catch (e) {
    console.error("site-preview:", e instanceof Error ? e.message : e);
    return send(500, { ok: false, said: "Something went wrong. Try again in a moment." });
  }
});
