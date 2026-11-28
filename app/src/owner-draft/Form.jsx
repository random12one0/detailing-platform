import { useEffect, useRef, useState } from "react";

import { ArrowLeft, ArrowRight, Check, SlidersHorizontal } from "lucide-react";
import QuestionField, {
  answerText,
  days,
} from "../components/QuestionField.jsx";
import {
  chapters,
  cleanAnswers,
  fields,
} from "../../../supabase/functions/_shared/setupQuestions.js";
import { t } from "../lib/appI18n.js";

import { draftCopies, sameCopies, saveAnswers } from "./storage.js";
import "../components/shop-questions.css";


const sections = chapters.filter((c) => c.fields.length && c.key !== "clients");
function display(field, value) {
  if (field.key === "hours")
    return value
      .map(
        (r) =>
          t(days[r.weekday]) +
          " · " +
          (r.closed ? t("Closed") : r.open + "–" + r.close),
      )
      .join("\n");
  if (field.key === "faqs")
    return value.map((r) => r.q + "\n" + r.a).join("\n\n");
  return answerText(field, value);
}
export default function Form(props) {
  const key = "dp.ownerSetup.v1." + props.owner + "." + props.business.id;
  const [initial, setInitial] = useState(null);
  useEffect(() => {
    let mounted = true;
    draftCopies(key).then(value => { if (mounted) setInitial(value); });
    return () => { mounted = false; };
  }, [key]);
  if (!initial) return <p role="status">{t("Opening shop setup.")}</p>;
  return <Questions {...props} storageKey={key} initial={initial} />;
}

function Questions({ business, owner, call, storageKey: key, initial }) {
  const original = useRef(initial);
  const [answers, setAnswers] = useState(() => {
      try {
        const stored = original.current.current ?? original.current.legacy;
        return cleanAnswers(stored ? JSON.parse(stored) : {});
      } catch {
        return {};
      }
    }),
    [chooseCopy, setChooseCopy] = useState(() => {
      const copies = original.current;
      return copies?.current != null && copies.legacy != null && copies.current !== copies.legacy;
    }),
    [step, setStep] = useState(0),
    [note, setNote] = useState(""),
    [saved, setSaved] = useState(false),
    [stale, setStale] = useState(false),
    [saving, setSaving] = useState(false);
  const heading = useRef(null);
  const current = sections[step],
    reviewing = !current;
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [step]);
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const starting = original.current;
      const latest = await draftCopies(key);
      if (mounted && starting === original.current && !sameCopies(starting, latest)) {
        setStale(true);
        setNote("");
      }
    };
    const changed = event => {
      if (!event.key || event.key === key || event.key === key + ".saved") check();
    };
    window.addEventListener("storage", changed);
    window.addEventListener("focus", check);
    check();
    return () => {
      mounted = false;
      window.removeEventListener("storage", changed);
      window.removeEventListener("focus", check);
    };
  }, [key]);
  function move(i) {
    setStep(i);
    setNote("");
  }
  function change(k, v) {
    setAnswers((a) => ({ ...a, [k]: v }));
    setSaved(false);
    setNote("");
  }
  function validate() {
    try {
      return cleanAnswers(answers);
    } catch (e) {
      const i = sections.findIndex((c) =>
        c.fields.some((f) => f.key === e.message),
      );
      if (i >= 0) move(i);
      setNote(
        t("Check the answer for {field}.", {
          field: t(fields[e.message]?.label ?? "Your business"),
        }),
      );
      return null;
    }
  }
  async function save() {
    const clean = validate();
    if (!clean || saving) return;
    setSaving(true);
    try {
      const session = await call("access");
      if (session.owner !== owner || session.business !== business.id)
        throw Error();
      const next = JSON.stringify(clean);
      original.current = await saveAnswers(key, original.current, next);
      setStale(false);
      setSaved(true);
      setNote(t("Draft saved on this device."));
    } catch (error) {
      if (error.message === "changed") { setStale(true); setNote(""); }
      else setNote(t(error.message === "lock unavailable"
        ? "This browser cannot safely save the draft. Copy your answers before closing this tab."
        : "Could not save this draft. Check your access and browser storage."));
    } finally {
      setSaving(false);
    }
  }
  if (chooseCopy && !stale) {
    return (
      <section className="shop-questions">
        <h1>{t("Choose a draft to continue")}</h1>
        <p>{t("This app and the previous version saved different answers. You can review both. Your choice takes effect when you save.")}</p>
        {[
          ["current", "This app’s answers", "Use this app’s answers"],
          ["legacy", "Previous app’s answers", "Use previous app’s answers"],
        ].map(([source, title, action]) => {
          const raw = original.current[source];
          let parsed;
          try { parsed = cleanAnswers(JSON.parse(raw)); } catch { /* Keep unknown text available to copy. */ }
          return (
            <section className="sq-summary" key={source}>
              <details className="sq-manual">
                <summary>{t(title)}</summary>
                <pre style={{whiteSpace:"pre-wrap", overflowWrap:"anywhere"}}>{parsed
                  ? Object.entries(parsed).map(([k, v]) => t(fields[k].label) + "\n" + display(fields[k], v)).join("\n\n") || t("No answers saved")
                  : raw}</pre>
              </details>
              <button className="btn" disabled={!parsed} onClick={() => {
                setAnswers(parsed);
                setChooseCopy(false);
              }}>{t(action)}</button>
            </section>
          );
        })}
      </section>
    );
  }
  const render = (f) => (
    <QuestionField
      key={f.key}
      field={f}
      value={answers[f.key]}
      onChange={(v) => change(f.key, v)}
    />
  );
  const primary =
    current?.key === "identity"
      ? 3
      : current?.key === "website"
        ? current.fields.length
        : 1;
  return (
    <section className="shop-questions">
      <header className="sq-bar">
        <span>
          <SlidersHorizontal size={18} />
          {t("Shop setup")}
        </span>
        <span>{t("Private draft")}</span>
      </header>
      <div className="sq-progress" aria-hidden="true">
        {sections.map((s, i) => (
          <span
            key={s.key}
            className={
              step === i
                ? "current"
                : s.fields.some((f) => answers[f.key] != null)
                  ? "answered"
                  : ""
            }
          />
        ))}
      </div>
      <div className="sq-layout">
        <div className="sq-main">
          {stale && (
            <div className="sq-note" role="alert">
              <p>{t("A newer draft was saved in another tab. Copy any answers you want to keep from this tab.")}</p>
              <a className="btn" href="/app?onboarding=1" target="_blank" rel="noopener noreferrer">
                {t("Open saved draft in a new tab")}
              </a>
            </div>
          )}
          <p className="sq-section">
            {t(reviewing ? "Review" : current.section)}{" "}
            <span>
              {Math.min(step + 1, sections.length + 1)} / {sections.length + 1}
            </span>
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {t(reviewing ? "Check your settings" : current.title)}
          </h1>
          <p className="sq-help">
            {t(
              reviewing ? "Save a private copy on this device." : current.help,
            )}
          </p>
          {step === 0 && (
            <p className="sq-note">
              {t(
                "Answer what you know. You can skip any section. Your draft stays in this browser.",
              )}
            </p>
          )}
          {reviewing ? (
            <div className="sq-body">
              {sections.map((s, i) => {
                const filled = s.fields.filter(
                  (f) =>
                    answers[f.key] != null &&
                    answers[f.key] !== "" &&
                    (!Array.isArray(answers[f.key]) || answers[f.key].length),
                );
                return (
                  filled.length > 0 && (
                    <section key={s.key} className="sq-summary">
                      <header>
                        <h3>{t(s.title)}</h3>
                        <button className="btn ghost" onClick={() => move(i)}>
                          {t("Change")}
                        </button>
                      </header>
                      <dl>
                        {filled.map((f) => (
                          <div key={f.key}>
                            <dt>{t(f.label)}</dt>
                            <dd>{display(f, answers[f.key])}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )
                );
              })}
              {!Object.keys(answers).length && (
                <p>
                  {t(
                    "You skipped every question. You can come back when you're ready.",
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="sq-body" key={current.key}>
              {current.fields.slice(0, primary).map(render)}
              {current.fields.length > primary && (
                <details className="sq-manual" open={note ? true : undefined}>
                  <summary>{t("Enter settings individually")}</summary>
                  {current.fields.slice(primary).map(render)}
                </details>
              )}
            </div>
          )}
          {!reviewing && (
            <button
              className="btn ghost"
              disabled={saving || saved || stale}
              onClick={save}
            >
              {t("Save draft on this device")}
            </button>
          )}
          {note && (
            <p role="status" className="sq-note">
              {note}
            </p>
          )}
          <div className="sq-actions">
            {step > 0 && (
              <button className="btn ghost" onClick={() => move(step - 1)}>
                <ArrowLeft size={15} />
                {t("Back")}
              </button>
            )}
            {reviewing ? (
              <button
                className="btn primary"
                disabled={saved || saving || stale}
                onClick={save}
              >
                <Check size={16} />
                {t("Save draft on this device")}
              </button>
            ) : (
              <>
                <button
                  className="btn primary"
                  onClick={() => {
                    if (validate()) move(step + 1);
                  }}
                >
                  {t(
                    step === sections.length - 1 ? "Review setup" : "Continue",
                  )}
                  <ArrowRight size={16} />
                </button>
                <button className="btn ghost" onClick={() => move(step + 1)}>
                  {t("Skip for now")}
                </button>
              </>
            )}
          </div>
        </div>
        <aside className="sq-index">
          <details>
            <summary>{t("Questions")}</summary>
            {sections.map((s, i) => (
              <button
                key={s.key}
                className={i === step ? "selected" : ""}
                onClick={(e) => {
                  if (innerWidth < 800)
                    e.currentTarget.closest("details").open = false;
                  move(i);
                }}
              >
                {t(s.title)}
              </button>
            ))}
          </details>
          {!reviewing && (
            <button
              className="btn ghost"
              onClick={() => {
                if (validate()) move(sections.length);
              }}
            >
              {t("Review setup")}
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}
