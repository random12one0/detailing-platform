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
import { Check, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { api } from "../../lib/api.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { Switch } from "../../components/controls.jsx";
import Sheet from "../../components/Sheet.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

// EVERY WAY TO BE PAID THAT NEEDS A HANDLE, in the order a detailer is most
// likely to use them. The `help` under each is what the switch cannot say on
// its own — and never a restatement of the name, which is the copy rule.
//
// ZELLE IS LAST AND ASKS FOR SOMETHING DIFFERENT: it is not an app with a page
// of its own, it lives inside a bank's app and is reached by phone number or
// email, so there is nothing to link to.
const HANDLES = [
  { key: "pay_venmo", name: "Venmo",
    help: "Just the username — we add the @ and make it a link they can tap.",
    placeholder: "your-handle" },
  { key: "pay_cashapp", name: "Cash App",
    help: "Just the tag — we add the $ and make it a link.",
    placeholder: "yourhandle" },
  { key: "pay_paypal", name: "PayPal",
    help: "Your username, or paste your PayPal.Me link.",
    placeholder: "your-handle, or a PayPal.Me link" },
  { key: "pay_zelle", name: "Zelle",
    help: "Zelle lives in your bank's app, so this is the phone number or email it is on.",
    placeholder: "The phone number or email your Zelle is on" },
];

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
  // **HIS OWN WAYS TO BE PAID, AS MANY AS HE NEEDS — his review, 2026-09-11.**
  // *"The something else shouldn't be a switch, it's you actually adding a new
  // one — and when you add it it looks like the others, with a title and then
  // their link or username."*
  //
  // THE OLD SINGLE `pay_other` LINE BECOMES THE FIRST ROW OF THE LIST, and is
  // cleared on the next save. A detailer who wrote "Apple Pay" into the old box
  // sees it here as a proper row rather than losing it, and nothing has to
  // migrate in SQL — the screen that owns the field does it the first time
  // anybody opens it. `_shared/payments.ts` still reads the old column for
  // every business that never does.
  const [custom, setCustom] = useState(() => {
    const list = Array.isArray(settings?.pay_custom) ? settings.pay_custom : [];
    const rows = list
      .map((r) => ({ label: String(r?.label ?? ""), handle: String(r?.handle ?? ""), off: r?.off === true }))
      .filter((r) => r.label || r.handle);
    const legacy = String(settings?.pay_other ?? "").trim();
    return legacy && !rows.length ? [{ label: t("Something else"), handle: legacy }] : rows;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, text}
  // THE SHEET, AND THE HALF-WRITTEN ROW THAT ONLY EXISTS INSIDE IT. Nothing
  // reaches the list until both halves are filled in, which is what makes a
  // saved method look like one the product shipped with rather than a form
  // somebody abandoned.
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ label: "", handle: "" });
  // WHAT WAS TYPED BEFORE A SWITCH WAS TURNED OFF. Turning a method off has to
  // clear the handle — an old Venmo name left in the row would go on the next
  // customer's email — but losing it on a mis-tap means opening another app to
  // look it up. Kept for as long as the screen is open, and never saved.
  const [drafts, setDrafts] = useState({});
  // WHICH FIELD IS OPEN WITH NOTHING IN IT YET. A method is "on" when it has a
  // handle, so the instant between switching on and typing the first character
  // has no other record of itself.
  const [openFor, setOpen] = useState({});

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
      // **THE OLD SINGLE LINE IS CLEARED THE MOMENT THE LIST TAKES OVER.**
      // Leaving it would print the same method twice on a customer's email —
      // once from the column and once from the array — which is the
      // two-places problem arriving where a customer can see it.
      pay_other: custom.length ? null : nn(pay.pay_other),
      // A ROW NEEDS BOTH HALVES. One without the other is a half-filled form
      // on somebody's confirmation email, and `payments.ts` drops it on the
      // way out anyway; dropping it here means the screen and the email agree
      // about what was saved.
      // `off` IS ONLY WRITTEN WHEN IT IS TRUE. A row that is on carries two
      // fields rather than three, so every method saved before the switch
      // existed still reads as on — absent means on, in the screen and in
      // `payments.ts`, which is one rule rather than a default in two places.
      pay_custom: custom
        .map((r) => ({
          label: String(r.label).trim().slice(0, 40),
          handle: String(r.handle).trim().slice(0, 120),
          ...(r.off === true ? { off: true } : {}),
        }))
        .filter((r) => r.label && r.handle)
        .slice(0, 8),
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
              <p className="muted" style={{ margin: "0 0 var(--sp-3)" }}>{t("You will need a Stripe account. If you do not have one, Stripe makes it during this.")}</p>
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
                  {/* "ending", because four characters on their own read as
                      the whole account id. It is the last four of `acct_…`,
                      which is all a detailer needs to tell two Stripe
                      accounts apart. */}
                  <span className="nm">{t("Stripe account ending {last4}", { last4: card.accountHint })}</span>
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
              {/* THE SERVER'S OWN SENTENCE, AND IT IS BELOW THE ROW RATHER
                  THAN INSIDE IT — MEASURED, not preferred. `.row-item .sub`
                  is a single nowrap line, so at 320 this read *"Stripe has
                  not finis…"* and the whole instruction — finish the details
                  Stripe asked for — was invisible. **The identical defect is
                  already on the record from stage 2**, where the same class
                  clipped *"You are committing to twelve months"* off a phone,
                  and CLAUDE.md carries the rule it produced: no check in this
                  repo can see clipped text, because an ellipsis has a
                  perfectly normal box. Anything that has to be READ wraps.

                  `cardStatus` orders its four states so that somebody who
                  switched card off is told that first, rather than being told
                  something that reads as a fault. */}
              <p className="muted" style={{ margin: "var(--sp-2) 0 0" }}>{t(card.detail)}</p>

              {/* THE DETAILER'S OWN SWITCH, and it cannot be turned on before
                  Stripe says the account can take a charge - the server
                  refuses that with a 409, and the control is disabled so
                  nobody meets the refusal. */}
              {/* NO `help`, AND IT HAD ONE UNTIL THE SCREEN WAS LOOKED AT.
                  Both sentences it carried were already on the screen: the
                  status line directly above says whether card is live, and
                  the lead paragraph says what card payments are and what they
                  cost. The owner's copy rule is a test — does the sentence
                  add a fact the control does not already carry — and this one
                  added none, twice, in the two states where it drew. */}
              <Switch
                label={t("Take card payments")}
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

      {/* ── A SWITCH PER WAY TO BE PAID — his note, 2026-09-10 ────────────
          *"There's only one option, do you take cash? Shouldn't there be an
          option for them to add things? There should be a toggle for cash, for
          Venmo, for Cash App, PayPal, Zelle."*

          It was one switch and then four loose text boxes, so four of the five
          ways a detailer gets paid had no on/off at all — they were on when
          the box had something in it, which is a rule the screen never stated
          and nobody would guess. Now every method is a row that reads the
          same: a name, a switch, and the one thing it needs to know underneath
          when it is on.

          **A METHOD IS STILL "ON" WHEN IT HAS A HANDLE, because that is what
          the database says and what every email reads.** No column was added
          and no migration: the switch makes the existing rule visible instead
          of leaving it implied. Turning one off clears the saved handle — but
          `drafts` below keeps what was typed for as long as the screen is
          open, so a mis-tap is one tap back rather than a handle to look up in
          another app. */}
      <Switch
        label={t("Cash")}
        help={t("You take cash on the day.")}
        checked={pay.pay_cash}
        onChange={(v) => setPay({ ...pay, pay_cash: v })}
      />

      {HANDLES.map(({ key, name, help, placeholder }) => {
        const on = !!pay[key];
        return (
          <div key={key}>
            <Switch
              label={name}
              help={on ? undefined : help}
              checked={on}
              onChange={(v) => {
                if (v) { setPay({ ...pay, [key]: drafts[key] || "" }); setOpen((o) => ({ ...o, [key]: true })); }
                else { setDrafts({ ...drafts, [key]: pay[key] }); setPay({ ...pay, [key]: "" }); }
              }}
            />
            {/* THE FIELD ONLY EXISTS WHILE THE SWITCH IS ON, which is what
                makes the switch mean something. `open` keeps it on screen for
                the moment between switching on and typing the first
                character, when the value is still empty. */}
            {(on || openFor[key]) && (
              <label className="field" style={{ margin: "0 0 var(--sp-4)" }}>
                <span>{t("Your {name}", { name })}</span>
                <input value={pay[key]} onChange={set(key)} autoFocus={openFor[key] && !on}
                  placeholder={placeholder} maxLength={120} />
              </label>
            )}
          </div>
        );
      })}

      {/* ── HIS OWN, AND THEY LOOK LIKE THEY SHIPPED WITH THE PRODUCT ───
          His second pass, 2026-09-11: *"when you press save it should go up to
          the area where the other ones are, with the same styling — it says
          the name, not in a text box... it should look like you didn't
          actually add it, and it was already built into the website."*

          The first build got the DATA right and the FEELING wrong: two open
          text boxes sitting in the page, so a saved method still looked like a
          form somebody was in the middle of filling in. Three changes and none
          of them touch what is stored:

          **THE NAME IS TEXT, NOT A FIELD.** It is `.setting-label`, the same
          element Venmo's name is, so a saved method is indistinguishable from
          one this product has always known about. It cannot be edited
          afterwards, which is the honest shape: the name is what the thing IS,
          and changing "Apple Pay" to "Zelle" is not an edit, it is a different
          method — remove it and add one.

          **THE VALUE STAYS EDITABLE**, in the same `.field` every built-in
          uses, because a handle is exactly the kind of thing that changes.

          **AND ADDING ONE HAPPENS IN A SHEET.** *"Then it popped over with the
          two."* Nothing is half-written into the list: the row appears
          complete or not at all, which is what makes it read as built in. */}
      <div className="section-title">{t("Anything else you take")}</div>

      {custom.map((row, n) => {
        const on = row.off !== true;
        return (
          <div key={`${row.label}-${n}`}>
            <div className="setting">
              <div className="setting-text">
                <div className="setting-label">{row.label}</div>
              </div>
              {/* **A SWITCH AND A REMOVE ARE TWO DIFFERENT ANSWERS — his note,
                  2026-09-11: *"there should be a switch, like how I don't have,
                  and the remove button."*** Off is *not this winter* — the
                  handle stays and comes back on. Remove is *I do not take this
                  any more*. Every built-in method has the first; this had only
                  the second, so the only way to stop offering something was to
                  throw away what you had typed.

                  `bare` because the row already has its own label above — the
                  full `Switch` would print the name a second time. */}
              <div className="row" style={{ gap: 10, alignItems: "center" }}>
                <button className="btn sm inline ghost"
                  onClick={() => { setCustom(custom.filter((_, k) => k !== n)); setMsg(null); }}>
                  {t("Remove")}
                </button>
                <Switch bare label={row.label} checked={on}
                  onChange={(v) => { setCustom(custom.map((r, k) => (k === n ? { ...r, off: !v } : r))); setMsg(null); }} />
              </div>
            </div>
            {/* THE FIELD GOES WITH THE SWITCH, exactly as a built-in's does:
                nothing to fill in for a method that is switched off. */}
            {on && (
              <label className="field" style={{ marginBottom: "var(--sp-4)" }}>
                <span>{t("What they need")}</span>
                <input value={row.handle} maxLength={120}
                  placeholder={t("A username, a number, or a link")}
                  onChange={(e) => { setCustom(custom.map((r, k) => (k === n ? { ...r, handle: e.target.value } : r))); setMsg(null); }} />
              </label>
            )}
          </div>
        );
      })}

      {custom.length < 8 && (
        <button className="btn ghost" style={{ marginBottom: "var(--sp-4)" }}
          onClick={() => setAdding(true)}>
          <Plus strokeWidth={2} /> {t("Add a way to be paid")}
        </button>
      )}

      {/* THE SHEET. `Sheet` is the product's one overlay and it brings the
          entrance, the exit, the escape key and the focus trap with it —
          which is why this is not a div with a background. */}
      {adding && (
        <Sheet onClose={() => setAdding(false)} title={t("Add a way to be paid")}>
          <div className="group">
            <label className="field"><span>{t("What it is called")}</span>
              <input value={draft.label} maxLength={40} autoFocus
                placeholder={t("e.g. Apple Pay")}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></label>
            <label className="field"><span>{t("What they need")}</span>
              <input value={draft.handle} maxLength={120}
                placeholder={t("A username, a number, or a link")}
                onChange={(e) => setDraft({ ...draft, handle: e.target.value })} /></label>
            <p className="muted">
              {t("Paste a link and we make it tappable. Anything else we print exactly as you type it.")}
            </p>
            {/* BOTH HALVES OR NEITHER. A name with no handle is a blank line on
                somebody's confirmation email, and the server drops it anyway —
                refusing here means the screen and the email agree. */}
            <button className="btn primary"
              disabled={!draft.label.trim() || !draft.handle.trim()}
              onClick={() => {
                setCustom([...custom, { label: draft.label.trim(), handle: draft.handle.trim() }]);
                setDraft({ label: "", handle: "" });
                setAdding(false);
                setMsg(null);
              }}>
              {t("Add it")}
            </button>
          </div>
        </Sheet>
      )}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy} onClick={save}>{busy ? "Saving" : "Save"}</button>
    </div>
    </>
  );
}
