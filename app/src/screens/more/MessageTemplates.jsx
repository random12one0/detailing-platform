// The texts you send from a job — written like a message, not edited like
// a config file.
//
// What changed, in two passes. FIRST the variables stopped being syntax you
// had to type and became labelled chips. THEN — his review of 2026-09-11,
// *"all these double brackets and kind of coding-looking stuff"* — the BOX
// stopped showing braces too: each detail is an atomic pill, one character to
// the caret, deleted whole by one Backspace. Beside it is a live preview
// filled with real sample data, so the date reads as "Thursday, 3 September"
// while you are still writing. The editor and the preview are visibly
// different surfaces, and the preview is the one that looks like a message.
//
// The STORED format is unchanged — `body` is still `Hi {{customer_name}}` —
// so every template already saved keeps working and `fillTemplate` never
// learned about any of this.
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
import {
  DEFAULT_TEMPLATES, PLACEHOLDERS, fillTemplate, findBadTokens, fromEditorDom, toSegments,
} from "../../lib/templates.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

// What the preview stands in for. Concrete enough to read as a real message.
// EVERY TOKEN NEEDS A SAMPLE OR THE PREVIEW LIES. A detail with nothing
// standing in for it previews as a gap, which reads as "this one does not
// work" — the opposite of what the preview is for.
const SAMPLE = {
  booking: { customer_name: "Dana Ortiz" },
  dateLabel: "Thursday, 3 September",
  timeLabel: "10:00 AM",
  address: "1420 Larimer St",
  total: "$285",
  service: "Interior Deep Clean",
  vehicle: "Tacoma",
  bookingLink: "detailingplatform.com/booking/8f2a",
};

export default function MessageTemplates() {
  useAppLocale();
  const { business } = useBusiness();
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("message_templates").select("*")
      .eq("business_id", business.id).order("sort_order");
    if (!data || data.length === 0) {
      await supabase.from("message_templates").insert(
        DEFAULT_TEMPLATES.map((d) => ({
          ...d, label: t(d.label), body: t(d.body), business_id: business.id,
        })),
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
    // Refuse a template that would send with a broken detail in it. A pill
    // cannot be mistyped, so this now catches only what came from somewhere
    // else — a body pasted in, or one saved before the pill editor existed.
    // KEPT RATHER THAN RETIRED: the check costs nothing and the day it stops
    // being able to fire is not a day anybody will notice.
    const problems = findBadTokens(body);
    if (problems.length > 0) {
      setMsg({ ok: false, text: t("“{name}” not saved. {problems}",
        { name: row.label, problems: problems.join(" ") }) });
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
        <h2>{t("Your messages")}</h2>
        <p className="quiet">
          {t("These are the texts you send from a job. Tap a detail to add it. Each one fills itself in from the booking when you send the message.")}
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

  const original = DEFAULT_TEMPLATES.find((d) => d.key === row.key);
  const dirty = body !== row.body;
  const isDefault = original ? body.trim() === original.body.trim() : false;

  // Insert a pill where the caret is. The editor is a contenteditable now, so
  // this is a Range operation rather than string slicing on a textarea's
  // selection — `insertNode` puts the pill exactly where the person was
  // looking, which is the behaviour the old textarea already had and the one
  // worth keeping.
  const insert = (token) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    let range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    // Not focused inside the editor, or focused somewhere else on the page:
    // append rather than dropping the pill into another card.
    if (!range || !el.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    }
    range.deleteContents();
    const pill = document.createElement("span");
    pill.className = "tok";
    pill.setAttribute("contenteditable", "false");
    pill.setAttribute("data-token", token);
    pill.textContent = t(PLAIN[token] ?? token);
    // A space after it so the next thing typed is not glued to the pill, and
    // so there is somewhere for the caret to live that is not inside it.
    // A PLAIN SPACE — U+0020. This line carried a NON-BREAKING space
    // until 2026-09-11: pixel-identical in the editor, a different
    // character in the message that actually gets sent.
    const space = document.createTextNode("\u0020");
    range.insertNode(space);
    range.insertNode(pill);
    // AND ONE BEFORE IT WHEN THERE IS NOT ONE ALREADY. The space after
    // the pill gives the caret somewhere to live that is not inside it;
    // this is the half that was missing, and the live preview is the
    // only surface that could show it — found by looking at a
    // screenshot, not by any assertion in the walker.
    const prev = pill.previousSibling;
    if (prev && prev.nodeType === 3 && prev.nodeValue && !/\s$/.test(prev.nodeValue)) {
      prev.nodeValue += "\u0020";
    } else if (prev && prev.nodeType === 1 && prev.classList
      && prev.classList.contains("tok")) {
      // Two pills back to back need one too, and there is no text node
      // between them to lengthen.
      pill.parentNode.insertBefore(document.createTextNode("\u0020"), pill);
    }
    const after = document.createRange();
    after.setStartAfter(space);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    setBody(fromEditorDom(el));
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
                {t("Text message")}
              </span>
              {isDefault && <span className="quiet">{t("Not changed yet")}</span>}
            </div>
          </div>
          {original && !isDefault && (
            <button className="btn sm inline ghost" onClick={() => setBody(original.body)}>
              <RotateCcw strokeWidth={2} /> {t("Reset")}
            </button>
          )}
        </div>

        <div>
          <span className="label">{t("What you write")}</span>
          <TokenEditor editorRef={ref} value={body} onChange={setBody} />
          <div className="row between" style={{ marginTop: 4 }}>
            <span className="quiet">{t("Tap to add a detail")}</span>
            <span className="quiet num">{preview.length} characters</span>
          </div>
          {/* wrap: these six are a palette you pick from, not a range you
              scroll along, and three of them were off the right edge on a
              phone with no scrollbar to say so (W12). */}
          <div className="chiprow wrap" style={{ marginTop: 6 }}>
            {PLACEHOLDERS.map(([token, meaning]) => (
              <button key={token} type="button" className="chip"
                title={t("Inserts {meaning}", { meaning: t(meaning) })} onClick={() => insert(token)}>
                {t(PLAIN[token] ?? meaning)}
              </button>
            ))}
          </div>
        </div>

        {/* The preview is the surface that looks like a message — a tinted
            bubble, not another input. It is what the customer receives. */}
        <div>
          <span className="label">{t("What Dana gets")}</span>
          {/* A CLASS RATHER THAN A STYLE BLOB, so the walker can read this
              bubble by name — it is the only surface that can show a detail
              glued to the word before it, because the editor draws a margin
              around every pill whether the text has a space or not. */}
          <div className="msgpreview">
            {preview || <span className="quiet">{t("Nothing to send yet.")}</span>}
          </div>
        </div>

        {dirty && (
          <div className="btnrow">
            <button className="btn" onClick={() => setBody(row.body)}>{t("Undo")}</button>
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
//
// A LABEL FOR EVERY ENTRY IN `PLACEHOLDERS` IS A REQUIREMENT, not a nicety:
// this map is also what the PILL shows, so a missing one renders the raw
// `{{token}}` inside the editor and puts back the exact thing this screen was
// rewritten to remove.
const PLAIN = {
  "{{customer_name}}": "Their name",
  "{{business_name}}": "Your business",
  "{{date}}": "The date",
  "{{time}}": "The time",
  "{{address}}": "The address",
  "{{total}}": "The total",
  "{{service}}": "What they booked",
  "{{vehicle}}": "Their car",
  "{{business_phone}}": "Your phone",
  "{{booking_link}}": "Link to their booking",
};

// --- THE EDITOR THAT NEVER SHOWS A BRACE -----------------------------------
//
// **HIS REVIEW, 2026-09-11:** *"there's this text box… and you have to insert
// these, like, weird things… without them, with all these double brackets and
// kind of, like, coding-looking stuff. Make it as nice as possible."*
//
// The chips and the live preview already existed; the box still showed
// `{{customer_name}}`, which is the whole of what he was looking at. Each
// token is an atomic pill now — one character to the caret, deleted whole by
// one press of Backspace, and impossible to typo, which also retires the
// class of mistake `findBadTokens` was written to catch.
//
// **UNCONTROLLED ON PURPOSE, AND THIS IS THE ONE THING TO GET RIGHT.** A
// contenteditable whose `innerHTML` is rewritten from state on every
// keystroke throws the caret to the start of the box on every letter typed.
// So the DOM is seeded once and on an EXTERNAL change only (Reset, Undo, a
// reload), and typing flows one way — DOM to state — which is the opposite
// direction from every other field in this product and the reason it is
// written down here.
//
// `seeded` holds the value this editor last wrote out, so an echo of our own
// keystroke coming back as a prop is not mistaken for somebody pressing
// Reset.
function TokenEditor({ editorRef, value, onChange }) {
  const seeded = useRef(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || value === seeded.current) return;
    el.innerHTML = "";
    for (const seg of toSegments(value)) {
      if (seg.text !== undefined) { el.appendChild(document.createTextNode(seg.text)); continue; }
      const pill = document.createElement("span");
      pill.className = "tok";
      pill.setAttribute("contenteditable", "false");
      pill.setAttribute("data-token", seg.token);
      pill.textContent = t(PLAIN[seg.token] ?? seg.token);
      el.appendChild(pill);
    }
    seeded.current = value;
  }, [value, editorRef]);

  const read = () => {
    const el = editorRef.current;
    if (!el) return;
    const next = fromEditorDom(el);
    seeded.current = next;
    onChange(next);
  };

  return (
    <div
      ref={editorRef}
      className="tokedit"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={t("What you write")}
      onInput={read}
      // A LINE BREAK, NEVER A PARAGRAPH. Left alone, Chrome wraps each new
      // line in a DIV and Firefox in a P, and `fromEditorDom` then has to
      // guess how many newlines that meant. One `<br>` is unambiguous.
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          document.execCommand("insertLineBreak");
          read();
        }
      }}
      // PASTE ARRIVES AS PLAIN TEXT. A message copied out of Notes or another
      // app brings its own markup, and a pasted `<b>` or `<span style>` would
      // survive into the editor and then be flattened on save — so what the
      // detailer sees would stop matching what gets sent.
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
        read();
      }}
    />
  );
}
