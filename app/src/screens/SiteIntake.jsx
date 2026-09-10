// THE WEBSITE BRIEF — the screen a detailer fills in so their site can be
// built. Roadmap 9.3.
//
// It wears the first-run form's chrome unchanged — `.setupform`,
// `.settings-head`, `.progress-rule`, `.setupstep`, `.setupfoot`, `.card`,
// `.thoughts`, `.field`, `.chip`. A second stepper is how one product comes to
// look like two. The questions are `lib/siteIntake.js`, not this file.
//
// REBUILT 2026-09-10 to his notes. Five things changed and each is a rule for
// anything added here later:
//
//   · **A question is asked with the right control, not with a radio button.**
//     A colour is a colour picker. Photographs are an upload. Other people's
//     websites are a list of links. *"Rather than a test they have to take."*
//   · **The note box per question is gone**; a multiple-choice question has an
//     **Other** option, which is where the extra answer belongs.
//   · **"Why we ask" is gone.** It was written for us.
//   · **The examples are WALKED** — one per screen, the real page in a frame,
//     with liked/not, what specifically, and a box. Both directions.
//   · **No reassurance in the copy.** No "there is no wrong answer", no
//     telling a detailer what we already know about their own business.
//
// `preview` is the owner looking without being a detailer (2026-09-10): reads
// nothing, writes nothing, needs no session, renders outside BusinessProvider
// — so every context read tolerates there being no provider above it.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ExternalLink, X, Check, Plus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { addPhoto } from "../lib/photos.js";
import { DISLIKED, EITHER, LIKED, STEPS, intakeProgress } from "../lib/siteIntake.js";
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// A little drawn page, four bars, shown until the real one loads. Not a
// screenshot: nothing is downloaded and the six kinds are guaranteed to look
// plainly unalike.
function Mini({ kind }) {
  const dark = kind !== "light" && kind !== "facts";
  return (
    <div className={`mini ${dark ? "dark" : "light"} mini-${kind}`} aria-hidden="true">
      <i className="mini-ph" /><i className="mini-b b1" /><i className="mini-b b2" /><i className="mini-b ac" />
    </div>
  );
}

/* ── one question ───────────────────────────────────────────────────────── */
// AT MODULE SCOPE, and that is not tidiness: nested inside the screen it is a
// new component type on every render, so React threw the input away and
// rebuilt it on each keystroke and the field lost focus after one letter.
function Question({ q, a, set }) {
  const v = a[q.id];
  const otherKey = `${q.id}::other`;
  const other = a[otherKey];
  const [showOther, setShowOther] = useState(!!other);

  const chip = (o, on, onClick) => (
    <button key={o} type="button" className={`chip ${on ? "active" : ""}`} aria-pressed={on} onClick={onClick}>
      {t(o)}
    </button>
  );

  return (
    <div className="card"><div className="thoughts">
      <h3 className="qtext">{t(q.question)}</h3>

      {q.type === "text" && (
        <input type="text" className="intakeinput" aria-label={t(q.question)}
          value={v ?? ""} onChange={(e) => set(q.id, e.target.value)} />
      )}

      {q.type === "long" && (
        <textarea rows={3} className="intakeinput" aria-label={t(q.question)}
          value={v ?? ""} onChange={(e) => set(q.id, e.target.value)} />
      )}

      {(q.type === "one" || q.type === "many") && (
        <>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            {q.options.map((o) => {
              const on = q.type === "many" ? (v ?? []).includes(o) : v === o;
              return chip(o, on, () => {
                if (q.type === "many") {
                  const s = v ?? [];
                  set(q.id, on ? s.filter((x) => x !== o) : s.concat([o]));
                } else set(q.id, on ? "" : o);
              });
            })}
            {/* OTHER, WHICH REPLACED THE NOTE BOX ON EVERY QUESTION. His
                words: an option to *"write something else — another option or
                an additional option"*. It is a chip like the rest, so it reads
                as one of the answers rather than as an escape hatch. */}
            {q.other && chip("Other", showOther, () => {
              setShowOther(!showOther);
              if (showOther) set(otherKey, "");
            })}
          </div>
          {q.other && showOther && (
            <input type="text" className="intakeinput" placeholder={t("Type it here")}
              aria-label={t("Other")} value={other ?? ""} onChange={(e) => set(otherKey, e.target.value)} />
          )}
        </>
      )}

      {q.type === "colour" && <Colours value={v} set={(x) => set(q.id, x)} />}
      {q.type === "photos" && <Photos value={v} set={(x) => set(q.id, x)} />}
    </div></div>
  );
}

/* ── colours: a picker, a hex box, and as many as they have ─────────────── */
// A COLOUR IS NOT A MULTIPLE-CHOICE QUESTION. His note: *"there should be some
// more interactive elements — a colour picker, a place to upload exact hexes,
// and multiple colours."* Both halves are the same value: the native swatch is
// for somebody who has never seen a hex code, and the text box is for the one
// who has it written on an invoice from the sign shop.
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
function Colours({ value, set }) {
  const list = Array.isArray(value) ? value : [];
  const put = (n, hex) => set(list.map((c, i) => (i === n ? hex : c)));
  return (
    <div className="colours">
      {list.map((c, n) => (
        <div className="colourrow" key={n}>
          <input type="color" aria-label={t("Colour {n}", { n: n + 1 })}
            value={HEX.test(c) ? (c.startsWith("#") ? c : `#${c}`) : "#000000"}
            onChange={(e) => put(n, e.target.value)} />
          <input type="text" className="intakeinput" aria-label={t("Hex code")}
            placeholder="#1A1A1A" value={c} onChange={(e) => put(n, e.target.value)} />
          <button type="button" className="btn icon ghost" aria-label={t("Remove")}
            onClick={() => set(list.filter((_, i) => i !== n))}>
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      ))}
      <button type="button" className="btn sm" onClick={() => set(list.concat([""]))}>
        <Plus size={14} strokeWidth={2.4} /> {list.length ? t("Another colour") : t("Add a colour")}
      </button>
    </div>
  );
}

/* ── photos: the question and the upload are one control ────────────────── */
// **THE BIGGEST SINGLE GAP IN THE TRADE IS HERE.** Two thirds of real
// detailers' sites have no before-and-after photographs at all
// (docs/tenant-site-research-2026-09-10.md § 1c) while every guide calls them
// the most important thing on the page — so *"have you got photos?"* answered
// yes and nothing attached is the failure this control exists to prevent. His
// note: *"do you have any photos — yes or no — and then if so, upload them."*
function Photos({ value, set }) {
  const { business } = useBusiness() ?? {};
  const v = value ?? {};
  const files = v.files ?? [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (e) => {
    const chosen = Array.from(e.target.files ?? []);
    if (!chosen.length) return;
    setBusy(true); setErr("");
    const done = [...files];
    for (const file of chosen) {
      try {
        // No business means the preview, where there is nothing to attach a
        // photograph to. The name is still recorded so the control behaves.
        if (business?.id) await addPhoto({ file, businessId: business.id, kind: "gallery" });
        done.push(file.name);
      } catch (x) { setErr(x.message); }
    }
    set({ ...v, files: done });
    setBusy(false);
    e.target.value = "";
  };

  return (
    <>
      <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
        {["A phone full of them", "A few good ones", "Almost none", "Not mine"].map((o) => (
          <button key={o} type="button" className={`chip ${v.have === o ? "active" : ""}`}
            aria-pressed={v.have === o} onClick={() => set({ ...v, have: v.have === o ? "" : o })}>
            {t(o)}
          </button>
        ))}
      </div>
      {v.have && v.have !== "Almost none" && (
        <div className="uploadbox">
          <label className="btn sm">
            {busy ? t("Uploading…") : t("Choose photos")}
            <input type="file" accept="image/*" multiple hidden onChange={pick} disabled={busy} />
          </label>
          {files.length > 0 && (
            <span className="label">{t("{n} added", { n: files.length })}</span>
          )}
          {!business?.id && <span className="label">{t("Sign in to upload for real")}</span>}
          {err && <span className="label">{err}</span>}
        </div>
      )}
    </>
  );
}

/* ── one of our sites, with the real page in it ─────────────────────────── */
// **THE FRAME IS THE POINT.** He asked for *"a little preview of what the site
// looks like"* and for them to go through every one. The pages are real routes
// on this same origin (`scripts/build-examples.mjs`), so this is the site
// itself scaled down rather than a picture of it that goes stale — the same
// reason that script copies at build time instead of committing a duplicate.
// `Mini` sits underneath until it loads, so the card is never an empty box.
const FRAME_W = 1280, FRAME_H = 900;
function LookStep({ site, value, set }) {
  const v = value ?? {};
  const chips = v.chips ?? [];
  const [loaded, setLoaded] = useState(false);
  const words = v.verdict === "no" ? DISLIKED : LIKED;

  // THE SCALE IS MEASURED, NOT GUESSED. The frame renders at a desktop 1280
  // and is transformed down, so what a detailer sees is the desk layout rather
  // than a phone layout pretending to be one. A fixed scale factor left a
  // 150px strip of dead card beside it at 1440 and cropped it at 320, because
  // the column this sits in is a different width at every breakpoint — so the
  // factor comes from the box itself.
  const box = useRef(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / FRAME_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toggle = (w) => set({ ...v, chips: chips.includes(w) ? chips.filter((x) => x !== w) : chips.concat([w]) });

  return (
    <>
      <p className="quiet">{t(site.note)}</p>

      <div className="sitecard" ref={box}
        style={{ height: scale ? `${Math.round(FRAME_H * scale)}px` : "260px" }}>
        {!loaded && <Mini kind={site.kind} />}
        {scale > 0 && (
          <iframe className="siteframe" src={site.href} title={site.name} loading="lazy"
            tabIndex={-1} onLoad={() => setLoaded(true)}
            style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }} />
        )}
        <a className="btn sm" href={site.href} target="_blank" rel="noreferrer">
          {t("Open it")} <ExternalLink size={13} strokeWidth={2} />
        </a>
      </div>

      <div className="card"><div className="thoughts">
        <div className="row wrap" style={{ gap: 6 }}>
          <button type="button" className={`chip ${v.verdict === "yes" ? "active" : ""}`}
            aria-pressed={v.verdict === "yes"}
            onClick={() => set({ ...v, verdict: v.verdict === "yes" ? "" : "yes", chips: [] })}>
            <Check size={13} strokeWidth={2.4} /> {t("I like it")}
          </button>
          <button type="button" className={`chip ${v.verdict === "no" ? "active" : ""}`}
            aria-pressed={v.verdict === "no"}
            onClick={() => set({ ...v, verdict: v.verdict === "no" ? "" : "no", chips: [] })}>
            {t("Not for me")}
          </button>
        </div>

        {/* THE WORDS ONLY APPEAR ONCE THEY HAVE PICKED A SIDE, and they are a
            DIFFERENT SET each way. A single list of adjectives cannot say
            whether "dark" was the reason they liked it or the reason they
            did not, and his ask was explicitly for both directions. */}
        {v.verdict && (
          <>
            <span className="label">{v.verdict === "yes" ? t("What did you like?") : t("What put you off?")}</span>
            <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
              {words.map((w) => (
                <button key={w} type="button" className={`chip ${chips.includes(w) ? "active" : ""}`}
                  aria-pressed={chips.includes(w)} onClick={() => toggle(w)}>{t(w)}</button>
              ))}
            </div>
            <textarea rows={2} className="intakeinput"
              placeholder={v.verdict === "yes"
                ? t("Anything specific — a feature, a section, the way something works")
                : t("Anything specific")}
              aria-label={t("Your thoughts")}
              value={v.note ?? ""} onChange={(e) => set({ ...v, note: e.target.value })} />
          </>
        )}
      </div></div>
    </>
  );
}

/* ── other people's sites ───────────────────────────────────────────────── */
// His ask: a place to say *"I like this car detailing website, and here's
// why"* — **and the other half, which he was explicit about:** *"we also need
// stuff saying here's negatives that I don't like and why."* One list, each
// row carrying which way it goes, because a site somebody hates is worth as
// much as one they love and a separate list for each would get half filled in.
function SitesStep({ value, set }) {
  const rows = Array.isArray(value) ? value : [];
  const put = (n, patch) => set(rows.map((r, i) => (i === n ? { ...r, ...patch } : r)));
  return (
    <>
      {/* A RULED LIST, NOT A STACK OF CARDS. `composition` test 1 forbids
          mapping records onto `.card` and it is right here: these are rows
          somebody adds four of, and four cards is four boxes of chrome around
          three fields each. */}
      {rows.map((r, n) => (
        <div className="siterow" key={n}>
          <div className="colourrow">
            <input type="url" className="intakeinput" placeholder="https://…" aria-label={t("Web address")}
              value={r.url ?? ""} onChange={(e) => put(n, { url: e.target.value })} />
            <button type="button" className="btn icon ghost" aria-label={t("Remove")}
              onClick={() => set(rows.filter((_, i) => i !== n))}>
              <Trash2 size={16} strokeWidth={2} />
            </button>
          </div>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            <button type="button" className={`chip ${r.verdict === "yes" ? "active" : ""}`}
              aria-pressed={r.verdict === "yes"} onClick={() => put(n, { verdict: "yes" })}>{t("I like it")}</button>
            <button type="button" className={`chip ${r.verdict === "no" ? "active" : ""}`}
              aria-pressed={r.verdict === "no"} onClick={() => put(n, { verdict: "no" })}>{t("I don't")}</button>
          </div>
          <textarea rows={2} className="intakeinput" aria-label={t("Why")}
            placeholder={r.verdict === "no" ? t("What's wrong with it?") : t("What do you like about it?")}
            value={r.why ?? ""} onChange={(e) => put(n, { why: e.target.value })} />
        </div>
      ))}
      <button type="button" className="btn sm" onClick={() => set(rows.concat([{ url: "", verdict: "", why: "" }]))}>
        <Plus size={14} strokeWidth={2.4} /> {rows.length ? t("Another one") : t("Add a website")}
      </button>
    </>
  );
}

/* ── the screen ─────────────────────────────────────────────────────────── */
export default function SiteIntake({ onClose, preview = false }) {
  useAppLocale();
  const { business, role } = useBusiness() ?? {};
  const [row, setRow] = useState(preview ? null : undefined);   // undefined = loading
  const [a, setA] = useState({});
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const heading = useRef(null);
  const timer = useRef(null);
  const owner = role === "owner";

  useEffect(() => {
    if (preview || !business?.id) return;
    let live = true;
    supabase.from("site_intake").select("*").eq("business_id", business.id).maybeSingle()
      .then(({ data }) => {
        if (!live) return;
        setRow(data ?? null);
        setA(data?.answers ?? {});
        setI(Math.min(data?.step ?? 0, STEPS.length - 1));
      });
    return () => { live = false; };
  }, [business?.id, preview]);

  // ONE WRITER, DEBOUNCED. Every editor on every step goes through `set`, so
  // there is one upsert in this file rather than one per question.
  const push = useCallback(async (answers, step, extra) => {
    if (preview || !business?.id || !owner) return;
    const { error } = await supabase.from("site_intake")
      .upsert({ business_id: business.id, answers, step, updated_at: new Date().toISOString(), ...extra },
        { onConflict: "business_id" });
    setErr(error ? error.message : "");
  }, [business?.id, owner, preview]);

  const set = (id, value) => {
    setA((prev) => {
      const next = { ...prev, [id]: value };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => push(next, i), 900);
      return next;
    });
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = async (n) => {
    clearTimeout(timer.current);
    setDir(n > i ? 1 : -1);
    const at = Math.max(0, Math.min(n, STEPS.length - 1));
    setI(at);
    window.scrollTo(0, 0);
    await push(a, at);
  };

  const finish = async () => {
    setBusy(true);
    clearTimeout(timer.current);
    await push(a, i, { submitted_at: new Date().toISOString() });
    setBusy(false);
    setRow((r) => ({ ...(r ?? {}), submitted_at: new Date().toISOString() }));
  };

  const p = useMemo(() => intakeProgress(a), [a]);
  useEffect(() => { heading.current?.focus(); }, [i]);

  if (row === undefined) return <div className="group" />;

  if (row?.submitted_at && i === STEPS.length - 1) {
    return (
      <div className="group setupform intake">
        <div className="settings-head">
          <span />
          <h1 className="display">{t("Your website")}</h1>
          <button className="x" aria-label={t("Close")} onClick={onClose}><X size={18} strokeWidth={2} /></button>
        </div>
        <div className="setupstep">
          <h2 className="title">{t("Got it.")}</h2>
          <p className="quiet">{t("{done} of {total} answered. Come back any time to change something.",
            { done: p.done, total: p.total })}</p>
          <div className="setupfoot">
            <button className="btn" onClick={() => go(0)}>{t("Go back through it")}</button>
            <button className="btn primary" onClick={onClose}>{t("Done")}</button>
          </div>
        </div>
      </div>
    );
  }

  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  // The one step with a bar: he asked for it to be required, and a disabled
  // Continue beside a live Skip says "we want this" without trapping anybody.
  const sitesEmpty = step.kind === "sites" && !(a.others ?? []).some((r) => r.url?.trim());

  return (
    <div className="group setupform intake">
      {preview && (
        <div className="impbar" role="status">
          <span>{t("Preview. This is the form a detailer fills in — nothing here is saved.")}</span>
        </div>
      )}
      <div className="settings-head">
        <button className="btn icon ghost" aria-label={t("Back")} disabled={i === 0} onClick={() => go(i - 1)}>
          <ChevronLeft strokeWidth={2} />
        </button>
        <h1 className="display">{t("Your website")}</h1>
        <button className="x" aria-label={t("Close")} onClick={onClose}><X size={18} strokeWidth={2} /></button>
      </div>

      <div className="tight">
        <div className="progress-rule" aria-hidden="true">
          {STEPS.map((s, n) => <span key={s.key} className={n < i ? "on" : ""} />)}
        </div>
        <span className="label">{t("Step {n} of {total} · {name}",
          { n: i + 1, total: STEPS.length, name: t(step.name) })}</span>
      </div>

      <div className={`setupstep ${dir > 0 ? "fwd" : "back"}`} key={step.key}>
        <h2 className="title" ref={heading} tabIndex={-1}>{t(step.title)}</h2>
        {step.lede && <p className="quiet">{t(step.lede)}</p>}

        {step.kind === "hello" && (
          <div className="card"><div className="thoughts">
            <ul className="plainlist">
              <li>{t("About fifteen minutes.")}</li>
              <li>{t("Skip anything you want.")}</li>
              <li>{t("It saves as you go.")}</li>
            </ul>
          </div></div>
        )}

        {step.kind === "look" && (
          <LookStep site={step.site} value={a[`look${step.site.n}`]}
            set={(x) => set(`look${step.site.n}`, x)} />
        )}

        {step.kind === "sites" && (
          <>
            <SitesStep value={a.others} set={(x) => set("others", x)} />
            {/* A DEAD BUTTON WITH NO REASON IS A BUG, even when the button is
                meant to be dead. He asked for this step to be required, so
                Continue waits — but it says what it is waiting for, and Skip
                stays live, because nothing in this form traps anybody. */}
            {sitesEmpty && <p className="quiet">{t("Add one, or skip.")}</p>}
          </>
        )}

        {step.kind === "either" && EITHER.map(([id, question, left, right]) => (
          <div className="card" key={id}><div className="thoughts">
            <h3 className="qtext">{t(question)}</h3>
            <div className="pairgrid">
              {[left, right].map(([k, label]) => (
                <button key={k} type="button" className={`paircard ${a[id] === k ? "on" : ""}`}
                  aria-pressed={a[id] === k} onClick={() => set(id, k)}>
                  <Mini kind={k} />
                  <span>{t(label)}</span>
                </button>
              ))}
            </div>
          </div></div>
        ))}

        {(step.qs ?? []).map((q) => <Question key={q.id} q={q} a={a} set={set} />)}

        {!owner && !preview && (
          <p className="quiet">{t("Only the owner can answer this, so nothing here will save.")}</p>
        )}
        {err && <div className="error-box">{err}</div>}
      </div>

      <div className="setupfoot">
        <button className="btn" disabled={busy} onClick={() => (last ? onClose() : go(i + 1))}>
          {last ? t("Finish later") : t("Skip")}
        </button>
        <button className="btn primary" disabled={busy || sitesEmpty}
          onClick={() => (last ? finish() : go(i + 1))}>
          {busy ? t("Saving…") : last ? t("Send it") : t("Continue")}
        </button>
      </div>

      {!preview && (
        <button className="btn sm inline ghost setupquit" disabled={busy}
          onClick={async () => { await push(a, i, { dismissed: true }); onClose(); }}>
          {t("I do not want a website")}
        </button>
      )}

      <span className="label intakecount">
        {preview
          ? t("{done} of {total} answered · nothing is saved in a preview", { done: p.done, total: p.total })
          : t("{done} of {total} answered · saved automatically", { done: p.done, total: p.total })}
      </span>
    </div>
  );
}
