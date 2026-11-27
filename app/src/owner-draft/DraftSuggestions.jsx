import { useState } from "react";
import { fields } from "../../../supabase/functions/_shared/setupQuestions.js";
import { writtenAnswers } from "../../../supabase/functions/_shared/ownerDraftInput.js";

import { t, getAppLocale } from "../lib/appI18n.js";
export default function DraftSuggestions({ answers, onUse, display, call }) {
  const [connection, setConnection] = useState(null),
    [result, setResult] = useState(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const payload = writtenAnswers(answers);
  async function prepare() {
    setBusy(true);
    setNotice("");
    try {
      const s = await call("settings", { op: "read" });
      if (!s.providers[s.active]?.model) throw Error();
      setConnection({
        revision: s.revision,
        provider: s.active,
        model: s.providers[s.active].model,
      });
    } catch {
      setNotice(t("Select and test a model in AI Settings first."));
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setNotice("");
    try {
      const r = await call("suggest", {
        requestId: crypto.randomUUID(),
        ...connection,
        confirmed: true,
        answers: payload,
        language: getAppLocale(),
      });
      setResult(r);
    } catch {
      setNotice(t("AI could not finish. Your answers are still here."));
      setConnection(null);
    } finally {
      setBusy(false);
    }
  }
  if (!Object.keys(payload).length) return null;
  const additions = Object.entries(result?.suggestions ?? {}).filter(
    ([k]) =>
      answers[k] == null ||
      answers[k] === "" ||
      (Array.isArray(answers[k]) && !answers[k].length),
  );
  return (
    <section className="sq-summary">
      <h3>{t("AI suggestions")}</h3>
      {result ? (
        <>
          {additions.length ? (
            <>
              <dl>
                {additions.map(([k, v]) => (
                  <div key={k}>
                    <dt>{t(fields[k].label)}</dt>
                    <dd>{display(fields[k], v)}</dd>
                    {result.evidence?.[k]?.quote && (
                      <small>{result.evidence[k].quote}</small>
                    )}
                  </div>
                ))}
              </dl>
              <button
                className="btn primary"
                onClick={() => {
                  onUse(Object.fromEntries(additions));
                  setResult(null);
                  setConnection(null);
                }}
              >
                {t("Add suggestions to my draft")}
              </button>
            </>
          ) : (
            <p>{t("No extra answers were found. Review what you entered.")}</p>
          )}
        </>
      ) : connection ? (
        <>
          <p>{t("These are the answers AI will receive.")}</p>
          <dl>
            {Object.entries(payload).map(([k, v]) => (
              <div key={k}>
                <dt>{t(fields[k].label)}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p>
            {connection.model} ·{" "}
            {t("This uses your provider account and may cost money.")}
          </p>
          <button className="btn primary" disabled={busy} onClick={generate}>
            {t("Send these answers to AI")}
          </button>
        </>
      ) : (
        <button className="btn ghost" disabled={busy} onClick={prepare}>
          {t("Review what AI will receive")}
        </button>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
