// THE PLATFORM OWNER'S BACK OFFICE — rebuilt from nothing, 2026-09-10.
//
// ── WHY IT WAS SCRAPPED RATHER THAN MENDED ─────────────────────────────────
//
// The owner opened the old one and said: *"honestly, I'm really disappointed
// with this back office… completely scrap it, don't even try to fix
// anything."* He listed a clipped header, an ugly scrollbar, month labels that
// drifted out from under their bars, and a half-empty screen saying "pick a
// detailer to see how they are doing".
//
// **All of those were one fault.** The screen had a permanent two-column
// skeleton and one column of content, so half of it was empty whenever
// nothing was selected and everything else had to be crammed into the rest.
// Patching the symptoms would have kept the cause.
//
// The plan he approved is `docs/back-office-plan-2026-09-09.md`. This is its
// first three tabs plus the shell; Money's Stripe half and Log wait on things
// that do not exist yet (§ 6 of that file lists them).
//
// ── WHAT DID NOT CHANGE, AND MUST NOT ─────────────────────────────────────
//
// **EVERY BYTE STILL COMES FROM THE `platform-admin` EDGE FUNCTION.** There is
// not one `supabase.from()` in this file. No row-level policy anywhere grants
// cross-tenant read — `tests/platform-admin.test.mjs` § 1 walks every
// migration and fails if one gains an "or a platform admin" clause — so the
// browser genuinely cannot reach another tenant's rows even if this screen
// were served to the wrong person. The server is the boundary; this is a view.
//
// **IT STILL ANSWERS 404 TO EVERYONE ELSE**, matching the server. A 403 saying
// "you are not an admin" tells a curious detailer that this page exists and
// that one row is all that stands between them and it.
//
// **IT STILL SITS OUTSIDE `BusinessProvider`**, like the public booking pages,
// because it has no "current business" and wrapping it in one would make it
// wait on a membership it never uses.
//
// ── WHAT THE OLD HEADER SAID THAT IS NOW WRONG ────────────────────────────
//
// It said **"No charts. He has fewer than ten customers and every trend line
// is noise."** That was already untrue when he read it — there was a
// six-month chart, and the thing he complained about was its labels being
// off. And he has since asked for the opposite in as many words: *"multiple
// different tabs, tracking almost everything… I really like animations and
// stuff looking really good and really sleek."* The old sentence is recorded
// here rather than deleted, because a later session finding a chart and a
// comment forbidding charts would have to guess which one won.

import { Eye, EyeOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { dateLong, localDate, money } from "../lib/format.js";
import { mb } from "../lib/photo-rules.js";
import { setupProgress } from "../lib/setup.js";
import { needsALook, reasonsFor, QUIET_DAYS, SETUP_FLOOR } from "../lib/attention.js";
import {
  billingState, bookability, daysSince, monthlySeries, owedByUs, trend, workload,
} from "../lib/adminInsight.js";
import { useLeaving } from "../hooks/useLeaving.js";
import { signOutEverything } from "../lib/signout.js";
// The refusal below IS the product's 404, not a copy of it — see the comment
// on the `denied` branch for why this one import crosses the admin.css line.
import NotFound from "../screens/NotFound.jsx";
import "./admin.css";

/* ── the one way this screen talks to the server ────────────────────────── */
const call = async (body) => {
  const { data } = await supabase.auth.getSession();
  const jwt = data?.session?.access_token;
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/platform-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => null);
  if (!res.ok) throw new Error(out?.error || `Request failed (${res.status})`);
  return out;
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const ago = (iso) => {
  if (!iso) return "never";
  const d = daysSince(iso);
  if (d === null) return "never";
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  if (d < 365) return `${plural(Math.round(d / 30), "month", "months")} ago`;
  return `${plural(Math.round(d / 365), "year", "years")} ago`;
};
const mins = (iso) => {
  if (!iso) return null;
  return Math.round((Date.now() - Date.parse(iso)) / 60000);
};
const shortAgo = (iso) => {
  const m = mins(iso);
  if (m === null) return "never";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${plural(Math.round(m / 60), "hour", "hours")} ago`;
  return `${plural(Math.round(m / 1440), "day", "days")} ago`;
};

const TABS = [
  ["now", "Today"],
  ["growth", "Growth"],
  ["money", "Money"],
  ["who", "Detailers"],
  ["pipes", "System health"],
];

// THE SAME NAMES watch-jobs/index.ts uses for its alert email — mirrored
// here rather than shared, because one is a two-line Deno map and the two
// runtimes do not share a module. A job with no entry shows its raw slug,
// same fallback as the email: telling Andrew a job stopped matters more
// than every job having a plain name on day one. ROADMAP 10.1.
const JOB_LABELS = {
  "send-owner-reminders": "the reminder sweep",
  "accrue-plan-visits": "the nightly plan-visit accrual",
};
const jobLabel = (job) => JOB_LABELS[job] ?? job;

/* ══ THE SIX-MONTH CHART ═══════════════════════════════════════════════════
   ONE SVG, ONE SET OF X-COORDINATES for the bar and its label. The old chart
   laid bars out in one flow row and month names in another, so the two
   spacings disagreed and the error accumulated left to right — 4px of drift
   under the first month and 35px under the sixth. The owner saw it before any
   check did, because no check this repo owns measures a label against the
   thing it labels. Sharing the coordinate makes the class of bug impossible
   rather than fixing this instance of it. */
function Chart({ series }) {
  /* `jobs`, NOT `count`. `monthlySeries` returns
     `{ key, label, jobs, revenue, booked }` and the first version of this
     read `s.count`, which is `undefined` — so every bar computed `NaN` for
     its y and its height and the browser rejected the attribute outright.
     **The build was clean and the page rendered**; the only evidence was six
     `<rect> attribute y: Expected length, "NaN"` lines in the console, which
     is why the console is read at every width rather than only looked at.
     `n()` is the guard: nothing that is not a finite number reaches an
     attribute, so a renamed field degrades to an empty bar instead of a
     broken one. */
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const W = 320, H = 92, PAD = 14, N = series.length || 1;
  const top = Math.max(1, ...series.map((s) => n(s.jobs)));
  const slot = (W - PAD * 2) / N;
  const bw = Math.min(30, slot * 0.56);
  return (
    <svg className="pa-chart" viewBox={`0 0 ${W} ${H}`} role="img"
         aria-label={`Jobs finished over ${N} months`}>
      {series.map((s, i) => {
        const cx = PAD + slot * i + slot / 2;
        const jobs = n(s.jobs);
        const h = Math.max(2, Math.round((jobs / top) * (H - 34)));
        return (
          <g key={s.key ?? i}>
            <rect className={`pa-barr${jobs ? " pa-has" : ""}${i === N - 1 ? " pa-now" : ""}`}
                  x={cx - bw / 2} y={H - 22 - h} width={bw} height={h} rx="3"
                  style={{ animationDelay: `${i * 55}ms` }} />
            <text className="pa-xl" x={cx} y={H - 8} textAnchor="middle">{s.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Tile({ n, t, warn }) {
  return (
    <div className={`pa-tile${warn ? " pa-warn" : ""}`}>
      <span className="pa-n">{n}</span>
      <span className="pa-t">{t}</span>
    </div>
  );
}

/* ── what the platform charges, flattened and given its units ─────────────
   The table is two levels deep and mixes three kinds of number, so neither
   `String(v)` nor `money(v)` is right for all of it. THE KEY CARRIES THE UNIT
   — nothing else in the value knows whether 12 is dollars, months or a share.
   Anything unrecognised falls through as a plain number rather than being
   dressed as money, because a wrong unit reads as a real price. */
const WORDS = {
  website: "Website + booking", bookingOnly: "Booking only", founding: "Founding offer",
  standard: "Standard price", unknown: "No plan recorded",
  term: "Contract", annual: "Paid yearly", monthly: "A month", setup: "To set up",
  monthToMonth: "Month to month", months: "Length", exitFeeShare: "Exit fee",
};
const say = (k) => WORDS[k] ?? k;
const priceValue = (key, v) => {
  if (typeof v !== "number") return String(v);
  if (key === "months") return `${v} months`;
  if (key === "exitFeeShare") return `${Math.round(v * 100)}% of what is left`;
  return money(v);
};
// **ONE WALK, AND THE EDITOR USES IT TOO.** A hand-written list of fields
// beside this would be a second place that has to learn about a new price, and
// the one that forgets is the one that silently drops a figure out of the table
// the day somebody saves. So a row carries where it came from (`path`) and what
// is actually stored (`raw`) as well as what it reads as.
function priceRows(table) {
  const out = [];
  for (const [k, v] of Object.entries(table ?? {})) {
    if (v && typeof v === "object") {
      for (const [k2, v2] of Object.entries(v)) {
        out.push({ path: [k, k2], raw: v2, label: `${say(k)} · ${say(k2)}`, value: priceValue(k2, v2) });
      }
    } else {
      out.push({ path: [k], raw: v, label: say(k), value: priceValue(k, v) });
    }
  }
  return out;
}

const Row = ({ k, v }) => (
  <div className="pa-row"><span className="pa-k">{k}</span><span className="pa-v">{v}</span></div>
);

/* ══ THE PAGE ══════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const [status, setStatus] = useState("checking");   // checking | anon | denied | ok
  const [email, setEmail] = useState("");
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("now");

  /* ── the door ────────────────────────────────────────────────────────── */
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [doorErr, setDoorErr] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const out = await call({ action: "list" });
      setState(out);
      setErr("");
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const s = data?.session;
      if (!live) return;
      if (!s) { setStatus("anon"); return; }
      setEmail(s.user?.email ?? "");
      try {
        await call({ action: "whoami" });
        if (!live) return;
        setStatus("ok");
        load();
      } catch {
        // 404 FROM THE SERVER, 404 ON THE SCREEN. Never "you are not an
        // admin" — that sentence confirms the page exists.
        if (live) setStatus("denied");
      }
    })();
    return () => { live = false; };
  }, [load]);

  const signIn = async (e) => {
    e.preventDefault();
    setDoorErr("");
    const { error } = await supabase.auth.signInWithPassword(form);
    // ONE MESSAGE FOR BOTH HALVES. "No such account" tells somebody which
    // addresses are real.
    if (error) { setDoorErr("That email and password do not match."); return; }
    window.location.reload();
  };

  if (status === "checking") return <div className="pa"><div className="pa-load" /></div>;

  if (status === "anon") {
    return (
      <div className="pa">
        <div className="pa-door">
          <div className="pa-door-in">
            <span className="pa-lab">Detailing Platform · back office</span>
            <h1>Sign in</h1>
            <p className="pa-sub">This is the platform&apos;s own screen, not a detailer&apos;s.</p>
            <form onSubmit={signIn} style={{ marginTop: 16 }}>
              <label className="pa-field">
                <span className="pa-lab">Email</span>
                <input type="email" autoComplete="username" required
                       value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="pa-field">
                <span className="pa-lab">Password</span>
                {/* ITS OWN EYE, NOT THE DASHBOARD'S. `controls.jsx`'s
                    PasswordInput renders theme.css classes, and this file's
                    standing law is that admin.css shares NO RULE with
                    theme.css — only its tokens (roadmap 4.4). Borrowing the
                    component would import the dependency the law exists to
                    prevent, so this is eight lines instead. */}
                <span className="pa-pw">
                  <input type={showPw ? "text" : "password"} autoComplete="current-password" required
                         value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <button type="button" aria-pressed={showPw}
                          aria-label={showPw ? "Hide password" : "Show password"}
                          onClick={() => setShowPw((v) => !v)}>
                    {showPw ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                  </button>
                </span>
              </label>
              {doorErr && <p className="pa-err">{doorErr}</p>}
              <div className="pa-acts">
                <button className="pa-btn pa-go" type="submit">Sign in</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // **THE REFUSAL IS THE PRODUCT'S OWN 404 COMPONENT, NOT A SECOND ONE THAT
  // LOOKS LIKE IT — 2026-09-12, after his review found two different 404s.**
  //
  // The rule above and in CLAUDE.md is that a non-admin gets 404 and never
  // 403, because a 403 tells a curious detailer this page exists. **Two 404s
  // that do not match leak the same fact more quietly**: this one had no links
  // out and its own wording, so anybody who had seen a real missing page could
  // tell that `/admin` answers differently — which is the one bit they were
  // not supposed to learn. Rendering the same component makes them identical
  // by construction rather than by two files agreeing to stay in step, and it
  // is also the fix for his other complaint, that this variant was a dead end
  // with nowhere to go next.
  //
  // **AND IT IS THE ONE PLACE `admin.css`'s "no shared rule with `theme.css`"
  // LAW GIVES WAY, on purpose.** The law exists so the back office cannot be
  // restyled by a dashboard change; here the requirement is the opposite — a
  // screen that must be indistinguishable from a dashboard-side page. The
  // password field a few lines up still declines to borrow `controls.jsx`,
  // because that is admin furniture and this is a denial that must not look
  // like admin furniture at all.
  if (status === "denied") return <NotFound />;

  const rows = state?.rows ?? [];
  const totals = state?.totals ?? {};
  const attention = needsALook(rows);

  /* WHAT IS ACTUALLY WRONG RIGHT NOW — collected once and used by both the
     strip on Now and the dot on the System health tab, so the two can never
     disagree about whether something is broken. */
  const alerts = [];
  for (const h of state?.heartbeats ?? []) {
    const m = mins(h.ran_at);
    const limit = Math.round((h.stale_after_seconds ?? 86400) / 60);
    if (m === null || m > limit) {
      alerts.push(`${jobLabel(h.job)} has not finished in ${m === null ? "ever" : `${m} minutes`} (it should every ${limit})`);
    }
  }
  const mail = state?.email;
  // **"PLATFORM" AND THE SECOND SENTENCE ARE BOTH LOAD-BEARING, AND THE
  // SECOND ONE WAS LOST IN THE REBUILD — restored 2026-09-13.** `sent` comes
  // from `platform_email_days`, a table in THIS project, so it counts what the
  // PLATFORM sent. The cap is Resend's daily allowance, which is ACCOUNT-WIDE
  // and shared with andrewsdetail.com — Andrew's own live business, real
  // customers, same Resend account. Numerator and denominator are therefore
  // different populations, so this line UNDER-reports, which is the unsafe
  // direction: 470 platform against 57 business over 30 days means a busy
  // Saturday reads comfortable while the account is at its limit. Without the
  // second sentence the figure reads as the whole truth.
  if (mail && mail.cap && mail.sent >= mail.cap * 0.8) {
    alerts.push(`Platform emails: ${mail.sent} of ${mail.cap} today — the cap is shared with andrewsdetail.com, so the real figure may be higher`);
  }
  if (mail && mail.failed > 0) alerts.push(`${mail.failed} email${mail.failed === 1 ? "" : "s"} failed to send today`);
  const store = state?.photo_store;
  // `total_bytes`, NOT `cap_bytes`. `photo_store_state()` — the PLATFORM-wide
  // row — returns used/total/committed; `cap_bytes` belongs to `photo_budget`,
  // the per-BUSINESS one. Reading the wrong name made this `undefined`, so the
  // condition was false at every fill level and **this alarm could never
  // sound.** A warning that cannot fire is worse than none: it holds the space
  // a real one would have used and quietly says everything is fine.
  if (store && store.total_bytes && store.used_bytes >= store.total_bytes * 0.8) {
    // **THE ALARM CARRIED NO NUMBER**, which made it a feeling rather than a
    // fact: "nearly full" is the same sentence at 81% and at 99%, and the one
    // decision behind it — connect R2 today, or next month — is the difference
    // between those two.
    alerts.push(`Photo storage is nearly full: ${mb(store.used_bytes)} of ${mb(store.total_bytes)} used`);
  }
  // **PROMISED, NOT USED, AND IT IS THE ONE THAT GOES WRONG FIRST.** Every
  // detailer is told they have a hundredth of the store; past a hundred
  // detailers those shares add up to more than exists, and the store can be 4%
  // used and 140% promised on the same morning. The migration that computes
  // `committed_bytes` says in as many words that it exists so the back office
  // can say this out loud rather than discovering it as a failed upload in
  // somebody's driveway.
  if (store && store.total_bytes && store.committed_bytes > store.total_bytes) {
    alerts.push(
      `Photo storage is over-promised: ${mb(store.committed_bytes)} handed out against ${mb(store.total_bytes)} that exists`);
  }
  if (totals.suspended) alerts.push(`${totals.suspended} detailer${totals.suspended === 1 ? " is" : "s are"} suspended`);

  return (
    <div className="pa">
      {busy && <div className="pa-load" />}

      <header className="pa-top">
        <div className="pa-top-in">
          <span className="pa-mark">Detailing Platform <i>· back office</i></span>
          <span className="pa-top-r">
            <span className="pa-who">{email}</span>
            <button className="pa-out" type="button" onClick={signOutEverything}>Sign out</button>
          </span>
        </div>
        <div className="pa-tabs" role="tablist" aria-label="Back office">
          {TABS.map(([k, label]) => (
            <button key={k} className="pa-tab" role="tab" type="button"
                    aria-selected={tab === k} onClick={() => setTab(k)}>
              {label}
              {k === "pipes" && alerts.length > 0 && <span className="pa-pip" aria-label="something needs attention" />}
            </button>
          ))}
        </div>
      </header>

      <main className="pa-body">
        {err && <div className="pa-alert"><span className="pa-lab">Could not load</span><p>{err}</p></div>}
        {!state && !err && <p className="pa-none">Reading the platform…</p>}

        {/* THE TAB IS THE ANIMATION'S KEY. Without it React reuses the same
            nodes and the arrival never re-runs, so switching tabs would swap
            the content with no motion at all — which is the thing this screen
            was rebuilt to stop doing. */}
        {state && (
          <div className="pa-in" key={tab}>
            {tab === "now"    && <TabNow    state={state} totals={totals} rows={rows} alerts={alerts} attention={attention} onOpen={setTab} />}
            {tab === "growth" && <TabGrowth rows={rows} totals={totals} onOpen={setTab} />}
            {tab === "who"    && <TabWho    rows={rows} totals={totals} reload={load} />}
            {tab === "money"  && <TabMoney  state={state} totals={totals} rows={rows} reload={load} />}
            {tab === "pipes" && <TabPipes  state={state} alerts={alerts} />}
          </div>
        )}
      </main>
    </div>
  );
}

/* ══ TAB 1 · NOW ═══════════════════════════════════════════════════════════ */
/* ══ TAB 1 · TODAY ═════════════════════════════════════════════════════════
   REBUILT 2026-09-13. Andrew has never used this screen — he built it, shrugged
   and assumed he would work it out later — so THE FIRST VERSION HE SEES TEACHES
   HIM WHAT THE BACK OFFICE IS FOR. That is the whole design constraint.

   ── THE RULE EVERY ROW HAS TO PASS ───────────────────────────────────────
   **"And what would Andrew DO about this?"** If a row has no answer it does not
   belong here however interesting the number is. That is why this screen has
   almost no tiles: a tile is a number waiting to be interpreted by somebody who
   already knows what good looks like, and he does not yet.

   ── OBSERVATION, NEVER PREDICTION — Cowork's refinement, and it is a wording
   rule because both produce the same row ─────────────────────────────────────
   *"Has not taken a booking in 34 days"* is a fact, checkable, and the thing to
   act on. *"Is likely to churn"* is a guess wearing a fact's clothes, and it
   would have Andrew ring a real person to say the software thinks they are
   leaving. **Say what happened and when. Let him draw the conclusion.**

   The test each sentence here had to pass: *could you show Andrew the number
   that produced this, and would he agree it says what you claim?* Anything that
   failed it was cut rather than softened.

   ── AND IT HAS TO BE HONEST WHEN IT IS EMPTY ────────────────────────────────
   The state he will almost certainly open it in first is "nothing is wrong and
   there are no detailers yet". A screen that looks broken or blank then teaches
   him it is useless. So every empty state says what it WILL say, which is how
   an empty screen still explains the job. */

/* The action for each reason `attention.js` can give. The reason is the
   OBSERVATION and lives in `lib/attention.js`; the sentence telling him what to
   do about it is this screen's, because it is advice and not a measurement. */
const WHAT_TO_DO = [
  [/payment failed/, "Their card was declined. Chase it before the month ends or the account lapses."],
  [/canceling/, "They have asked to stop at the end of the term. Ring them and ask what went wrong."],
  [/never taken a booking/, "They signed up and never got going. Ring them and walk them through setup."],
  [/no booking in/, "They were taking work and stopped. Ring them before they decide to cancel."],
  [/setup stopped at/, "They stalled part-way through setup. Finish it with them on the phone."],
  [/no website/, "Nothing for their customers to find. Offer to build it."],
];
const actionFor = (why = []) => {
  for (const [re, say] of WHAT_TO_DO) if (why.some((w) => re.test(w))) return say;
  return null;
};

/* WHAT TO LOOK AT, IN ORDER — the rhythm he asked for. Deliberately not a
   calendar: a weekday checklist is read once and ignored, and it is wrong the
   moment something is actually on fire. This reorders itself around what is
   true right now, so it is a queue rather than a ritual. */
function weeklyRhythm({ fires, needCall, waiting, live }) {
  const out = [];
  if (fires) out.push("Something is broken — fix that before anything else on this page.");
  if (waiting) out.push("A customer is waiting on a detailer to answer them. That is somebody's booking.");
  if (needCall) {
    out.push(needCall === 1
      ? "Ring the detailer below. A phone call at this size is the whole job."
      : `Ring the ${needCall} detailers below. A phone call at this size is the whole job.`);
  }
  if (!live) {
    out.push("No real detailers yet, so nothing here is about the business.");
    out.push("When the first one signs up, this page starts telling you who is stuck and who has gone quiet.");
  } else {
    out.push("Check Growth for anybody stuck between signing up and taking their first booking.");
    out.push("Check Money for anything past due.");
  }
  return out;
}

function TabNow({ state, totals, rows, alerts, attention, onOpen }) {
  /* NO PLATFORM-WIDE CHART, AND THIS IS THE SECOND TIME THAT SENTENCE HAS BEEN
     WRITTEN HERE — an earlier rebuild drew one by summing a `months` array off
     each row. **There is no such field.** The `list` payload carries this
     month's figures per business and no history at all, so the chart said "No
     finished jobs yet" for ever and looked like an empty platform rather than a
     missing field. It was caught by loading the screen and reading it, which is
     the only thing that could have caught it: the code was valid, the build was
     clean, and `rows[0].months` is simply `undefined`. */
  const live = rows.filter((r) => !r.is_demo);
  const waiting = live.reduce((a, r) => a + (r.requests_waiting ?? 0), 0);
  const withWaiting = live.filter((r) => (r.requests_waiting ?? 0) > 0);
  const fires = alerts.length;
  const needCall = attention.length;
  const nothing = !fires && !needCall && !waiting;

  return (
    <>
      {/* THE LEAD SENTENCE. He should know whether to keep reading before he
          reads anything else, and "nothing needs you" is a real answer rather
          than an empty screen. */}
      <section className="pa-sec pa-today" style={{ "--i": 0 }}>
        <p className="pa-lede">
          {nothing
            ? "Nothing needs you right now."
            : (() => {
              const n = fires + needCall + (waiting ? 1 : 0);
              return n === 1 ? "One thing needs you." : `${n} things need you.`;
            })()}
        </p>
        <p className="pa-sub">
          {live.length === 0
            ? "There are no real detailers on the platform yet — everything below is about the software itself."
            : `${plural(live.length, "detailer", "detailers")} on the platform.`}
        </p>
      </section>

      {/* 1 · BROKEN. Above everything, because a stopped job is silent and the
             other sections are about people who can wait an hour. */}
      {fires > 0 && (
        <section className="pa-sec" style={{ "--i": 1 }}>
          <div className="pa-h"><h2>Something is broken</h2></div>
          <div className="pa-card pa-fire">
            <div className="pa-rows">
              {alerts.map((a) => <div className="pa-do" key={a}><span className="pa-ev">{a}</span></div>)}
            </div>
            <p className="pa-sub pa-act">
              The platform's own jobs — open System health to see when each last finished.
            </p>
          </div>
        </section>
      )}

      {/* 2 · A CUSTOMER IS WAITING. Ahead of detailer health because there is a
             real person at the other end of it with a booking in the balance. */}
      {waiting > 0 && (
        <section className="pa-sec" style={{ "--i": 2 }}>
          <div className="pa-h"><h2>Customers waiting on an answer</h2></div>
          <div className="pa-card">
            <div className="pa-rows">
              {withWaiting.map((r) => (
                <Row key={r.id} k={r.name}
                     v={`${plural(r.requests_waiting, "request", "requests")} unanswered`} />
              ))}
            </div>
            <p className="pa-sub pa-act">
              A customer asked for a time and has not heard back — worth interrupting a detailer for.
            </p>
          </div>
        </section>
      )}

      {/* 3 · WHO TO RING. The reasons come from `lib/attention.js` and are facts
             with dates in them; the advice beneath each is this screen's. */}
      <section className="pa-sec" style={{ "--i": 3 }}>
        <div className="pa-h">
          <h2>Detailers who need a call</h2>
          {live.length > 0 && (
            <button className="pa-out" type="button" onClick={() => onOpen("who")}>See everyone</button>
          )}
        </div>
        {needCall === 0
          ? (
            <div className="pa-card">
              <p className="pa-none">
                {live.length === 0
                  ? "Nobody yet — a detailer who stalls (no bookings, setup unfinished, a failed card) appears here with the reason and what to do."
                  : "Everybody is taking bookings and nobody is past due."}
              </p>
            </div>
          )
          : (
            <div className="pa-card">
              <div className="pa-rows">
                {attention.map((a) => {
                  /* `why`, NOT `reasons` — the previous version of this screen
                     read `a.reasons`, which `needsALook` has never returned, so
                     every row here rendered a name beside an empty string. Found
                     by reading the code while rebuilding, not by any check. */
                  const why = a.why ?? [];
                  const todo = actionFor(why);
                  return (
                    <div className="pa-do" key={a.id}>
                      <div className="pa-do-t">
                        <strong>{a.name}</strong>
                        <span className="pa-ev">{why.join(" · ")}</span>
                      </div>
                      {todo && <p className="pa-act">{todo}</p>}
                      {a.owner_email && (
                        <a className="pa-btn" href={`mailto:${a.owner_email}`}>{a.owner_email}</a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </section>

      {/* 4 · THE RHYTHM. What to look at and in what order, reordered around
             what is actually true rather than printed as a fixed checklist. */}
      <section className="pa-sec" style={{ "--i": 4 }}>
        <div className="pa-h"><h2>What to look at, in order</h2></div>
        <div className="pa-card">
          <ol className="pa-steps">
            {weeklyRhythm({ fires, needCall, waiting, live: live.length }).map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
      </section>

      {/* 5 · THE NUMBERS, LAST AND FEW. Kept because he asked to see money, cut
             to the ones that mean something on their own. Anything needing a
             trend to read belongs on Growth, which has the history. */}
      <section className="pa-sec" style={{ "--i": 5 }}>
        <div className="pa-h"><h2>Where the business stands</h2></div>
        <div className="pa-tiles">
          <Tile n={money((totals.mrr_cents ?? 0) / 100)} t="A month, recurring" />
          <Tile n={totals.businesses ?? 0} t="Detailers" />
          <Tile n={totals.new_month ?? 0} t="Joined this month" />
          <Tile n={totals.suspended ?? 0} t="Suspended" warn={Boolean(totals.suspended)} />
          <Tile n={totals.founding_left ?? 0} t="Founding spots left" />
        </div>
        <p className="pa-sub" style={{ marginTop: 10 }}>
          {money(totals.revenue_month ?? 0)} passed through the platform this month, but only the
          recurring total above is ours.
        </p>
      </section>
    </>
  );
}

/* ══ TAB 2 · GROWTH ════════════════════════════════════════════════════════
   BUILT 2026-09-13, to Today's shape and under Today's rules — every row has to
   survive *"and what would Andrew DO about this?"*, and every sentence is an
   OBSERVATION with a date or a count in it rather than a prediction.

   ── WHY THERE IS NO CHART ON THIS SCREEN ──────────────────────────────────
   A signups-per-month chart was the obvious thing to build here and it was cut.
   With one real detailer every trend line is noise, and a chart is a number
   waiting to be interpreted by somebody who already knows what good looks like.
   Andrew does not yet. The day there are twenty detailers this is the first
   thing to add back, and `Chart` is already in this file for it.

   ── EACH LINE IS COUNTED ON ITS OWN, NOT AS A FUNNEL — and that is the
   important decision on this screen ────────────────────────────────────────
   The obvious build filters each stage out of the one above it, so a detailer
   who stalled at setup never appears in any later row. **But these five facts
   are independent in real life**: a detailer can be booking steadily with setup
   half-finished, and a funnel would file him under "stuck at setup" and stop
   counting him. That is a false alarm about a working business, which is the
   one thing that gets a list like this ignored.

   So each row asks its own question of everybody, and the screen says so in as
   many words. **A detailer can appear on two rows. That is correct** — it means
   two different things are true about them. */
// **`bookability()` AND `setupProgress()` TAKE THE SAME PARAMETER SHAPE AND
// DIFFERENT FIELD SETS, AND THAT WAS THE WHOLE BUG — ROADMAP 9.2, fixed
// 2026-09-21.** `platform-admin` builds `setup_inputs` FOR `setupProgress`
// and labels it so in its own comment, which is why it carries
// `business: { contact_phone, contact_email }` and `settings: { setup }`.
// `bookability` reads `business.status` and `settings.booking_mode` — neither
// is in there, and JavaScript charges nothing for a missing key. So on both
// screens that asked, the **"suspended" reason could never fire**, and a
// detailer who takes REQUESTS read as "Taking bookings".
//
// **Nothing new is fetched. The row already carries both fields at the top
// level**, which is why this needed no edge-function deploy — unlike 9.1,
// whose fix is on the server. They are named one by one below rather than
// passing the whole row, because the two fields this function actually reads
// are the entire point of the defect.
const bookabilityOf = (r) => bookability({
  counts: r?.setup_inputs?.counts,
  business: { status: r?.status },
  settings: { booking_mode: r?.booking_mode },
});

const STUCK = [
  ["setup",
   (r) => setupProgress(r.setup_inputs).count >= SETUP_FLOOR,
   (n) => `${plural(n, "detailer has", "detailers have")} not got through setup`,
   `Fewer than ${SETUP_FLOOR} of the steps are done. Ring them and finish it on the phone — every one of these signed up and then stopped.`],
  ["open",
   (r) => bookabilityOf(r).ok,
   (n) => `${plural(n, "booking page", "booking pages")} cannot take a booking`,
   "Nothing to sell, no open days, or the account is suspended. A customer who tries gets nowhere, and neither of you finds out. This is the most expensive thing on the page."],
  // **THIS ROW'S ADVICE IS THE ONLY ONE WITH NO LEAD FACT, AND THAT IS A
  // DECISION RATHER THAN AN OVERSIGHT — ROADMAP 9.2(b), 2026-09-21. Please do
  // not helpfully put one back.** It used to open *"The page works and nobody
  // has used it"*, and **"The page works" was a claim this row never made**:
  // it tests `bookings_total` and nothing else, while the `open` row four
  // lines up is the one that actually evaluates bookability. On an account
  // that fails both — which is every account on this screen today — the two
  // rows contradicted each other in plain English.
  //
  // The obvious repair is *"Nobody has used their page"*, which keeps the
  // house fact-then-action shape. **It was rejected, and the reason is the
  // shape argument's own limit:** the other four rows lead with a fact the
  // headline does NOT carry, and this one would only restate the count two
  // lines above it — CLAUDE.md's never-defaults name that exactly, *copy that
  // explains what the label already said*, and the cost is that the row stops
  // being read. What is left says the only thing on this row a person cannot
  // already see.
  ["first",
   (r) => (r.bookings_total ?? 0) > 0,
   (n) => `${plural(n, "detailer has", "detailers have")} never taken a booking`,
   "Ask how they are telling their own customers about their booking page."],
  // **A DETAILER WHO NEVER BOOKED IS NOT QUIET, AND THIS ROW SAID HE WAS —
  // caught by loading the screen and reading it, 2026-09-13.** With no
  // bookings `days_since_booking` is null, so the plain test made every new
  // signup "has not booked in 21 days" and told Andrew *"they were taking work
  // and stopped"* about somebody who had never started. The row above already
  // owns that person and says the true thing about them. **Two rows on one
  // screen contradicting each other about one detailer is worse than either
  // row being missing** — and `lib/attention.js` has kept these two facts
  // apart since the day it was written, for exactly this reason.
  ["quiet",
   (r) => (r.bookings_total ?? 0) === 0 || (r.days_since_booking ?? 9999) < QUIET_DAYS,
   (n) => `${plural(n, "detailer has", "detailers have")} not booked in ${QUIET_DAYS} days`,
   "They were taking work and stopped. Ring them before they decide to cancel."],
  ["site",
   (r) => Boolean(r.site_url || r.domain),
   (n) => `${plural(n, "detailer has", "detailers have")} no website`,
   "That one is ours rather than theirs. Build it, or tell them when it is coming."],
];

function TabGrowth({ rows, totals, onOpen }) {
  // REAL DETAILERS ONLY, the same rule every tile on this screen already
  // follows. A fixture trips four of the five rows below by construction, so
  // counting them would make this screen permanently alarming and useless.
  const live = useMemo(() => rows.filter((r) => !r.is_demo), [rows]);

  const stuck = useMemo(() => STUCK.map(([key, ok, headline, todo]) => {
    const failing = live.filter((r) => !ok(r));
    return { key, todo, failing, headline: headline(failing.length) };
  }).filter((s) => s.failing.length > 0), [live]);

  const booking = live.filter((r) => (r.bookings_total ?? 0) > 0).length;
  const onFounding = live.filter((r) => r.plan_tier === "founding").length;

  return (
    <>
      <section className="pa-sec pa-today" style={{ "--i": 0 }}>
        <p className="pa-lede">
          {live.length === 0
            ? "Nobody has signed up yet."
            : `${plural(live.length, "detailer", "detailers")}, ${booking} of them taking bookings.`}
        </p>
        <p className="pa-sub">
          {live.length === 0
            ? "When the first detailer signs up, this page tells you exactly where they got to and where they stopped."
            : `${plural(totals.new_month ?? 0, "joined", "joined")} this month.`}
        </p>
      </section>

      {/* 1 · WHERE PEOPLE ARE STUCK. The whole screen, really — everything else
             here is context for these rows. */}
      <section className="pa-sec" style={{ "--i": 1 }}>
        <div className="pa-h"><h2>Where people are stuck</h2></div>
        {stuck.length === 0
          ? (
            <div className="pa-card">
              <p className="pa-none">
                {live.length === 0
                  ? "Nothing yet — fills in with names the moment somebody signs up and stalls."
                  : "Nobody is stuck — everyone has finished setup, taken a booking, and booked recently."}
              </p>
            </div>
          )
          : (
            <div className="pa-card">
              <div className="pa-rows">
                {stuck.map((s) => (
                  <div className="pa-do" key={s.key}>
                    <div className="pa-do-t">
                      <strong>{s.headline}</strong>
                      <span className="pa-ev">{s.failing.map((r) => r.name).join(" · ")}</span>
                    </div>
                    <p className="pa-act">{s.todo}</p>
                  </div>
                ))}
              </div>
              {/* SAYING HOW IT IS COUNTED IS PART OF THE ROW. Without this
                  sentence a name on two lines looks like a bug in the screen
                  rather than two true things about one detailer. */}
              <p className="pa-sub pa-act">
                A detailer can appear on two lines at once when two different things are true about
                them — that is not the same name being counted twice.
              </p>
            </div>
          )}
      </section>

      {/* 2 · THE FOUNDING OFFER. A number he can actually spend: it is the
             thing to say on a sales call and it runs out. */}
      <section className="pa-sec" style={{ "--i": 2 }}>
        <div className="pa-h"><h2>The founding offer</h2></div>
        <div className="pa-card">
          <div className="pa-do">
            {/* **THIS LINE PRINTED "0 detailers are on the platform" DIRECTLY
                UNDER A LEDE SAYING THERE WAS ONE.** It was an expression that
                subtracted the spots left from the total and then printed the
                total anyway — arithmetic nobody could have read as a sentence,
                which is the tell. It counts the founding tier now, which is a
                fact the payload actually carries. Found by loading the screen
                and reading it; no check in this repo would have seen it. */}
            <div className="pa-do-t">
              <strong>{plural(totals.founding_left ?? 0, "spot", "spots")} left</strong>
              <span className="pa-ev">
                {plural(onFounding, "detailer is", "detailers are")} on the founding price
              </span>
            </div>
            <p className="pa-act">
              {(totals.founding_left ?? 0) === 0
                ? "They are gone. Anybody signing up now pays the standard price."
                : "Real scarcity, not a tactic — the count comes from the database and drops every time somebody takes a spot."}
            </p>
          </div>
        </div>
      </section>

      {/* 3 · WHAT THIS SCREEN CANNOT TELL HIM. A growth page that silently
             omits churn reads as "nobody has left", which is a claim rather
             than an omission. */}
      <section className="pa-sec" style={{ "--i": 3 }}>
        <div className="pa-h"><h2>Not here yet</h2></div>
        <div className="pa-card">
          <div className="pa-rows">
            <Row k="How many left, and when" v="nothing records a cancellation date yet" />
            <Row k="Where a signup came from" v="nothing records it" />
            <Row k="How long setup takes on average" v="needs a timestamp per step" />
          </div>
          <p className="pa-sub pa-act">
            Missing, not zero — this screen can say who is here or stuck, not yet who has left.
          </p>
        </div>
      </section>

      {live.length > 0 && (
        <section className="pa-sec" style={{ "--i": 4 }}>
          <button className="pa-btn pa-go" type="button" onClick={() => onOpen("who")}>
            Open a detailer
          </button>
        </section>
      )}
    </>
  );
}

/* ══ TAB 4 · DETAILERS ═════════════════════════════════════════════════════ */
// **THREE OF THESE SIX ASKED THE WRONG QUESTION AND NOTHING SAID SO — fixed
// 2026-09-13, while rebuilding this screen.**
//
// `setupProgress` takes `{ business, branding, settings, counts }` and the row
// carries those under `setup_inputs`, so `setupProgress(r)` destructured four
// undefineds and returned `{ done: Set(0), count: 0, total: 11 }` for EVERY
// business on the platform. The chip then compared `Set < 11`, which is `NaN <
// 11`, which is `false` — so "Setup unfinished" counted **zero** on a platform
// where nobody had finished setup. A filter that is always empty looks exactly
// like a filter with nothing to show.
//
// **AND THE SAME MISTAKE PRINTED `[object Set] of 11` IN THE PANEL**, because
// the result was read as `.done` (a Set of step keys) where the number is
// `.count`. Two spellings of one answer, one of them wrong, in two places.
//
// `billingState(...)?.pastDue` was the third: that function returns
// `{ tone, label, detail }` and has never had a `pastDue` field, so "Past due"
// was `undefined` for everybody and counted zero too.
//
// **THE RULE UNDERNEATH: A FILTER THAT MATCHES NOBODY IS INDISTINGUISHABLE FROM
// A HEALTHY PLATFORM.** None of the three threw, none logged, and the screen
// rendered perfectly. They were found by reading the code, not by any check.
const setupOf = (r) => setupProgress(r.setup_inputs);
const FILTERS = [
  ["all", "Everyone", () => true],
  // FOURTEEN OF THE FIFTEEN ROWS ARE FIXTURES TODAY, so "everyone" is mostly
  // noise and the one real detailer sits in the middle of it. This is a chip
  // rather than the default, because a list that silently hides rows is the
  // omission this repo refuses everywhere else — he chooses to narrow it.
  ["real", "Real detailers", (r) => !r.is_demo],
  ["due", "Past due", (r) => billingState(r.subscription).tone === "bad"],
  ["setup", "Setup unfinished", (r) => setupOf(r).count < setupOf(r).total],
  ["never", "No bookings ever", (r) => !r.last_booking_at],
  // QUIET_DAYS, NOT 30. `lib/attention.js` decides what "gone quiet" means and
  // Today already prints its answer; a chip with its own threshold is a second
  // number about the same thing, and the support call starts with an argument
  // about which screen is right.
  ["quiet", `Quiet ${QUIET_DAYS} days`, (r) => (daysSince(r.last_booking_at) ?? 9999) >= QUIET_DAYS],
  ["nosite", "No website yet", (r) => !r.site_url && !r.domain],
];

// REGISTERING A BUSINESS SIGNED UP IN PERSON — restored 2026-09-13.
//
// **THE SERVER HAS ANSWERED `create` ALL ALONG AND NOTHING COULD REACH IT.**
// The back-office rewrite in `45eaf85` cut this screen from 1,436 lines to 798
// and six of the edge function's twelve actions lost their only caller. This is
// the first of the six back, and it is the one a person misses first: a detailer
// standing at his counter could not be signed up at all.
//
// **AN INVITE, NOT A MEMBERSHIP** — the server's own reasoning, unchanged here:
// the person being signed up may have no account yet, and `business_users`
// references `auth.users`, so there is nobody to point a row at.
//
// **AND THE LINK IS SHOWN, NOT JUST EMAILED.** `create` returns it either way,
// deliberately, because he is standing next to them: if the email is slow or the
// address was mistyped, reading the link off his own screen is the entire point
// of doing this in person. So it is displayed and selectable rather than
// announced as sent.
function NewBusiness({ reload }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", timezone: "America/Los_Angeles", owner_email: "", contact_phone: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState(null);

  // The slug follows the name until somebody types their own, which is the
  // same rule the tenant settings screen uses. A slug typed by hand is never
  // overwritten by a later edit to the name.
  const [slugTouched, setSlugTouched] = useState(false);
  const slugify = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const setName = (v) => setForm((f) => ({ ...f, name: v, slug: slugTouched ? f.slug : slugify(v) }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(""); setMade(null);
    try {
      const out = await call({ action: "create", ...form });
      setMade(out);
      setForm({ name: "", slug: "", timezone: form.timezone, owner_email: "", contact_phone: "" });
      setSlugTouched(false);
      reload();
    } catch (e2) { setErr(e2.message || "That did not work."); }
    setBusy(false);
  };

  if (!open) {
    return (
      <section style={{ "--i": 0 }}>
        <button className="pa-btn pa-go" type="button" onClick={() => setOpen(true)}>
          Sign up a detailer
        </button>
      </section>
    );
  }

  return (
    <section style={{ "--i": 0 }}>
      <form onSubmit={submit}>
        <h2>Sign up a detailer</h2>
        <p className="pa-sub">
          Creates the business, emails the owner an invite, and shows the link here too in case you
          want to read it to them.
        </p>
        <input className="pa-find" placeholder="Business name" required
               value={form.name} onChange={(e) => setName(e.target.value)} />
        <input className="pa-find" placeholder="Booking link (letters, numbers, hyphens)" required
               value={form.slug}
               onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }} />
        <input className="pa-find" placeholder="Their email, for the invite" type="email" required
               value={form.owner_email}
               onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))} />
        <input className="pa-find" placeholder="Their phone (optional)"
               value={form.contact_phone}
               onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
        <input className="pa-find" placeholder="Timezone" required
               value={form.timezone}
               onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} />
        <div className="pa-acts">
          <button className="pa-btn pa-go" type="submit" disabled={busy}>
            {busy ? "Creating..." : "Create and invite"}
          </button>
          <button className="pa-btn" type="button" disabled={busy} onClick={() => { setOpen(false); setErr(""); }}>
            Cancel
          </button>
        </div>
        {err && <p className="pa-err">{err}</p>}
      </form>

      {made?.business && (
        <div className="pa-card">
          <h3>{made.business.name} is set up</h3>
          {made.invite
            ? (
              <>
                <p className="pa-sub">
                  {made.invite.emailed
                    ? `Invite emailed to ${made.invite.email}. If it does not arrive, read them this link:`
                    : `The invite email did not send. Read them this link instead:`}
                </p>
                {/* SELECTABLE, NOT A BUTTON. He may be reading it aloud, texting
                    it, or writing it down — all three want the text itself. */}
                <input className="pa-find" readOnly value={made.invite.link}
                       onFocus={(e) => e.target.select()} />
              </>
            )
            : <p className="pa-sub">No invite was created; add an owner from their row.</p>}
        </div>
      )}
    </section>
  );
}

function TabWho({ rows, totals, reload }) {
  const [find, setFind] = useState("");
  const [filter, setFilter] = useState("all");
  // BY ID, NEVER BY THE ROW OBJECT. `act()` awaits reload(), which replaces
  // `rows`; a captured row would keep the panel — and the `detail` fetch that
  // keys on it — showing the state from before the action. Press Suspend and
  // the drawer still said "live" and still offered Suspend.
  const [openId, setOpenId] = useState(null);
  const open = openId ? rows.find((x) => x.id === openId) ?? null : null;
  const setOpen = (r) => setOpenId(r ? r.id : null);
  const [detail, setDetail] = useState(null);

  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x[0] === filter)?.[2] ?? (() => true);
    const q = find.trim().toLowerCase();
    return rows.filter((r) => {
      if (!f(r)) return false;
      if (!q) return true;
      return [r.name, r.slug, r.owner_email, r.contact_email].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [rows, filter, find]);

  useEffect(() => {
    if (!open) { setDetail(null); return; }
    let live = true;
    call({ action: "get", business_id: open.id })
      .then((d) => { if (live) setDetail(d); })
      .catch(() => { if (live) setDetail({ error: true }); });
    return () => { live = false; };
  }, [openId, rows]);

  return (
    <>
      <NewBusiness reload={reload} />
      <section style={{ "--i": 1 }}>
        <input className="pa-find" placeholder="Search a name, a link or an email"
               value={find} onChange={(e) => setFind(e.target.value)} />
        <div className="pa-chips">
          {FILTERS.map(([k, label, f]) => (
            <button key={k} className="pa-chip" type="button"
                    aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {label}<span className="pa-c">{rows.filter(f).length}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ "--i": 1 }}>
        {shown.length === 0
          ? <p className="pa-none">Nobody matches that.</p>
          : (
            <div className="pa-list">
              {shown.map((r) => {
                const sp = setupOf(r);
                const bill = billingState(r.subscription);
                /* THE ROW SAYS WHAT IS TRUE ABOUT THEM, NOT THREE NUMBERS —
                   2026-09-13, Andrew's rule that guidance is written as the row
                   itself. The sentence comes from `lib/attention.js`, the same
                   file that decides who appears on Today, so this list and that
                   one can never describe the same detailer differently. A row
                   with no reasons gets the positive fact instead of a blank,
                   because "nothing is wrong" is an answer and an empty line is
                   not. */
                const why = r.is_demo ? [] : reasonsFor(r);
                /* **THE FIRST VERSION PRINTED ONE IDENTICAL SENTENCE FOURTEEN
                   TIMES** — "A seeded fixture. Left out of every count on this
                   screen." — which buried the single real detailer in the
                   middle of it and is Andrew's monotony fault exactly. The
                   fixture rule is stated ONCE, under the list, and every row
                   here says the one thing that is actually different about
                   it. The DEMO flag beside the name already marks which is
                   which. */
                const line = why.length
                  ? why.join(" · ")
                  : `${r.bookings_total ?? 0 ? "Booking" : "No bookings"} · last one ${ago(r.last_booking_at).toLowerCase()}`;
                return (
                  <button key={r.id} className="pa-biz" type="button" onClick={() => setOpen(r)}>
                    <span className="pa-biz-n">
                      {r.name}
                      {r.is_demo && <span className="pa-flag">demo</span>}
                      {r.status === "paused" && <span className="pa-flag pa-off">suspended</span>}
                      {bill.tone === "bad" && !r.is_demo && <span className="pa-flag pa-off">{bill.label.toLowerCase()}</span>}
                      {sp.count >= sp.total && <span className="pa-flag pa-on">set up</span>}
                    </span>
                    <span className="pa-biz-m">{line}</span>
                    <span className="pa-biz-f">
                      {/* `plural`, NOT a bare count. "1 customers" is the
                          unguarded-plural bug CLAUDE.md already names once
                          ("1 visits"), and it was live on three rows here. */}
                      {/* FINISHED jobs — `jobs_month` counts `done`. "0 jobs this month" an inch
                          under "last one today" reads as a broken screen; both are true. */}
                      <span><b>{r.jobs_month}</b> {r.jobs_month === 1 ? "finished job" : "finished jobs"} this month</span>
                      {/* **"earned", NOT "taken" — ROADMAP 5.1, settled by 14.7.** This is
                          `final_amount ?? total_price` over FINISHED jobs, so it
                          counts work done whether or not the customer has paid.
                          "Taken" claimed the money had arrived; on the demo
                          business that claim was $295 too big. The detailer's own
                          Money screen uses the same word for the same figure now. */}
                      <span><b>{money(r.revenue_month)}</b> earned</span>
                      <span><b>{r.customers}</b> {r.customers === 1 ? "customer" : "customers"}</span>
                      <span>setup <b>{sp.count}</b> of {sp.total}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        <p className="pa-sub" style={{ marginTop: 12 }}>
          Showing {shown.length} of {rows.length}{totals.demo ? `, including ${totals.demo} demo or test row${totals.demo === 1 ? "" : "s"} left out of every count elsewhere` : ""}.
        </p>
      </section>

      {open && <Business row={open} detail={detail} onClose={() => setOpen(null)} reload={reload} />}
    </>
  );
}

/* ── one business, opened over the list ─────────────────────────────────── */
function Business({ row, detail, onClose, reload }) {
  // The exit is a DELAYED UNMOUNT and the 180ms lives in the hook, not here —
  // a fourth caller with its own setTimeout is how the pattern forks.
  // AN ARRAY, NOT AN OBJECT. Destructured as `{ leaving, close }` this handed
  // back two undefineds, which React accepts in silence: the panel rendered
  // perfectly and neither the x nor the scrim did anything at all. The only
  // way out was reloading the page.
  const [leaving, close] = useLeaving(onClose);
  const [busy, setBusy] = useState("");
  // THE INVITE FORM IS PUT AWAY UNTIL IT IS WANTED. Prefilled with whatever
  // address we already hold, and editable, because the address on file is
  // often the one that bounced.
  const [inviting, setInviting] = useState(false);
  const [inviteTo, setInviteTo] = useState(row.owner_email ?? "");
  const [invite, setInvite] = useState(null);
  const sp = setupOf(row);
  const bill = billingState(row.subscription);
  // **`bookability(row)` WAS ALWAYS WRONG AND THE ROW WAS ALWAYS BLANK.** It
  // takes `{ business, counts, settings }`, which the payload carries under
  // `setup_inputs`; passed the whole row it destructured undefineds and
  // reported "no active services, no open days" about every business alive.
  // Then the screen read `.label`, which this function has never returned, so
  // the `?? "—"` fallback hid the wrong answer behind a dash. **A defect that
  // renders as an em dash is a defect nobody reports.**
  //
  // **AND PASSING `setup_inputs` WAS STILL WRONG, JUST LESS VISIBLY — ROADMAP
  // 9.2.** That object is built for `setupProgress` and has no `status` and
  // no `booking_mode` in it, so this row said "Taking bookings" about a
  // suspended account and about a request-only one. `bookabilityOf` is the
  // one place that decides what this function is fed; see its note above.
  const book = bookabilityOf(row);
  // **`row.owner_email` IS NOT "THEY HAVE AN OWNER ACCOUNT".** The server
  // builds it as `owner?.email ?? contact_email`, so a business somebody typed
  // a contact address for reads as having an owner it does not have — and the
  // button that needs one was enabled for it, right up to the server's 409.
  // `detail.members` is the account list itself, which is the question.
  // **AND `null` IS A THIRD ANSWER, NOT A FALSY SECOND ONE.** The detail
  // arrives a moment after the drawer opens and may not arrive at all. Folding
  // "we do not know yet" into "there is no owner" would disable the button and
  // print a sentence claiming a fact we have not read — so unknown leaves both
  // alone and lets the server answer, which it does in one sentence.
  const hasOwner = detail?.members ? detail.members.some((m) => m.role === "owner") : null;
  const why = row.is_demo ? [] : reasonsFor(row);
  const todo = actionFor(why);
  const series = detail?.bookings ? monthlySeries(detail.bookings, 6, new Date(), row.timezone) : null;

  // ESCAPE CLOSES IT TOO. A panel that covers the page and cannot be left is
  // the same bug as a dead close button, and the owner hit both at once.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const act = async (body, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(body.action);
    try { await call({ ...body, business_id: row.id }); await reload(); }
    catch (e) { window.alert(e.message); }
    setBusy("");
  };

  return (
    <div className="pa-open" role="dialog" aria-label={row.name}>
      <div className="pa-scrim" onClick={close} />
      <div className={`pa-col${leaving ? " pa-leaving" : ""}`}>
        <button className="pa-x" type="button" onClick={close} aria-label="Close">×</button>
        <div className="pa-swap" key={row.id}>
          <div style={{ "--i": 0 }}>
            <span className="pa-lab">{row.slug}</span>
            <h2 style={{ margin: "6px 0 0", fontSize: 20 }}>{row.name}</h2>
            <p className="pa-sub">{row.owner_email ?? "no owner account yet"}</p>
          </div>

          {/* WHAT IS TRUE ABOUT THEM, AND WHAT TO DO — the same sentence Today
              shows, from the same file, so the two screens cannot describe one
              detailer differently. */}
          {(why.length > 0 || todo) && (
            <div className="pa-do" style={{ "--i": 1, marginTop: 12 }}>
              <div className="pa-do-t"><span className="pa-ev">{why.join(" · ")}</span></div>
              {todo && <p className="pa-act">{todo}</p>}
            </div>
          )}

          {series && (
            <div style={{ "--i": 1, marginTop: 16 }}>
              <span className="pa-lab">Their last six months</span>
              <Chart series={series} />
            </div>
          )}

          <div className="pa-card" style={{ "--i": 2, marginTop: 14 }}>
            <div className="pa-rows">
              <Row k="Finished this month" v={row.jobs_month} />
              {/* EARNED, NOT TAKEN — ROADMAP 14.7. See `lib/adminInsight.js`
                  § `paidFor`: this is what was CHARGED, falling back to what was
                  QUOTED, over finished jobs. Nothing here knows whether it was
                  paid, and this screen must not imply that it does. */}
              <Row k="Earned this month" v={money(row.revenue_month)} />
              <Row k="Earned, all time" v={money(row.revenue_total)} />
              <Row k="Customers" v={row.customers} />
              <Row k="Last booking" v={ago(row.last_booking_at)} />
              <Row k="Requests waiting" v={row.requests_waiting ?? 0} />
              <Row k="Setup" v={`${sp.count} of ${sp.total}`} />
              <Row k="Subscription" v={bill.label} />
              <Row k="Their page"
                   v={book.ok
                     ? (book.mode === "request" ? "Takes requests, you answer" : "Taking bookings")
                     : book.reasons.join(", ")} />
              <Row k="Website" v={row.site_url ? (row.domain_verified ? "verified" : "not verified") : "none yet"} />
            </div>
          </div>

          <div className="pa-acts" style={{ "--i": 3 }}>
            {row.site_url && (
              <a className="pa-btn" href={row.site_url} target="_blank" rel="noreferrer">Their site</a>
            )}
            <a className="pa-btn" href={`/book/${row.slug}`} target="_blank" rel="noreferrer">Their booking page</a>
            {row.owner_email && <a className="pa-btn" href={`mailto:${row.owner_email}`}>Email them</a>}
            {row.status === "paused"
              ? <button className="pa-btn" type="button" disabled={busy === "restore"}
                        onClick={() => act({ action: "restore" }, `Let ${row.name} back in?`)}>Restore</button>
              : <button className="pa-btn pa-danger" type="button" disabled={busy === "suspend"}
                        onClick={() => act({ action: "suspend" }, `Suspend ${row.name}? Their booking page stops taking bookings.`)}>Suspend</button>}
            {/* A NEW TAB, AND THIS ONE STAYS SIGNED IN AS YOU. It used to
                replace your session with the detailer's, warn you about it,
                and leave you at their dashboard with no way back. The owner,
                2026-09-09: *"I don't even wanna be signing in as someone to
                view their dashboard... There should be just a way that I can
                view it just from me."* The preview tab keeps its session in
                its own drawer (lib/preview.js), so nothing here is touched
                and closing that tab is the whole exit. No warning, because
                there is nothing left to warn about.

                THE TAB IS OPENED ON THE CLICK, BEFORE THE AWAIT. Opened
                after it, the browser calls it a pop-up and blocks it without
                a word. It is handed the one-time token once the server has
                given us one, and closed again if the call fails.
                Impersonation is still logged server-side before the token is
                made, and a failed log still stops it. */}
            <button className="pa-btn" type="button" disabled={hasOwner === false || busy === "impersonate"}
                    onClick={async () => {
                      const tab = window.open("/preview", "_blank");
                      if (!tab) { window.alert("Your browser blocked the new tab. Allow pop-ups for this site, then try again."); return; }
                      setBusy("impersonate");
                      try {
                        const out = await call({ action: "impersonate", business_id: row.id });
                        const token = new URL(out.url).searchParams.get("token");
                        if (!token) throw new Error("The server did not send back a usable link.");
                        tab.location.replace(
                          `/preview#token=${encodeURIComponent(token)}&who=${encodeURIComponent(row.name)}`);
                      } catch (e) { tab.close(); window.alert(e.message); }
                      setBusy("");
                    }}>
              Look at their dashboard
            </button>
            {/* EVERYTHING THEY OWN, AS ONE FILE — the door onto `export`,
                which has done the work since roadmap 4.4 and was reachable
                from no screen at all. `/terms` promises a detailer a copy of
                their own data on request, and this is the only thing in the
                product that can produce one; it is also the answer to a
                deletion request, which arrives without warning.

                HANDED OVER, NEVER DRAWN. It is every customer and every price
                of one business, so a screen that prints it is a screen left
                open on a desk. The server logs the size rather than the
                contents for the same reason. */}
            <button className="pa-btn" type="button" disabled={busy === "export"}
                    onClick={async () => {
                      setBusy("export");
                      try {
                        const out = await call({ action: "export", business_id: row.id });
                        const url = URL.createObjectURL(
                          new Blob([JSON.stringify(out.export, null, 2)], { type: "application/json" }));
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${row.slug}-${localDate(new Date().toISOString())}.json`;
                        a.click();
                        // Revoked, or the whole export stays in memory until
                        // the tab is closed — and this tab stays open all day.
                        URL.revokeObjectURL(url);
                      } catch (e) { window.alert(e.message); }
                      setBusy("");
                    }}>
              {busy === "export" ? "Gathering it up…" : "Download everything they own"}
            </button>
            <button className="pa-btn" type="button" onClick={() => setInviting((v) => !v)}>
              {inviting ? "Never mind" : "Send an owner invite"}
            </button>
          </div>

          {/* THE WAY OUT OF THE DEAD END ABOVE. The screen used to state the
              problem and offer nothing: no owner account, so no dashboard to
              look at, and the action that fixes it — `resend_invite` — was
              reachable from nowhere. Any live invite to the same address is
              superseded rather than duplicated, which the server does. */}
          {hasOwner === false && (
            <p className="pa-sub" style={{ "--i": 4, marginTop: 8 }}>
              Nobody has accepted the owner invite yet, so there is no account to open it as.
            </p>
          )}
          {inviting && (
            <div className="pa-card" style={{ "--i": 4, marginTop: 10 }}>
              <label className="pa-field">
                <span className="pa-lab">Their email address</span>
                <input type="email" value={inviteTo} autoComplete="off"
                       onChange={(e) => setInviteTo(e.target.value)} />
              </label>
              <p className="pa-sub" style={{ marginTop: 8 }}>
                Sends a sign-in link that makes them owner of {row.name}, and cancels any invite
                already out to that address.
              </p>
              <button className="pa-btn pa-go" type="button" style={{ marginTop: 10 }}
                      disabled={!inviteTo.includes("@") || busy === "resend_invite"}
                      onClick={async () => {
                        setBusy("resend_invite");
                        setInvite(null);
                        try {
                          const out = await call({
                            action: "resend_invite", business_id: row.id,
                            email: inviteTo.trim(), role: "owner",
                          });
                          setInvite(out.invite);
                        } catch (e) { window.alert(e.message); }
                        setBusy("");
                      }}>
                {busy === "resend_invite" ? "Sending…" : "Send it"}
              </button>
              {invite && (
                <p className="pa-sub" style={{ marginTop: 10 }}>
                  {invite.emailed
                    ? `Sent to ${invite.email}. The link works until ${dateLong(localDate(invite.expires_at))}.`
                    : "The email did not go out. Send them this link yourself:"}
                  {/* THE LINK IS SHOWN WHEN THE EMAIL FAILED AND ONLY THEN. A
                      one-time sign-in link on screen every time is a link that
                      ends up in a screenshot; when the relay is down it is the
                      only thing standing between a detailer and their own
                      account. */}
                  {!invite.emailed && (
                    <><br /><code style={{ wordBreak: "break-all" }}>{invite.link}</code></>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══ TAB 3 · MONEY ═════════════════════════════════════════════════════════ */
function TabMoney({ state, totals, rows, reload }) {
  const byTier = useMemo(() => {
    const t = {};
    for (const r of rows) {
      if (r.is_demo) continue;
      const cents = r.subscription?.recurring_cents ?? 0;
      if (!cents) continue;
      const k = r.plan_tier ?? "unknown";
      t[k] = t[k] ?? { n: 0, cents: 0 };
      t[k].n += 1; t[k].cents += cents;
    }
    return Object.entries(t);
  }, [rows]);

  /* MONEY THAT IS ABOUT TO STOP ARRIVING, with the reason and the action —
     2026-09-13, rebuilt to Today's shape. The old screen led with three tiles,
     which told him what the numbers WERE and nothing about what to do, and a
     tile is exactly the thing Today's rule cuts: a figure waiting to be
     interpreted by somebody who already knows what good looks like.

     EACH ROW IS AN OBSERVATION WITH A CAUSE, never a forecast. "Their card was
     declined" is checkable; "at risk of churning" is a guess he would act on by
     ringing a real person. */
  const atRisk = useMemo(() => {
    const out = [];
    for (const r of rows) {
      if (r.is_demo) continue;
      const b = billingState(r.subscription);
      if (b.tone === "good") continue;
      const cents = r.subscription?.recurring_cents ?? 0;
      out.push({ id: r.id, name: r.name, label: b.label, detail: b.detail, cents, email: r.owner_email });
    }
    return out.sort((a, b) => b.cents - a.cents);
  }, [rows]);
  const riskCents = atRisk.reduce((a, r) => a + r.cents, 0);

  const p = state?.prices;
  // THE DRAFT IS A FLAT MAP OF `"website.setup" -> "999"`, and the values stay
  // STRINGS while they are being typed — a number state cannot hold "" or "0."
  // and fights the person halfway through a figure. `null` means the editor is
  // shut.
  const [draft, setDraft] = useState(null);
  const [priceErr, setPriceErr] = useState("");
  const [saving, setSaving] = useState(false);
  const open = () => {
    setPriceErr("");
    setDraft(Object.fromEntries(
      priceRows(p?.current ?? p?.built_in).map((r) => [r.path.join("."), String(r.raw)]),
    ));
  };
  // **NOTHING IS VALIDATED HERE, ON PURPOSE.** `platform-admin` runs the table
  // through `pricesFrom` — the same function the checkout charges from — so a
  // second opinion on this screen is exactly how the two answers drift apart.
  // The server's sentence is what gets shown.
  const send = async (body) => {
    setSaving(true); setPriceErr("");
    try { await call(body); setDraft(null); await reload?.(); }
    catch (e) { setPriceErr(e.message); }
    setSaving(false);
  };
  const save = () => {
    const table = {};
    for (const [k, v] of Object.entries(draft)) {
      const [a, b] = k.split(".");
      if (b === undefined) table[a] = Number(v);
      else { table[a] = table[a] ?? {}; table[a][b] = Number(v); }
    }
    return send({ action: "prices", prices: table });
  };
  // `null` IS THE WHOLE POINT OF THIS BUTTON. It does not write the built-in
  // figures into the row — that would be a third copy of the same numbers,
  // silently stale the next time the files change. It empties the row, and
  // empty means *read the files*.
  const clearPrices = () => {
    if (!window.confirm("Go back to the built-in prices? Whatever is set here is forgotten.")) return;
    return send({ action: "prices", prices: null });
  };
  return (
    <>
      {/* THE DISTINCTION THE OLD SCREEN GOT WRONG by putting both figures in
          one row in one style: what the platform EARNS and what flows THROUGH
          it are different numbers by two orders of magnitude, and only one of
          them is income. It is a sentence now rather than two tiles, because
          the sentence is the part that says which is which. */}
      <section className="pa-sec pa-today" style={{ "--i": 0 }}>
        <p className="pa-lede">
          {(totals.mrr_cents ?? 0) === 0
            ? "Nothing is coming in yet."
            : `${money((totals.mrr_cents ?? 0) / 100)} a month is ours.`}
        </p>
        <p className="pa-sub">
          {money(totals.revenue_month ?? 0)} passed through the platform this month — the
          detailers&apos; money, not income of ours.
        </p>
      </section>

      {/* 1 · WHAT IS ABOUT TO STOP. Above the earnings breakdown, because a
             breakdown is a report and this is a list of phone calls. */}
      <section className="pa-sec" style={{ "--i": 1 }}>
        <div className="pa-h"><h2>Money at risk</h2></div>
        {atRisk.length === 0
          ? (
            <div className="pa-card">
              <p className="pa-none">
                {totals.businesses
                  ? "Every detailer is paying and nothing has failed."
                  : "Nobody is paying yet, so nothing to lose — fills in on a failed card, a notice, or a free account."}
              </p>
            </div>
          )
          : (
            <div className="pa-card">
              <div className="pa-rows">
                {atRisk.map((r) => (
                  <div className="pa-do" key={r.id}>
                    <div className="pa-do-t">
                      <strong>{r.name}</strong>
                      <span className="pa-ev">
                        {r.label}{r.cents ? ` · ${money(r.cents / 100)} a month` : " · paying nothing"}
                      </span>
                    </div>
                    {r.detail && <p className="pa-act">{r.detail}</p>}
                    {r.email && <a className="pa-btn" href={`mailto:${r.email}`}>{r.email}</a>}
                  </div>
                ))}
              </div>
              <p className="pa-sub pa-act">
                {riskCents
                  ? `${money(riskCents / 100)} a month sits on these ${plural(atRisk.length, "account", "accounts")} — a failed card retries itself, everything else needs a call.`
                  : "None of these is paying anything today, so nothing stops if they leave. They are here because a subscription that never started is a sale that was never finished."}
              </p>
            </div>
          )}
      </section>

      <section className="pa-sec" style={{ "--i": 2 }}>
        <div className="pa-h"><h2>What we earn, by plan</h2></div>
        <div className="pa-card">
          {byTier.length === 0
            ? <p className="pa-none">Nobody is paying yet.</p>
            : (
              <div className="pa-rows">
                {/* `say()` RATHER THAN THE RAW COLUMN. `plan_tier` holds
                    `founding` and `standard`, which are database tokens; the
                    price table two sections down already has English for them
                    and printing one screen in two vocabularies is how a
                    support call starts with a question about wording. */}
                {byTier.map(([k, v]) => (
                  <Row key={k} k={`${say(k)} · ${plural(v.n, "detailer", "detailers")}`} v={`${money(v.cents / 100)} a month`} />
                ))}
              </div>
            )}
        </div>
      </section>

      <section className="pa-sec" style={{ "--i": 3 }}>
        <div className="pa-h">
          <h2>What we charge</h2>
          <span className="pa-sub">
            {p?.current ? "Custom pricing, set here" : "Standard pricing"}
          </span>
        </div>
        <div className="pa-card">
          {/* **IT PRINTED `[object Object]` FOUR TIMES — fixed 2026-09-13.**
              The price table is NESTED — `website: { setup, monthly }`,
              `term: { months, exitFeeShare }` — and this mapped the top level
              and called `String(v)` on the group. So the one screen that shows
              what the platform charges could not show a single number.
              **AND `money()` ON EVERYTHING WOULD HAVE BEEN THE SECOND BUG.**
              `term.months` is a count and `term.exitFeeShare` is a fraction;
              rendering either as dollars is a wrong number rather than a
              missing one, which is worse. The unit comes from the KEY, because
              the key is the only thing that knows it. */}
          {/* **THE EDITOR CAME BACK — roadmap 4.4 stage 4, lost in a rebuild
              and restored 2026-09-13.** `platform-admin` has carried the
              `prices` action the whole time; what went missing was the only
              thing that could reach it, so the one table that decides what a
              detailer's card is charged was editable through the API and
              nowhere else. `platform_settings.prices` was `null` throughout, so
              nothing was stuck — but an override set by any route at all could
              not have been cleared from this screen, and `null` meaning *fall
              back to the files WHOLE* is the safety valve. */}
          {draft
            ? (
              <>
                <div className="pa-rows">
                  {priceRows(p?.current ?? p?.built_in).map(({ path, label }) => {
                    const key = path.join(".");
                    return (
                      <div className="pa-row" key={key}>
                        <span className="pa-k">{label}</span>
                        <span className="pa-edit">
                          {/* WHAT IT WILL READ AS, BESIDE WHAT IS TYPED. The
                              table is not all money: `Length` is a count of
                              months and `Exit fee` is a FRACTION, so 0.5 means
                              half. Converting either on the way in and out
                              would put a unit conversion in the screen, which
                              is the shape of bug this repo already paid for
                              with promo codes. Showing the reading instead
                              costs nothing and cannot drift: a typed 50 says
                              "5000% of what is left" out loud. */}
                          <span className="pa-said">{priceValue(path[path.length - 1], Number(draft[key]))}</span>
                          <input type="text" inputMode="decimal" value={draft[key]} aria-label={label}
                                 onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                        </span>
                      </div>
                    );
                  })}
                </div>
                {priceErr && <p className="pa-err">{priceErr}</p>}
                <div className="pa-acts">
                  <button className="pa-btn pa-go" type="button" disabled={saving}
                          onClick={save}>{saving ? "Saving…" : "Save these prices"}</button>
                  <button className="pa-btn" type="button" disabled={saving}
                          onClick={() => { setDraft(null); setPriceErr(""); }}>Cancel</button>
                  {/* ONLY WHEN THERE IS SOMETHING TO CLEAR. With no override
                      this button would claim to undo a thing that never
                      happened. */}
                  {p?.current && (
                    <button className="pa-btn pa-danger" type="button" disabled={saving}
                            onClick={clearPrices}>Go back to the built-in prices</button>
                  )}
                </div>
              </>
            )
            : (
              <>
                <div className="pa-rows">
                  {priceRows(p?.current ?? p?.built_in).map(({ label, value }) => (
                    <Row key={label} k={label} v={value} />
                  ))}
                </div>
                <div className="pa-acts">
                  <button className="pa-btn" type="button" onClick={open}>Change these prices</button>
                </div>
              </>
            )}
        </div>
      </section>

      <section className="pa-sec" style={{ "--i": 4 }}>
        <div className="pa-h"><h2>Promo codes</h2></div>
        <div className="pa-card">
          {(state?.promos ?? []).length === 0
            ? <p className="pa-none">None.</p>
            : (
              <div className="pa-rows">
                {state.promos.map((c) => (
                  <Row key={c.code} k={`${c.code}${c.active ? "" : " · off"}`}
                       v={`${c.used ?? 0} used`} />
                ))}
              </div>
            )}
        </div>
      </section>

      {/* SAYING WHAT IS MISSING IS PART OF THE SCREEN. A money page that
          silently omits costs reads as "you have no costs", which is worse
          than an empty panel that names what it is waiting for. */}
      <section className="pa-sec" style={{ "--i": 5 }}>
        <div className="pa-h"><h2>Not here yet</h2></div>
        <div className="pa-card">
          <div className="pa-rows">
            <Row k="What it costs to run · Supabase, Netlify, Resend, the domain" v="needs a place to record them" />
            <Row k="Profit" v="needs the line above" />
            <Row k="Stripe · payouts, failed charges, disputes" v="needs Stripe connected" />
          </div>
          <p className="pa-sub pa-act">
            Missing, not zero — until costs exist, the figure above is revenue, not profit.
          </p>
        </div>
      </section>
    </>
  );
}

/* ══ TAB 5 · PLUMBING ══════════════════════════════════════════════════════ */
function TabPipes({ state, alerts }) {
  const store = state?.photo_store;
  const mail = state?.email;
  // `total_bytes` — see the note beside the alert above; `cap_bytes` is a
  // different RPC's column and made this meter read 0% at every fill level.
  const usedPct = store?.total_bytes ? Math.min(100, Math.round((store.used_bytes / store.total_bytes) * 100)) : 0;
  const mailPct = mail?.cap ? Math.min(100, Math.round((mail.sent / mail.cap) * 100)) : 0;
  const overPromised = !!(store?.total_bytes && store.committed_bytes > store.total_bytes);

  return (
    <>
      {alerts.length === 0 && (
        <p className="pa-sub" style={{ "--i": 0 }}>Everything that reports in is reporting in.</p>
      )}

      <section className="pa-sec" style={{ "--i": 1 }}>
        <div className="pa-h"><h2>Jobs that run on their own</h2></div>
        <div className="pa-svc">
          {(state?.heartbeats ?? []).map((h) => {
            const m = mins(h.ran_at);
            const limit = Math.round((h.stale_after_seconds ?? 86400) / 60);
            const bad = m === null || m > limit;
            return (
              <div className="pa-svc-r" key={h.job}>
                <span className="pa-svc-n"><i className={`pa-dot ${bad ? "pa-bad" : "pa-ok"}`} />{jobLabel(h.job)}</span>
                <span className="pa-v" style={{ fontFamily: "var(--f-num)", fontSize: 12 }}>{shortAgo(h.ran_at)}</span>
                <span className="pa-svc-d">Counts as stopped after {limit} minutes without finishing.</span>
              </div>
            );
          })}
          <div className="pa-svc-r">
            <span className="pa-svc-n">
              <i className={`pa-dot ${state?.watch?.outside ? "pa-ok" : "pa-idle"}`} />
              Dead man's switch
            </span>
            <span className="pa-v" style={{ fontSize: 12 }}>{state?.watch?.outside ? "set up" : "none"}</span>
            <span className="pa-svc-d">
              The only thing that can notice if everything above stops at once.
            </span>
          </div>
        </div>
      </section>

      <section className="pa-sec" style={{ "--i": 2 }}>
        <div className="pa-h"><h2>Quotas</h2></div>
        <div className="pa-svc">
          <div className="pa-svc-r">
            <span className="pa-svc-n">Email today</span>
            <span className="pa-v" style={{ fontSize: 12 }}>{mail?.sent ?? 0} of {mail?.cap ?? 0}</span>
            <span className="pa-svc-d">
              {mail?.failed ? `${mail.failed} failed. ` : ""}
              {mail?.owner_email ? `Signups go to ${mail.owner_email}.` : "NOBODY is being emailed about signups."}
            </span>
            <div className={`pa-meter${mailPct >= 80 ? " pa-warn" : ""}`}><i style={{ width: `${mailPct}%` }} /></div>
          </div>
          <div className="pa-svc-r">
            <span className="pa-svc-n">Photo storage</span>
            <span className="pa-v" style={{ fontSize: 12 }}>
              {mb(store?.used_bytes ?? 0)} of {mb(store?.total_bytes ?? 0)}
            </span>
            {/* **THE PROMISED TOTAL IS PRINTED ONLY WHEN IT IS OVER THE
                CEILING** — F-017's rule, and it is not tidiness. Under the
                ceiling that figure is exactly share x detailers and is a second
                rounding of arithmetic already on the line, which is how the old
                screen came to print "10 MB each for 15 detailers · 154 MB
                promised" and contradict itself. Over the ceiling it is the only
                number on this screen that predicts the morning an upload
                fails. */}
            <span className="pa-svc-d">
              {store?.businesses ?? 0} {store?.businesses === 1 ? "detailer" : "detailers"},
              {" "}{mb(store?.share_bytes ?? 0)} promised to each.
              {overPromised && ` PROMISED ${mb(store.committed_bytes)}, which is more than exists.`}
            </span>
            <div className={`pa-meter${usedPct >= 80 || overPromised ? " pa-warn" : ""}`}><i style={{ width: `${usedPct}%` }} /></div>
          </div>
        </div>
      </section>

      <section className="pa-sec" style={{ "--i": 3 }}>
        <div className="pa-h"><h2>Not wired up yet</h2></div>
        <div className="pa-card">
          <div className="pa-rows">
            <Row k="Stripe · is it taking money, and did anything fail" v="needs connecting" />
            <Row k="Netlify · builds, credits, bandwidth" v="connected, not read yet" />
            <Row k="Resend · every message, with delivered or bounced" v="confirmed possible" />
            <Row k="Supabase · database, logins, storage" v="needs wiring" />
            <Row k="Was it down on Tuesday?" v="nothing keeps a history yet" />
          </div>
        </div>
      </section>
    </>
  );
}
