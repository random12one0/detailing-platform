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
// IT IS IN THE PLATFORM'S COLOURS, NOT THE DETAILER'S, and deliberately: this
// page is the customer stepping away from that business, and dressing it in
// their branding to do it would be the one moment in the product where the
// tenant's colour is used to make something harder.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import "./booking.css";

export default function UnsubscribePage() {
  const { customerId } = useParams();
  // "loading" | "ready" | "done" | "not_found"
  const [state, setState] = useState({ status: "loading", name: "", first: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      }))
      .catch(() => live && setState({ status: "not_found", name: "", first: null }));
    return () => { live = false; };
  }, [customerId]);

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
    return <div className="bk"><div className="bk-center"><div className="bk-spinner" /></div></div>;
  }

  if (state.status === "not_found") {
    return (
      <div className="bk">
        <div className="bk-center">
          <h1>This link has expired</h1>
          <p className="bk-muted">
            Reply to the email you got instead — it reaches the business directly.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "done") {
    return (
      <div className="bk">
        <div className="bk-center">
          <h1>Done</h1>
          {/* THE ONE THING SOMEBODY WOULD OTHERWISE GET WRONG. An opt-out here
              is about marketing, and a customer who read this as "I will no
              longer be told when my detailer is coming" would be badly served
              by their own choice. Transactional mail is exempt from opt-out
              for exactly this reason. */}
          <p className="bk-muted">
            {state.name} won't email you about coming back again. If you book with
            them, you'll still get the confirmation and reminder for that booking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bk">
      <div className="bk-center">
        <h1>Stop these emails?</h1>
        <p className="bk-muted">
          {state.first ? `${state.first}, this ` : "This "}
          stops {state.name} emailing you about coming back. Anything to do with a
          booking you make — the confirmation, the reminder, the receipt — still
          reaches you.
        </p>
        {error && <div className="bk-error">{error}</div>}
        <div className="bk-actions" style={{ marginTop: 24 }}>
          <button className="bk-btn primary" disabled={busy} onClick={stop}>
            {busy ? "One moment…" : "Yes, stop them"}
          </button>
        </div>
      </div>
    </div>
  );
}
