// THE WEBSITE BRIEF — the screen a detailer fills in so their site can be
// built. Roadmap 9.3.
//
// The owner, 2026-09-09, after being shown the questions as a document:
// *"it should be, like, popped up basically once the detailer signs in and
// they pay… a next-next type of thing with visuals and information and links
// to some of our example websites."*
//
// **IT WEARS THE PRODUCT'S OWN CHROME AND ADDS ALMOST NO CSS.** `.setupform`,
// `.settings-head`, `.progress-rule`, `.setupstep`, `.setupfoot`, `.card`,
// `.thoughts`, `.field` and `.chip` are the first-run form's, unchanged — this
// IS the first-run form's sibling and a second set of stepper styles is how
// two forms in one product start to look like two products. Only the example
// gallery and the either/or picker are new, and both are in theme.css beside
// the rest.
//
// **THE QUESTIONS ARE `lib/siteIntake.js` AND NOT THIS FILE**, same as
// `lib/setup.js`: they are printed here and on Business, and the count is
// printed in both places.
//
// **EVERY KEYSTROKE IS SAVED, AND LEAVING IS NOT AN ANSWER.** A form this long
// is filled in over several sittings from a van, so there is no Save button
// and no confirm-on-leave: the draft is written a second after typing stops,
// and re-entering lands on the step they left. `submitted_at` is the only
// thing the last button sets, because a half-finished draft is not a brief and
// building a site from one is how a detailer ends up with a website claiming
// something they never said.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ExternalLink, X, Check } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { EITHER, EXAMPLES, STEPS, intakeProgress } from "../lib/siteIntake.js";
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// A LITTLE DRAWN PAGE, NOT A SCREENSHOT. Six of them, built from divs, so the
// either/or asks its question in pictures without shipping twelve images —
// and so the two options in a pair are guaranteed to look plainly unalike,
// which is the research finding the whole step rests on.
function Mini({ kind }) {
  const dark = kind !== "light" && kind !== "facts";
  return (
    <div className={`mini ${dark ? "dark" : "light"} mini-${kind}`} aria-hidden="true">
      <i className="mini-ph" />
      <i className="mini-b b1" />
      <i className="mini-b b2" />
      <i className="mini-b ac" />
    </div>
  );
}

// DECLARED AT MODULE SCOPE, AND THAT IS NOT TIDINESS. Nested inside the
// screen it is a NEW component type on every render, so React threw the input
// away and rebuilt it on each keystroke — the field lost focus after one
// letter and the form was unusable. `a` and `set` come in as props instead.
function Question({ q, a, set }) {
  const [why, setWhy] = useState(false);
  const [note, setNote] = useState(!!a[`${q.id}::n`]);
  const v = a[q.id];
  return (
    <div className="card"><div className="thoughts">
      <div className="qhead">
        <h3 className="qtext">{t(q.question)}</h3>
        {q.why && (
          <button type="button" className="btn sm inline ghost" onClick={() => setWhy(!why)}>
            {why ? t("hide") : t("why we ask")}
          </button>
        )}
      </div>
      {why && <p className="quiet whyline">{t(q.why)}</p>}

      {q.type === "text" && (
        <input type="text" className="intakeinput" aria-label={t(q.question)}
          value={v ?? ""} onChange={(e) => set(q.id, e.target.value)} />
      )}
      {q.type === "long" && (
        <textarea rows={3} className="intakeinput" aria-label={t(q.question)}
          value={v ?? ""} onChange={(e) => set(q.id, e.target.value)} />
      )}
      {(q.type === "one" || q.type === "many") && (
        <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
          {q.options.map((o) => {
            const on = q.type === "many" ? (v ?? []).includes(o) : v === o;
            return (
              <button key={o} type="button" className={`chip ${on ? "active" : ""}`}
                aria-pressed={on}
                onClick={() => {
                  if (q.type === "many") {
                    const s = v ?? [];
                    set(q.id, on ? s.filter((x) => x !== o) : s.concat([o]));
                  } else set(q.id, on ? "" : o);
                }}>{t(o)}</button>
            );
          })}
        </div>
      )}

      {/* ONE NOTE BOX PER QUESTION — the owner's rule, 2026-09-06. A single
          box at the end loses "we do offer that, but only for regulars",
          because nobody remembers it eleven questions later. Folded away
          until it is wanted, or every question would look like two. */}
      {note ? (
        <label className="field"><span>{t("Note")}</span>
          <textarea rows={2} value={a[`${q.id}::n`] ?? ""}
            onChange={(e) => set(`${q.id}::n`, e.target.value)} /></label>
      ) : (
        <button type="button" className="btn sm inline ghost" onClick={() => setNote(true)}>
          {t("Add a note")}
        </button>
      )}
    </div></div>
  );
}

// `preview` is the owner looking at the form without being a detailer.
// He asked for it 2026-09-10: *"if I go to /website, it makes me want to sign
// up as a detailer or as a business, and I don't wanna do that right now."*
// It reads nothing, writes nothing and needs no session, so it renders outside
// BusinessProvider — which is why every context read below tolerates its
// absence rather than assuming a provider is above it.
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
  // there is one upsert in this file rather than one per question — the same
  // reason the first-run form holds a single `draft` and commits it once.
  const push = useCallback(async (answers, step, extra) => {
    if (preview || !business?.id || !owner) return;
    const { error } = await supabase.from("site_intake")
      .upsert({ business_id: business.id, answers, step, updated_at: new Date().toISOString(), ...extra },
        { onConflict: "business_id" });
    setErr(error ? error.message : "");
  }, [business?.id, owner, preview]);

  const set = (id, value) => {
    const next = { ...a, [id]: value };
    setA(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next, i), 900);
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

  // ALREADY SENT. Not a dead end and not a lock: they can carry on editing,
  // because a detailer who remembers something on Tuesday should be able to
  // add it. It just stops the form asking to be finished again.
  if (row?.submitted_at && i === STEPS.length - 1) {
    return (
      <div className="group setupform">
        <div className="settings-head">
          <span />
          <h1 className="display">{t("Your website")}</h1>
          <button className="x" aria-label={t("Close")} onClick={onClose}><X size={18} strokeWidth={2} /></button>
        </div>
        <div className="setupstep">
          <h2 className="title">{t("That is everything we need.")}</h2>
          <p className="quiet">
            {t("We have your answers. Nothing on your site will claim anything you did not tell us here — if you want to change something, come back to this page any time.")}
          </p>
          <div className="card"><div className="thoughts">
            <p className="quiet">{t("{done} of {total} questions answered.", { done: p.done, total: p.total })}</p>
          </div></div>
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

        {/* ── the opening screen: what this is, and what it is not ───── */}
        {step.kind === "hello" && (
          <>
            <p className="quiet">
              {t("You have told us what you charge and when you work. This is the other half — the things a website needs that a booking page does not, in your own words.")}
            </p>
            <div className="card"><div className="thoughts">
              <ul className="plainlist">
                <li>{t("About fifteen minutes. Most of it is tapping, not typing.")}</li>
                <li>{t("Nothing is compulsory. Skip anything and we will use our judgement and tell you where we did.")}</li>
                <li>{t("It saves as you type, so you can stop halfway and come back to this page.")}</li>
                <li>{t("We never ask for anything already in your dashboard — your prices, hours, colour and photographs come straight from it.")}</li>
              </ul>
            </div></div>
            <p className="quiet">
              {t("One promise in return: nothing on your finished site will claim anything you did not say here.")}
            </p>
          </>
        )}

        {/* ── the gallery: real pages of ours, opened in a new tab ───── */}
        {step.kind === "looks" && (
          <div className="exgrid">
            {EXAMPLES.map(([href, name, note, kind]) => {
              const picked = (a.looks ?? []).includes(href);
              return (
                <div key={href} className={`excard ${picked ? "on" : ""}`}>
                  <Mini kind={kind} />
                  <div className="exbody">
                    <b>{name}</b>
                    <span className="quiet">{note}</span>
                  </div>
                  <div className="exfoot">
                    <button type="button" className={`chip ${picked ? "active" : ""}`} aria-pressed={picked}
                      onClick={() => {
                        const s = a.looks ?? [];
                        set("looks", picked ? s.filter((x) => x !== href) : s.concat([href]));
                      }}>
                      {picked ? <><Check size={13} strokeWidth={2.4} /> {t("Liked")}</> : t("I like this")}
                    </button>
                    <a className="btn sm inline ghost" href={href} target="_blank" rel="noreferrer">
                      {t("Open")} <ExternalLink size={13} strokeWidth={2} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── the three either/ors, asked in pictures ─────────────────── */}
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
          <p className="quiet">{t("Only the owner of this business can answer this, so nothing here will save.")}</p>
        )}
        {err && <div className="error-box">{err}</div>}
      </div>

      <div className="setupfoot">
        <button className="btn" disabled={busy} onClick={() => (last ? onClose() : go(i + 1))}>
          {last ? t("Finish later") : t("Skip this bit")}
        </button>
        <button className="btn primary" disabled={busy} onClick={() => (last ? finish() : go(i + 1))}>
          {busy ? t("Saving…") : last ? t("Send it to us") : t("Continue")}
        </button>
      </div>

      {/* THE ONE WAY TO STOP BEING ASKED. It writes `dismissed` rather than
          hiding the form locally: the platform needs to know the difference
          between a detailer who has not got to it and one who does not want a
          website, and a flag in this browser answers neither. The form stays
          reachable at /website afterwards. */}
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
