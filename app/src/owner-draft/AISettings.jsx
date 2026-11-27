import { useEffect, useRef, useState } from "react";
import { keyHint, providerNames } from "./modelProvider.js";
import { t } from "../lib/appI18n.js";
export default function AISettings({ mode, call }) {
  const [state, setState] = useState(null),
    [provider, setProvider] = useState(""),
    [model, setModel] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [typed, setTyped] = useState(false),
    [confirm, setConfirm] = useState("");
  const input = useRef(null),
    lock = useRef(false);
  async function load() {
    try {
      const s = await call("settings", { op: "read" });
      setState(s);
      const p = providerNames[s.active] ? s.active : "";
      setProvider(p);
      setModel(s.providers[p]?.model ?? "");
    } catch {
      setNotice(t("Could not load AI settings."));
    }
  }
  useEffect(() => {
    if (mode !== "off") load();
  }, [mode]);
  const choose = (p) => {
    setProvider(p);
    setModel(state?.providers[p]?.model ?? "");
    setConfirm("");
  };
  async function change(op) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      const req = {
        op,
        provider,
        revision: state.revision,
        requestId: crypto.randomUUID(),
      };
      if (op === "save") {
        req.key = input.current.value.trim();
        input.current.value = "";
        setTyped(false);
      }
      if (op === "activate") Object.assign(req, { model, confirmed: true });
      const s = await call("settings", req);
      setState(s);
      setModel(s.providers[provider].model ?? "");
      setNotice(t("AI settings updated."));
    } catch {
      setNotice(
        t("Could not update AI settings. Check your key or model and reload."),
      );
    } finally {
      lock.current = false;
      setBusy(false);
      setConfirm("");
    }
  }
  const c = state?.providers[provider];
  return (
    <section className="group">
      <h1>{t("AI Settings")}</h1>
      {mode === "off" ? (
        <p>{t("AI is off. You can fill out and save your draft.")}</p>
      ) : (
        state && (
          <fieldset className="draft-fields" disabled={busy}>
            <p>
              {t("Current model")} ·{" "}
              {state.active === "manual"
                ? t("Manual review")
                : providerNames[state.active] +
                  " · " +
                  state.providers[state.active].model}
            </p>
            <label className="field">
              {t("Provider API key")}
              <input
                type="password"
                ref={input}
                autoComplete="new-password"
                maxLength={2048}
                spellCheck={false}
                onChange={(e) => {
                  setTyped(!!e.target.value);
                  choose(keyHint(e.target.value));
                }}
              />
            </label>
            <p>{t("Confirm the provider before sending the key.")}</p>
            <div className="draft-actions">
              {Object.entries(providerNames).map(([p, label]) => (
                <button
                  className="btn"
                  aria-pressed={p === provider}
                  key={p}
                  onClick={() => choose(p)}
                >
                  {label}
                </button>
              ))}
            </div>
            {provider && typed && (
              <button
                className="btn primary"
                onClick={() =>
                  c.hasKey && confirm !== "replace"
                    ? setConfirm("replace")
                    : change("save")
                }
              >
                {confirm === "replace"
                  ? t("Confirm replacement")
                  : t("Save key and load models")}{" "}
                · {providerNames[provider]}
              </button>
            )}
            {c?.hasKey && (
              <>
                <p>{t("A key is saved for this provider.")}</p>
                <div className="draft-actions">
                  <button className="btn" onClick={() => change("refresh")}>
                    {t("Refresh model list")}
                  </button>
                  <button
                    className="btn"
                    onClick={() =>
                      confirm === "remove"
                        ? change("remove")
                        : setConfirm("remove")
                    }
                  >
                    {t(confirm === "remove" ? "Confirm removal" : "Remove key")}
                  </button>
                </div>
                <label className="field">
                  {t("Available models")}
                  <input
                    list="owner-models"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={t("Choose a model")}
                  />
                  <datalist id="owner-models">
                    {c.models.map((m) => (
                      <option key={m.id} value={m.id} />
                    ))}
                  </datalist>
                </label>
                <p>
                  {t(
                    "Testing sends a fictional example and can use API credit.",
                  )}
                </p>
                <button
                  className="btn primary"
                  disabled={
                    mode !== "enabled" || !c.models.some((m) => m.id === model)
                  }
                  onClick={() => change("activate")}
                >
                  {t("Test and use model")}
                </button>
                {state.active !== "manual" && (
                  <button className="btn" onClick={() => change("manual")}>
                    {t("Use manual review")}
                  </button>
                )}
              </>
            )}
          </fieldset>
        )
      )}
      {notice && <p role="status">{notice}</p>}
      {mode !== "off" && (
        <button className="btn" disabled={busy} onClick={load}>
          {t("Reload settings")}
        </button>
      )}
    </section>
  );
}
