// THE FULL PICTURE — the advanced money screen. Roadmap 8.9, 2026-09-10.
//
// **HIS ASK, TWICE, AND THE SECOND TIME IS THE BRIEF:** *"just wish I had a
// little advanced page where you get to more into those cool statistics that
// you like to see... but just think overall of what would be useful for an
// advanced page... add it in a nice way, not just text. If there's a nice way
// to add it visually, then do it. If it just has to be a number with a title,
// then that's fine."*
//
// **SO THE RULE HERE IS: A PICTURE WHERE THE SHAPE IS THE ANSWER, A ROW
// EVERYWHERE ELSE.** Four things on this screen are drawn and the other
// eighteen are ruled rows, and the four were chosen by asking what question
// the drawing answers that the number does not:
//
//   KEPT vs SPENT     one bar, two segments. "Net $400" is a number; the
//                     proportion is the thing he is actually judging.
//   WHERE IT WENT     a bar per expense category. Ranking by eye is the whole
//                     job of that block, and five numbers do not rank.
//   THE WEEK          seven columns. A fixed seven-way comparison is not a
//                     trend line — it is a shape a person reads in one look,
//                     and it is his "most popular days".
//   WHAT SELLS        a bar per package. Same argument as the categories, and
//                     it is the one block on this screen about what to do
//                     NEXT rather than what already happened.
//
// **AND NO CHART OF MONEY OVER TIME.** Money's own signed bars already are
// that, and `docs/platform-admin-2026-09-04.md` settled the argument for the
// second one: under ten jobs a month a trend line is decoration with a
// confidence it has not earned.
//
// **IT TAKES THE MAIN AREA AND THEREFORE SHIPS NO ENTRANCE OF ITS OWN** —
// CLAUDE.md, § ANYTHING THAT OPENS: a `.group` under `.app-main` already
// arrives with the screen's stagger, and giving it a second one is two
// animations running the same 420ms.
//
// The period control is NOT here. It stays where it was, above this, so there
// is one period vocabulary on this tab rather than two — which is also why
// this component takes figures rather than dates: everything it shows is
// already decided by the control the detailer can see.

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
// **`localDate`, NOT `withLocal`.** The derived local date comes from the one
// place that derives it — but withLocal also derives the START and END times,
// and this read does not ask for `end_at`, so it threw "Invalid time value"
// on every row. The page still drew, which is how it survived a first look:
// an uncaught error in a `.then` leaves React holding the last good render.
import { localDate, money } from "../lib/format.js";
import { advancedMoney } from "../lib/moneyAdvanced.js";
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

const pct = (v) => `${Math.round(v * 100)}%`;
// Two decimal places on a wage and none on a count. `money()` handles the
// currency; this is only for the things that are not money.
const hrs = (v) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
// "1 jobs" is the oldest bug in this product (Part B row 7) and it arrived
// again in two places on this screen. Same shape Business uses.
const n = (v, one, many) => t(v === 1 ? one : many, { count: v });

// A ruled row: what it is on the left, what it says on the right. The
// product's own vocabulary — `.facts` is the same shape on Today and on the
// client record, so this screen is not inventing a fifth kind of list.
function Row({ label, value, note }) {
  return (
    <div className="advrow">
      <span className="advrow-k">
        {label}
        {note ? <span className="quiet advrow-n">{note}</span> : null}
      </span>
      <span className="advrow-v num">{value}</span>
    </div>
  );
}

// A named proportion. The bar is `aria-hidden` and the figure beside it is
// the real content — a screen reader gets "Supplies, $60, 60%" and never a
// div whose width is the information (law 1's accessibility floor).
function Meter({ name, value, share, tone, cap }) {
  return (
    <div className={`advmeter${cap ? " cap" : ""}`}>
      <span className="advmeter-k">{name}</span>
      <span className="advmeter-bar" aria-hidden="true">
        <span style={{ width: `${Math.max(2, Math.round(share * 100))}%`,
          background: tone === "bad" ? "var(--bad)" : "var(--ac)" }} />
      </span>
      <span className="advmeter-v num">{value}</span>
    </div>
  );
}

export default function AdvancedMoney({ bookings, expenses, lineItems, period, previous, onClose }) {
  useAppLocale();
  const { business } = useBusiness();
  // **WHO HAD BOOKED BEFORE THIS PERIOD, which nothing else on Money needs.**
  // The screen's own reads are bounded by the chart's range, so "is this a new
  // customer" cannot be answered from them: a regular of three years who last
  // came in March would read as new in September. One narrow read, only when
  // this screen is open, and only two columns of it.
  const [history, setHistory] = useState(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  useEffect(() => {
    let on = true;
    // **`booking_date` IS NOT A COLUMN — it is derived in the browser.** The
    // table keeps `start_at`, a timestamptz, and `withLocal()` turns it into
    // the business's own local date; every screen reads the derived field, so
    // asking the server for it returns 400 and the block silently claimed
    // every customer had been before. Caught by reading the network, not the
    // screen: the figures were plausible and wrong.
    //
    // The cut is made twice on purpose. The server cuts on `start_at` a day
    // WIDE, because a local date and a UTC timestamp disagree by up to a day
    // and over-fetching one day is free where missing one is a customer
    // wrongly called new; `advancedMoney` then cuts exactly, on the local date.
    supabase.from("bookings")
      .select("customer_phone, customer_id, customer_name, start_at, status")
      .eq("business_id", business.id).is("deleted_at", null)
      .eq("status", "completed").lt("start_at", `${period.start}T23:59:59`)
      .then(({ data, error }) => {
        if (!on) return;
        // A FAILED READ IS NOT AN EMPTY HISTORY. Empty would print "everybody
        // is new", which is a plausible-looking lie; the block says so instead.
        if (error) setHistoryFailed(true);
        else setHistory((data ?? []).map((b) => ({ ...b, booking_date: localDate(b.start_at, business.timezone) })));
      });
    return () => { on = false; };
  }, [business.id, business.timezone, period.start]);

  const m = advancedMoney({ bookings, expenses, lineItems, period, previous, history });

  // THE SENTENCE AT THE TOP ANSWERS THE QUESTION HE ACTUALLY HAS, and it has
  // to be true at a loss as well as at a profit — a screen that only reads
  // correctly in a good month is a screen that lies in a bad one.
  const lede = m.collected === 0
    ? t("Nothing came in this period.")
    : m.net >= 0
      ? t("You brought in {in} and kept {net} of it.", { in: money(m.collected), net: money(m.net) })
      : t("You brought in {in} and spent {out} — that is {down} down.",
        { in: money(m.collected), out: money(m.spent), down: money(Math.abs(m.net)) });

  const busiest = m.week.reduce((a, d) => Math.max(a, d.jobs), 0);

  return (
    <div className="advanced">
      <button className="btn sm inline ghost advback" onClick={onClose}>
        <ChevronLeft strokeWidth={2} /> {t("Back to Money")}
      </button>

      {/* ── THE ANSWER, THEN THE PROPORTION ───────────────────────────── */}
      <div className="tight">
        <p className="advlede">{lede}</p>
        {m.collected > 0 && (
          <>
            <div className="advsplit" aria-hidden="true">
              <span className="kept" style={{ flex: Math.max(0, m.net) }} />
              <span className="gone" style={{ flex: Math.max(0, m.spent) }} />
            </div>
            <div className="advsplit-k quiet">
              <span>{t("Kept")} · {money(Math.max(0, m.net))}</span>
              <span>{t("Spent")} · {money(m.spent)}</span>
            </div>
          </>
        )}
      </div>

      {/* ── WHAT IT WAS WORTH ─────────────────────────────────────────── */}
      <div className="tight">
        <span className="label">{t("What it was worth")}</span>
        <div className="sunken">
          {/* HIS FAVOURITE FIGURE, AND IT IS THE ONLY ONE SET LARGE — *"this is
              my favourite because I like to see kind of how much I make an
              hour."* Hours are the BOOKED duration; nobody clocks in, and the
              row says so when some jobs have no time on them rather than
              printing a wage nobody can account for. */}
          <span className="label">{t("Per hour, after expenses")}</span>
          <div className="figure lead" style={{ marginTop: 4 }}>
            {m.hours > 0 ? money(m.hourly) : "—"}
          </div>
          <p className="quiet" style={{ marginTop: 4 }}>
            {m.hours > 0
              ? t("{net} over {hours} hours booked", { net: money(m.net), hours: hrs(m.hours) })
              : t("No job in this period has a length on it.")}
            {m.hoursMissing > 0
              ? ` · ${n(m.hoursMissing, "{count} job had no length and is not counted",
                "{count} jobs had no length and are not counted")}`
              : ""}
          </p>
          <hr className="rule" />
          <Row label={t("Net")} value={money(m.net)} />
          <Row label={t("Margin")} value={m.collected > 0 ? pct(m.margin) : "—"}
            note={t("what you keep of every dollar")} />
          <Row label={t("In the bank")} value={money(m.collectedPaid)} />
          {/* STILL OWED IS THE ONE FIGURE HERE THAT IS A TO-DO RATHER THAN A
              RESULT, so it is marked when it is not zero and silent when it is
              — `--bad` is the product's fixed red and never the tenant's
              accent (law 11b). */}
          <Row label={t("Still owed")}
            value={<span style={{ color: m.owed > 0 ? "var(--bad)" : undefined }}>{money(m.owed)}</span>}
            note={m.owed > 0 ? t("work finished, not paid for") : null} />
        </div>
      </div>

      {/* ── WHAT CAME IN ──────────────────────────────────────────────── */}
      <div className="tight">
        <span className="label">{t("What came in")}</span>
        <div className="sunken">
          <Row label={t("Jobs done")} value={String(m.jobs)} />
          <Row label={t("Average job")} value={money(m.avgTicket)} />
          <hr className="rule" />
          <Row label={t("Quoted up front")} value={money(m.quoted)} />
          <Row label={t("Sold at the job")} value={money(m.onSite)} />
          {/* **THE RATE, NOT ONLY THE MONEY — and this figure is not on his own
              dashboard.** "$340 of upsells" is an outcome; "on 9 of 12 jobs" is
              a habit, and a habit is the thing a detailer can decide to
              change. */}
          <Row label={t("How often you sell something extra")}
            value={m.jobs > 0 ? pct(m.upsellRate) : "—"}
            note={m.upsoldJobs > 0
              ? t("{count} of {total} · {avg} each", {
                count: m.upsoldJobs, total: n(m.jobs, "{count} job", "{count} jobs"),
                avg: money(m.avgUpsell) })
              : null} />
          <hr className="rule" />
          {/* TIPS ARE THE ONES THE DETAILER WROTE DOWN, and the note says so.
              His own answer when asked: *"I always track my tips... it takes
              the same amount of effort to add it as a tip and add it as just a
              regular thing."* True of him; the note is for everyone else. */}
          <Row label={t("Tips")} value={money(m.tipTotal)}
            note={t("the ones you wrote down when finishing a job")} />
          <Row label={t("Average tip")} value={m.tippedJobs > 0 ? money(m.avgTip) : "—"} />
          <Row label={t("Jobs with a tip on them")}
            value={m.jobs > 0 ? `${m.tippedJobs} ${t("of")} ${m.jobs}` : "—"} />
        </div>
      </div>

      {/* ── WHERE IT WENT ─────────────────────────────────────────────── */}
      <div className="tight">
        <span className="label">{t("Where it went")}</span>
        {m.byCategory.length === 0 ? (
          <p className="body">{t("Nothing written down as an expense in this period.")}</p>
        ) : (
          <div className="sunken">
            {m.byCategory.map((c) => (
              <Meter key={c.name} cap name={t(c.name)} value={money(c.amount)} share={c.share} tone="bad" />
            ))}
            <hr className="rule" />
            <Row label={t("Everything out")} value={money(m.spent)} />
          </div>
        )}
      </div>

      {/* ── WHAT SELLS ────────────────────────────────────────────────── */}
      {/* **HIS OWN LATE ADDITION AND HE ASKED TWICE THAT IT NOT BE LOST** —
          *"definitely don't forget that, like, most popular packages."* It is
          the only block here about what to do NEXT: the others report a month
          that has already happened. */}
      <div className="tight">
        <span className="label">{t("What sells")}</span>
        {m.packages.length === 0 ? (
          <p className="body">{t("No finished job in this period has a service on it.")}</p>
        ) : (
          <div className="sunken">
            {m.packages.slice(0, 8).map((p) => (
              <Meter key={p.name} name={p.name} share={p.share}
                value={`${p.count} · ${money(p.total)}`} />
            ))}
          </div>
        )}
      </div>

      {/* ── THE WEEK ──────────────────────────────────────────────────── */}
      {/* SEVEN COLUMNS, NOT A TREND LINE. A fixed seven-way comparison is a
          shape somebody reads in one look; the two sentences under it are the
          same fact for anyone who is listening to the screen rather than
          looking at it, and they are two DIFFERENT days often enough that both
          are worth printing. */}
      <div className="tight">
        <span className="label">{t("Your week")}</span>
        {busiest === 0 ? (
          <p className="body">{t("No finished jobs in this period.")}</p>
        ) : (
          <div className="sunken">
            <div className="advweek" aria-hidden="true">
              {m.week.map((d) => (
                <span key={d.name}>
                  <span className="advweek-bar">
                    <span style={{ height: `${Math.round((d.jobs / busiest) * 100)}%` }} />
                  </span>
                  <span className="advweek-d">{t(d.name).slice(0, 1)}</span>
                </span>
              ))}
            </div>
            <hr className="rule" />
            <Row label={t("Busiest day")}
              value={m.busiestDay ? t(m.busiestDay.name) : "—"}
              note={m.busiestDay ? n(m.busiestDay.jobs, "{count} job", "{count} jobs") : null} />
            <Row label={t("Best-paying day")}
              value={m.bestDay ? t(m.bestDay.name) : "—"}
              note={m.bestDay ? money(m.bestDay.total) : null} />
          </div>
        )}
      </div>

      {/* ── WHO ───────────────────────────────────────────────────────── */}
      <div className="tight">
        <span className="label">{t("Who came")}</span>
        <div className="sunken">
          {historyFailed && (
            <p className="quiet" style={{ marginBottom: 8 }}>
              {t("Could not check who had been before, so everyone below counts as new.")}
            </p>
          )}
          <Row label={t("People")} value={String(m.people)}
            note={t("not jobs — somebody who came twice is one person")} />
          <Row label={t("First time")} value={String(m.newCustomers)} />
          <Row label={t("Been before")} value={String(m.returningCustomers)} />
          <Row label={t("Came back")} value={m.people > 0 ? pct(m.returnRate) : "—"} />
          {m.topSpender && (
            <>
              <hr className="rule" />
              <Row label={t("Spent the most")} value={money(m.topSpender.total)}
                note={`${m.topSpender.name} · ${n(m.topSpender.jobs, "{count} job", "{count} jobs")}`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
