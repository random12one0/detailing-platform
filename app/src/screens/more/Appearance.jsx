// The brand colour — and, since roadmap 2.3, ONLY the brand colour.
//
// The Light/Dark chips are gone: the owner killed the light theme on
// 2026-08-30 and there is one ground now.
//
// THIS COLOUR PAINTS THIS DASHBOARD TOO — design system law 11, as the owner
// rewrote it on 2026-08-30: "we should have them be able to customize their
// admin dashboard accent color… almost anything goes with black." 2.3 shipped
// the opposite and this screen said so in plain words; both are now corrected.
//
// It flips what the screen has to carry honestly. Under the old law, picking
// a colour changed NOTHING on the screen you were looking at, so the copy had
// to say so and a preview had to show what it did change. Now picking a
// colour repaints the screen under your finger the moment it saves — the
// strongest possible confirmation — so the copy says that instead.
//
// THE PREVIEW STAYS, for a reason worth writing down before someone deletes
// it as redundant: what it shows is the pairing on the CUSTOMER's screen,
// which is the one that has to be right. It happens to match the dashboard
// today — both grounds are #0B0D0E and, since roadmap 2.4, both FILLS are
// corrected against #1E2327 — but the constants exist separately precisely
// so they can diverge again, and the preview is what would show it if they
// did.
//
// EVERY SWATCH ON THIS SCREEN IS PAINTED THROUGH `brandVarsFor`, not through
// `correctAccent` against the ground. Since 2.4 the booking fill is corrected
// against --bk-lit (rings land on panels), so correcting against the ground
// here would paint a colour the page never uses. One function, no drift.

import { useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { PRESET_COLORS, brandVarsFor, describeAccent, CUSTOMER_BG, HOUSE_ACCENT } from "../../lib/theme.js";

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
    setMsg({ ok: true, text: "Saved." });
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
          It marks the buttons and highlights on your booking page, on your
          website, and on this dashboard. If a colour is too faint to read,
          it is adjusted just enough to stay legible.
        </p>
      </div>

      <div className="swatch-row">
        {PRESET_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            className={`swatch ${current === c.hex ? "selected" : ""}`}
            /* brandVarsFor, not correctAccent against the ground: since 2.4 the
               booking FILL is corrected against --bk-lit because rings land on
               panels, so painting the swatch from the ground would show a
               colour the page never paints. One function, no drift. */
            style={{ background: brandVarsFor(c.hex)["--bk-accent"] }}
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

      {/* WHAT YOU PICKED, IN WORDS — roadmap 2.4 item 3b. This replaced a
          fixed paragraph that said a pale colour "may look slightly deeper
          than the one you chose", which was backwards: the ground is dark, so
          it is DARK colours that get lightened. A live sentence about the
          actual colour cannot go stale that way, and it is the only place a
          detailer whose brand is a deep navy finds out why their swatch came
          back brighter than their van. */}
      <p className="quiet">{describeAccent(current || custom)}</p>
    </div>
  );
}
