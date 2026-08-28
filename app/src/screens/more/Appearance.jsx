// Theme (light/dark, saved per user) and the brand color. The brand color
// is business_branding.primary_color — the same value the public booking
// page uses. It only ever colors accents, and lib/theme.js contrast-corrects
// it against the active theme, so no choice here can make the app unreadable.

import { useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { PRESET_COLORS, applyTheme, correctAccent, DEFAULT_ACCENT } from "../../lib/theme.js";

export default function Appearance() {
  const { business, branding, themeMode, setThemeMode, reload } = useBusiness();
  const [custom, setCustom] = useState(branding?.primary_color || DEFAULT_ACCENT.dark);
  const [msg, setMsg] = useState(null);

  const saveBrandColor = async (hex) => {
    setMsg(null);
    setCustom(hex);
    const { error } = await supabase.from("business_branding").upsert({
      business_id: business.id,
      primary_color: hex,
    });
    if (error) {
      setMsg({ ok: false, text: error.message });
      return;
    }
    applyTheme(themeMode, hex); // immediate feedback; reload syncs context
    setMsg({ ok: true, text: "Brand color saved. It applies to your booking page too." });
    reload();
  };

  const current = branding?.primary_color || null;

  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>Theme</div>
      <div className="row" style={{ gap: 8 }}>
        <button className={`chip ${themeMode === "dark" ? "active" : ""}`} onClick={() => setThemeMode("dark")}>Dark</button>
        <button className={`chip ${themeMode === "light" ? "active" : ""}`} onClick={() => setThemeMode("light")}>Light</button>
      </div>

      <div className="section-title">Brand color</div>
      <p className="muted" style={{ marginBottom: 10 }}>
        Used for buttons, links and highlights here and on your booking page.
        If a color is too faint for the current theme, it is adjusted
        automatically so everything stays readable.
      </p>
      <div className="swatch-row">
        {PRESET_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            className={`swatch ${current === c.hex ? "selected" : ""}`}
            style={{ background: correctAccent(c.hex, themeMode) }}
            title={c.name}
            aria-label={c.name}
            onClick={() => saveBrandColor(c.hex)}
          />
        ))}
      </div>
      <label className="field" style={{ marginTop: 12 }}>
        <span>Custom color</span>
        <div className="row" style={{ gap: 10 }}>
          <input type="color" value={custom} onChange={(e) => setCustom(e.target.value)} style={{ maxWidth: 90 }} />
          <button className="btn inline" onClick={() => saveBrandColor(custom)}>Use this color</button>
        </div>
      </label>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
    </div>
  );
}
