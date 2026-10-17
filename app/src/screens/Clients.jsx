// Clients — the only screen in the product with NO PANEL ON IT (law 1's
// register), and the only record with no container.
//
// REBUILT IN ROADMAP 2.11 STEP 6, STAGE 5, against
// docs/dashboard-screen-designs-2026-08-31.md §8-9 (the shape) and
// docs/dashboard-phone-pass-2026-08-31.md §9-10 (the phone, which overrides
// it wherever the two disagree). What changed and why:
//
//   THE ROW      It printed `name / phone · email`. Email is the least useful
//                thing about a customer to a detailer holding a phone, and
//                the two figures the screen already calculated — how many
//                times they have been in, and what they have spent — were
//                hidden inside the sheet. The list now SHOWS what it
//                calculates: name · last visit · lifetime spend · phone at a
//                desk, and two cells on a phone (phone pass §9). Email is
//                dropped from the row and stays in the record.
//   LAST VISIT   Part B row 6: it read the first row of a newest-first
//                history without checking the job had happened, so a booking
//                on the calendar could print as a past visit. It is now the
//                most recent COMPLETED job that has already ENDED — nothing
//                finished may ever be printed in the future.
//   SORT/FILTER  His decision 3, manual only: three sorts and one chip. When
//                the chip is on, the header offers the action — "Text these
//                12" — which is the "act on the answer" half of the same
//                decision. Automatic "we miss you" messages on a timer are a
//                different thing and are not this.
//   THE CAP      200 rows, silently, with a search that hits the database
//                each keystroke. A silent truncation reads as a complete
//                list, so the cap states itself and names the way past it.
//   THE ERROR    `const { data } = await q` turned a dropped connection into
//                "no customers yet" — the same defect useBookings carried
//                until stage 3 and loadExtras until stage 4. Third time; it
//                is a pattern to grep for, not a bug that keeps being fixed.
//   THE RECORD   Was a <Sheet> at every width. It goes through RecordHost
//                like every other record, and at a desk it is the right
//                column of a 1.4 / 1 split — with NO CARD AROUND IT, which is
//                the whole reason §9 specifies it separately from the job
//                record. Bare ruled rows on the ground.
//   TWO COPY     Part B row 18: the phone number was printed twice (subtitle
//   DEFECTS      and button), and every history row repeated the client's own
//                name on the one screen where the name is the least useful
//                thing in the row. A history row is date · what · total.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, ChevronRight, ListChecks, Mail, MessageSquare, Phone } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { api } from "../lib/api.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import BookingLink from "../components/BookingLink.jsx";
import NewBookingModal from "../components/NewBookingModal.jsx";
import { fetchBooking, withLocal, BOOKING_SELECT } from "../hooks/useBookings.js";
import { dateLong, localDate, money, phone, todayLocal } from "../lib/format.js";
// ROADMAP 7.7 — the file builder is in its own module with no DOM in it, so
// `tests/customer-export.test.mjs` can assert what lands in the spreadsheet
// without a browser. Same reason `accountant-export.js` is not inside Money.
import { customersCsv, customersFilename } from "../lib/customer-export.js";
// THE ARITHMETIC IS IN ITS OWN FILE so `tests/client-list.test.mjs` can import
// it with no browser — the same reason `accountant-export.js` is separate from
// Money. Three of the four decide something a person acts on: what the screen
// prints as the last time somebody was in, who counts as gone, and who ends up
// on the end of a group text. Part B row 6 was a defect of exactly that kind
// and nothing could have caught it while it lived in here.
import { agoWords, arrange, summarise } from "../lib/client-list.js";
// Roadmap 2.14. The plan's own words for its rhythm, from the one file that
// knows them — the Plans screen and this record must not describe the same
// cadence two different ways.
import { cadenceWords, statusWords } from "../lib/plans.js";
import BookingDetail, { jobRecordProps } from "../components/BookingDetail.jsx";
import CampaignModal from "../components/CampaignModal.jsx";
import RecordHost from "../components/RecordHost.jsx";
// ROADMAP 5.3 — the mail rows moved into their own file so the JOB record
// draws the same ones. The seven-states-to-three mapping lives there now.
import EmailTrail from "../components/EmailTrail.jsx";
import { Segmented } from "../components/controls.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { appIntlLocale, getAppLocale, t } from "../lib/appI18n.js";
// "1 jobs" is the oldest bug in this product, and it came back twice on this
// screen under two different verbs. Same shape Business.jsx and
// AdvancedMoney.jsx already use — a third copy of three lines rather than a
// refactor of two working files; lift it into appI18n if a fourth appears.
const n = (v, one, many) => t(v === 1 ? one : many, { count: v });
import { useAppLocale } from "../hooks/useAppLocale.js";

// Manual, and three of them (decision 3). Three choices is a segmented
// control, never a <select> — design system § Composition.
const SORTS = [["recent", "Recent"], ["spent", "Most spent"], ["away", "Longest away"]];
// What the database read takes, and what the screen states rather than hides.
const ROW_CAP = 200;
// A ten-year client's history is the longest list in the record.
const HISTORY_CAP = 50;
// ROADMAP 14.3 — the mail we sent this person. Short on purpose: the question
// it answers is "did the last one arrive", and a detailer scrolling two years
// of reminders to find it is the failure mode.
const MAIL_CAP = 12;

const shortDate = (d) => new Date(`${d}T12:00:00`)
  .toLocaleDateString(appIntlLocale(), { weekday: "short", month: "short", day: "numeric" });

// `intent` is App's one-word answer to "what was this screen opened for" —
// "lapsed" when Today's re-book prompt sent them here (roadmap 2.19). It is
// read once, on arrival: turning the chip off has to stick.
export default function Clients({ intent = null, onSetup = null, refreshKey = 0 }) {
  // ROADMAP 8.17 STAGE 2B — `lib/plans.js`'s generators are SHARED with the
  // customer's plan page and default to English on purpose, because
  // `dp.lang` is a per-device choice a CUSTOMER makes. The dashboard has to
  // hand them its OWN language; a call site that forgets renders correct
  // English inside a Spanish screen, with no string for any check to find.
  const lang = useAppLocale();
  // `reloadBusiness` is here for one line: a send stamps
  // `businesses.last_campaign_at`, and that is what Today's nudge reads to
  // know it can stop asking. Without it the prompt is still there when the
  // detailer taps back, having just done the thing it asked for.
  const { business, can, role, reload: reloadBusiness, siteOrigin } = useBusiness();
  // IS THERE ANYTHING TO SELL — a deliberate second copy of Today's read
  // (`Today.jsx`, `sellable`) and not a shared hook, because the whole of
  // it is one head-count against one table with one filter, and the two
  // can only ever drift to the same answer. A hook would be a file, an
  // import on two screens and a refactor of a verified one, to save five
  // lines.
  const [sellable, setSellable] = useState(null);
  useEffect(() => {
    let live = true;
    supabase.from("services").select("id", { count: "exact", head: true })
      .eq("business_id", business.id).eq("is_active", true)
      .then(({ count }) => { if (live) setSellable(count ?? 0); });
    return () => { live = false; };
  }, [business.id, refreshKey]);
  // Lifetime spend is money, not rank — roadmap 2.13.
  const owner = can("money");
  const today = todayLocal(business.timezone);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [lapsed, setLapsed] = useState(intent === "lapsed");
  // ROADMAP 1.3 — OFF, AND IT IS THE ONLY DEFAULT THAT ANSWERS THE SCREEN'S
  // QUESTION. A test row is a row a check left behind: `zone-muew68al` with
  // the number "(555) 013-3", "Smoke TPMOY" with "(555) 014-2". Nobody can
  // ring them, nobody is worth ringing, and until now they sat in the list
  // and inside "gone quiet" — on `demo-detail`, three of the eight.
  const [showTest, setShowTest] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [totals, setTotals] = useState(new Map());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(null);      // customer
  const [history, setHistory] = useState(null); // null while the record's list loads
  const [mail, setMail] = useState(null);       // ROADMAP 14.3 — same null-means-loading rule
  const [mailErr, setMailErr] = useState("");   // ROADMAP 3.1 — a failed read is not an empty one
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(null); // ROADMAP 9.7 — customer to open New Booking with, or null
  const [notes, setNotes] = useState("");
  // WHO IS ON A PLAN — roadmap 2.14, research §3: "a plan badge on the client,
  // with the cadence". It is in the RECORD rather than in the row on purpose:
  // the row already carries three cells, and the list of who is on what is the
  // Plans screen's whole job. What this answers is the question a detailer has
  // with one customer in front of them.
  const [planBy, setPlanBy] = useState(new Map());
  // ROADMAP 2.19. The customers a compose sheet is open over, or null. A
  // snapshot of the list at the moment the button was pressed — re-reading
  // `rows` while somebody is typing would let a background refresh change who
  // they are writing to.
  const [writing, setWriting] = useState(null);
  // ROADMAP 8.11 — a customer asking to be forgotten. Three states, because a
  // permanent deletion gets ONE confirm and no more: null (the button), the
  // customer (the confirm), or "going" (in flight). Never a second dialog and
  // never a typed name — AB 2863's own reasoning about cancellation applies
  // to any irreversible thing a person is entitled to: put the consequence in
  // front of them once and then let them do it.
  const [forgetting, setForgetting] = useState(null);
  const [forgetError, setForgetError] = useState("");
  const [notesError, setNotesError] = useState("");
  // A refusal under the Notes box renders below the record panel's edge at
  // 1440 (ROADMAP 97.14); a line nobody sees is the silent failure it replaced.
  const notesErrorRef = useRef(null);
  useEffect(() => { if (notesError) notesErrorRef.current?.scrollIntoView({ block: "nearest" }); }, [notesError]);

  const load = useCallback(async () => {
    setBusy(true);
    let q = supabase
      .from("customers")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(ROW_CAP);
    if (search.trim()) q = q.or(`name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
    // NOTHING FINISHED MAY BE PRINTED IN THE FUTURE. `end_at <= now` is the
    // second half of "completed": a job can be marked done from the day panel
    // before its slot has run out, and a seeded or mistyped one can sit in
    // next week entirely.
    const totalsQ = supabase
      .from("bookings")
      .select("customer_phone, end_at, final_amount, total_price")
      .eq("business_id", business.id)
      .is("deleted_at", null)
      .eq("status", "completed")
      .lte("end_at", new Date().toISOString());
    // Every live membership for the business, in one read — there are at most
    // one per customer (`plan_members_one_live`), so this is smaller than the
    // customer list it is joined to.
    const plansQ = supabase
      .from("plan_members")
      .select("customer_id, status, plans(name, cadence_count, cadence_unit)")
      .eq("business_id", business.id)
      .neq("status", "ended");
    const [cs, ts, pm] = await Promise.all([q, totalsQ, plansQ]);
    // A FAILED READ MUST NOT LOOK LIKE AN EMPTY BUSINESS — the third site of
    // this defect (useBookings, Money's loadExtras, here). The last good list
    // stays drawn and the message goes above it.
    const failed = cs.error || ts.error;
    setError(failed ? (failed.message || t("Could not load your customers.")) : "");
    if (cs.data) setCustomers(cs.data);
    if (ts.data) setTotals(summarise(ts.data, business.timezone));
    // NOT part of `failed` above: a business with no plans reads zero rows and
    // that is the ordinary case, so a plan read that fails must not put an
    // error banner over a customer list that loaded perfectly well.
    if (pm.data) setPlanBy(new Map(pm.data.map((r) => [r.customer_id, r])));
    setBusy(false);
  }, [business.id, business.timezone, search]);

  useEffect(() => { load(); }, [load]);

  // ROADMAP 1.3 — ONE PLACE DECIDES WHO IS ON THIS SCREEN, AND EVERYTHING
  // ELSE READS `people`. `customers` is what came back from the database and
  // is used for exactly two things below: the row cap (a fact about the
  // QUERY, not about who is real) and the count of fixtures the chip offers.
  // Every list, every figure, every button's number and the export all take
  // `people`, because the defect this item is fixing was one screen counting
  // two different populations in two different places.
  //
  // `is_test` IS A COLUMN, NOT A RULE THIS SCREEN APPLIES. The obvious
  // shortcut — hide anyone whose email ends `.test` — is refused in the
  // migration's own header: the demo's thirteen seeded personas are
  // `@example.com`, which is just as reserved, so any rule wide enough to
  // catch a real dropping is one edit from emptying the demo of its content.
  // Which rows are fixtures is something somebody KNOWS.
  const fixtures = useMemo(() => customers.filter((c) => c.is_test).length, [customers]);
  const people = useMemo(
    () => (showTest ? customers : customers.filter((c) => !c.is_test)),
    [customers, showTest],
  );

  const rows = useMemo(
    () => arrange(people, totals, { sort, lapsed, today }),
    [people, totals, sort, lapsed, today],
  );

  // THE ANSWER, RATHER THAN THE LIST YOU WORK THE ANSWER OUT OF.
  //
  // Andrew's brief for this screen: *this is the screen a detailer opens to
  // answer who is worth ringing — who has not been back in a while, who spends
  // the most.* Until now it answered neither on arrival. The default sort is
  // last-visit-newest-first, so the people who have GONE QUIET are at the
  // bottom of the list, below the fold and below up to two hundred rows —
  // the screen's own reason to exist was the hardest thing on it to see. And
  // "who spends the most" took a press on the sort and then a read of row 1.
  //
  // So the two answers are stated in figures at the top, and each figure is
  // the control that shows you the people behind it. Same `.ledger` strip
  // Today and the client record already use — nothing invented.
  //
  // TWO CELLS AND NOT THREE. "Who is new" is the third question in the brief
  // and it is deliberately not here: `customers.created_at` is when the ROW
  // appeared, which for every customer in the demo is the moment of the seed,
  // and "first completed visit in the last 30 days" is nobody. Either way the
  // cell reads all-or-nothing on the only database anything can sign in to,
  // which is the exact failure the five lapsed customers were seeded to end.
  // See docs/VISUAL-CHANGES.md and FOUND.md.
  const answers = useMemo(() => {
    const quiet = arrange(people, totals, { sort: "away", lapsed: true, today });
    // `spend > 0` because "spends most" over a business whose customers have
    // all spent nothing names somebody for no reason.
    const top = arrange(people, totals, { sort: "spent", lapsed: false, today })[0];
    // LIFETIME SPEND IS OWNER-ONLY, here as everywhere else on this screen
    // (the row's third cell and the record's second figure both gate on it).
    // A staff member gets one cell, which `.ledger.one` already draws.
    return { quiet: quiet.length, top: owner && top && top.spend > 0 ? top : null };
  }, [people, totals, today, owner]);

  const openCustomer = async (c) => {
    setOpen(c);
    setNotes(c.notes || "");
    setNotesError("");
    setHistory(null);
    setMail(null);
    // ROADMAP 14.3 — READ, NEVER WRITTEN. `email_sends` grants the browser
    // `select` and nothing else, so this screen cannot mark a bounce as
    // delivered however hard it tries; the service role writes every row.
    //
    // **`data ?? []` WAS DRAWING A FAILED READ AS "no emails sent to this
    // address yet" — roadmap 3.1.** That sentence is the product answering the
    // one question 3.1 exists to stop it getting wrong, and it was being
    // printed on no evidence at all. The error goes to `EmailTrail`, which owns
    // the empty sentence and suppresses it.
    setMailErr("");
    supabase
      .from("email_sends")
      .select("id, subject, to_email, status, detail, sent_at")
      .eq("business_id", business.id)
      .eq("customer_id", c.id)
      .order("sent_at", { ascending: false })
      .limit(MAIL_CAP)
      .then(({ data: sends, error }) => {
        if (error) setMailErr(error.message); else setMail(sends ?? []);
      });
    const { data } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("business_id", business.id)
      .eq("customer_phone", c.phone)
      .is("deleted_at", null)
      .order("start_at", { ascending: false })
      .limit(HISTORY_CAP);
    setHistory((data ?? []).map((b) => withLocal(b, business.timezone)));
  };

  // ROADMAP 97.14 — the browser holds no write on `customers`; the notes go
  // through `set_customer_notes`, which checks membership and writes nothing
  // else. A refusal is shown: the old direct update failed silently. A view-as
  // tab on Looking throws before anything is sent, and says so here too.
  const saveNotes = async () => {
    try {
      const { error } = await supabase.rpc("set_customer_notes", {
        p_business_id: business.id, p_customer_id: open.id, p_notes: notes,
      });
      setNotesError(error ? t("Your notes were not saved. Please try again.") : "");
      if (!error) load();
    } catch (e) {
      setNotesError(e.message);
    }
  };

  // ROADMAP 8.11. The screen closes the record and reloads the list; the
  // SERVER decides everything else, including whether this person may do it.
  const forget = async (customer) => {
    setForgetError("");
    // ROADMAP 0.3 — FLAG, DON'T DELETE. Belt as well as braces: the control
    // below is not rendered on a flagged row, and this is the half that
    // survives somebody rendering it again, or a second call site arriving.
    // About sixty checks in `tests/` sign into these rows, and a check that
    // cannot run prints something that looks very like a pass, so deleting one
    // takes the net away silently. Inert until `customers.is_test` exists
    // (0.3b), exactly like the `!c.is_test` filter at the top of this screen.
    if (customer?.is_test) {
      setForgetError(t("This is a test row, not a person. Automated checks sign into these, so it cannot be deleted here."));
      setForgetting(null);
      return;
    }
    setForgetting("going");
    try {
      await api.deleteCustomer(business.id, customer.id);
      setForgetting(null);
      setOpen(null);
      load();
    } catch (e) {
      // The record stays open on a failure, with the reason on it. Closing it
      // would leave somebody unsure whether the deletion happened.
      setForgetError(e.message || t("We could not delete that. Please try again."));
      setForgetting(customer);
    }
  };

  // The action the filter earns (row 48). This product does not send texts
  // and is not going to — the inbox question was settled `no` in the
  // architecture doc — so it hands the numbers to the phone's own messages
  // app, which is where a detailer writes to a customer anyway.
  const smsHref = `sms:${rows.map((r) => r.c.phone).filter(Boolean).join(",")}`;

  // A LIST SOMEBODY NARROWED IS A LIST SOMEBODY CHOSE — roadmap 2.19. Either
  // control does it, and the actions below act on whatever is left.
  const narrowed = lapsed || !!search.trim();
  // AND THE TWO BUTTONS BELOW CARRY DIFFERENT NUMBERS, WHICH IS THE HONEST
  // ANSWER RATHER THAN AN INCONSISTENCY. A text reaches everyone on the list —
  // every customer has a phone number, it is the one required field. An email
  // reaches only those with an address who have not opted out, and in this
  // trade that is routinely fewer. "Email these 5" over a list where 3 get one
  // is the same defect this repo chases everywhere else: a number printed that
  // is not the number acted on.
  // `email_failed_at` JOINED THE TEST IN ROADMAP 2.20, and it belongs here for
  // the reason the paragraph above already gives: the number printed has to be
  // the number reached, and the provider has told us it will reject this one.
  // It is not a permanent verdict — the flag clears itself the next time
  // anything to that address goes through.
  const emailable = rows.filter((r) =>
    (r.c.email || "").trim() && !r.c.unsubscribed_at && !r.c.email_failed_at).length;

  const capped = !search.trim() && customers.length >= ROW_CAP;

  // ── ROADMAP 7.7 — "YOU EXPORT THEM AND GO", MADE TRUE ──────────────────
  // Andrew's ruling, `docs/MANAGER-CLOSE-2026-09-21.md` § 2. Three public
  // pages have promised this for the whole life of the pricing page and the
  // only download in the product was the accountant's jobs-and-expenses CSV.
  //
  // **IT DOES ITS OWN READ AND DELIBERATELY IGNORES `customers`.** That state
  // is capped at `ROW_CAP` (200) and is re-queried through the search box, so
  // exporting what the screen holds would hand a detailer with 400 customers
  // half their list and a detailer mid-search their search results — with
  // nothing anywhere saying so. `lib/customer-export.js` carries the full
  // reasoning.
  //
  // **AND IT PAGES.** PostgREST caps a response at 1,000 rows, so a single
  // `select("*")` is the same silent truncation one layer down: the 1,001st
  // customer would simply not be in the file. `readAll` walks until a short
  // page comes back.
  //
  // **NO NEW DATA PATH.** Same authenticated browser client as every other
  // read on this screen, same `business_id` filter, no edge function and no
  // service key — so it inherits the tenant policy rather than needing one of
  // its own. `customers`, `bookings` and `expenses` are all RLS-enabled AND
  // forced with `business_id in (select public.current_business_ids())`
  // (migration `20260827000200`), and `scripts/tenant-matrix.mjs` § 3 proves
  // a detailer cannot read another detailer's customers.
  const [exporting, setExporting] = useState("");
  const exportCustomers = async () => {
    setExporting("going");
    const readAll = async (build) => {
      const out = [];
      const SIZE = 1000;
      for (let from = 0; ; from += SIZE) {
        const r = await build().range(from, from + SIZE - 1);
        if (r.error) throw new Error(r.error.message);
        out.push(...(r.data ?? []));
        if ((r.data?.length ?? 0) < SIZE) return out;
      }
    };
    try {
      const [all, done] = await Promise.all([
        readAll(() => supabase.from("customers").select("*")
          .eq("business_id", business.id).order("name", { ascending: true })),
        readAll(() => supabase.from("bookings")
          .select("customer_phone, end_at, final_amount, total_price")
          .eq("business_id", business.id).is("deleted_at", null)
          .eq("status", "completed").lte("end_at", new Date().toISOString())),
      ]);
      // ROADMAP 1.3 — THE FILE HOLDS WHAT THE SCREEN HOLDS, and it is
      // filtered HERE rather than in the query on purpose: `.eq("is_test",
      // false)` is a 400 from PostgREST on any database where the column has
      // not been applied yet, which would turn a pending migration into a
      // broken download button. A `.filter` on rows that simply do not carry
      // the field keeps every one of them, which is the old behaviour
      // exactly.
      const input = {
        customers: showTest ? all : all.filter((c) => !c.is_test),
        totals: summarise(done, business.timezone),
        timezone: business.timezone,
      };
      const name = customersFilename(business.name);
      const file = new File([customersCsv(input)], name, { type: "text/csv" });
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      // THE COUNT IS THE POINT OF THE MESSAGE, not the filename. A download on
      // a desktop is invisible, and "it worked" about a file nobody can see is
      // the same as silence — the number is what a detailer can check against
      // the count at the top of this screen.
      setExporting(t("Saved {name} — {count} people", { name, count: input.customers.length }));
    } catch (e) {
      // A FAILED READ MUST NOT BECOME AN EMPTY FILE, and this is the worst
      // place on the screen for it: a spreadsheet with a header row and
      // nothing under it is a detailer concluding they have no customers.
      // Nothing is written at all unless both reads came back.
      setExporting(e.message || t("We could not build that file. Please try again."));
    }
  };

  const list = (
    <>
      {/* A masthead, like every other tab. This screen went straight into a
          search field, which left it the only one of the five with no
          identity and no count — and the count is the thing an owner
          actually wants from this tab at a glance. */}
      <div>
        <h1 className="display">{t("Clients")}</h1>
        <p className="quiet" style={{ marginTop: 4 }}>
          {search.trim()
            ? `${rows.length} match${rows.length === 1 ? "" : "es"}`
            : lapsed
              ? t("{shown} of {total}", { shown: rows.length, total: people.length })
              : people.length === 0
                ? t("Nobody yet")
                : people.length === 1
                  ? t("1 person")
                  : t("{count} people", { count: people.length })}
        </p>
        {/* ROADMAP 7.7. Hidden until there is something to export, because a
            button that hands back an empty file is worse than no button.
            It sits under the count on purpose: the count is the number the
            file should match, and they are read together. */}
        {people.length > 0 && (
          <p style={{ margin: "10px 0 0" }}>
            <button className="btn sm" type="button" disabled={exporting === "going"}
              onClick={exportCustomers}>
              {exporting === "going" ? t("Building…") : t("Export my customers")}
            </button>
            {exporting && exporting !== "going" && (
              <span className="quiet" style={{ marginLeft: 10 }}>{exporting}</span>
            )}
          </p>
        )}
        {/* SURVEY FINDING 7 — the promise on the pricing page is one sentence
            and the product answers it with two buttons on two screens. The
            smallest honest fix is each one naming the other; a "your data"
            screen would be a new place to look rather than one fewer. */}
        {people.length > 0 && (
          <p className="quiet" style={{ margin: "6px 0 0" }}>
            {t("Your photos export separately, from Business → Photos.")}
          </p>
        )}
      </div>

      {/* See `answers` above for why this is here and why it is two cells.
          It is drawn from `customers`, not from `rows`, so searching or
          filtering does not change the answer underneath — the strip is a
          fact about the business and the list below it is a view. */}
      {people.length > 0 && (
        <div className={`ledger answers ${answers.top ? "two" : "one"}`}>
          {/* ROADMAP 9.6, SECOND HALF — 2026-09-22. The figure used to say
              only "gone quiet", with no period anywhere on the stat itself —
              a reader had to notice the separate chip below, several inches
              away, to learn what "quiet" meant. "3 months" here is the
              SAME fact as the chip's own wording and LAPSED_DAYS in
              lib/client-list.js, not a second number invented to match it —
              read from the chip's own live text before writing this. The
              stat was already the thing you press (onClick has always set
              lapsed + sort); what was missing was the label saying so. */}
          {answers.quiet > 0 ? (
            <button aria-pressed={lapsed}
              aria-label={t("Show the {count} not seen in 3 months", { count: answers.quiet })}
              onClick={() => { setLapsed(true); setSort("away"); }}>
              <span className="figure">{answers.quiet}</span>
              <span className="lbl">{t("gone quiet · 3 months")}</span>
            </button>
          ) : (
            <div>
              <span className="figure">0</span>
              <span className="lbl">{t("gone quiet · 3 months")}</span>
            </div>
          )}
          {answers.top && (
            <button aria-pressed={sort === "spent" && !lapsed}
              aria-label={t("Sort by most spent")}
              onClick={() => { setLapsed(false); setSort("spent"); }}>
              <span className="figure">{money(answers.top.spend)}</span>
              <span className="lbl">{t("{name} spends most", { name: answers.top.c.name })}</span>
            </button>
          )}
        </div>
      )}

      <input data-tour="csearch" placeholder={t("Search name or phone…")} value={search}
        aria-label={t("Search customers")}
        onChange={(e) => setSearch(e.target.value)} />

      {error && <div className="error-box">{error}</div>}

      {/* A CONTROL THAT CANNOT CHANGE ANYTHING IS NOISE — the sort is absent
          below three rows (step 4 §8). The chip stays: at two customers you
          can see for yourself, at two hundred it is the screen's second job. */}
      {(people.length > 0 || fixtures > 0) && (
        <div className="clientfilters">
          {/* data-tour — roadmap 2.24. On the wrapper rather than the control:
              `Segmented` is a shared component and marking it there would put
              the same name on Money's period control too, which is the "two
              elements answering one selector" defect the tour's own header
              warns about. It is conditional (three customers), and a step whose
              target is absent is dropped from the plan. */}
          {people.length >= 3 && (
            <span data-tour="sort">
              <Segmented label={t("Sort by")} value={sort} options={SORTS} onChange={setSort} />
            </span>
          )}
          {/* These words and LAPSED_DAYS in lib/client-list.js are two
              halves of one fact and must move together. Written out rather
              than computed: "3 months" is what a person says, and 90/30 in a
              button is arithmetic nobody reading the screen asked for. */}
          <button data-tour="lapsedchip" className={`chip${lapsed ? " active" : ""}`} aria-pressed={lapsed}
            onClick={() => setLapsed((v) => !v)}>
            {t("Not seen in 3 months")}
          </button>
          {/* ROADMAP 1.3 — WHERE A FIXTURE IS SHOWN DELIBERATELY, AND THE ONLY
              PLACE IT IS. Absent entirely when there are none, so a real
              detailer never meets the word "test" on their own screen. It
              carries the COUNT because that number is the whole evidence the
              list underneath it got shorter — a bare "Show test rows" leaves a
              detailer unable to tell a filter that worked from one that had
              nothing to do. Pressed, the rows come back with a TEST mark on
              each; nothing is deleted anywhere, ever (0.3's ruling: about
              sixty checks sign into these). */}
          {fixtures > 0 && (
            <button className={`chip${showTest ? " active" : ""}`} aria-pressed={showTest}
              onClick={() => setShowTest((v) => !v)}>
              {n(fixtures, "Show 1 test row", "Show {count} test rows")}
            </button>
          )}
        </div>
      )}

      {/* THE FILTER OFFERS THE ACTION. Finding who has not been back is only
          half of decision 3; the other half is doing something about it.
          THE BUTTON IS THE WHOLE ROW — a "2 not seen in 3 months" label went
          here first and it restated the chip that is switched on directly
          above it. The count that is NEW lives in the masthead, where every
          count on this screen lives, and the button carries the number it is
          about to act on.
          ROADMAP 2.19 PUT EMAIL BESIDE TEXT, AND WIDENED WHEN THE ROW APPEARS.
          The owner's ask is *"send out email to someone that they want"* — and
          a set narrowed by TYPING A NAME is as much a chosen set as one
          narrowed by the chip, so a detailer wanting to write to three people
          searches for them rather than unticking two hundred. Both controls
          cut the same list, which is why one condition covers both.
          Email is `marketing` — the permission whose own words have said
          "promo codes and campaign links" since roadmap 2.13. */}
      {narrowed && rows.length > 0 && (
        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          {can("marketing") && emailable > 0 && (
            <button className="btn sm inline" data-tour="compose" onClick={() => setWriting(rows.map((r) => r.c))}>
              {/* **THE SAME FAULT UNDER A DIFFERENT VERB — 2026-09-12.**
                  "Text these 1" was fixed and this said "Email these 1" an
                  hour later. They are not one string with two labels: this
                  one counts `emailable` and the other counts `rows`, so a
                  list of four with one email address breaks THIS one while
                  the other reads correctly. Both go through the plural
                  helper now instead of each carrying its own branch. */}
              {n(emailable, "Email this one", "Email these {count}")}
            </button>
          )}
          <a className="btn sm inline" href={smsHref}>
            {n(rows.length, "Text this one", "Text these {count}")}
          </a>
        </div>
      )}

      {/* RE-SORTING IS A SWAP — the owner, 2026-09-03: "same thing, no animation
          between the recent, most spent, longest away… it just feels very
          static." Measured: nothing at all was running 120ms after the click
          except the chip's own hover colour. The rows below are the only thing
          that changed, so they are the only thing that moves — and they move
          one at a time, down the list, rather than as one block; the controls
          above stay put, because they did not change and a control that moves
          under the pointer pressing it reads as a glitch.
          THIS LIST IS WHY THE SWAP'S LADDER RUNS EIGHT DEEP instead of the
          five the screen's arrival and the day rail cap at: most of a customer
          list is below the fifth row, and a cap at five would leave that
          majority moving as one flat plane, which is the fault the owner
          rejected the first version for.
          Keyed on the sort AND the lapsed filter — both re-order or re-cut the
          same list, which is one kind of change wearing two controls.
          See theme.css § A CONTENT SWAP. */}
      {/* AN EMPTY SCREEN IS ONE SENTENCE AND ONE WAY FORWARD (screen
          designs §1a) — and until 2026-09-06 this one was a sentence on its
          own. `docs/final-pass.md` finding 3 is what it looked like from a
          chair: everything on a 1440x900 Clients ended 260px down, which
          reads as an app that has not loaded rather than a list with nobody
          on it yet.

          THE WAY FORWARD IS THE SAME QUESTION TODAY ASKS, and the same two
          answers, because the honest answer to *where are my customers* is
          the thing that produces one. A link that cannot take a booking is
          finding 4 again, so the service count decides which half is drawn
          — and while the count is still `null` NEITHER is, rather than
          flashing the wrong one on every arrival.

          The words are this screen's own and are not Today's: §1a's *never
          the same fact twice* is about one screen, but a detailer who meets
          both in the same ten minutes should not read one sentence on two
          tabs. */}
      {people.length === 0 && !busy && !error && (
        <div className="tight emptyscreen">
          <p className="body">{t("No customers yet. They appear on their own when bookings come in.")}</p>
          {sellable === 0 && (
            <div className="card setting-card">
              <button className="nav-row" onClick={() => onSetup?.()}>
                <span className="ico"><ListChecks size={19} strokeWidth={2} /></span>
                <span className="txt">
                  <span className="name">{t("Finish setting up")}</span>
                  <span className="now">{t("Your services come first")}</span>
                </span>
                <span className="chev"><ChevronRight size={18} strokeWidth={2} /></span>
              </button>
            </div>
          )}
          {sellable > 0 && (
            <>
              <p className="body">{t("Send this to the next person who asks.")}</p>
              <BookingLink slug={business.slug} origin={siteOrigin} />
            </>
          )}
        </div>
      )}
      {people.length > 0 && rows.length === 0 && (
        <p className="body">{t("Everyone has been in within three months.")}</p>
      )}

      {/* A ruled list, not a stack of cards. Cards are for objects you pick
          BETWEEN; a customer list is an enumeration, and eight bordered
          cards filled a phone screen where rows fit three times as many
          (docs/design-system.md, Composition).
          THE LIST DIMS AND THE SEARCH FIELD STAYS LIVE — §8's loading state,
          and the same rule every other screen follows: after the first paint
          a read never blanks what you are looking at. */}
      {/* The OUTER div holds this list's place in the screen's arrival; the
          inner one is the swap (theme.css § A CONTENT SWAP). */}
      <div>
      <div className={`rows cols clients swap${busy ? " refreshing" : ""}`}
        key={`${sort}|${lapsed}`} aria-busy={busy || undefined}>
        {rows.map(({ c, visits, spend, last }, rowIndex) => (
          // THE FIRST ROW ONLY. Marking every row would put one tour name on
          // fifty elements, and the tour's own header is explicit that two
          // elements answering one selector is a silently wrong target —
          // `querySelector` takes whichever comes first in the document.
          <button key={c.id} className="row-item" data-tour={rowIndex === 0 ? "client" : undefined}
            onClick={() => openCustomer(c)}
            aria-label={`${c.is_test ? `${t("Test")}, ` : ""}${c.name}, ${t("last visit {when}", { when: agoWords(last, today, t).toLowerCase() })}, ${owner ? money(spend) : n(visits, "{count} visit", "{count} visits")}, ${phone(c.phone)}`}>
            {/* ROADMAP 1.3 — THE MARK GOES BEFORE THE NAME, NOT AFTER IT, AND
                THAT IS THE WHOLE REASON IT IS UNMISTAKABLE. `.c-who` is
                `nowrap` with an ellipsis, so a mark after the name is the
                first thing cut at 320px — and these names are the longest in
                the list ("ROADMAP 2.8 Address Test 2026-09-23"). Ahead of it,
                it survives every width. `.tag` is the system's own "category
                that cannot change, quiet, never coloured", which is exactly
                what this is; nothing new is invented. */}
            <span className="c-who nm">
              {c.is_test && <span className="tag c-test">{t("Test")}</span>}
              <span>{c.name}</span>
            </span>
            <span className="c-sub">
              <span className="c-date">{agoWords(last, today, t)}</span>
              <span className="c-what">{phone(c.phone)}</span>
            </span>
            {/* ROADMAP 9.6 — THE FIGURE ALONE DOES NOT SAY WHAT IT IS. Same
                slot shows lifetime spend to an owner and a bare visit count
                to staff; neither carries a unit. The date beside it reads as
                a relative-time phrase on its own and the phone number reads
                as one by its shape — this is the one value on the row that
                needs a word, not all three. Reuses the exact words the
                record's own ledger already uses two taps away (`.ledger
                .lbl`: "lifetime" / "visit(s)") so the two never disagree.
                Lifetime spend is owner-only; staff get the count (step 4
                §8). */}
            <span className="c-total figure sm">
              {owner ? money(spend) : visits}
              <span className="c-total-lbl">{owner ? t("lifetime") : (visits === 1 ? t("visit") : t("visits"))}</span>
            </span>
          </button>
        ))}
      </div>
      </div>

      {/* A SILENT TRUNCATION READS AS A COMPLETE LIST, and the search is the
          way past it — which is a fact the list does not carry. */}
      {capped && (
        <p className="quiet">{t("Showing the {n} most recent. Search for anyone older.", { n: ROW_CAP })}</p>
      )}
    </>
  );

  const facts = open ? (totals.get(open.phone) ?? { visits: 0, spend: 0, last: null }) : null;

  return (
    <div className="split clients">
      <div className="group col-1">{list}</div>

      {/* THE ONLY RECORD IN THE PRODUCT WITH NO CONTAINER (§9). Clients is
          the only screen with no panel on it and a right-hand card would end
          that, so the rows sit directly on the ground at both widths. */}
      {open && !selected && (
        <RecordHost bare onClose={() => setOpen(null)} title={open.name} subtitle={phone(open.phone)}>
          <div className="group">
            {/* IT LEADS WITH THE NUMBERS — F8, 2 of 2: both documented
                products lead a client with a figure. Today's bare-figure
                ledger is already this shape, so nothing is invented. */}
            <div className={`ledger ${owner ? "two" : "one"}`}>
              <div>
                <span className="figure">{facts.visits}</span>
                {/* **WRAPPED 2026-10-03, ROADMAP 14.22.** The same two words already go
                    through `t()` in the `c-total-lbl` row above - the one reading
                    `owner ? t("lifetime") : ...` - so a Spanish customer saw "visitas"
                    in one place on this screen and the English plural in the other. `appEs.js`
                    already carries both keys (`visita`, `visitas`), so nothing new was
                    added: the strings existed and this one line was not asking for them.

                    **THE FIRST VERSION OF THIS COMMENT SAID "thirty-three rows above
                    this" AND WAS WRONG THE INSTANT IT WAS SAVED.** Thirty-three was true
                    until the sentence saying thirty-three existed: the comment is six
                    lines long and pushed the thing it points at six rows further away,
                    making it thirty-nine. `docs/gotchas.md` 92 is this, written an hour
                    earlier about markdown and ABSOLUTE line numbers; it reproduced here
                    in a `.jsx` comment using a RELATIVE row count, which is how we know
                    92 is not about markdown and not about line numbers but about **any
                    address measured from where the new text is going.** So this quotes
                    the class instead of counting: `grep c-total-lbl` finds it for ever,
                    and a row count is wrong the next time anybody edits this file, with
                    nothing anywhere to announce it. */}
                <span className="lbl">{facts.visits === 1 ? t("visit") : t("visits")}</span>
              </div>
              {owner && (
                <div>
                  <span className="figure">{money(facts.spend)}</span>
                  <span className="lbl">{t("lifetime")}</span>
                </div>
              )}
            </div>

            <div className="facts">
              <div>
                <span className="quiet">{t("Last visit")}</span>
                <span className="v">{facts.last ? dateLong(facts.last, getAppLocale()) : t("No completed visits yet")}</span>
              </div>
              {/* ROADMAP 9.7 — NO NEW FETCH. `history` already comes through
                  BOOKING_SELECT, which is "*", so the vehicle and address
                  from the most recent visit are already in state; this only
                  draws them. Gated on `history?.[0]` — loaded AND non-empty —
                  the same unknown-vs-empty rule ROADMAP 9.8 used tonight:
                  while `history === null` nothing renders, never a false
                  "no vehicle on file". Labelled "Last", not bare "Vehicle" /
                  "Address": a customer with more than one car across their
                  history is not an edge case in this trade, and showing one
                  silently is a lie unless the card says which one it is —
                  Andrew's own words, 2026-09-20. `customers.address` is a
                  real column that nothing in this codebase ever writes to
                  (checked: every function and screen that could — grepped,
                  none does) — a dead half-feature, not a smaller version of
                  a working one, and left alone here on purpose rather than
                  read from, so the next reader does not mistake it for the
                  intended source. Deleting it is a migration and a decision,
                  neither of which this item makes. */}
              {history?.[0] && (
                <div>
                  <span className="quiet">{t("Last vehicle")}</span>
                  <span className="v">
                    {history[0].vehicle_size_label || t({ small: "Small", medium: "Medium", large: "Large" }[history[0].vehicle_size] ?? history[0].vehicle_size)}
                    {history[0].vehicle_model ? ` · ${history[0].vehicle_model}` : ""}
                  </span>
                </div>
              )}
              {history?.[0]?.customer_address && (
                <div>
                  <span className="quiet">{t("Last address")}</span>
                  <span className="v">{history[0].customer_address}</span>
                </div>
              )}
              {planBy.get(open.id) && (
                <div>
                  <span className="quiet">{t("Plan")}</span>
                  <span className="v">
                    {planBy.get(open.id).plans?.name ?? t("On a plan")}
                    {" · "}
                    {planBy.get(open.id).status === "active"
                      ? cadenceWords(planBy.get(open.id).plans, lang)
                      : statusWords(planBy.get(open.id).status, lang)}
                  </span>
                </div>
              )}
            </div>

            {/* THE PHONE NUMBER IS NOT PRINTED TWICE. It is the record's
                subtitle; this is the action, and the email is the one thing
                here the row above does not already carry. */}
            <div className="stack" style={{ gap: 8 }}>
              <a className="btn" href={`tel:${open.phone}`}><Phone size={18} strokeWidth={2} /> {t("Call")}</a>
              {/* ROADMAP 9.7 — THE BARE sms: LINK, NOT THE TEMPLATE PICKER.
                  BookingDetail.jsx has a "Text" button too, but it opens a
                  picker that fills tokens from a specific booking ("on my
                  way," etc.) — there is no active job here to fill them
                  from, so this is the same shape as Call above: it opens the
                  phone's own messaging app and pre-fills nothing. Checked
                  first whether the absence here was a ruling rather than an
                  oversight — grepped DECISIONS.md, FOUND.md and
                  docs/roadmap.md for any prior word on it: nothing. */}
              <a className="btn" href={`sms:${open.phone}`}><MessageSquare size={18} strokeWidth={2} /> {t("Text")}</a>
              {open.email && (
                <a className="btn" href={`mailto:${open.email}`}><Mail size={18} strokeWidth={2} /> {open.email}</a>
              )}
              {/* ROADMAP 9.7 — "BOOK AGAIN," SCOPED OUT LOUD. Routes into
                  `NewBookingModal`'s own `pick()` — exactly what runs for a
                  detailer who types this same customer's name and taps the
                  search result, never a second version of it. So it carries
                  exactly what a manual search already carries: name, phone,
                  email — real data — and their address, which `pick()`
                  also reads but which is empty for every real customer here,
                  because `customers.address` is a dead column (this item's
                  own earlier finding). Does NOT carry their last vehicle or
                  last service — `pick()` never has, for a manual search
                  either, and reaching further than it does would be a
                  second, richer version of the function rather than wiring
                  into the one that exists. */}
              {/* ROADMAP 9.7 — **"AGAIN" IS A CLAIM ABOUT THEM, AND FOR A
                  CLIENT WITH NO VISITS IT IS FALSE.** Andrew, live.
                  **IT DEFAULTS TO "Book again" WHILE `history` IS STILL NULL**,
                  which is this item's own unknown-vs-empty rule: a returning
                  client must never flash "Book" before their visits arrive.
                  The rarer direction — a brand-new client reading "Book again"
                  for a moment — is the cheaper of the two wrongs. */}
              <button className="btn" onClick={() => setBooking(open)}>
                <CalendarPlus size={18} strokeWidth={2} />{" "}
                {history == null || history.length ? t("Book again") : t("Book")}
              </button>
              {/* ROADMAP 2.20 — THE ONE PLACE A REJECTED SEND BECOMES VISIBLE.
                  Until this line the provider refusing an address was a
                  `console.error` inside an edge function, so the first symptom
                  was a customer saying they never got their confirmation. It
                  is drawn HERE rather than in a log because a rejected send is
                  a fact about this person, and this is where a detailer is
                  about to rely on their address.
                  It names what to DO — the phone number is right above it —
                  because "delivery failed" on its own is a notification, not
                  a help. `--bad` is the fixed red and does not follow the
                  tenant (law 11b): this is meaning, not identity. */}
              {open.email && open.email_failed_at && (
                <p className="muted" style={{ margin: 0, color: "var(--bad)" }}>
                  {t("This address bounced. The last email to it was refused, so check it with them or call instead.")}
                </p>
              )}
            </div>
            {/* ROADMAP 9.7 — same conditional shape App.jsx/Calendar.jsx/
                Today.jsx already use to open this modal, a fourth instance
                of it rather than a new mechanism. `onCreated` re-runs the
                existing `openCustomer` so the record reflects the booking
                just made instead of going stale. */}
            {booking && (
              <NewBookingModal
                initialCustomer={booking}
                onClose={() => setBooking(null)}
                onCreated={() => { setBooking(null); openCustomer(open); }}
              />
            )}

            <label className="field"><span>{t("Notes")}</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes}
                placeholder={t("Gate code, dog's name, preferences…")} /></label>
            {notesError && <div ref={notesErrorRef} className="error-box" role="alert">{notesError}</div>}

            <div className="tight">
              <span className="label">{t("History")}</span>
              {/* DATE · WHAT · TOTAL. Every row used to repeat the client's
                  own name, on the one screen where it is the least useful
                  thing in the row (Part B row 18). */}
              <div className={`rows${history === null ? " refreshing" : ""}`}
                aria-busy={history === null || undefined}>
                {(history ?? []).map((b) => {
                  const what = (b.services ?? []).map((s) => s.name_at_booking).filter(Boolean).join(" · ")
                    || t(b.service_type === "mobile" ? "Mobile" : "Drop-off");
                  return (
                    <button key={b.id} className="row-item" onClick={() => setSelected(b)}>
                      <span className="txt">
                        <span className="nm">{shortDate(b.booking_date)}</span>
                        <span className="sub">{what}</span>
                      </span>
                      <span className="figure sm">{money(b.final_amount ?? b.total_price)}</span>
                    </button>
                  );
                })}
              </div>
              {history !== null && history.length === 0 && (
                <p className="quiet">{t("Nothing booked yet.")}</p>
              )}
              {history?.length >= HISTORY_CAP && (
                <p className="quiet">{HISTORY_CAP} most recent.</p>
              )}
            </div>

            {/* ROADMAP 14.3 — THE EMAILS, AND WHAT BECAME OF THEM.
                Andrew's ask, 2026-09-16: a row per message saying who it went
                to and whether it arrived. He raised a full inbox with a
                preview of each message in the same breath and talked himself
                out of it — so this is the row. The body is not stored at all;
                the migration says why.

                IT IS BELOW THE HISTORY BECAUSE OF WHAT IT IS FOR. Nobody opens
                a client to read their mail log. They open it because somebody
                said "I never got the confirmation", and by then they are
                already looking at this record.

                NOT RENDERED AT ALL FOR A CUSTOMER WITH NO ADDRESS: an empty
                "Emails" heading on somebody we could never email is a section
                that explains its own absence, which screen-rules § the
                exhaustion test calls out by name. */}
            {open.email && (
              <div className="tight">
                <span className="label">{t("Emails")}</span>
                <EmailTrail rows={mail} timezone={business.timezone} cap={MAIL_CAP}
                  error={mailErr} empty="No emails sent to this address yet." />
              </div>
            )}

            {/* ROADMAP 8.11 — HIS ASK, AND IT IS LAST ON THE RECORD FOR THE
                REASON EVERY DESTRUCTIVE CONTROL IS: nobody scrolls past their
                own client's history to find it by accident.

                OWNER ONLY. There is no permission tick that means "may erase a
                person", and the server refuses staff whatever this renders —
                the same rule the subscription row follows.

                THE CONFIRM SAYS WHAT SURVIVES, not just what goes. A detailer
                reading "delete this customer" reasonably fears losing the
                money, and the answer is the whole design: the jobs stay as
                anonymous entries, so Money and the accountant export do not
                move by a cent. */}
            {role === "owner" && (
              <div className="tight">
                <hr className="rule" />
                {/* **THE JOB PAGE ALREADY SOLVED THIS AND THIS SCREEN BROKE
                    ITS ANSWER — 2026-09-12.** A job's delete sits behind a
                    `details.disclose`, explains what it does that CANCELLING
                    does not, says "It cannot be undone" in those words, and
                    is `.btn.danger` — the one colour this theme reserves for
                    harm. Ten feet away this control was a plain `--bone`
                    button on an ordinary surface with no heading, no fold and
                    no explanation until you pressed it.
                    **Copied rather than designed**, which is the anti-drift
                    rule working: the reference is this product's own best
                    screen and it already existed. The two-state React went
                    with it — native `<details>` is the speed bump, and closing
                    the fold IS "keep them", so the second button is gone. */}
                <h3 className="section-title">{t("Removing them from your records")}</h3>
                {forgetError && <div className="error-box">{forgetError}</div>}
                <details className="disclose">
                  <summary>{t("Deleting their information")}</summary>
                  {/* A TEST ROW GETS THE REASON AND NOTHING ELSE. The two
                      paragraphs below describe what deleting WOULD do, and on
                      a row that cannot be deleted they are two sentences
                      answering a question nobody can ask — the second of them
                      reading "The 0 jobs stay as anonymous entries", which is
                      the exhaustion test failing in `docs/screen-rules.md`'s
                      own words. */}
                  {!open.is_test && (<>
                  <p className="quiet" style={{ margin: "0 0 10px" }}>
                    {t("Their name, number, address and any notes come off every job, and their photos are deleted. This cannot be undone.")}
                  </p>
                  <p className="muted" style={{ margin: "0 0 10px" }}>
                    {n(history?.length ?? 0,
                      "The {count} job stays as an anonymous entry, so your takings and your accountant export do not change.",
                      "The {count} jobs stay as anonymous entries, so your takings and your accountant export do not change.")}
                  </p>
                  </>)}
                  {/* ROADMAP 0.3 — THE RULING MEETS AN ACTUAL DELETE
                      BUTTON. The chip at the top of this screen reveals the
                      flagged fixture rows on purpose; two presses later this
                      control erased one for good, and roughly sixty checks
                      sign into those rows. So a flagged row gets the reason
                      instead of the button, and `forget()` refuses it anyway.
                      Nothing is hidden from the detailer: the fold still
                      opens and still says what deleting would do. */}
                  {open.is_test ? (
                    <p className="quiet" style={{ margin: 0 }}>{t("This is a test row, not a person. Automated checks sign into these, so it cannot be deleted here.")}</p>
                  ) : (
                  <button className="btn danger" disabled={forgetting === "going"}
                    onClick={() => { setForgetError(""); setForgetting("going"); forget(open); }}>
                    {forgetting === "going" ? t("Deleting…") : t("Delete for good")}
                  </button>
                  )}
                </details>
              </div>
            )}
          </div>
        </RecordHost>
      )}

      {/* A job opened from the history REPLACES the client in that column and
          closing it puts the client back — the same answer the calendar's day
          gives, and the reason both go through RecordHost. */}
      {selected && (
        <RecordHost onClose={() => setSelected(null)} {...jobRecordProps(selected)}>
          {/* ROADMAP 4.1 / DECISIONS.md "the record stays open on a status
              change" — see Today.jsx for the fuller note; same fix, same
              reason. `openCustomer` refreshes the client's own history list
              but not this snapshot, so it is re-fetched by id too. */}
          <BookingDetail booking={selected} onClose={() => setSelected(null)}
            onChanged={() => {
              load(); if (open) openCustomer(open);
              fetchBooking(selected.id, business.id, business.timezone).then(setSelected);
            }} />
        </RecordHost>
      )}

      {/* ROADMAP 2.19. A FORM YOU COMMIT, so it is a sheet at every width —
          RecordHost's own rule, and the same one new-booking, finalize and the
          quote already follow. It closes itself; the reload is the dashboard
          nudge finding out it has been answered. */}
      {writing && (
        <CampaignModal people={writing} onClose={() => setWriting(null)}
          onSent={reloadBusiness} />
      )}
    </div>
  );
}
