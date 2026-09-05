// How you get paid — the fourteenth settings screen. Roadmap 2.20, stage 1.
//
// WHY THIS IS A SCREEN AND NOT PART OF BUSINESS INFO. Business info is how a
// customer REACHES you — phone, email, the address you work out of. This is
// how they PAY you, and it is the first half of the product's answer to the
// owner's own ask: *"at least I need a way for my customers to pay me."*
// Stages 2 and 3 put a processor behind that question; this one needs none,
// costs nobody a percentage, and is the only stage that can ship before there
// is a Stripe account in the world to attach it to.
//
// IT PASSES BUSINESS'S ADMISSION TEST WITHOUT ARGUMENT — *"a row belongs on
// Business only if it changes what a CUSTOMER meets"* — because every value
// typed here is printed in that customer's email and nowhere else.
//
// SIX FIELDS AND NO PREVIEW, WHICH IS THE ONE CALL WORTH DEFENDING. The
// obvious build is a live preview of the emailed list, and it would mean a
// second copy of `supabase/functions/_shared/payments.ts` inside `app/` — the
// exact second-implementation problem CLAUDE.md allows in exactly one place
// (`brandColor.js`, and only because a Deno bundle cannot import out of
// `supabase/`). The two facts a preview would have carried are carried by the
// placeholders and by one sentence instead: what shape each handle takes, and
// that a username becomes a tappable link while anything else stays text.
//
// NO PERMISSION KEY OF ITS OWN. `business_settings` writes ride `settings`,
// which is what every other screen on this tab already uses; a detailer who
// can change their prices can change where the money goes to.

import { useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { Switch } from "../../components/controls.jsx";

export default function Payments() {
  const { business, settings, reload } = useBusiness();
  const [pay, setPay] = useState({
    pay_cash: !!settings?.pay_cash,
    pay_venmo: settings?.pay_venmo || "",
    pay_cashapp: settings?.pay_cashapp || "",
    pay_paypal: settings?.pay_paypal || "",
    pay_zelle: settings?.pay_zelle || "",
    pay_other: settings?.pay_other || "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, text}

  const set = (k) => (e) => setPay({ ...pay, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    setMsg(null);
    // Trimmed to null rather than stored as "": an empty string is a value the
    // email layer would have to know to ignore, and the column is nullable
    // precisely so it does not have to.
    const nn = (v) => (String(v).trim() === "" ? null : String(v).trim().slice(0, 120));
    const { error } = await supabase.from("business_settings").update({
      pay_cash: pay.pay_cash,
      pay_venmo: nn(pay.pay_venmo),
      pay_cashapp: nn(pay.pay_cashapp),
      pay_paypal: nn(pay.pay_paypal),
      pay_zelle: nn(pay.pay_zelle),
      pay_other: nn(pay.pay_other),
    }).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) reload();
    setBusy(false);
  };

  return (
    <div className="card">
      {/* THE ONE FACT THE FIELDS CANNOT CARRY: which emails these land on. A
          detailer who fills this in and then checks a paid receipt would
          otherwise conclude it is broken. The copy rule (2026-09-01) bans a
          sentence that repeats a label; this repeats none of them. */}
      <p className="quiet" style={{ marginTop: 0 }}>
        These go on a customer's booking confirmation, their reminder, and any
        invoice still owed. Never on a receipt for money already paid.
      </p>

      <Switch
        label="Cash"
        help="You take cash on the day."
        checked={pay.pay_cash}
        onChange={(v) => setPay({ ...pay, pay_cash: v })}
      />

      <div className="section-title">Apps</div>
      {/* THE SENTENCE GOVERNS ALL THREE FIELDS, SO IT SITS ABOVE THEM. It was
          under PayPal on the first pass and read as a caption about PayPal —
          the @ and the $ it names belong to the two fields above that one.
          Same shape as `controls.jsx`'s `Group` blurb, which is the house
          pattern for exactly this. */}
      <p className="muted" style={{ margin: "0 0 var(--sp-3)" }}>
        Just the username — we add the @ or $ and make it a link they can tap.
        Anything else still shows, but they will have to type it in themselves.
      </p>
      {/* NOT PAIRED, AND THIS ONE WAS MEASURED. Two `.grid2` fields at 392
          leave 155px each, which holds `@andrews-detail` and clips anything
          longer into a horizontal scroll inside the box. Every other paired
          field in this product holds a value you can recognise half of; a
          payment handle is the one kind of value where reading half of it is
          the same as reading none, because the detailer is checking it
          character by character against another app. The row it saves is free
          on a page that already scrolls. Same finding as Reviews.jsx: a pair
          that does not survive 392 is not a pair. */}
      <label className="field"><span>Venmo</span>
        <input value={pay.pay_venmo} onChange={set("pay_venmo")}
          placeholder="your-handle" maxLength={120} /></label>
      <label className="field"><span>Cash App</span>
        <input value={pay.pay_cashapp} onChange={set("pay_cashapp")}
          placeholder="yourhandle" maxLength={120} /></label>
      <label className="field"><span>PayPal</span>
        <input value={pay.pay_paypal} onChange={set("pay_paypal")}
          placeholder="your-handle, or paste your PayPal.Me link" maxLength={120} /></label>

      <div className="section-title">Bank and anything else</div>
      {/* ZELLE IS NOT AN APP WITH A PAGE. It lives inside a bank's own app and
          is reached by phone number or email, so there is nothing to link to
          and the field asks for a different thing from the three above it.
          That is why it is under its own heading rather than in the pair. */}
      <label className="field"><span>Zelle</span>
        <input value={pay.pay_zelle} onChange={set("pay_zelle")}
          placeholder="The phone number or email your Zelle is on" maxLength={120} /></label>
      <label className="field"><span>Anything else</span>
        <input value={pay.pay_other} onChange={set("pay_other")}
          placeholder="e.g. Apple Pay, or a check" maxLength={120} /></label>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy} onClick={save}>{busy ? "Saving" : "Save"}</button>
    </div>
  );
}
