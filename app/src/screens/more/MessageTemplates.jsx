// The texts you send from a job — written like a message, not edited like
// a config file.
//
// What changed: the variables were syntax you had to type and remember.
// They are now labelled chips that insert at the cursor, so nobody types a
// brace. Beside each one is a live preview filled with real sample data, so
// {{date}} reads as "Thursday, 3 September" while you are still writing.
// The raw text and the preview are visibly different surfaces, and the
// preview is the one that looks like a message.
//
// NOTE ON SUBJECT LINES: every template here is an SMS sent from a job, and
// a text has no subject. Rather than draw an empty subject field that would
// never send anywhere, the channel is stated on each card. The confirmation
// and reminder EMAILS are a separate surface (supabase/functions/_shared/
// emailTemplates.ts) and are not editable yet — that is a real gap, noted
// in DECISIONS.md, not something this screen silently half-does.

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, RotateCcw } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { DEFAULT_TEMPLATES, PLACEHOLDERS, fillTemplate, findBadTokens } from "../../lib/templates.js";

// What the preview stands in for. Concrete enough to read as a real message.
const SAMPLE = {
  booking: { customer_name: "Dana Ortiz" },
  dateLabel: "Thursday, 3 September",
  timeLabel: "10:00 AM",
  address: "1420 Larimer St",
  total: "$285",
};

export default function MessageTemplates() {
  const { business } = useBusiness();
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("message_templates").select("*")
      .eq("business_id", business.id).order("sort_order");
    if (!data || data.length === 0) {
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
    // Refuse a template that would send with a broken detail in it. The
    // editor shows raw braces, so a typo is easy to make and invisible
    // once saved — the message just goes out with "{{custmer_name}}" in it.
    const problems = findBadTokens(body);
    if (problems.length > 0) {
      setMsg({ ok: false, text: `“${row.label}” not saved. ${problems.join(" ")}` });
      return { ok: false };
    }
    const { error } = await supabase
      .from("message_templates").update({ body })
      .eq("id", row.id).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: `“${row.label}” saved.` });
    if (!error) await load();
    return { ok: !error };
  };

  if (!rows) return <div className="center"><div className="spinner" /></div>;

  return (
    <div className="group">
      <div className="tight">
        <h2>Your messages</h2>
        <p className="quiet">
          These are the texts you send from a job. Tap a detail to drop it in —
          it fills itself in from the booking when you send.
        </p>
      </div>

      {rows.map((row) => (
        <TemplateCard key={row.id} row={row} business={business} onSave={saveOne} />
      ))}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
    </div>
  );
}

function TemplateCard({ row, business, onSave }) {
  const [body, setBody] = useState(row.body);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setBody(row.body); }, [row.body]);

  const original = DEFAULT_TEMPLATES.find((t) => t.key === row.key);
  const dirty = body !== row.body;
  const isDefault = original ? body.trim() === original.body.trim() : false;

  // Insert at the cursor, then put the caret after what was inserted so you
  // can keep typing. Falls back to appending when the field isn't focused.
  const insert = (token) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const before = body.slice(0, start);
    const after = body.slice(end);
    // Don't glue a variable onto the previous word.
    const sep = before && !/\s$/.test(before) ? " " : "";
    const next = `${before}${sep}${token}${after}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = (before + sep + token).length;
      el.setSelectionRange(caret, caret);
    });
  };

  const preview = fillTemplate(body, { ...SAMPLE, business });

  const save = async () => {
    setSaving(true);
    await onSave(row, body);
    setSaving(false);
  };

  return (
    <div className="card">
      <div className="thoughts">
        <div className="row top between">
          <div>
            <div className="strong">{row.label}</div>
            <div className="row" style={{ gap: 6, marginTop: 4 }}>
              <span className="tag">
                <MessageSquare size={11} strokeWidth={2} style={{ marginRight: 4 }} />
                Text message
              </span>
              {isDefault && <span className="quiet">Not changed yet</span>}
            </div>
          </div>
          {original && !isDefault && (
            <button className="btn sm inline ghost" onClick={() => setBody(original.body)}>
              <RotateCcw strokeWidth={2} /> Reset
            </button>
          )}
        </div>

        <div>
          <label className="field">
            <span>What you write</span>
            <textarea ref={ref} value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <div className="row between" style={{ marginTop: 4 }}>
            <span className="quiet">Tap to add a detail</span>
            <span className="quiet num">{preview.length} characters</span>
          </div>
          <div className="chiprow" style={{ marginTop: 6 }}>
            {PLACEHOLDERS.map(([token, meaning]) => (
              <button key={token} type="button" className="chip"
                title={`Inserts ${meaning}`} onClick={() => insert(token)}>
                {PLAIN[token] ?? meaning}
              </button>
            ))}
          </div>
        </div>

        {/* The preview is the surface that looks like a message — a tinted
            bubble, not another input. It is what the customer receives. */}
        <div>
          <span className="label">What Dana gets</span>
          <div style={{
            marginTop: 6, background: "var(--accent-quiet)", border: "1px solid var(--accent-line)",
            borderRadius: "var(--r-lg)", borderBottomLeftRadius: 4,
            padding: "10px 14px", fontSize: "var(--t-body)", lineHeight: 1.45,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {preview || <span className="quiet">Nothing to send yet.</span>}
          </div>
        </div>

        {dirty && (
          <div className="btnrow">
            <button className="btn" onClick={() => setBody(row.body)}>Undo</button>
            <button className="btn primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Chip labels in plain words. The token itself never appears on a button —
// the audience has never seen a template variable and does not need to.
const PLAIN = {
  "{{customer_name}}": "Their name",
  "{{business_name}}": "Your business",
  "{{date}}": "The date",
  "{{time}}": "The time",
  "{{address}}": "The address",
  "{{total}}": "The total",
};
