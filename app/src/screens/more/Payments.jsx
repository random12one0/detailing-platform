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
//
// ---------------------------------------------------------------------------
// STAGE 3 PUT CARD PAYMENTS AT THE TOP OF IT, AND THE ONE BLOCK IS OWNER-ONLY
// WHILE THE SIX FIELDS BELOW IT ARE NOT.
// ---------------------------------------------------------------------------
// That looks inconsistent on one screen and it is the honest shape: a handle
// is a line of text in an email, and connecting a Stripe account decides
// which BANK ACCOUNT a customer's money lands in. `connect-account` refuses
// anybody but the owner and answers 404 rather than 403 — hiding the block
// here is a courtesy so staff are not shown a control that will not work.
//
// THREE SWITCHES HAVE TO BE ON AND ONLY ONE OF THEM IS OURS. Stripe has to
// say the account can take charges, the detailer has to say they want card,
// and the platform has to have a Connect client id at all. `cardStatus` in
// `supabase/functions/_shared/connect.ts` is the one place that resolves the
// three into a state, and it is the SERVER that draws the conclusion — this
// screen prints the answer it was given and works none of it out. The public
// pay endpoint asks the same function again at the moment a customer presses,
// because a link in an inbox outlives every switch on this screen.
//
// AND CONNECTING IS NOT SWITCHING ON. Card costs the detailer 2.9% + 30c,
// which is exactly why they hold up a Venmo code today; an account that
// connected and immediately started charging them a fee on every job would
// be a cost they did not agree to. The switch is theirs and starts off.

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { api } from "../../lib/api.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { Switch } from "../../components/controls.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

export default function Payments() {
  useAppLocale();
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

  // --- CARD PAYMENTS (stage 3) -------------------------------------------
  // `card` is whatever `connect-account` last said, and NOTHING here works
  // any of it out. A screen that decided "ready" for itself would be a second
  // implementation of `cardStatus`, and the two would disagree the first time
  // Stripe turned an account off.
  const [card, setCard] = useState(null);       // null while the answer is out
  const [cardBusy, setCardBusy] = useState(""); // which button is working
  const [cardMsg, setCardMsg] = useState(null); // {ok, text}

  // WHAT COMES BACK FROM STRIPE'S CONSENT SCREEN. `/settings/payments/connected`
  // is the address registered with Stripe (`connect.ts`, the return path) and
  // `main.jsx` forwards it here with the `code` and the `state` still attached.
  // Read ONCE, at mount, and then wiped out of the address bar: the code is
  // single-use, and a refresh that retried it would show a detailer an error
  // about a connection that had in fact just worked.
  const [returned] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    const code = q.get("code"), state = q.get("state");
    if (code && state) {
      q.delete("code"); q.delete("state"); q.delete("error"); q.delete("error_description");
      const rest = q.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? "?" + rest : ""));
    }
    return code && state ? { code, state } : null;
  });

  const loadCard = useCallback(async () => {
    try {
      setCard(await api.connect(business.id, "status"));
    } catch (_) {
      // A 404 here is a STAFF member, which is the ordinary case and not a
      // fault: the block simply does not draw for them.
      setCard({ unavailable: true });
    }
  }, [business.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (returned) {
        setCardBusy("finish");
        try {
          const r = await api.connect(business.id, "finish", returned);
          if (!cancelled) {
            setCard(r);
            setCardMsg({ ok: true, text: t("Stripe is connected.") });
          }
        } catch (_) {
          if (!cancelled) {
            setCardMsg({ ok: false, text: t("Stripe did not finish connecting. Try again.") });
            await loadCard();
          }
        }
        if (!cancelled) setCardBusy("");
        return;
      }
      await loadCard();
    })();
    return () => { cancelled = true; };
  }, [returned, business.id, loadCard]);

  // LEAVING FOR STRIPE. `start` writes a single-use state against this
  // business before it hands back a url, so the callback can be recognised as
  // ours; the browser then goes to `connect.stripe.com`, not to a page here.
  const connect = async () => {
    setCardBusy("start");
    setCardMsg(null);
    try {
      const r = await api.connect(business.id, "start");
      window.location.href = r.url;
      return;                                  // no state to unwind - we leave
    } catch (_) {
      setCardMsg({ ok: false, text: t("Could not reach Stripe. Try again in a minute.") });
    }
    setCardBusy("");
  };

  // ONE HANDLER FOR THE THREE THAT COME BACK WITH A STATUS. `refresh`,
  // `toggle` and `disconnect` all answer with the same object the screen is
  // already drawing, so there is nothing to reconcile - the answer replaces
  // what was there.
  const cardAction = async (action, extra, failure) => {
    setCardBusy(action);
    setCardMsg(null);
    try {
      setCard(await api.connect(business.id, action, extra));
    } catch (_) {
      setCardMsg({ ok: false, text: failure });
    }
    setCardBusy("");
  };

  const disconnect = async () => {
    // ONE PRESS BEHIND ONE CONFIRM, naming what stops. Disconnecting also
    // switches card off, so a customer holding a receipt loses a button they
    // may already have been looking at.
    if (!confirm(t("Disconnect Stripe? Your customers will not be able to pay by card, and any receipt they are holding loses its Pay button."))) return;
    await cardAction("disconnect", {}, t("Could not disconnect. Try again."));
  };

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

  // The block draws for the OWNER only. `card` is null while the answer is
  // out and `{unavailable: true}` when the endpoint said no - which is what a
  // staff member gets, so both of those draw nothing rather than an error.
  const showCard = card && !card.unavailable;

  return (
    <>
      {showCard && (
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>{t("Card payments")}</div>
          {/* THE FACT NO CONTROL BELOW CARRIES: where the money goes and who
              pays the fee. A detailer weighing this against the Venmo code
              they hold up today is deciding about 2.9% + 30c, and it is not a
              number this product should make them go and look up. */}
          <p className="quiet" style={{ marginTop: 0 }}>
            {t("Your customers pay by card from their booking page, and the money goes straight to your own Stripe account — we never hold it. Stripe takes 2.9% + 30¢ of each payment.")}
          </p>

          {!card.available ? (
            /* THE PLATFORM'S OWN SWITCH IS OFF. Saying so is the alternative
               to a button that answers 503 - the detailer has done nothing
               wrong and there is nothing here for them to fix. */
            <p className="body">{t("Card payments are not switched on yet. Nothing for you to do — we will tell you when they are.")}</p>
          ) : !card.connected ? (
            <>
              <p className="body">{t("You will need a Stripe account. If you do not have one, Stripe makes it during this.")}</p>
              <div className="btnrow">
                <button className="btn primary" disabled={cardBusy === "start"} onClick={connect}>
                  {cardBusy === "start" ? t("Opening Stripe") : t("Connect Stripe")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="row-item" style={{ cursor: "default" }}>
                <span className="txt">
                  <span className="nm">{t("Stripe account {last4}", { last4: card.accountHint })}</span>
                  {/* THE SERVER'S OWN SENTENCE, not one worked out here.
                      `cardStatus` orders its four states so that somebody who
                      switched card off is told that first, rather than being
                      told something that reads as a fault. */}
                  <span className="sub">{t(card.detail)}</span>
                </span>
                {card.chargesEnabled
                  ? <span className="pill completed" aria-label={t("Ready")}><Check size={14} strokeWidth={2.5} /></span>
                  : (
                    <button className="btn sm inline ghost" disabled={cardBusy === "refresh"}
                      onClick={() => cardAction("refresh", {}, t("Could not reach Stripe. Try again in a minute."))}>
                      {cardBusy === "refresh" ? t("Checking") : t("Check again")}
                    </button>
                  )}
              </div>

              {/* THE DETAILER'S OWN SWITCH, and it cannot be turned on before
                  Stripe says the account can take a charge - the server
                  refuses that with a 409, and the control is disabled so
                  nobody meets the refusal. */}
              <Switch
                label={t("Take card payments")}
                help={card.chargesEnabled
                  ? t("A Pay button goes on your customers' booking pages and on any invoice still owed.")
                  : t("Available once Stripe has finished checking your account.")}
                checked={card.cardPaymentsEnabled}
                disabled={!card.chargesEnabled || cardBusy === "toggle"}
                onChange={(v) => cardAction("toggle", { enabled: v }, t("Could not save that. Try again."))}
              />

              <div className="btnrow">
                <button className="btn ghost" disabled={cardBusy === "disconnect"} onClick={disconnect}>
                  {cardBusy === "disconnect" ? t("Disconnecting") : t("Disconnect Stripe")}
                </button>
              </div>
            </>
          )}

          {cardMsg && <div className={cardMsg.ok ? "ok-box" : "error-box"}>{cardMsg.text}</div>}
        </div>
      )}

    <div className="card">
      {/* WHAT THIS SECOND CARD IS FOR, now that there are two. Card is a
          button a customer presses; these are handles a customer reads and
          types into another app themselves. */}
      {showCard && <div className="section-title" style={{ marginTop: 0 }}>{t("Other ways to pay you")}</div>}
      {/* THE ONE FACT THE FIELDS CANNOT CARRY: which emails these land on. A
          detailer who fills this in and then checks a paid receipt would
          otherwise conclude it is broken. The copy rule (2026-09-01) bans a
          sentence that repeats a label; this repeats none of them. */}
      <p className="quiet" style={{ marginTop: 0 }}>
        {t("These go on a customer's booking confirmation, their reminder, and any invoice still owed. Never on a receipt for money already paid.")}
      </p>

      <Switch
        label={t("Cash")}
        help={t("You take cash on the day.")}
        checked={pay.pay_cash}
        onChange={(v) => setPay({ ...pay, pay_cash: v })}
      />

      <div className="section-title">{t("Apps")}</div>
      {/* THE SENTENCE GOVERNS ALL THREE FIELDS, SO IT SITS ABOVE THEM. It was
          under PayPal on the first pass and read as a caption about PayPal —
          the @ and the $ it names belong to the two fields above that one.
          Same shape as `controls.jsx`'s `Group` blurb, which is the house
          pattern for exactly this. */}
      <p className="muted" style={{ margin: "0 0 var(--sp-3)" }}>
        {t("Just the username — we add the @ or $ and make it a link they can tap. Anything else still shows, but they will have to type it in themselves.")}
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
      <label className="field"><span>{"Venmo"}</span>
        <input value={pay.pay_venmo} onChange={set("pay_venmo")}
          placeholder="your-handle" maxLength={120} /></label>
      <label className="field"><span>{"Cash App"}</span>
        <input value={pay.pay_cashapp} onChange={set("pay_cashapp")}
          placeholder={t("yourhandle")} maxLength={120} /></label>
      <label className="field"><span>{"PayPal"}</span>
        <input value={pay.pay_paypal} onChange={set("pay_paypal")}
          placeholder={t("your-handle, or paste your PayPal.Me link")} maxLength={120} /></label>

      <div className="section-title">{t("Bank and anything else")}</div>
      {/* ZELLE IS NOT AN APP WITH A PAGE. It lives inside a bank's own app and
          is reached by phone number or email, so there is nothing to link to
          and the field asks for a different thing from the three above it.
          That is why it is under its own heading rather than in the pair. */}
      <label className="field"><span>{"Zelle"}</span>
        <input value={pay.pay_zelle} onChange={set("pay_zelle")}
          placeholder={t("The phone number or email your Zelle is on")} maxLength={120} /></label>
      <label className="field"><span>{t("Anything else")}</span>
        <input value={pay.pay_other} onChange={set("pay_other")}
          placeholder={t("e.g. Apple Pay, or a check")} maxLength={120} /></label>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy} onClick={save}>{busy ? "Saving" : "Save"}</button>
    </div>
    </>
  );
}
