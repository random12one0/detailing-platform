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

// STRIPE'S OWN VOCABULARY IS NOT A DETAILER'S. `inv.status` fell through to
// the raw value, so a real receipt list could print `uncollectible`, `void` or
// `draft` at somebody who wants to know whether they paid. Anything unmapped
// says "Not paid", which is the safe direction: it sends them to look rather
// than reassuring them wrongly.
const INVOICE_WORDS = {
  paid: "Paid",
  open: "Not paid yet",
  void: "Cancelled — nothing owed",
  uncollectible: "Written off — nothing owed",
  draft: "Not sent yet",
};

const dateLong = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

// THE RUNGS ARE IN THE SAME ORDER AS /pricing AND CARRY THE SAME WORDS. A
// detailer who chose "pay for the year" there and meets "annual-upfront" here
// has been handed a different product. The order is cheapest-per-month first,
// which is also least-flexible first, so the ladder reads downward as
// "commitment buys the discount" — the thing the exit fee is paying for.
//
// EACH NOTE ADDS A FACT THE ROW DOES NOT ALREADY CARRY, and the first draft of
// all three failed that — the owner's own copy rule, 2026-09-01. *"One payment,
// up front"* under **Pay for the year**, *"The same yearly price, spread out"*
// under **Pay monthly, for a year**, and *"No commitment at all. Stop any month
// you like."* under **Month to month** at **$75 a month**: two sentences with
// nothing in them the label and the figure had not already said. That is
// *"Mobile — we go to them"* three times over.
//
// WHAT SURVIVED IS THE HALF THAT WAS BEING CLIPPED. `.row-item .sub` is
// `nowrap` with an ellipsis, so at 392 the middle rung read *"The same yearly
// price, spread out.…"* and **the twelve-month commitment never rendered on a
// phone at all** — the disclosure the whole AB 2863 reading exists to protect,
// deleted by a CSS rule at the moment of the decision. `.clamp2` (theme.css,
// and `Reviews.jsx` is the precedent) gives it two lines; the shorter copy is
// what makes two lines enough.
//
// THE TERM AND THE SHARE COME FROM THE SERVER for the same reason every figure
// on this screen does: they are the numbers that will be CHARGED.
const RUNGS = [
  ["annual-upfront", "Pay for the year",
    () => "Nothing to commit to — you choose again next year."],
  ["annual-monthly", "Pay monthly, for a year",
    (q) => `${q.term_months} months. Leaving early costs ${Math.round(q.exit_fee_share * 100)}% of what is left.`],
  ["monthly", "Month to month",
    () => "Nothing to pay to leave."],
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
  // `data-loading` IS FOR THE SCRIPTS, and it costs no pixels. Every browser
  // script in this repo settles on a DOM that has gone quiet, and a screen
  // waiting on an edge function is perfectly quiet — so a screenshot of this
  // card is a screenshot of the word "Checking". Both `settle()`s treat the
  // attribute as "not finished".
  if (!data) {
    return (
      <div className="card" data-loading="">
        <p className="quiet" style={{ margin: 0 }}>Checking your subscription…</p>
      </div>
    );
  }

  const sub = data.subscription;
  const live = sub && sub.status !== "canceled" && sub.status !== "incomplete";

  return live ? account() : ladder();

  // -------------------------------------------------------------------------

  function ladder() {
    const q = chosen ? data.quotes[chosen] : null;
    // Identical on all three website rungs, so it is stated once above them
    // rather than three times inside them. Read from the server, so a founding
    // account sees its own figure.
    const buildFee = data.quotes["annual-monthly"]?.setup_cents ?? 0;
    const listBuildFee = data.quotes["annual-monthly"]?.list_setup_cents ?? 0;
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
        {/* THE BUILD FEE IS 94% OF WHAT LEAVES THE BANK ON DAY ONE AND WAS ONE
            PRESS PAST THE DECISION. Every rung printed "$60 a month" while the
            first charge was $1,059 — which is the same dishonesty this ladder's
            own "what leaves the bank, never an effective monthly" rule exists
            to refuse, from the other end. It is one line here because it is the
            same figure on all three rungs. */}
        {buildFee > 0 && (
          <p className="muted" style={{ margin: "0 0 var(--sp-3)" }}>
            Every plan also includes the one-time{" "}
            {listBuildFee > buildFee && <s className="was">{usd(listBuildFee)}</s>}
            <span className="num">{usd(buildFee)}</span> build.
          </p>
        )}
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
                  <span className="sub clamp2">{note(quote)}</span>
                </span>
                {/* WHAT LEAVES THE BANK, never an "effective monthly" — the
                    same rule /pricing is built on. Printing $50/mo beside a
                    plan that takes $600 in one go is the small dishonesty this
                    whole page is a correction to.
                    AND THE LIST PRICE BESIDE IT ON A FOUNDING ACCOUNT, which
                    /pricing does too — a discount nobody can see is a discount
                    that does no work. `list_recurring_cents` comes from the
                    server, so it is a real price the product charges somebody
                    rather than an anchor; the test is whether the two DIFFER,
                    so a standard account draws nothing. */}
                <span className="figure sm">
                  {quote.list_recurring_cents > quote.recurring_cents && (
                    <s className="was">{usd(quote.list_recurring_cents)}</s>
                  )}
                  {usd(quote.recurring_cents)} {per}
                </span>
              </button>
            );
          })}
        </div>

        {/* IT OPENS, SO IT ANIMATES IN — the standing rule CLAUDE.md says binds
            new work today, and `document.getAnimations()` 120ms after a rung
            press reported only `ground-drift`, which is the instrument saying
            this shipped dead. AND SWITCHING RUNGS IS THE OWNER'S THIRD KIND OF
            MOTION: the frame stays put while every figure and the whole consent
            sentence are replaced — *"the GUI doesn't really change, but the
            actual text inside of it changes"* — which is Money's period switch
            exactly. `.swap` + a key is the whole mechanism; no new keyframe, no
            new duration, and the parts stagger 20ms at `--t-exit` for free. */}
        {q && (
          <div className="swap" key={chosen}>
            <div className="section-title">Before you pay</div>
            <div className="facts">
              <div>
                <span className="quiet">Today</span>
                <span className="v strong num">{usd(q.first_charge_cents)}</span>
              </div>
              {q.setup_cents > 0 && (
                <div>
                  <span className="quiet">Of that, the build</span>
                  <span className="v"><span className="strong num">{usd(q.setup_cents)}</span> once</span>
                </div>
              )}
              <div>
                <span className="quiet">Then</span>
                <span className="v">
                  <span className="strong num">{usd(q.recurring_cents)}</span>
                  {" "}{q.bill_interval === "year" ? "every year" : "every month"}
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

            {/* A DISABLED BUTTON THAT DOES NOT SAY WHY READS AS A BROKEN APP.
                The label is what tells them, rather than a sentence underneath
                it — the control answering for itself. */}
            <button
              className="btn primary"
              disabled={!ticked || busy}
              onClick={() => act(() => api.billingCheckout(business.id, "website", chosen))}
            >
              {busy ? "One moment" : ticked ? "Go to payment" : "Tick the box to continue"}
            </button>
            <p className="muted" style={{ marginTop: "var(--sp-2)" }}>
              Your card details are entered on Stripe's own page. They never
              reach us.
            </p>
          </div>
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

        <div className="section-title">What you pay us</div>
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
              <span className="strong num">{usd(sub.recurring_cents)}</span>
              {" "}{sub.bill_interval === "year" ? "a year" : "a month"}
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
              {data.invoices.map((inv) => {
                // AN INVOICE WITH NO DOCUMENT BEHIND IT IS NOT A LINK. `href="#"`
                // drew a focusable, hover-lit row that navigates nowhere — a
                // control that promises a thing it cannot do, which is the same
                // defect as a `›` that only peeks.
                const href = inv.hosted_url || inv.pdf_url || null;
                const Row = href ? "a" : "div";
                return (
                  <Row
                    key={inv.id}
                    className="row-item"
                    {...(href ? { href, target: "_blank", rel: "noreferrer" } : {})}
                  >
                    <span className="txt">
                      <span className="nm">{dateLong(inv.paid_at || inv.created_at)}</span>
                      <span className="sub">{INVOICE_WORDS[inv.status] ?? "Not paid"}</span>
                    </span>
                    <span className="figure sm">{usd(inv.amount_cents)}</span>
                    {href && <ExternalLink size={16} strokeWidth={2} />}
                  </Row>
                );
              })}
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
            {/* THE FEE IS THE LARGEST UNEXPECTED NUMBER IN THIS PRODUCT AND IT
                WAS SET AT 13px IN GREY, MID-SENTENCE, ABOVE A RED BUTTON. Law 8
                says a price in the body face is a bug; a price a person is
                about to be charged, buried in a `.quiet` paragraph, is that bug
                at the worst moment. It is a `.facts` row of its own now, in the
                same voice as every other figure on the screen. */}
            <div className="facts">
              <div>
                <span className="quiet">To pay now</span>
                <span className="v strong num">
                  {data.exit_fee_cents > 0 ? usd(data.exit_fee_cents) : "Nothing"}
                </span>
              </div>
              {data.exit_fee_cents > 0 && (
                <div>
                  <span className="quiet">Why</span>
                  <span className="v">You committed to {sub.term_months} months</span>
                </div>
              )}
            </div>
            <p className="quiet" style={{ marginTop: "var(--sp-3)" }}>
              {paidThrough
                ? `You keep everything until ${dateLong(sub.current_period_end)}, and this month is not refunded.`
                : "The month you have not paid for is still owed. Cancelling stops us trying the card for anything after it."}
              {/* THE THING SOMEBODY CANCELLING ACTUALLY WANTS TO KNOW, and the
                  confirm was silent about it: what happens to their work. The
                  pricing page already promises it and both billing emails say
                  it; this is the moment the fear is live. */}
              {" "}After that your booking page stops taking new bookings.
              Nothing is deleted — your jobs, your customers and your settings
              stay, and customers who have already booked keep their own page.
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
