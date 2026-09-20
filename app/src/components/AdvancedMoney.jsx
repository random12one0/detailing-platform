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
//   LEFT vs SPENT     one bar, two segments. "$400 left" is a number; the
//                     proportion is the thing he is actually judging.
//                     **THE WORDS ON IT CHANGED IN ROADMAP 14.7 AND THE
//                     PICTURE DID NOT.** It said KEPT, and a third of what it
//                     was drawing had not been paid for.
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
import { advancedMoney, RATE_FLOOR } from "../lib/moneyAdvanced.js";
import { categoryWord } from "./ExpenseModal.jsx";
import { getAppLocale, t } from "../lib/appI18n.js";
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
// **A TILE, NOT A ROW — his review of 2026-09-11, and it is the whole shape of
// this screen now.** *"With everything in rows, it takes up a ton of space,
// which I think was probably even a worse decision than even the boxes. But
// everything's just a simple number in a row… even myself, I'm bored of just
// kind of looking through and having to read at every what the title is and
// what the number means."*
//
// A `label ......... value` row spends a whole line on one number and gives
// the eye nothing to land on, so twenty of them is a page of homework. A tile
// puts the FIGURE first at a size you can read across a van, its name under
// it, and the change against last period beside it — three facts in the space
// a row spent on one, and the important one is the one that is big.
// **A PERCENTAGE NEEDS A DENOMINATOR THAT CAN CARRY IT — 2026-09-12.**
//
// This divided by the previous period whatever that period was, and printed
// the result as an arrow and a number. Two ways that produced a figure nobody
// could use, both found in a real month:
//
//   `▼118%`  — net went from positive to negative. A percentage across a sign
//              flip is arithmetic with no meaning: 118% of WHAT, when the two
//              numbers are on opposite sides of zero? The honest fact is the
//              distance, `down $859`.
//   `▼33%`   — three jobs became two. True, and it dresses one job in the
//              language of a trend. `down from 3` is the same fact and cannot
//              be misread as a rate.
//
// So a COUNT never takes a percentage, and money falls back to the distance
// whenever the base cannot carry a ratio. Everything else is unchanged.
function changeWords({ now, prev, unit }) {
  if (prev === undefined || prev === null || now === undefined || now === null) return null;
  if (now === prev) return null;
  const up = now > prev;
  if (unit === "count") {
    return { up, text: t(up ? "up from {n}" : "down from {n}", { n: prev }) };
  }
  // No base, or the two numbers are on opposite sides of zero.
  if (prev === 0 || (now < 0) !== (prev < 0)) {
    return { up, text: t(up ? "up {amount}" : "down {amount}", { amount: money(Math.abs(now - prev)) }) };
  }
  const diff = (now - prev) / Math.abs(prev);
  // A CHANGE UNDER HALF A PERCENT IS NOISE and printing it as an arrow makes a
  // flat period look like a moving one.
  if (Math.abs(diff) < 0.005) return null;
  return { up, text: `${up ? "▲" : "▼"} ${Math.round(Math.abs(diff) * 100)}%` };
}

function Kpi({ label, value, now, prev, note, tone, unit }) {
  const change = changeWords({ now, prev, unit });
  return (
    <div className="advkpi">
      <div className="advkpi-v num" style={{ color: tone === "bad" ? "var(--bad)" : undefined }}>
        {value}
      </div>
      <div className="advkpi-l">{label}</div>
      {change && <span className={`delta ${change.up ? "up" : "down"}`}>{change.text}</span>}
      {note && <p className="advkpi-n">{note}</p>}
    </div>
  );
}

// **AND EVERY BLOCK SAYS WHAT IT IS FOR.** The other half of his note: *"it's
// kinda just hard to understand what this is actually showing you… it needs to
// be visually a whole ton better at explaining what is actually here."* A
// heading names a block; one plain sentence says what question it answers, and
// that sentence is the difference between a figure somebody reads and a figure
// somebody uses. One per block, never one per number — that would be the
// clutter his 2026-09-01 rule is about.
function Panel({ title, says, children }) {
  return (
    <div className="tight">
      <span className="label">{title}</span>
      {says && <p className="advsays">{says}</p>}
      <div className="sunken">{children}</div>
    </div>
  );
}

function Meter({ name, value, share, tone }) {
  return (
    <div className="advmeter">
      <span className="advmeter-k">{name}</span>
      <span className="advmeter-bar" aria-hidden="true">
        <span style={{ width: `${Math.max(2, Math.round(share * 100))}%`,
          background: tone === "bad" ? "var(--bad)" : "var(--ac)" }} />
      </span>
      <span className="advmeter-v num">{value}</span>
    </div>
  );
}

export default function AdvancedMoney({
  bookings, expenses, lineItems, period, previous, onClose,
}) {
  useAppLocale();
  const { business } = useBusiness();
  // **WHO HAD BOOKED BEFORE THIS PERIOD, which nothing else on Money needs.**
  // The screen's own reads are bounded by the chart's range, so "is this a new
  // customer" cannot be answered from them: a regular of three years who last
  // came in March would read as new in September. One narrow read, only when
  // this screen is open, and only two columns of it.
  const [history, setHistory] = useState(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  // WHERE THEY CAME FROM. Two reads, only while this screen is open, and both
  // narrow: the links themselves, and every visit in the period. A visit row
  // is four short columns and a detailer's traffic is measured in hundreds.
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

  // THE CAMPAIGN AND VISIT READS ARE GONE WITH THE BLOCK THEY FED (2026-09-11).
  // Two queries on every open of this screen, for a summary that now lives on
  // Tracking links — the page is one round trip lighter for it. `whereFrom` in
  // `lib/moneyAdvanced.js` is still exported and still tested; it is that
  // screen's arithmetic now, not this one's.

  const m = advancedMoney({ bookings, expenses, lineItems, period, previous, history });

  // THE SENTENCE AT THE TOP ANSWERS THE QUESTION HE ACTUALLY HAS, and it has
  // to be true at a loss as well as at a profit — a screen that only reads
  // correctly in a good month is a screen that lies in a bad one.
  const lede = m.earned === 0
    ? t("Nothing came in this period.")
    : m.net >= 0
      ? t("You earned {in} and {net} is left after expenses.", { in: money(m.earned), net: money(m.net) })
      : t("You earned {in} and spent {out}, so you are {down} down.",
        { in: money(m.earned), out: money(m.spent), down: money(Math.abs(m.net)) });

  const busiest = m.week.reduce((a, d) => Math.max(a, d.jobs), 0);

  // **A RATE NEEDS JOBS UNDER IT, AND A FIRST MONTH DOES NOT HAVE THEM —
  // 2026-09-12, from an outside review of a real two-job period.**
  //
  // What this screen printed at two jobs, every line of it arithmetically
  // correct: *MOST BOOKED · 1*, *-$31.29 per hour* over 4.3 hours,
  // *100% CAME BACK* from two people, *BUSIEST DAY Wednesday, 1 job*, and a
  // wall of zeros. **That is what every detailer's first month looks like**,
  // so it is not an edge case to tolerate — it is the first thing a new
  // customer sees, and it reads as a broken screen or, worse, as a business
  // failing.
  //
  // A superlative over one job is not a superlative. A percentage over two
  // people is not a rate. Eight is the floor: below it every rate, percentage
  // and best-of is replaced by ONE panel that says so and keeps the four
  // figures that are simply counted rather than derived.
  //
  // **WHAT IS DELIBERATELY NOT DONE HERE:** roadmap 8.9 leaves this screen
  // half-built on purpose — three of its six money figures are tip figures and
  // the customer-entered tip does not exist yet. This floor makes the half
  // that DOES exist read honestly. It is not the missing half and must not
  // grow into it.
  const THIN = RATE_FLOOR;
  const thin = m.jobs < THIN;

  return (
    <div className="advanced">
      <button className="btn sm inline ghost advback" onClick={onClose}>
        <ChevronLeft strokeWidth={2} /> {t("Back to Money")}
      </button>

      {/* ── THE ANSWER, THEN THE PROPORTION ───────────────────────────── */}
      <div className="tight">
        <p className="advlede">{lede}</p>
        {/* **EVERY ARROW ON THIS SCREEN IS AGAINST THE SAME STRETCH OF TIME,
            AND WHEN THAT STRETCH IS A PART PERIOD IT SAYS SO — ROADMAP 5.2.**
            The four tiles under "What it was worth" and the "Earned" tile
            print a bare "▼ 69%" with nothing beside it naming what the 69% is
            against; while the period is still running that used to be a whole
            month, measured against seventeen days. `previous` now arrives cut
            to the same point, from `previousSoFar` in `lib/periods.js` — one
            line here rather than a caption per tile, because it is one fact
            about the whole screen.
            **AND NOT WHEN THERE ARE NO ARROWS TO EXPLAIN.** Under `THIN` the
            tiles that carry a change are withheld, so this sentence described
            nothing that was on the screen — seen on the demo business at four
            finished jobs, 2026-09-18. A caption for an absent thing is the
            same kind of claim this item was opened about. */}
        {previous?.partial && !thin && (
          <p className="quiet" style={{ marginTop: "var(--sp-2)" }}>
            {t("Changes are against the same point in the period before.")}
          </p>
        )}
        {m.earned > 0 && (
          <>
            <div className="advsplit" aria-hidden="true">
              <span className="kept" style={{ flex: Math.max(0, m.net) }} />
              <span className="gone" style={{ flex: Math.max(0, m.spent) }} />
            </div>
            <div className="advsplit-k quiet">
              <span>{t("Left after expenses")} · {money(Math.max(0, m.net))}</span>
              <span>{t("Spent")} · {money(m.spent)}</span>
            </div>
          </>
        )}
      </div>

      {/* ── TOO FEW JOBS TO READ RATES ────────────────────────────────── */}
      {thin && (
        <Panel title={t("Too few jobs to read rates")}
          says={t("Rates, percentages and best-of-the-week need more finished jobs behind them than this period has. These four are counted, not worked out, so they are the ones worth reading.")}>
          <div className="advkpis">
            <Kpi label={t("Earned")} value={money(m.earned)} />
            <Kpi label={t("Spent")} value={money(m.spent)} />
            <Kpi label={t("Earned less expenses")} value={money(m.net)} tone={m.net < 0 ? "bad" : undefined} />
            <Kpi label={t("Jobs done")} value={String(m.jobs)} />
          </div>
          <p className="advkpi-n" style={{ marginTop: "var(--sp-3)" }}>
            {n(THIN - m.jobs, "{count} more finished job and the rest of this screen fills in.",
              "{count} more finished jobs and the rest of this screen fills in.")}
          </p>
        </Panel>
      )}

      {!thin && (<>
      {/* ── WHAT IT WAS WORTH ─────────────────────────────────────────── */}
      {/* ONE HERO AND FOUR TILES, WHERE THERE WERE SIX ROWS. The hero is his
          favourite figure and the only one set large — *"this is my favourite
          because I like to see kind of how much I make an hour."* Hours are
          the BOOKED duration; nobody clocks in, and it says so when some jobs
          have no time on them rather than printing a wage nobody can account
          for.
          The four under it are what that hour is made of, and each carries its
          own change against the same period one step back — which is the fact
          a row could never fit and the one that tells a detailer whether to do
          anything. */}
      <Panel title={t("What it was worth")}
        says={t("What is left of what you earned after everything you spent.")}>
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
        <div className="advkpis">
          <Kpi label={t("Earned less expenses")} value={money(m.net)} now={m.net} prev={m.prevNet} />
          <Kpi label={t("Margin")} value={m.earned > 0 ? pct(m.margin) : "—"}
            note={t("of every dollar earned")} />
          <Kpi label={t("Jobs done")} value={String(m.jobs)} now={m.jobs} prev={m.prevJobs} unit="count" />
          <Kpi label={t("Average job")} value={money(m.avgTicket)}
            now={m.avgTicket} prev={m.prevAvgTicket} />
        </div>
      </Panel>

      </>)}

      {/* ── STILL TO COLLECT ──────────────────────────────────────────── */}
      {/* TWO FIGURES THAT ONLY MEAN ANYTHING TOGETHER, so they share a box —
          his own instruction: *"maybe even things that are related could be in
          one box."* Banked against owed is one question, not two numbers.
          `--bad` is the product's fixed red and never the tenant's accent
          (law 11b), and it is only spent when there is something to chase. */}
      <Panel title={t("Still to collect")}
        says={m.owed > 0
          ? t("Work you have finished and not been paid for yet.")
          : t("Everything finished in this period has been paid for.")}>
        <div className="advkpis two">
          {/* **"Collected" RATHER THAN "In the bank" — ROADMAP 14.7.** Not
              because the old words were false — they were the one honest cash
              label in this product — but because the everyday Money screen now
              carries the same pair, and two screens showing one figure under
              two names is how a detailer ends up believing they are two
              figures. `m.collected` is the field that means cash; it was
              called `collectedPaid` until 14.7, beside an accrual field called
              `collected`, which is how this cell was one keystroke from
              showing the overstatement under the label that promises it
              cannot. */}
          <Kpi label={t("Collected")} value={money(m.collected)} />
          <Kpi label={t("Still owed")} value={money(m.owed)}
            tone={m.owed > 0 ? "bad" : undefined}
            note={m.owed > 0 ? t("work finished, not paid for") : null} />
        </div>
      </Panel>

      {!thin && (<>
      {/* ── WHAT CAME IN ──────────────────────────────────────────────── */}
      {/* **QUOTED AGAINST SOLD ON SITE IS A PROPORTION, SO IT IS DRAWN AS
          ONE.** Two money rows made a detailer do the division in their head
          to answer the only question worth asking — how much of this month
          came from selling once you were already there. A bar answers it
          without any arithmetic, and the sentence under it is the HABIT
          rather than the outcome: "$340 of upsells" is a result, "on 9 of 12
          jobs" is something you can decide to do more of.
          Tips keep their own line because they are money somebody CHOSE to
          give, which is a different fact from a price, and the note says they
          are only the ones written down at the job. */}
      <Panel title={t("What came in")}
        says={t("Where the money came from: what you quoted, and what you sold once you were there.")}>
        <div className="advkpis two">
          <Kpi label={t("Earned")} value={money(m.earned)}
            now={m.earned} prev={m.prevEarned} />
          <Kpi label={t("Sold at the job")} value={money(m.onSite)}
            note={m.jobs > 0
              ? t("on {count} of {total}", {
                count: m.upsoldJobs, total: n(m.jobs, "{count} job", "{count} jobs") })
              : null} />
        </div>
        {m.earned > 0 && (m.quoted > 0 || m.onSite > 0) && (
          <>
            <div className="advsplit" style={{ marginTop: "var(--sp-3)" }} aria-hidden="true">
              <span className="kept" style={{ flex: Math.max(0, m.quoted) }} />
              <span className="gone" style={{ flex: Math.max(0, m.onSite) }} />
            </div>
            <div className="advsplit-k quiet">
              <span>{t("Quoted up front")} · {money(m.quoted)}</span>
              <span>{t("Sold at the job")} · {money(m.onSite)}</span>
            </div>
          </>
        )}
        <hr className="rule" />
        <div className="advkpis three">
          <Kpi label={t("Sells an extra")} value={m.jobs > 0 ? pct(m.upsellRate) : "—"}
            note={m.upsoldJobs > 0 ? t("{avg} each", { avg: money(m.avgUpsell) }) : null} />
          <Kpi label={t("Tips")} value={money(m.tipTotal)}
            note={t("only the ones you wrote down")} />
          <Kpi label={t("Left a tip")}
            value={m.jobs > 0 ? `${m.tippedJobs}/${m.jobs}` : "—"}
            note={m.tippedJobs > 0 ? t("{avg} each", { avg: money(m.avgTip) }) : null} />
        </div>
      </Panel>

      </>)}

      {/* ── WHERE IT WENT ─────────────────────────────────────────────── */}
      <div className="tight">
        <span className="label">{t("Where it went")}</span>
        {m.byCategory.length === 0 ? (
          <p className="body">{t("Nothing written down as an expense in this period.")}</p>
        ) : (
          <div className="sunken">
            {m.byCategory.map((c) => (
              <Meter key={c.name} name={categoryWord(c.name, getAppLocale())} value={money(c.amount)} share={c.share} tone="bad" />
            ))}
            <hr className="rule" />
            <Row label={t("Everything out")} value={money(m.spent)} />
          </div>
        )}
      </div>

      {!thin && (<>
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
                  {/* **THE COUNT, NOT ONLY THE HEIGHT — 2026-09-12.** Seven
                      bars with no number on them and no axis is a shape you
                      can rank but not read: "Wednesday is tallest" was the
                      only fact available, and at one job against zero that is
                      a superlative dressed up as a chart. The figure is the
                      content and the bar is the drawing, which is the rule
                      this screen's own `Meter` already follows. */}
                  <span className="advweek-n num">{d.jobs || ""}</span>
                  <span className="advweek-bar">
                    <span style={{ height: `${Math.round((d.jobs / busiest) * 100)}%` }} />
                  </span>
                  <span className="advweek-d">{t(d.name).slice(0, 1)}</span>
                </span>
              ))}
            </div>
            <hr className="rule" />
            <div className="advkpis two">
              <Kpi label={t("Busiest day")} value={m.busiestDay ? t(m.busiestDay.name) : "—"}
                note={m.busiestDay ? n(m.busiestDay.jobs, "{count} job", "{count} jobs") : null} />
              <Kpi label={t("Best-paying day")} value={m.bestDay ? t(m.bestDay.name) : "—"}
                note={m.bestDay ? money(m.bestDay.total) : null} />
            </div>
          </div>
        )}
      </div>


      </>)}

      {/* ── WHERE THEY CAME FROM — GONE FROM THIS SCREEN, HIS CALL ─────── */}
      {/* **2026-09-11, and he reversed his own earlier decision to put it
          here:** *"the through-your-links thing, I think that should be a
          different tab or more accessible, because right now it's kind of in
          the middle of all this stuff… I think it should all be one GUI, and I
          think it should be outside of the advanced pricing. I think that was
          the wrong call by me."*
          He is right, and the reason is sharper than placement: this screen
          answers "how did the business do", and a link is something you SET UP
          and then check. Two jobs, one page, and the setting-up half was
          stranded eight blocks down where nobody would look for it.
          **The whole feature lives on Tracking links** (`?settings=campaigns`),
          which already has per-link opens, bookings, conversion and money
          earned — everything the summary here was a thin copy of. Money links
          to it rather than restating it, because a second copy of a number is
          how two screens come to disagree. */}
      {/* ── WHO ───────────────────────────────────────────────────────── */}
      {/* NEW AGAINST RETURNING IS THE POINT OF THIS BLOCK, so it is a bar and
          not four rows. Four counts that add up to each other are the exact
          shape he was bored of reading; the proportion is the thing a detailer
          can act on, and the two counts are printed under it for anyone who
          wants them. */}
      {!thin && (
      <Panel title={t("Who came")}
        says={t("Whether this period was new faces or people coming back.")}>
        {historyFailed && (
          <p className="quiet" style={{ marginBottom: 8 }}>
            {t("Could not check who had been before, so everyone below counts as new.")}
          </p>
        )}
        <div className="advkpis two">
          <Kpi label={t("People")} value={String(m.people)}
            note={t("somebody who came twice is one person")} />
          <Kpi label={t("Came back")} value={m.people > 0 ? pct(m.returnRate) : "—"} />
        </div>
        {m.people > 0 && (
          <>
            <div className="advsplit" style={{ marginTop: "var(--sp-3)" }} aria-hidden="true">
              <span className="gone" style={{ flex: Math.max(0, m.newCustomers) }} />
              <span className="kept" style={{ flex: Math.max(0, m.returningCustomers) }} />
            </div>
            <div className="advsplit-k quiet">
              <span>{t("First time")} · {m.newCustomers}</span>
              <span>{t("Been before")} · {m.returningCustomers}</span>
            </div>
          </>
        )}
        {m.topSpender && (
          <>
            <hr className="rule" />
            <Row label={t("Spent the most")} value={money(m.topSpender.total)}
              note={`${m.topSpender.name} · ${n(m.topSpender.jobs, "{count} job", "{count} jobs")}`} />
          </>
        )}
      </Panel>
      )}
    </div>
  );
}
