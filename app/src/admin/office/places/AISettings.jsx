import { useEffect, useRef, useState } from "react";
import { call } from "../api.js";
import { keyHint, providerNames } from "./modelProvider.js";
const request = (body) => call({ ...body, action: "shop_ai_settings" });
const terms = {
  gemini: "https://ai.google.dev/gemini-api/terms",
  openai: "https://openai.com/policies/services-agreement/",
  anthropic: "https://www.anthropic.com/legal/commercial-terms",
};
const errors = {
  conflict:
    "Another administrator changed these settings. Reload them before trying again.",
  key_rejected: "The provider rejected this key. Check its permissions.",
  rate_limited: "Too many changes. Try again in a minute.",
  provider_limit: "The provider reached its usage limit.",
  provider_unavailable: "The provider is unavailable. Try again later.",
  unsupported: "Choose a model from the current list.",
};
export default function AISettings() {
  const [data, setData] = useState(null),
    [provider, choose] = useState("gemini"),
    [model, setModel] = useState(""),
    [editor, setEditor] = useState(false),
    [filled, setFilled] = useState(false),
    [removing, setRemoving] = useState(false),
    [status, note] = useState(""),
    [busy, setBusy] = useState(false);
  const input = useRef(null),
    locked = useRef(false);
  const select = (id, state = data) => {
    choose(id);
    setModel(state?.providers?.[id]?.model ?? "");
    setRemoving(false);
  };
  function closeEditor() {
    if (input.current) input.current.value = "";
    setEditor(false);
    setFilled(false);
  }
  async function load() {
    try {
      closeEditor();
      const state = await request({ op: "read" });
      setData(state);
      select(state.preferredProvider || "gemini", state);
      note("");
    } catch {
      setData(null);
      note("Could not load AI settings.");
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function change(op) {
    if (locked.current || !data) return;
    locked.current = true;
    setBusy(true);
    note("");
    try {
      const b = {
        op,
        provider,
        requestId: crypto.randomUUID(),
        revision: data.revision,
      };
      if (op === "save") {
        b.key = input.current.value.trim();
        b.confirmed = true;
        closeEditor();
      }
      if (op === "prefer") b.model = model;
      const state = await request(b);
      setData(state);
      select(provider, state);
      note(
        {
          save: "Key saved. Model list loaded.",
          remove: "Key removed.",
          refresh: "Model list refreshed.",
          prefer: "Model preference saved.",
        }[op],
      );
    } catch (e) {
      note(
        errors[e.message] ??
          "Could not save this change. Reload settings and try again.",
      );
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }
  if (!data)
    return (
      <section className="bo-sec">
        <p role="status">{status || "Loading AI settings."}</p>
        {status && (
          <button className="bo-btn" onClick={load}>
            Reload settings
          </button>
        )}
      </section>
    );
  const c = data.providers?.[provider];
  return (
    <div className="bo-ai">
      <section className="bo-sec">
        <div className="bo-label">Shop onboarding</div>
        <h2>Manual review</h2>
        <p className="bo-dim">
          Detailers can fill out and save their setup. Their answers stay in the
          draft.
        </p>
      </section>
      {data.mode === "off" ? (
        <p className="bo-dim">Provider connections are off.</p>
      ) : (
        <fieldset className="bo-ai-fields" disabled={busy}>
          <legend>Provider connection</legend>
          <p>
            Connecting a key sends it to the selected provider to list available
            models. The server stores the key encrypted. Model tests and shop
            suggestions are off.
          </p>
          <p>Review the provider terms before connecting a key.</p>
          <div className="bo-ai-actions">
            {Object.entries(terms).map(([id, url]) => (
              <a key={id} href={url} target="_blank" rel="noreferrer">
                {providerNames[id]} terms
              </a>
            ))}
          </div>
          <div className="bo-ai-choices" role="group" aria-label="AI provider">
            {Object.entries(providerNames).map(([id, name]) => (
              <button
                type="button"
                key={id}
                aria-pressed={provider === id}
                onClick={() => select(id)}
              >
                {name}
              </button>
            ))}
          </div>
          {c.hasKey && <p>A key is saved for {providerNames[provider]}.</p>}
          {editor ? (
            <div className="bo-ai-key">
              <label>
                Provider API key
                <input
                  type="password"
                  ref={input}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={2048}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    setFilled(raw.length >= 8);
                    const hint = keyHint(raw);
                    if (hint) select(hint);
                  }}
                />
              </label>
              <button
                className="bo-btn go"
                disabled={!filled}
                onClick={() => change("save")}
              >
                {c.hasKey ? "Replace" : "Connect"} {providerNames[provider]} key
                and load models
              </button>
              <button className="bo-btn ghost" onClick={closeEditor}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="bo-btn"
              onClick={() => {
                note("");
                setEditor(true);
              }}
            >
              {" "}
              {c.hasKey ? "Replace key" : "Add API key"}
            </button>
          )}
          {c.hasKey && !editor && (
            <section className="bo-sec">
              <div className="bo-ai-head">
                <h2>Preferred model</h2>
                <button
                  className="bo-btn ghost"
                  onClick={() => change("refresh")}
                >
                  Refresh model list
                </button>
              </div>
              <label className="bo-ai-model">
                Available models
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="">Choose a model</option>
                  {c.models.map((m) => (
                    <option key={m.id}>{m.id}</option>
                  ))}
                </select>
              </label>
              <p className="bo-dim">
                These models are listed by the provider. Saving a preference
                does not test the model or send any shop answers.
              </p>
              <button
                className="bo-btn go"
                disabled={!c.models.some((m) => m.id === model)}
                onClick={() => change("prefer")}
              >
                Save model preference
              </button>
              <button
                className="bo-btn ghost"
                onClick={() =>
                  removing ? change("remove") : setRemoving(true)
                }
              >
                {removing ? "Confirm removal" : "Remove key"}
              </button>
              {removing && (
                <button
                  className="bo-btn ghost"
                  onClick={() => setRemoving(false)}
                >
                  Cancel
                </button>
              )}
            </section>
          )}
        </fieldset>
      )}
      {status && (
        <div role="status" className="bo-ai-status">
          {status}
          <button className="bo-btn ghost" disabled={busy} onClick={load}>
            Reload settings
          </button>
        </div>
      )}
    </div>
  );
}
