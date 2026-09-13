// THE DOORBELL — 2026-09-12, at Cowork's ask. Rewritten 2026-09-13 to say WHICH
// SESSION STOPPED, on Andrew's instruction.
//
// He needs to know when a builder session stops typing instead of polling it on
// a timer. Claude Code fires a Stop hook at the end of every turn; the hook
// posts here and he reads it back.
//
//   POST { session_id, label? }  -> records that SESSION as having just stopped
//   GET                          -> the latest stop PER SESSION
//
// **WHY IT IS KEYED ON `session_id` AND NOT ON A LABEL.** It used to key on a
// label and the hook posted one constant, so with two panes open the second to
// stop overwrote the first: one row, one timestamp, no way to tell who. Andrew:
// *"I need to see that lane C stopped at one time and lane B at another, not a
// single timestamp that overwrites whichever finished last."*
//
// **THE LABEL IS STICKY, AND THAT IS THE WHOLE MECHANISM FOR A READABLE NAME.**
// An upsert whose payload omits `label` does not touch that column, so a
// session names itself once and every automatic ping afterwards keeps the name.
// A ping that carries no label therefore never erases one.
//
// **IT IS AN INSTRUMENT, SO IT FAILS LOUDLY.** `FOUND.md` § READ THIS FIRST is
// seven instruments that reported success regardless of reality. The two states
// that must never be confused here:
//
//   * `200 { sessions: [], count: 0 }`  — nobody has ever pinged. A fact.
//   * `502 { sessions: null }`          — we cannot tell. Not a fact.
//
// An empty array is an answer and `null` is the absence of one, and no read
// error may ever be dressed up as the former.
//
// **`latest` IS KEPT DELIBERATELY, AND SO ARE THE THREE TOP-LEVEL FIELDS.** The
// blunt bell's reader is a bare `curl` Andrew already has; breaking it while
// improving it is the one outcome he asked against.
//
// **THE GET DOES NOT NEED A SERVICE KEY**: deployed `verify_jwt=false`, reading
// under its own service role, so watching it is a `curl` from anywhere.
//
// **AND IT STORES NO MESSAGE TEXT.** The Stop hook's JSON carries
// `last_assistant_message` — the whole turn that just ended. The hook is written
// not to send it and this function has nowhere to put it: `session_id` and
// `label` are the only fields read off the body.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { retryRead, supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";

// An id or a name somebody chose, not free text to be stored: short, and no
// control characters. A doorbell that accepts a megabyte is a doorbell somebody
// fills a table with.
const clean = (v: unknown) =>
  String(v ?? "").replace(/[^\w .:-]/g, "").trim().slice(0, 64);

const age = (at: string) =>
  Math.max(0, Math.round((Date.now() - Date.parse(at)) / 1000));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    if (req.method === "GET") {
      // ONE ROW PER SESSION ALREADY, so this is the whole table newest first —
      // no grouping needed and none faked. 50 is a cap on a table nobody ever
      // fills, not a page.
      const { data, error } = await retryRead("session_pings", () =>
        supabase
          .from("session_pings")
          .select("session_id, label, at")
          .order("at", { ascending: false })
          .limit(50));

      // A READ ERROR IS NOT AN EMPTY LIST. See the header.
      if (error) {
        return json({
          sessions: null,
          count: null,
          latest: null,
          error: (error as { message?: string }).message ?? String(error),
        }, 502);
      }

      const sessions = (data ?? []).map((r) => ({ ...r, ago_seconds: age(r.at) }));
      const latest = sessions[0] ?? null;
      return json({
        sessions,
        count: sessions.length,
        latest,
        // The blunt bell's three fields, unchanged, so the old `curl` still
        // finds something where it left it.
        label: latest?.label ?? null,
        at: latest?.at ?? null,
        ago_seconds: latest?.ago_seconds ?? null,
      });
    }

    if (req.method !== "POST") return json({ error: "GET or POST" }, 405);

    const body = await req.json().catch(() => ({})) as {
      session_id?: unknown;
      label?: unknown;
    };

    // IDENTITY IS `session_id` WHEN THE BODY HAS ONE, ELSE `label`. That one
    // line is what keeps an old hook in another pane working unchanged through
    // the cutover, and it is why the migration backfills `session_id = label`.
    const sessionId = clean(body.session_id) || clean(body.label);
    // NO `"unlabelled"` FALLBACK. A ping that cannot say who it is would land
    // on one shared row and re-create the exact collision this replaces, while
    // looking like a success to whoever sent it.
    if (!sessionId) {
      return json({ error: "session_id (or label) is required" }, 400);
    }

    // ONE ROW PER SESSION. The question is "when did it last stop", never "how
    // many times", so the row is replaced rather than appended.
    // `label` is set ONLY when this ping carried one — omitting a column from an
    // upsert leaves it untouched, which is what makes the name sticky.
    const row: Record<string, string> = {
      session_id: sessionId,
      at: new Date().toISOString(),
    };
    const label = clean(body.label);
    if (label) row.label = label;

    const { error } = await supabase
      .from("session_pings")
      .upsert(row, { onConflict: "session_id" });
    if (error) throw error;
    return json({ ok: true, session_id: sessionId, label: label || null });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
