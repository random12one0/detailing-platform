// The last line of defence.
//
// A render error in React unmounts the whole tree. With nothing catching
// it, the user gets a blank white page — no message, no way back. That
// happened for real during an end-to-end run: a timezone label assumed
// "Region/City", threw on a browser reporting a bare "UTC", and took the
// entire signup screen down at the exact moment someone was signing up.
//
// So: catch it, say plainly that something broke, and offer the two things
// that actually get a person moving again — try again (re-render, which is
// enough for a transient error) and reload. The technical detail is
// present but folded away, because the person reading this is a detailer
// with wet hands, not an engineer — while the console still gets the full
// error and stack for whoever is debugging.

import { Component } from "react";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";

// ROADMAP 8.17 STAGE 2B — THIS IS THE ONE TRANSLATED THING WITH NO
// `useAppLocale()`, AND IT IS A CLASS, WHICH IS WHY.
//
// A class component cannot call a hook, so this never re-renders when the
// language changes — and it does not need to. `t()` runs at render, so the
// crash screen is drawn in whatever language was chosen; and there is no
// language switch ON a crash screen, so nothing can change under it.
//
// It stays a class because `componentDidCatch` has no hook equivalent.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the real thing where a developer will look for it.
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="center" style={{ minHeight: "100dvh", padding: 16 }}>
        <div className="card" style={{ width: "100%", maxWidth: 420 }}>
          <h1 style={{ marginBottom: 4 }}>{t("That didn't load")}</h1>
          <p className="quiet" style={{ marginBottom: 16 }}>
            {t("Something on this screen broke. Nothing you were doing was lost — your bookings and settings are safe.")}
          </p>

          <button className="btn primary" onClick={() => this.setState({ error: null })}>
            {t("Try again")}
          </button>
          <button
            className="btn ghost"
            style={{ marginTop: 10 }}
            onClick={() => window.location.assign("/app")}
          >
            {t("Back to the dashboard")}
          </button>

          <details style={{ marginTop: 16 }}>
            <summary className="quiet" style={{ cursor: "pointer" }}>
              {t("Technical detail")}
            </summary>
            <pre
              style={{
                marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word",
                fontSize: 12, color: "var(--text-muted)",
              }}
            >
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
