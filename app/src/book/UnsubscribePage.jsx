// ROADMAP 2.19 — "STOP GETTING EMAILS LIKE THIS". `/unsubscribe/:customerId`.
//
// THE ONE PAGE IN THIS PRODUCT THAT EXISTS BECAUSE OF A STATUTE. The re-book
// email is the only commercial message the platform sends, and CAN-SPAM
// classifies a message by its primary purpose rather than by what pressed
// send — so a detailer picking fourteen names by hand needs the same working
// opt-out an automated blast would. `send-campaign` is the half that honours
// it; this is the half a customer meets.
//
// IT IS TWO STEPS, AND THAT IS THE WHOLE REASON IT IS A PAGE. A link that
// unsubscribed on load would be pressed by things that are not people: Gmail
// prefetches, and corporate link scanners and antivirus proxies open every URL
// in an incoming message. Every one of those would quietly opt somebody out of
// a business they still want to hear from, and nobody would ever know. So the
// link only READS, and a human presses the button that writes.
//
// THE CUSTOMER'S OWN UUID IS THE CREDENTIAL — the fourth caller of the pattern
// `/booking/:id` started and `/plan/:memberId` continued. No account, no
// token, nothing to expire.
//
// ~~IT IS IN THE PLATFORM'S COLOURS, NOT THE DETAILER'S~~ — REVERSED BY ANDREW,
// 2026-09-12, and the reversal is the load-bearing part. The old reasoning is
// kept below because it is the argument somebody will make again.
//
// **THE ACCENT FOLLOWS WHOSE RELATIONSHIP IS ENDING.** A customer unsubscribing
// from a detailer's emails is ending something with THAT DETAILER, and the page
// belongs to them, so it wears their colour — the same colour the email that
// brought the customer here was painted in. A detailer unsubscribing from
// something of OURS gets platform green. There is no such page today, so only
// the customer arm is built; ROADMAP.md carries the other as the rule to
// follow rather than this file carrying a branch with one dead half.
//
// The colour is run through `brandVarsFor`, which is the same legibility
// correction the booking page uses — a detailer can pick something too faint to
// read on this ground, and the "Your color" screen already promises it will be
// adjusted just enough to stay legible. Correcting it in a second place, or not
// at all, is how that promise stops being true on one page.
//
// The argument it replaces, kept so it is not re-made: *this page is the
// customer stepping away from that business, and dressing it in their branding
// to do it would be the one moment in the product where the tenant's colour is
// used to make something harder.*

import { t } from "../lib/i18n.js";
import { useLocale } from "../hooks/useLocale.js";
import LanguagePicker from "./LanguagePicker.jsx";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { brandVarsFor } from "../lib/theme.js";
import "./booking.css";

export default function UnsubscribePage() {
  useLocale();
  const { customerId } = useParams();
  // "loading" | "ready" | "done" | "not_found"
  const [state, setState] = useState({ status: "loading", name: "", first: null, color: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // "No, keep them" changes nothing on the server on purpose — there is
  // nothing to undo. It says so and stops asking.
  const [kept, setKept] = useState(false);

  useEffect(() => {
    let live = true;
    api.unsubscribeLookup(customerId)
      .then((r) => live && setState({
        // ALREADY OFF LANDS ON "done", not on the button. Somebody arriving
        // from an older email must not be asked to make the same decision
        // twice and left wondering whether the first time counted.
        status: r.unsubscribed ? "done" : "ready",
        name: r.business_name,
        first: r.first_name,
        color: r.primary_color || null,
      }))
      .catch(() => live && setState({ status: "not_found", name: "", first: null, color: null }));
    return () => { live = false; };
  }, [customerId]);

  // Null until the lookup answers, and null for a detailer who never picked a
  // colour — brandVarsFor falls back to the house accent, which is byte for
  // byte what booking.css already declares, so the loading and expired screens
  // do not change at all.
  const brandVars = brandVarsFor(state.color);

  const stop = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await api.unsubscribeConfirm(customerId);
      setState((s) => ({ ...s, status: "done", name: r.business_name || s.name }));
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  if (state.status === "loading") {
    return <div className="bk" style={brandVars}><div className="bk-center"><div className="bk-spinner" /></div></div>;
  }

  if (state.status === "not_found") {
    return (
      <div className="bk" style={brandVars}>
        <div className="bk-center">
          <h1>{t("This link has expired")}</h1>
          <p className="bk-muted">
            {t("Reply to the email you got instead. It reaches the business directly.")}
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "done") {
    return (
      <div className="bk" style={brandVars}>
        <div className="bk-center">
          <h1>{t("Done")}</h1>
          {/* THE ONE THING SOMEBODY WOULD OTHERWISE GET WRONG. An opt-out here
              is about marketing, and a customer who read this as "I will no
              longer be told when my detailer is coming" would be badly served
              by their own choice. Transactional mail is exempt from opt-out
              for exactly this reason. */}
          <p className="bk-muted">
            {t("{business} won't email you about coming back again. If you book with them, you'll still get the confirmation and reminder for that booking.",
              { business: state.name })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bk" style={brandVars}>
      {/* **THE BUSINESS'S NAME AT THE TOP — an outside review, 2026-09-11.**
          Every other customer-facing page in this product says whose it is;
          this one was bare, and the browser tab read "Detailing Platform", a
          name the customer has never heard of. So the ONE page a customer only
          ever reaches by clicking a link in an email — the exact shape of a
          phishing attempt — was the only one that would not say who sent it.
          It also gives the language chips a header to live in: at 390px they
          were right-aligned on top of the heading with no gap, because there
          was no bar to hold them. */}
      <header className="bk-header">
        <div className="inner">
          <div>
            <h1>{state.name}</h1>
            <div className="tagline">{t("Email preferences")}</div>
          </div>
          <LanguagePicker />
        </div>
      </header>
      <div className="bk-center">
        {/* **THE GREETING IS INSIDE THE SENTENCE, NOT GLUED TO ITS FRONT.**
            English can prepend "Maria, this…"; Spanish wants the name
            somewhere the English never puts it, and a translation that cannot
            move a name is a translation that reads as a machine's. Two whole
            sentences, one with the name in it and one without. */}
        <p className="bk-muted">
          {state.first
            ? t("{name}, this stops {business} emailing you about coming back. Anything to do with a booking you make — the confirmation, the reminder, the receipt — still reaches you.",
              { name: state.first, business: state.name })
            : t("This stops {business} emailing you about coming back. Anything to do with a booking you make — the confirmation, the reminder, the receipt — still reaches you.",
              { business: state.name })}
        </p>
        {error && <div className="bk-error">{error}</div>}
        {/* **A SECOND BUTTON, BECAUSE MOST PEOPLE WHO SEE THIS PAGE GOT HERE
            BY ACCIDENT.** There was one control and it was the irreversible
            one: tap the footer link by mistake and the only thing you can do
            is confirm. "No, keep them" costs nothing and it is the answer most
            of them want.
            IT IS A LINK BACK TO THE BUSINESS where there is one to go to, so
            leaving is not a dead end either. */}
        <div className="bk-actions" style={{ marginTop: 24 }}>
          <button className="bk-btn primary" disabled={busy} onClick={stop}>
            {busy ? t("One moment…") : t("Yes, stop them")}
          </button>
          <button className="bk-btn" disabled={busy || kept} onClick={() => setKept(true)}>
            {t("No, keep them")}
          </button>
        </div>
        {kept && <p className="bk-muted" style={{ marginTop: 12 }}>{t("Nothing changed. You can close this page.")}</p>}
        {/* NO PHONE NUMBER AND NO LINK BACK TO THE BUSINESS, and it is not an
            oversight: `unsubscribe-lookup` returns the business NAME and the
            customer's first name and nothing else. Adding the slug and the
            phone is an edge-function change, which is lane C's — noted rather
            than half-built, because a link to `/book/undefined` would be worse
            than no link. */}
      </div>
    </div>
  );
}
