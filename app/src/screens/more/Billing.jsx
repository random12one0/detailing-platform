// Your subscription — the fifteenth settings screen. Roadmap 2.20 stage 2.
//
// THE ONLY SCREEN IN THIS PRODUCT ABOUT MONEY GOING THE OTHER WAY. Every other
// money surface — Money, the invoice, the price bar — is a detailer's own
// customer paying them. This one is the detailer paying us, and the difference
// matters more than it sounds: on every other screen we are the software, and
// on this one we are the company taking their card.
//
// ============================================================================
// BEHIND THE GEAR AND OWNER-ONLY, WHICH IS TWO SEPARATE DECISIONS
// ============================================================================
// BEHIND THE GEAR, because Business's own admission test is *"a row belongs on
// Business only if it changes what a CUSTOMER meets"* and a card on file
// changes nothing a customer ever sees. OWNER-ONLY rather than behind a
// permission tick, for the reason roadmap 2.13 refused a `team` permission:
// whoever can change what the business PAYS can change everything, and there
// is no tick that means "may cancel our subscription and nothing else". The
// server enforces it; the row being hidden here is only courtesy.
//
// ============================================================================
// THE SCREEN DOES NO ARITHMETIC ABOUT MONEY. NONE.
// ============================================================================
// Every figure, the consent sentence and what cancelling costs today all come
// from `api.billingSummary()`, which computes them with the same functions
// `platform-billing` uses to CHARGE and to STORE. That is not tidiness: the
// sentence a detailer ticks is the sentence quoted back in a card dispute, so a
// screen that composes its own wording is a screen that can promise $40 while
// the row says $60. The three alternatives were a second copy of
// `platformBilling.ts` inside `app/`, an import across the `app/` → `supabase/`
// boundary, and this. Only this one cannot drift.
//
// It needs no Stripe key to render, which is the whole reason this screen could
// be built and looked at months before there is an account: `summary` is pure
// arithmetic and only the last button touches Stripe.
//
// ============================================================================
// AB 2863 LIVES ON THIS SCREEN TWICE
// ============================================================================
//   · THE TICK. Express affirmative consent, its own control, never bundled
//     into the button. Nothing is pre-ticked and no rung is pre-selected
//     unless the detailer arrived having already chosen one on /pricing —
//     their choice carried forward is not a default.
//   · THE CANCEL BUTTON. The statute requires somebody who signed up online to
//     be able to cancel online, and it is the fourth item on the FTC's list of
//     what Adobe did wrong. **It stays ONE press behind one confirm.** It is
//     never moved behind support, an email, a reason picker or a retention
//     offer, whatever a future session thinks of. The exit fee is printed
//     BEFORE the press, not discovered after it.

import { useCallback, useEffect, useState } from "react";
import { CreditCard, ExternalLink, TriangleAlert } from "lucide-react";
import { api } from "../../lib/api.js";
import { useBusiness } from "../../context/BusinessContext.jsx";

const usd = (cents) =>
  `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;

// Stripe's card brands come back lowercase. "American Express" is two words,
// so this is a word-wise pass rather than a single capital.
const titleCase = (s) =>
  String(s || "").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const dateLong = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

// THE RUNGS ARE IN THE SAME ORDER AS /pricing AND CARRY THE SAME WORDS. A
// detailer who chose "pay for the year" there and meets "annual-upfront" here
// has been handed a different product. The order is cheapest-per-month first,
// which is also least-flexible first, so the ladder reads downward as
// "commitment buys the discount" — the thing the exit fee is paying for.
const RUNGS = [
  ["annual-upfront", "Pay for the year", "One payment, up front. No commitment after it — you simply choose again next year."],
  ["annual-monthly", "Pay monthly, for a year", "The same yearly price, spread out. You are committing to twelve months."],
  ["monthly", "Month to month", "No commitment at all. Stop any month you like."],
];

export default function Billing() {
  const { business } = useBusiness();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // WHICH RUNG, AND WHY IT CAN START SET. `/pricing` sends `?term=` through
  // signup, and a detailer who has already chosen should not choose twice —
  // carrying THEIR choice forward is the opposite of a pre-selected default.
  // With no term in the URL, nothing is selected.
  const [chosen, setChosen] = useState(() => {
    const t = new URLSearchParams(window.location.search).get("term");
    return RUNGS.some(([k]) => k === t) ? t : null;
  });
  const [ticked, setTicked] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.billingSummary(business.id));
    } catch (e) {
      setError(String(e.message || e));
    }
  }, [business.id]);
  useEffect(() => { load(); }, [load]);

  // A SINGLE PLACE THAT TALKS TO THE SERVER, so every button gets the same
  // busy state, the same error box and the same reload. Four copies of
  // try/catch is four chances for one of them to swallow a failure silently —
  // and a silent failure here is a detailer who thinks they cancelled.
  const act = async (fn, after) => {
    setBusy(true);
    setError("");
    try {
      const res = await fn();
      if (res?.url) { window.location.assign(res.url); return; }
      await load();
      after?.(res);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <div className="card"><div className="error-box">{error}</div></div>;
  // ONE LINE RATHER THAN NOTHING, AND RATHER THAN A CONCLUSION. This screen's
  // whole content comes from an edge function, and a cold one took five
  // seconds to answer the first time it was opened after a deploy — five
  // seconds of an empty page under a heading, which reads as broken. What it
  // must NOT say is "you have no subscription": that is the mistake roadmap
  // 2.14 made on the plans list, where a conclusion was painted before the
  // first read returned. This states the only thing that is true yet.
  if (!data) return <div className="card"><p className="quiet" style={{ margin: 0 }}>Checking your subscription…</p></div>;

  const sub = data.subscription;
  const live = sub && sub.status !== "canceled" && sub.status !== "incomplete";

  return live ? account() : ladder();

  // -------------------------------------------------------------------------

  function ladder() {
    const q = chosen ? data.quotes[chosen] : null;
    return (
      <div className="card">
        <p className="quiet" style={{ marginTop: 0 }}>
          {/* The one fact the rungs cannot carry: what happens to what is
              already here. A detailer looking at this screen has a dashboard
              full of their own work and no way to know whether paying is what
              keeps it. */}
          Everything you have already set up stays exactly as it is. This is
          what keeps your booking page online.
        </p>

        <div className="section-title">Ways to pay</div>
        <div className="rows">
          {RUNGS.map(([key, name, note]) => {
            const quote = data.quotes[key];
            const per = quote.bill_interval === "year" ? "a year" : "a month";
            return (
              <button
                key={key}
                className="row-item"
                data-billing-rung={key}
                aria-pressed={chosen === key}
                onClick={() => { setChosen(key); setTicked(false); }}
              >
                <span className="txt">
                  <span className="nm">{name}</span>
                  <span className="sub">{note}</span>
                </span>
                {/* WHAT LEAVES THE BANK, never an "effective monthly" — the
                    same rule /pricing is built on. Printing $50/mo beside a
                    plan that takes $600 in one go is the small dishonesty this
                    whole page is a correction to. */}
                <span className="figure sm">{usd(quote.recurring_cents)} {per}</span>
              </button>
            );
          })}
        </div>

        {q && (
          <>
            <div className="section-title">Before you pay</div>
            <div className="facts">
              <div>
                <span className="quiet">Today</span>
                <span className="v">{usd(q.first_charge_cents)}</span>
              </div>
              {q.setup_cents > 0 && (
                <div>
                  <span className="quiet">Of that, the build</span>
                  <span className="v">{usd(q.setup_cents)} once</span>
                </div>
              )}
              <div>
                <span className="quiet">Then</span>
                <span className="v">
                  {usd(q.recurring_cents)} {q.bill_interval === "year" ? "every year" : "every month"}
                </span>
              </div>
              {data.founding && (
                <div>
                  <span className="quiet">Founding price</span>
                  <span className="v">Locked for as long as you stay</span>
                </div>
              )}
            </div>

            {/* THE TICK. Its own control, its own words, generated by the
                server — see the header. It resets whenever the rung changes,
                because consent to one price is not consent to another. */}
            {/* `.confirm-box`, NOT `.field`. The first version used the form
                label class, and `label.field > span` is the uppercase,
                letter-spaced, muted micro-label every field on every settings
                screen uses — so the one sentence on this screen that has to be
                READ, and that gets quoted back in a card dispute, rendered as
                unreadable small caps. `.confirm-box` is the house pattern for
                exactly this: body text, on the accent's quiet ground, framed.
                It is `display: block`, so the row is set here. */}
            <label
              className="confirm-box"
              style={{
                display: "flex", gap: "var(--sp-3)", alignItems: "flex-start",
                marginTop: "var(--sp-3)", cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={ticked}
                data-billing-consent=""
                onChange={(e) => setTicked(e.target.checked)}
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <span>{q.consent}</span>
            </label>

            {!data.configured && (
              <div className="warn-box">
                <TriangleAlert strokeWidth={2} />
                <span>Card payments are not switched on yet. Nothing here will charge you.</span>
              </div>
            )}
            {error && <div className="error-box">{error}</div>}

            <button
              className="btn primary"
              disabled={!ticked || busy}
              onClick={() => act(() => api.billingCheckout(business.id, "website", chosen))}
            >
              {busy ? "One moment" : "Go to payment"}
            </button>
            <p className="muted" style={{ marginTop: "var(--sp-2)" }}>
              Your card details are entered on Stripe's own page. They never
              reach us.
            </p>
          </>
        )}
      </div>
    );
  }

  function account() {
    const d = data.dunning;
    const ending = sub.cancel_at_period_end;
    // A PAST-DUE PERIOD END IS IN THE PAST, and two sentences on this screen
    // were promising a future out of it: "Next charge <a date last week>" and
    // "You keep everything until <a date last week>". Stripe leaves
    // `current_period_end` where it was while it retries, so the date is
    // correct and the word in front of it was not.
    const paidThrough = sub.current_period_end && new Date(sub.current_period_end) > new Date();
    return (
      <div className="card">
        {/* THE DUNNING STATE FIRST, because a detailer whose page is offline
            has exactly one question and it is not what their plan is called.
            The words come from the server so they match the promise printed on
            /pricing, which is what the checkout is bound by. */}
        {d.level !== "ok" && (
          <div className={d.level === "down" ? "error-box" : "warn-box"} data-billing-dunning={d.level}>
            <TriangleAlert strokeWidth={2} />
            <span><strong>{d.headline}.</strong> {d.detail}</span>
          </div>
        )}

        <div className="facts">
          <div>
            <span className="quiet">Plan</span>
            <span className="v">
              {sub.plan === "booking" ? "Booking system" : "Website and booking system"}
              {data.founding ? " · founding price" : ""}
            </span>
          </div>
          <div>
            <span className="quiet">You pay</span>
            <span className="v">
              {usd(sub.recurring_cents)} {sub.bill_interval === "year" ? "a year" : "a month"}
            </span>
          </div>
          <div>
            <span className="quiet">
              {ending ? "Ends" : paidThrough ? "Next charge" : "Unpaid since"}
            </span>
            <span className="v">{dateLong(sub.current_period_end)}</span>
          </div>
          {sub.term_months > 0 && (
            <div>
              {/* THE COMMITMENT AND THE FEE, at reading size and on the screen
                  a detailer actually returns to. AB 2863 wants the disclosure
                  before billing details are taken — /pricing does that — and
                  this is the copy that has to still be findable a year later,
                  which is what makes the fee defensible in a dispute. */}
              <span className="quiet">Committed until</span>
              <span className="v">{dateLong(`${sub.term_ends_on}T12:00:00Z`)}</span>
            </div>
          )}
          <div>
            <span className="quiet">Card</span>
            <span className="v">
              {/* Stripe writes the brand lowercase ("visa"), and a card is a
                  proper noun everywhere a person has ever seen one. */}
              {sub.card_last4
                ? `${titleCase(sub.card_brand)} ···· ${sub.card_last4} · ${String(sub.card_exp_month).padStart(2, "0")}/${String(sub.card_exp_year).slice(-2)}`
                : "None on file"}
            </span>
          </div>
        </div>

        <button className="btn" disabled={busy} onClick={() => act(() => api.billingPortal(business.id))}>
          <CreditCard strokeWidth={2} /> Update card
        </button>

        {data.invoices.length > 0 && (
          <>
            <div className="section-title">Payments</div>
            <div className="rows">
              {data.invoices.map((inv) => (
                <a
                  key={inv.id}
                  className="row-item"
                  href={inv.hosted_url || inv.pdf_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="txt">
                    <span className="nm">{dateLong(inv.paid_at || inv.created_at)}</span>
                    <span className="sub">
                      {inv.status === "paid" ? "Paid" : inv.status === "open" ? "Not paid yet" : inv.status}
                    </span>
                  </span>
                  <span className="figure sm">{usd(inv.amount_cents)}</span>
                  <ExternalLink size={16} strokeWidth={2} />
                </a>
              ))}
            </div>
          </>
        )}

        {error && <div className="error-box">{error}</div>}

        <div className="section-title">{ending ? "Cancelled" : "Cancelling"}</div>
        {ending ? (
          <>
            <p className="quiet" style={{ marginTop: 0 }}>
              Your subscription ends on {dateLong(sub.current_period_end)}. Until
              then nothing changes.
              {sub.exit_fee_charged_cents
                ? ` The ${usd(sub.exit_fee_charged_cents)} early-exit fee has already been charged and is not refunded if you restart.`
                : ""}
            </p>
            <button className="btn" disabled={busy} onClick={() => act(() => api.billingResume(business.id))}>
              Keep my subscription
            </button>
          </>
        ) : confirming ? (
          <>
            <p className="quiet" style={{ marginTop: 0 }}>
              {/* WHAT IT COSTS, BEFORE THE PRESS. Discovering an exit fee after
                  cancelling is the complaint, not the fee. */}
              {paidThrough
                ? `You keep everything until ${dateLong(sub.current_period_end)}, and this month is not refunded.`
                : "The month you have not paid for is still owed. Cancelling stops us trying the card for anything after it."}
              {data.exit_fee_cents > 0
                ? ` Because you committed to ${sub.term_months} months, ${usd(data.exit_fee_cents)} will be charged to your card now.`
                : " There is nothing else to pay."}
            </p>
            <button
              className="btn danger"
              disabled={busy}
              data-billing-cancel-confirm=""
              onClick={() => act(() => api.billingCancel(business.id), () => setConfirming(false))}
            >
              {busy ? "One moment" : "Yes, cancel it"}
            </button>
            <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setConfirming(false)}>
              Never mind
            </button>
          </>
        ) : (
          <button className="btn danger" data-billing-cancel="" onClick={() => setConfirming(true)}>
            Cancel my subscription
          </button>
        )}
      </div>
    );
  }
}
