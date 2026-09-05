// ROADMAP 2.19 — THE COMPOSE-AND-SEND SURFACE, and it is the half of this
// item that did not already exist.
//
// The Clients screen has known who has lapsed since roadmap 2.11 step 6 stage
// 5, and `tests/client-list.test.mjs` is 31 checks on that arithmetic. What
// was missing was somewhere to write to them. So this component does not
// select anybody — it is handed a list that a human already narrowed with the
// chip and the search field, and its whole job is the words and the send.
//
// IT IS A <Sheet> AT EVERY WIDTH, WHICH IS THE RULE RATHER THAN A CHOICE.
// RecordHost's own header: *a form you commit is not a record.* New booking,
// finalize payment and add-an-expense are all sheets at a desk for the same
// reason, and this one leaves the building the moment it is pressed.
//
// THE SHAPE IS QuoteModal'S, DELIBERATELY: the fields, then the thing that
// cannot be recalled behind a confirm step that states the number. That
// pattern is already in the product twice (Finalize, Quote) and a third
// variation of "are you sure" would be a third thing to learn.
//
// WHO IS ACTUALLY ON THE LIST IS DECIDED ON THE SERVER. This screen counts the
// same three ways `send-campaign` does — has an address, has not opted out,
// under the cap — so the sentence above the button is true, but the counts
// here are a DISPLAY and the function is the gate. An opt-out honoured only by
// a browser is not honoured.

import { useState } from "react";
import { api } from "../lib/api.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import Sheet from "./Sheet.jsx";

// A STARTING DRAFT, NOT A TEMPLATE PICKER. The email research's finding is
// that this trade means WORDING when it says "premade templates" (five of six
// products do exactly this), and one good draft they edit costs nothing and
// answers the blank-page problem a gallery of choices only postpones.
// It does not open with a greeting: the email adds "Hello <first name>," of
// its own, which is the part a detailer writing to fourteen people cannot do.
const DRAFT_SUBJECT = "Time to get it looking right again?";
const DRAFT_MESSAGE = "It's been a few months since we last took care of your car. "
  + "If you'd like it back to how it looked when you drove it away, booking takes about a minute — "
  + "just use the button below and pick a time that suits you.";

export default function CampaignModal({ people, onClose, onSent }) {
  const { business } = useBusiness();
  const [subject, setSubject] = useState(DRAFT_SUBJECT);
  const [message, setMessage] = useState(DRAFT_MESSAGE);
  // WHO IS LEFT OUT, rather than who is in: everyone handed to this component
  // was already chosen once, on the screen behind it. Asking them to tick
  // fourteen boxes to confirm a list they just made would be the second
  // selection step this item exists to avoid.
  const [dropped, setDropped] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  // NOBODY IS QUIETLY DROPPED. Most customers in this trade are a name and a
  // phone number, so "sent to 14" when four had no address is a detailer
  // believing they got in touch when they did not.
  // A THIRD WAY TO BE UNREACHABLE ARRIVED IN ROADMAP 2.20: the provider has
  // already refused this address. Sending to it again spends the platform's
  // shared reputation on mail nobody will read, which is the risk the whole
  // 50-per-press cap exists to protect — so it is dropped, and, by the rule
  // this block is built on, it is dropped OUT LOUD.
  const has = (p) => (p.email || "").trim();
  const reachable = people.filter((p) => has(p) && !p.unsubscribed_at && !p.email_failed_at);
  const noEmail = people.length - people.filter(has).length;
  const optedOut = people.filter((p) => has(p) && p.unsubscribed_at).length;
  const bounced = people.filter((p) => has(p) && !p.unsubscribed_at && p.email_failed_at).length;
  const chosen = reachable.filter((p) => !dropped.has(p.id));
  const address = (business.mailing_address || "").trim();

  const toggle = (id) => setDropped((d) => {
    const next = new Set(d);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await api.sendCampaign(business.id, chosen.map((p) => p.id), subject.trim(), message.trim());
      setResult(r);
      onSent?.();
    } catch (e) {
      setError(e.message);
      setConfirming(false);
    }
    setBusy(false);
  };

  // AFTERWARDS, THE COUNTS. A send is the one thing on this screen that cannot
  // be taken back, so it says what actually happened rather than closing and
  // leaving the detailer to assume.
  if (result) {
    return (
      <Sheet onClose={onClose} title="Sent"
        subtitle={`${result.sent} ${result.sent === 1 ? "person" : "people"} will get it`}>
        {result.failed > 0 && (
          <div className="error-box">
            {result.failed} did not go out. Try those again in a few minutes.
          </div>
        )}
        {result.capped > 0 && (
          <p className="body">
            {result.capped} more were left out — {result.cap} is the most that can go at once.
            Send the rest tomorrow.
          </p>
        )}
        <p className="quiet">
          Replies come to your own inbox, not to us.
        </p>
        <button className="btn primary" onClick={onClose}>Done</button>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} title="Email your customers"
      subtitle={`${chosen.length} ${chosen.length === 1 ? "person" : "people"}`}>

      {/* THE LAW'S REQUIREMENT, STATED WHERE IT CAN BE ACTED ON. The server
          refuses this send without a postal address; finding that out after
          typing the message would be the worst possible moment to learn it. */}
      {!address && (
        <div className="error-box">
          Add your mailing address under Business info first. An email like this has to
          carry one at the bottom — that is the law, not our rule.
        </div>
      )}

      <label className="field"><span>Subject</span>
        <input value={subject} maxLength={120} autoFocus
          onChange={(e) => { setSubject(e.target.value); setConfirming(false); }} /></label>

      <label className="field"><span>What you want to say</span>
        <textarea value={message} rows={6} maxLength={2000}
          onChange={(e) => { setMessage(e.target.value); setConfirming(false); }} /></label>

      {/* THE ONE THING THE CONTROLS DO NOT ALREADY SAY. A detailer typing a
          paragraph into a box cannot see that their name, their colour and a
          way to book get wrapped around it — and the unsubscribe line is not
          optional, so saying it here stops it arriving as a surprise. */}
      <p className="muted" style={{ marginBottom: 8 }}>
        Their name, your logo, a <strong>Book again</strong> button and a way to stop
        getting these are added for you.
      </p>

      {reachable.length > 0 && (
        <div className="tight">
          <span className="label">Going to</span>
          {/* Press a name to leave that person out. The chip is the same
              control the Clients screen filters with, in its second job. */}
          <div className="clientfilters">
            {reachable.map((p) => (
              <button key={p.id} className={`chip${dropped.has(p.id) ? "" : " active"}`}
                aria-pressed={!dropped.has(p.id)} onClick={() => toggle(p.id)}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {(noEmail > 0 || optedOut > 0 || bounced > 0) && (
        <p className="quiet">
          {[
            noEmail > 0 ? `${noEmail} of them ${noEmail === 1 ? "has" : "have"} no email address` : null,
            optedOut > 0 ? `${optedOut} asked not to get these` : null,
            // NOT "asked not to" — nobody asked. Said as something to fix,
            // because it usually is a typo and the detailer can correct it.
            bounced > 0 ? `${bounced} ${bounced === 1 ? "address" : "addresses"} bounced last time` : null,
          ].filter(Boolean).join(" · ")}
          {noEmail > 0 || bounced > 0 ? " — text those ones instead." : "."}
        </p>
      )}

      {error && <div className="error-box">{error}</div>}

      {confirming ? (
        <div className="confirm-box">
          <p>
            Send this to <strong>{chosen.length} {chosen.length === 1 ? "person" : "people"}</strong>?
            It cannot be taken back.
          </p>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn ghost inline" disabled={busy} onClick={() => setConfirming(false)}>
              Go back
            </button>
            <button className="btn primary inline" disabled={busy} onClick={send}>
              {busy ? "Sending…" : "Yes, send it"}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn primary"
          disabled={!address || chosen.length === 0 || !subject.trim() || !message.trim()}
          onClick={() => setConfirming(true)}>
          Send to {chosen.length}
        </button>
      )}
    </Sheet>
  );
}
