// THE DETAILER'S PREVIEW (STUDIO-SPEC.md §1d, §5b, screen 7; S7). What the detailer opens from the Studio's email on
// their own phone: /site/p/<link>. Dev server only for now (main.jsx), like /site/preview; in production it becomes the
// platform's `site-preview` function on detailingplatform.com/p/<link>.
//
// The page knows only its link's secret. It asks the Studio's LINK SERVER (VITE_STUDIO_LINKS) for what that link may
// show: one revision of the detailer's own site ("review") or the three looks ("choose"). Nothing in the address can
// name another site.
//   Use it   the real site, with the detailer's real prices and times. Booking runs up to the last step; the final press
//            says "This is a preview, nothing was booked." (installPreviewGuard: create-booking is never called).
//   Comment  a tap on any part drops a numbered pin and asks "What should change?". The words go to the Studio as a
//            request for Andrew. Each part can also get a quick Good / Change it, and the end of the page has
//            "I'm happy with it".
//   Choose   the three looks, each the real site; "Pick this one".
import { useEffect, useRef, useState } from "react";
import Site from "./Site.jsx";
import "./detailer.css";

const BASE = String(import.meta.env.VITE_STUDIO_LINKS || "").replace(/\/+$/, "");
const NAMES = { hero: "The first screen", catalog: "Prices", proof: "Photos and reviews", visit: "Hours and contact", booking: "Booking" };
// S8: a preview drawn from example data says so plainly, so nobody takes made-up prices for their own.
const isExample = (spec) => /^example_/.test(String(spec?.slug || ""));
const ExampleNote = () => <p className="dp-ui dp-example" role="note"><b>Example data.</b> The prices, hours, photos and reviews here are made up for this preview, not yours. The site that goes live reads your own dashboard.</p>;
export const PREVIEW_SAID = "This is a preview, nothing was booked.";

// THE PREVIEW NEVER BOOKS. Every call that would write something for real (create-booking first of all) is answered
// here, in the page, with the preview's own words, and never leaves it. Reads stay real: the profile, prices
// (calculate-booking) and free times (available-slots). Installed before anything on the page runs.
// validate-promo-code only answers whether a code is good (S7 review F6: a detailer may try their own promo code)
const READS = /\/functions\/v1\/(calculate-booking|available-slots|validate-promo-code)$|\/rest\/v1\/rpc\/get_[a-z_]+$/;
export function installPreviewGuard(win = window) {
  if (win.__previewGuard) return;
  const real = win.fetch.bind(win);
  win.__previewGuard = { blocked: [] };
  win.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "", method = String(init.method || input?.method || "GET").toUpperCase();
    const ours = BASE && url.startsWith(BASE + "/");
    if (method !== "GET" && method !== "HEAD" && !ours && !READS.test(url.split("?")[0])) {
      win.__previewGuard.blocked.push(url);
      return Promise.resolve(new Response(JSON.stringify({ error: PREVIEW_SAID }), { status: 409, headers: { "content-type": "application/json" } }));
    }
    return real(input, init);
  };
}

const api = async (token, what = "", body) => {
  const r = await fetch(`${BASE}/p/${encodeURIComponent(token)}${what ? "/" + what : ""}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const j = await r.json().catch(() => ({ ok: false, said: "The page could not be read. Try again in a moment." }));
  return { status: r.status, ...j };
};

export default function DetailerPreview({ token }) {
  const [got, setGot] = useState(null);
  const load = () => api(token).then(setGot, () => setGot({ ok: false, said: "This page could not load. Check your connection and try again." }));
  useEffect(() => { load(); }, [token]);
  useEffect(() => { document.title = got?.business ? `${got.business}: your new site` : "Your new site"; }, [got?.business]);
  // a private preview: never in a search engine (the link server also says so in its replies)
  useEffect(() => { const m = Object.assign(document.createElement("meta"), { name: "robots", content: "noindex, nofollow" }); document.head.appendChild(m); return () => m.remove(); }, []);
  if (!got) return <main className="dp-msg" aria-busy="true"><p>Loading your site…</p></main>;
  if (!got.ok) return <main className="dp-msg"><h1>{got.status === 410 ? "This link no longer works" : "Nothing to show here"}</h1><p>{got.said}</p></main>;
  return got.purpose === "choose" ? <Chooser token={token} data={got} reload={load} /> : <Review token={token} data={got} reload={load} />;
}

// ---------------------------------------------------------------- review: use it, comment on it
function Review({ token, data, reload }) {
  const [mode, setMode] = useState("use");
  const [draft, setDraft] = useState(null);     // { section, part, at, n }
  const [said, setSaid] = useState(null);
  const [busy, setBusy] = useState(false);
  const root = useRef(null);
  const comments = data.comments;
  const thumbs = data.thumbs || {};
  const sections = data.spec.pages[0].sections;

  // In Comment, a tap on the site does not follow links or press buttons: it marks the spot.
  useEffect(() => {
    if (mode !== "comment") return undefined;
    const on = (e) => {
      const sec = e.target.closest?.("[data-section]");
      if (!sec || !root.current?.contains(sec) || e.target.closest(".dp-ui")) return;
      e.preventDefault(); e.stopPropagation();
      const r = sec.getBoundingClientRect();
      setDraft({ section: sec.dataset.section, part: e.target.closest("[data-part]")?.dataset.part || null, at: { x: Math.round(((e.clientX - r.left) / r.width) * 1000), y: Math.round(e.clientY - r.top) }, n: comments.length + 1 });
      setSaid(null);
    };
    document.addEventListener("click", on, true);
    return () => document.removeEventListener("click", on, true);
  }, [mode, comments.length]);

  const send = async (text) => {
    setBusy(true);
    const r = await api(token, "comment", { section: draft.section, part: draft.part, at: draft.at, text }).catch(() => ({ ok: false, said: "That did not go through. Try again." }));
    setBusy(false); setSaid(r.said);
    if (r.ok) { setDraft(null); reload(); }
  };
  const vote = async (section, v) => { const r = await api(token, "thumbs", { section, thumbs: thumbs[section] === v ? null : v }); setSaid(r.said); if (r.ok) reload(); return r; };
  // "Change it" asks what to change (S7 review F6): the vote, and the comment box for that part, which makes a card
  const changeIt = async (section) => {
    if (thumbs[section] === "down") return vote(section, "down");
    await vote(section, "down");
    setSaid(null); setDraft({ section, part: null, at: null, n: comments.length + 1 });
  };
  const happy = async () => { setBusy(true); const r = await api(token, "happy", {}); setBusy(false); setSaid(r.said); if (r.ok) reload(); };

  return (
    <div className={`dp dp-${mode}`} ref={root}>
      <div className="dp-ui dp-bar" role="region" aria-label="Your preview">
        <p className="dp-title"><b>Draft for you to check</b><span>{data.business}</span></p>
        <div className="dp-seg" role="group" aria-label="What a tap does">
          <button type="button" aria-pressed={mode === "use"} onClick={() => { setMode("use"); setDraft(null); }}>Use it</button>
          <button type="button" aria-pressed={mode === "comment"} onClick={() => setMode("comment")}>Comment</button>
        </div>
      </div>
      {mode === "comment" && <p className="dp-ui dp-hint" role="status">Tap anything you want changed.</p>}
      <Pins comments={comments} draft={draft} />
      {isExample(data.spec) && <ExampleNote />}
      <Site spec={data.spec} />
      <section className="dp-ui dp-end" aria-labelledby="dpEndH">
        <h2 id="dpEndH">How is each part?</h2>
        <ul>{sections.map((s) => (
          <li key={s.id}><span>{NAMES[s.type] || s.id}</span>
            <span className="dp-votes" role="group" aria-label={`${NAMES[s.type] || s.id}`}>
              <button type="button" aria-pressed={thumbs[s.id] === "up"} onClick={() => vote(s.id, "up")}>Good</button>
              <button type="button" aria-pressed={thumbs[s.id] === "down"} onClick={() => changeIt(s.id)}>Change it</button>
            </span></li>))}</ul>
        {comments.length > 0 && <p className="dp-note">{comments.length === 1 ? "You left one comment." : `You left ${comments.length} comments.`} We read every one.</p>}
        {data.approved_at
          ? <p className="dp-done" role="status">You said you are happy with it. Thank you.</p>
          : <button type="button" className="dp-happy" disabled={busy} onClick={happy}>I'm happy with it</button>}
      </section>
      {draft && <CommentBox n={draft.n} where={NAMES[sections.find((s) => s.id === draft.section)?.type] || "This part"} busy={busy} said={said} onSend={send} onCancel={() => setDraft(null)} />}
      {said && !draft && <p className="dp-ui dp-toast" role="status">{said}</p>}
    </div>
  );
}

function Pins({ comments, draft }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = () => tick((n) => n + 1); addEventListener("resize", t); const id = setInterval(t, 1500); return () => { removeEventListener("resize", t); clearInterval(id); }; }, []);
  const all = [...comments.map((c, i) => ({ ...c, n: i + 1 })), ...(draft ? [{ ...draft, id: "new" }] : [])];
  return all.map((c) => {
    const sec = document.querySelector(`[data-section="${CSS.escape(c.section)}"]`); if (!sec || !c.at) return null;
    const r = sec.getBoundingClientRect();
    return <span key={c.id} className={`dp-ui dp-pin${c.id === "new" ? " new" : ""}`} aria-hidden="true" style={{ left: `${r.left + scrollX + (c.at.x / 1000) * r.width}px`, top: `${r.top + scrollY + c.at.y}px` }}>{c.n}</span>;
  });
}

function CommentBox({ n, where, busy, said, onSend, onCancel }) {
  const [text, setText] = useState("");
  const box = useRef(null);
  useEffect(() => { box.current?.focus(); }, []);
  return (
    <form className="dp-ui dp-sheet" aria-labelledby="dpSheetH" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onSend(text); }}>
      <h2 id="dpSheetH"><span className="dp-n">{n}</span> {where}</h2>
      <label htmlFor="dpText">What should change?</label>
      <textarea id="dpText" ref={box} rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type, or use the microphone on your keyboard" />
      {said && <p className="dp-err" role="alert">{said}</p>}
      <div className="dp-row"><button type="button" className="dp-quiet" onClick={onCancel}>Cancel</button><button type="submit" disabled={busy || !text.trim()}>{busy ? "Sending…" : "Send"}</button></div>
    </form>
  );
}

// ---------------------------------------------------------------- choose: the three looks
function Chooser({ token, data, reload }) {
  const [at, setAt] = useState(data.picked || data.looks[0]?.letter);
  const [said, setSaid] = useState(null), [busy, setBusy] = useState(false);
  const look = data.looks.find((l) => l.letter === at) || data.looks[0];
  useEffect(() => { scrollTo(0, 0); }, [at]);
  const pick = async () => { setBusy(true); const r = await api(token, "pick", { letter: look.letter }); setBusy(false); setSaid(r.said); if (r.ok) reload(); };
  return (
    <div className="dp dp-use">
      <div className="dp-ui dp-bar" role="region" aria-label="Pick your look">
        <p className="dp-title"><b>Pick your look</b><span>{data.business}</span></p>
        <div className="dp-seg" role="group" aria-label="Which look">
          {data.looks.map((l) => <button key={l.letter} type="button" aria-pressed={l.letter === look.letter} onClick={() => { setAt(l.letter); setSaid(null); }}>{l.letter}</button>)}
        </div>
      </div>
      {isExample(look.spec) && <ExampleNote />}
      <Site key={look.letter} spec={look.spec} />
      <div className="dp-ui dp-pickbar">
        {data.picked === look.letter
          ? <p role="status"><b>You picked {look.letter}: {look.name}.</b> Thank you. We will continue with it.</p>
          : <><p><b>Look {look.letter}</b> · {look.name}{data.picked ? ` (you picked ${data.picked})` : ""}</p><button type="button" disabled={busy} onClick={pick}>Pick this one</button></>}
        {said && data.picked !== look.letter && <p role="status">{said}</p>}
      </div>
    </div>
  );
}
