// THE DOORBELL — 2026-09-12, at Cowork's ask.
//
// He needs to know when the builder session stops typing instead of polling it
// on a timer. Claude Code fires a Stop hook at the end of every turn; the hook
// posts a label here and he reads the latest one.
//
//   POST { label }   -> records that label as having just stopped
//   GET              -> the most recent ping, or every label with ?all=1
//
// **IT IS A DOORBELL, NOT A FEATURE.** No history, no auth model of its own, no
// payload. The whole surface is two verbs and one row per label.
//
// **THE GET DOES NOT NEED A SERVICE KEY**, which is the requirement: this
// function is deployed `verify_jwt=false` and reads under its own service role,
// so watching it is a bare `curl` from anywhere.
//
// **AND IT STORES NO MESSAGE TEXT.** The Stop hook's own JSON carries
// `last_assistant_message` — the entire turn that just ended. The hook is
// written not to send it and this function has nowhere to put it: `label` is
// the only field read off the body, and anything else in it is dropped.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";

// A label is a name somebody chose, not free text to be stored: short, and no
// control characters. A doorbell that accepts a megabyte is a doorbell somebody
// fills a table with.
const clean = (v: unknown) =>
  String(v ?? "").replace(/[^\w .:-]/g, "").trim().slice(0, 64);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const { data, error } = await supabase
        .from("session_pings")
        .select("label, at")
        .order("at", { ascending: false })
        .limit(url.searchParams.get("all") ? 50 : 1);
      if (error) throw error;
      const rows = data ?? [];
      // `ago_seconds` is the only thing a watcher actually wants, and computing
      // it here means the caller does not have to agree with us about clocks.
      const now = Date.now();
      const withAge = rows.map((r) => ({
        ...r,
        ago_seconds: Math.max(0, Math.round((now - Date.parse(r.at)) / 1000)),
      }));
      return json(url.searchParams.get("all")
        ? { pings: withAge }
        : (withAge[0] ?? { label: null, at: null, ago_seconds: null }));
    }

    if (req.method !== "POST") return json({ error: "GET or POST" }, 405);

    const body = await req.json().catch(() => ({}));
    const label = clean((body as { label?: unknown }).label) || "unlabelled";
    // ONE ROW PER LABEL. The question is "when did it last stop", never "how
    // many times has it stopped", so the row is replaced rather than appended.
    const { error } = await supabase
      .from("session_pings")
      .upsert({ label, at: new Date().toISOString() }, { onConflict: "label" });
    if (error) throw error;
    return json({ ok: true, label });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
