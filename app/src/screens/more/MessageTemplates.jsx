// Editable prefilled texts. Seeded from a sensible default set the first
// time this page is opened, then entirely the detailer's own.

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { DEFAULT_TEMPLATES, PLACEHOLDERS } from "../../lib/templates.js";

export default function MessageTemplates() {
  const { business } = useBusiness();
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("message_templates").select("*")
      .eq("business_id", business.id).order("sort_order");
    if (!data || data.length === 0) {
      // First open: seed the defaults so there is something to edit.
      await supabase.from("message_templates").insert(
        DEFAULT_TEMPLATES.map((t) => ({ ...t, business_id: business.id })),
      );
      const { data: seeded } = await supabase
        .from("message_templates").select("*")
        .eq("business_id", business.id).order("sort_order");
      setRows(seeded ?? []);
      return;
    }
    setRows(data);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const saveOne = async (row, body) => {
    setMsg(null);
    const { error } = await supabase
      .from("message_templates").update({ body })
      .eq("id", row.id).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: `"${row.label}" saved.` });
    load();
  };

  const resetOne = async (row) => {
    const original = DEFAULT_TEMPLATES.find((t) => t.key === row.key);
    if (!original) return;
    await saveOne(row, original.body);
  };

  if (!rows) return <div className="spinner" />;

  return (
    <div className="card">
      <p className="muted" style={{ marginBottom: 12 }}>
        These are the texts you send from a job. Edit them freely — the words
        in braces are filled in automatically when you send.
      </p>
      <div className="card" style={{ background: "var(--surface-2)" }}>
        {PLACEHOLDERS.map(([token, meaning]) => (
          <div className="row between" key={token} style={{ fontSize: "0.8rem" }}>
            <code style={{ color: "var(--accent)" }}>{token}</code>
            <span className="muted">{meaning}</span>
          </div>
        ))}
      </div>

      {rows.map((row) => (
        <TemplateRow key={row.id} row={row} onSave={saveOne} onReset={resetOne} />
      ))}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
    </div>
  );
}

function TemplateRow({ row, onSave, onReset }) {
  const [body, setBody] = useState(row.body);
  const dirty = body !== row.body;
  return (
    <div style={{ marginTop: 14 }}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <strong>{row.label}</strong>
        <button className="btn ghost inline" aria-label="Reset to default" onClick={() => onReset(row)}>
          <RotateCcw size={16} strokeWidth={1.75} />
        </button>
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} />
      {dirty && (
        <button className="btn" style={{ marginTop: 6 }} onClick={() => onSave(row, body)}>
          Save "{row.label}"
        </button>
      )}
    </div>
  );
}
