// The brand colour — and, since roadmap 2.3, ONLY the brand colour.
//
// The Light/Dark chips are gone: the owner killed the light theme on
// 2026-08-30 and there is one ground now.
//
// The larger change is that this colour NO LONGER TOUCHES THIS DASHBOARD.
// Design system law 11: "The house accent is fixed; the tenant's accent is
// customer-facing only." That is the owner's own reasoning — a detailer
// "probably doesn't really care about the admin dashboard colour scheme"
// (docs/design-brief.md §B6b) — so the colour is spent where their customers
// see it. That has one consequence this screen has to carry honestly:
// picking a colour changes nothing on the screen you are looking at. If it
// did not say so, and show what it DOES change, it would read as broken.
// Hence the preview.

import { useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { PRESET_COLORS, correctAccent, brandVarsFor, CUSTOMER_BG, HOUSE_ACCENT } from "../../lib/theme.js";

export default function Appearance() {
  const { business, branding, reload } = useBusiness();
  const [custom, setCustom] = useState(branding?.primary_color || HOUSE_ACCENT);
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
    setMsg({ ok: true, text: "Saved. Your booking page uses it straight away." });
    reload();
  };

  const current = branding?.primary_color || null;
  // Exactly what the customer will see — the same function the booking page
  // itself calls, so the preview cannot drift from the page. It returns the
  // fill, the ink measured against that fill, and the accent-as-words value.
  const v = brandVarsFor(current || custom);

  return (
    <div className="group">
      {/* No "YOUR COLOUR" label here: the sheet's own title already says it,
          and a heading repeated twelve pixels below itself is noise. */}
      <div className="tight">
        <p className="quiet">
          It marks the buttons and highlights on your booking page, and on
          your website. If a colour is too faint to read against that page,
          it is adjusted just enough to stay legible.
        </p>
      </div>

      <div className="swatch-row">
        {PRESET_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            className={`swatch ${current === c.hex ? "selected" : ""}`}
            style={{ background: correctAccent(c.hex, CUSTOMER_BG) }}
            title={c.name}
            aria-label={c.name}
            onClick={() => saveBrandColor(c.hex)}
          />
        ))}
      </div>

      {/* Not decoration: this is the only place on the screen where the
          choice has a visible effect, so it is what makes the choice
          make sense. Drawn on the booking page's own ground. */}
      <div className="tight">
        <span className="label">On your booking page</span>
        <div className="sunken" style={{ background: CUSTOMER_BG }}>
          <div className="row between" style={{ gap: 12 }}>
            <span className="num" style={{ color: v["--bk-accent-text"], fontSize: "var(--t-strong)" }}>
              $180.00
            </span>
            <span
              className="btn inline sm"
              style={{
                background: v["--bk-accent"], borderColor: v["--bk-accent"],
                color: v["--bk-accent-ink"], fontWeight: 700, pointerEvents: "none",
              }}
            >
              Book it
            </span>
          </div>
        </div>
      </div>

      <label className="field">
        <span>Any other colour</span>
        <div className="row" style={{ gap: 10 }}>
          <input type="color" value={custom} onChange={(e) => setCustom(e.target.value)} style={{ maxWidth: 90 }} />
          <button className="btn inline" onClick={() => saveBrandColor(custom)}>Use this colour</button>
        </div>
      </label>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}

      <p className="quiet">
        The dashboard itself keeps its own colours, on purpose — so what you
        pick here is judged against your customers' screen, not this one.
      </p>
    </div>
  );
}
