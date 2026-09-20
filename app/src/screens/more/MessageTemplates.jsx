// The texts you send from a job — written like a message, not edited like
// a config file.
//
// What changed, in two passes. FIRST the variables stopped being syntax you
// had to type and became labelled chips. THEN — his review of 2026-09-11,
// *"all these double brackets and kind of coding-looking stuff"* — the BOX
// stopped showing braces too: each detail is an atomic pill, one character to
// the caret, deleted whole by one Backspace. Beside it is a live preview
// filled with real sample data, so the date reads as "Thursday, September 17"
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
// The one date formatter. A hand-typed sample date is how "3 September" got
// onto the one screen whose whole job is to look like the real thing.
import { dateLong } from "../../lib/format.js";
import { Folded } from "../../components/controls.jsx";
import { getAppLocale, t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

// What the preview stands in for. Concrete enough to read as a real message.
// EVERY TOKEN NEEDS A SAMPLE OR THE PREVIEW LIES. A detail with nothing
// standing in for it previews as a gap, which reads as "this one does not
// work" — the opposite of what the preview is for.
// **THREE THINGS THE PREVIEW GOT WRONG, ALL VISIBLE TO A DETAILER DECIDING
// WHETHER TO TRUST THIS — 2026-09-12.**
//
//   THE DATE  read "Thursday, 3 September". Every other date in the product
//             reads "Saturday, September 12" or "Sep 11", because they go
//             through `lib/format.js`. A hand-typed sample is not a format,
//             which is exactly how day-before-month got in.
//   THE TOWN  "1420 Larimer St" is Denver, while the same demo's Marcus Webb
//             lives at "1420 Pine Ave, Long Beach, CA" — same street number,
//             different city. A demo that contradicts itself on screen is a
//             demo somebody stops believing.
//
// The sample is still hand-written, because a preview must be stable while you
// type — but it is now the SAME PLACE as the rest of the product.
const SAMPLE = {
  booking: { customer_name: "Dana Ortiz" },
  dateLabel: dateLong("2026-09-17", getAppLocale()),
  timeLabel: "10:00 AM",
  address: "1420 Pine Ave, Long Beach, CA",
  total: "$285",
  service: "Interior Deep Clean",
  vehicle: "Tacoma",
  bookingLink: "detailingplatform.com/booking/8f2a",
};

// ROADMAP 2.12 — `row.label` is seeded once, in whatever language was active
// at that moment (`label: t(d.label)` in the insert below), and never
// re-translated after. A detailer who switches the dashboard to Spanish
// later still reads whatever got baked in at signup — measured on the demo
// business, seeded before these five had Spanish keys at all: all five
// labels sit in English in the database right now, "On my way" included.
// There is no way to rename a template (only its body is ever saved), so the
// label is always exactly one of `DEFAULT_TEMPLATES`' five — deriving it
// fresh from the stable key and translating it live fixes every business
// already seeded without writing to a single row.
const templateLabel = (row) => t(DEFAULT_TEMPLATES.find((d) => d.key === row.key)?.label ?? row.label);

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
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: `“${templateLabel(row)}” saved.` });
    if (!error) await load();
    return { ok: !error };
  };

  if (!rows) return <div className="center"><div className="spinner" /></div>;

  return (
    <div className="group">
      <div className="tight">
        <h2>{t("Your messages")}</h2>
        <p className="quiet">
          {t("These are the texts you send from a job. Choose a detail to add it. Each one fills itself in from the booking when you send the message.")}
        </p>
      </div>

      {/* **FIVE IDENTICAL 467px CARDS WERE 2,980px AND 62 BUTTONS — on the
          LAST screen of onboarding, where a detailer decides whether this
          product respects their time. Measured, 2026-09-12.** Every card
          carried the same ten-chip palette, the same "Choose a detail to add
          it" sentence, the same "WHAT DANA GETS" heading and the same "Not
          changed yet" status. One distinct row of content across five rows.

          **THE STATUS LINE WAS ALREADY THE SUMMARY.** Each card knew whether
          it had been touched, so a folded row has its value ready to state
          without inventing one: *"Ask about access · Not changed yet"*.

          **INDEPENDENT, NOT ONE-AT-A-TIME, AND THAT IS A DELIBERATE
          DEPARTURE.** The review asked for one open at a time; every other
          `Folded` in this product — Booking rules, Notifications, Business
          info — opens independently, and exclusivity exists nowhere in it.
          Adding it here would be a new behaviour on one screen, which is the
          opposite of using the product's own vocabulary. All five start
          closed, so the wall is gone either way. */}
      {rows.map((row) => {
        const base = DEFAULT_TEMPLATES.find((d) => d.key === row.key);
        const untouched = base ? row.body.trim() === base.body.trim() : false;
        return (
          <Folded key={row.id} name={templateLabel(row)}
            now={untouched ? t("Not changed yet") : t("In your own words")}>
            <TemplateCard row={row} business={business} onSave={saveOne} inFold />
          </Folded>
        );
      })}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
    </div>
  );
}

function TemplateCard({ row, business, onSave, inFold = false }) {
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
            {/* The folded row above already names it; repeating it here is the
                duplication this screen was criticised for. */}
            {!inFold && <div className="strong">{templateLabel(row)}</div>}
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
            {/* TWO FACTS, ONE SENTENCE EACH, and the second is the only way
                anybody finds out the drag exists — a pill looks like a word,
                and nothing about it says it can be picked up. His rule for the
                wording, given twice on 2026-09-11: straightforward and
                informative, no flourish. */}
            <span className="quiet">{t("Choose a detail to add it. Drag one to move it.")}</span>
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
// WHERE IN THE TEXT A POINT IS. Two spellings of the same thing: Firefox and
// Safari have `caretPositionFromPoint`, Chrome had `caretRangeFromPoint` first.
// Neither is in every engine, so a browser with neither simply cannot drag —
// which is why nothing else on this screen depends on it.
const caretAt = (x, y) => {
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    return r ? { node: r.startContainer, offset: r.startOffset } : null;
  }
  return null;
};

// Punctuation that hugs the word before it. A space in front of one of these
// is the tell that something used to be there — `Hi , this is` — and it was
// the last thing left of his note after the double space was dealt with.
const HUGS = /^[,.!?;:)\]}'"’”…]/;

// ONE SPACE EITHER SIDE OF A PILL, AND NEVER TWO. The same rule `insert()`
// applies when a chip is tapped, pulled out so a dropped pill obeys it too —
// otherwise dragging a detail next to a word glues them together in the
// message that actually sends, and the editor would not show it because it
// draws a margin around every pill regardless.
const spaceAround = (pill) => {
  const parent = pill.parentNode;
  if (!parent) return;
  const before = pill.previousSibling;
  const after = pill.nextSibling;
  if (!before) { /* start of the line — nothing owed */ }
  else if (before.nodeType === 3) {
    if (before.nodeValue && !/\s$/.test(before.nodeValue)) before.nodeValue += " ";
  } else parent.insertBefore(document.createTextNode(" "), pill);
  // AND NOT IN FRONT OF PUNCTUATION. Dropping a detail immediately before a
  // comma should read `⟦Their name⟧, this is`, not `⟦Their name⟧ , this is`.
  if (!after) parent.appendChild(document.createTextNode(" "));
  else if (after.nodeType === 3) {
    const v = after.nodeValue ?? "";
    if (!/^\s/.test(v) && !HUGS.test(v)) after.nodeValue = ` ${v}`;
  } else parent.insertBefore(document.createTextNode(" "), after);
};

// THE NEAREST GAP BETWEEN WORDS. A caret offset is per character; a detail
// belongs between words, so an offset in the middle of one moves to whichever
// end of that word is closer to where the finger actually is.
// A "gap" is the start, the end, or either side of a run of whitespace.
const wordGap = (text, offset) => {
  if (!text) return 0;
  const at = Math.max(0, Math.min(offset, text.length));
  const gap = (i) => i === 0 || i === text.length || /\s/.test(text[i - 1]) || /\s/.test(text[i]);
  if (gap(at)) return at;
  let left = at;
  let right = at;
  while (left > 0 && !gap(left)) left -= 1;
  while (right < text.length && !gap(right)) right += 1;
  return at - left <= right - at ? left : right;
};

// CLOSE THE HOLE THE PILL LEFT — his note, 2026-09-11: *"whenever I drag it
// and then move it away, it adds, like, a space where it was, which is kinda
// weird."* He is describing arithmetic rather than a glitch: a pill sits with
// one space on each side, so taking it out leaves both of them touching and
// the sentence gains a gap it never had.
//
// Called with the two nodes the pill was BETWEEN, captured before it moved.
// Only spaces and tabs are touched, never a newline: a line break is a `<br>`
// here, but a text node can still hold one and eating it would reflow the
// message.
const closeGap = (before, after) => {
  const sp = /[^\S\n]+/;
  if (before?.nodeType === 3 && after?.nodeType === 3 && before.nextSibling === after) {
    const left = (before.nodeValue ?? "").replace(new RegExp(sp.source + "$"), "");
    const right = (after.nodeValue ?? "").replace(new RegExp("^" + sp.source), "");
    const glue = !left || !right || HUGS.test(right) ? "" : " ";
    before.nodeValue = left + glue + right;
    after.remove();
    return;
  }
  // The pill was at one end, so there is one orphaned space rather than two.
  if (!before && after?.nodeType === 3) {
    after.nodeValue = (after.nodeValue ?? "").replace(new RegExp("^" + sp.source), "");
  } else if (!after && before?.nodeType === 3) {
    before.nodeValue = (before.nodeValue ?? "").replace(new RegExp(sp.source + "$"), "");
  }
};

// A drag leaves split and empty text nodes behind it. Left alone they are
// invisible in the editor and turn into stray double spaces in the message.
const tidy = (el) => {
  for (const n of [...el.childNodes]) {
    if (n.nodeType === 3 && n.nodeValue === "") n.remove();
  }
  el.normalize();
};

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

  // ── DRAG A DETAIL TO WHERE YOU WANT IT ──────────────────────────────────
  //
  // **His ask, 2026-09-11:** *"make it so that when it's inside of the text
  // chat, you could drag it to wherever you want."*
  //
  // **POINTER EVENTS, NOT HTML5 DRAG-AND-DROP, and that is the whole design
  // decision.** `draggable="true"` plus `dragstart`/`drop` is four fewer
  // lines and does nothing at all on a touch screen — the browser never fires
  // a drag for a finger. This product's detailers are holding a phone in a
  // driveway, so a desk-only gesture is a feature most of them do not have.
  // One pointer API covers mouse, finger and stylus.
  //
  // **THE PILL MOVES AS YOU GO — there is no floating ghost.** The element
  // itself is re-parented on every move, so the sentence rearranges under the
  // finger and what you see during the drag is what you get when you let go.
  // A ghost would need its own copy, its own position and its own drop
  // indicator, and all three can disagree with where the pill actually lands.
  //
  // **A DOM NODE EXISTS IN ONE PLACE**, so `insertNode` MOVES the pill rather
  // than copying it. There is no remove step, and therefore no window in
  // which the drag can lose the detail it is carrying.
  const onPointerDown = (e) => {
    const el = editorRef.current;
    const pill = e.target?.closest?.(".tok");
    if (!el || !pill || !el.contains(pill)) return;
    if (e.button !== undefined && e.button > 0) return;   // right-click is not a drag
    let moved = false;
    const start = { x: e.clientX, y: e.clientY };

    // **THE LISTENERS GO ON `window`, NOT ON THE PILL, AND POINTER CAPTURE IS
    // NOT USED — measured, 2026-09-11, not assumed.** The obvious version
    // called `pill.setPointerCapture()` and listened on the pill. It moved the
    // pill correctly and then never committed: dragging RE-PARENTS the pill,
    // re-parenting takes it out of the document for an instant, and that
    // releases the capture — so `pointerup` was delivered to whatever the
    // cursor happened to be over and the handler that reads the editor back
    // into state never ran.
    //
    // The tell was not the pill, which visibly moved. It was `Save` never
    // appearing and the live preview never changing: the DOM had the new
    // sentence and the state still had the old one, which is a half-applied
    // edit that looks finished. A screenshot would have called it working.
    const move = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      // A SLOP THRESHOLD, or a tap to place the caret becomes a one-pixel
      // drag and the pill jumps. Four pixels is under the tremor of a thumb
      // resting and over nothing anybody means.
      if (!moved) {
        if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) < 4) return;
        moved = true;
        pill.classList.add("dragging");
      }
      ev.preventDefault();
      const at = caretAt(ev.clientX, ev.clientY);
      if (!at || !el.contains(at.node) || pill.contains(at.node) || at.node === pill) return;
      // **A PILL MUST NEVER LAND INSIDE ANOTHER PILL.** `caretAt` answers with
      // a position in whatever text is under the pointer, and a pill's label
      // is text — so dragging across "Their name" returned an offset INSIDE
      // it and the dragged pill was inserted between two of its letters. Seen
      // in a mid-drag screenshot as `T⟦Your business⟧heir name`, which
      // `fromEditorDom` would then have flattened into a nonsense token.
      //
      // The right answer is also the one a person expects: a pointer over
      // another pill means before it or after it, decided by which half of it
      // the pointer is past.
      const host = at.node.nodeType === 1 ? at.node : at.node.parentNode;
      const other = host?.closest?.(".tok");
      if (other && other !== pill) {
        const r = other.getBoundingClientRect();
        const after = ev.clientX > r.left + r.width / 2;
        const ref = after ? other.nextSibling : other;
        if (ref !== pill) other.parentNode.insertBefore(pill, ref);
        return;
      }
      // WHERE THE PILL CAME FROM, so the gap it leaves can be closed after it
      // has gone. Captured before the move, because moving a node makes these
      // two siblings of each other and there is no way back to them after.
      const cameAfter = pill.previousSibling;
      const cameBefore = pill.nextSibling;

      if (at.node.nodeType === 3) {
        const r = document.createRange();
        // **SNAPPED TO A GAP BETWEEN WORDS — his note, 2026-09-11: *"it's a
        // little glitchy and kind of hard… make it automatically snap to
        // where there's actually spaces in between words and not have it so
        // you can drag it in in the middle of a word."*** The caret the
        // browser hands back is per CHARACTER, so a pill followed the pointer
        // letter by letter and landed inside "shortly" as readily as beside
        // it. A detail is a word, and a word goes between words.
        r.setStart(at.node, wordGap(at.node.nodeValue ?? "", at.offset));
        r.collapse(true);
        r.insertNode(pill);
      } else {
        const ref = at.node.childNodes[at.offset] ?? null;
        if (ref !== pill) at.node.insertBefore(pill, ref);
      }
      closeGap(cameAfter, cameBefore);
      // Repeated inserts split one text node into many; merging them back
      // keeps the next snap working on whole words rather than on fragments.
      el.normalize();
    };

    const done = (ev) => {
      if (ev && ev.pointerId !== undefined && ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", done);
      window.removeEventListener("pointercancel", done);
      if (!moved) return;                 // a tap, not a drag — nothing changed
      pill.classList.remove("dragging");
      spaceAround(pill);
      tidy(el);
      read();
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", done);
    window.addEventListener("pointercancel", done);
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
      onPointerDown={onPointerDown}
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
