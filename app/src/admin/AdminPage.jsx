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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { money } from "../lib/format.js";
import { setupProgress } from "../lib/setup.js";
import { needsALook } from "../lib/attention.js";
import {
  billingState, bookability, daysSince, monthlySeries, owedByUs, trend, workload,
} from "../lib/adminInsight.js";
import { useLeaving } from "../hooks/useLeaving.js";
import { signOutEverything } from "../lib/signout.js";
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

const ago = (iso) => {
  if (!iso) return "never";
  const d = daysSince(iso);
  if (d === null) return "never";
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  if (d < 365) return `${Math.round(d / 30)} months ago`;
  return `${Math.round(d / 365)} years ago`;
};
const mins = (iso) => {
  if (!iso) return null;
  return Math.round((Date.now() - Date.parse(iso)) / 60000);
};
const shortAgo = (iso) => {
  const m = mins(iso);
  if (m === null) return "never";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} hours ago`;
  return `${Math.round(m / 1440)} days ago`;
};

const TABS = [
  ["now", "Now"],
  ["who", "Detailers"],
  ["money", "Money"],
  ["pipes", "Plumbing"],
];

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
                <input type="password" autoComplete="current-password" required
                       value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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

  if (status === "denied") {
    return (
      <div className="pa">
        <div className="pa-door"><div className="pa-door-in">
          <h1>Page not found</h1>
          <p className="pa-sub">There is nothing at this address.</p>
        </div></div>
      </div>
    );
  }

  const rows = state?.rows ?? [];
  const totals = state?.totals ?? {};
  const attention = needsALook(rows);

  /* WHAT IS ACTUALLY WRONG RIGHT NOW — collected once and used by both the
     strip on Now and the dot on the Plumbing tab, so the two can never
     disagree about whether something is broken. */
  const alerts = [];
  for (const h of state?.heartbeats ?? []) {
    const m = mins(h.ran_at);
    const limit = Math.round((h.stale_after_seconds ?? 86400) / 60);
    if (m === null || m > limit) {
      alerts.push(`${h.job} has not finished in ${m === null ? "ever" : `${m} minutes`} (it should every ${limit})`);
    }
  }
  const mail = state?.email;
  if (mail && mail.cap && mail.sent >= mail.cap * 0.8) {
    alerts.push(`Platform emails: ${mail.sent} of ${mail.cap} today`);
  }
  if (mail && mail.failed > 0) alerts.push(`${mail.failed} email${mail.failed === 1 ? "" : "s"} failed to send today`);
  const store = state?.photo_store;
  if (store && store.cap_bytes && store.used_bytes >= store.cap_bytes * 0.8) {
    alerts.push("Photo storage is nearly full");
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
            {tab === "now"   && <TabNow    state={state} totals={totals} rows={rows} alerts={alerts} attention={attention} onOpen={setTab} />}
            {tab === "who"   && <TabWho    rows={rows} totals={totals} reload={load} />}
            {tab === "money" && <TabMoney  state={state} totals={totals} rows={rows} reload={load} />}
            {tab === "pipes" && <TabPipes  state={state} alerts={alerts} />}
          </div>
        )}
      </main>
    </div>
  );
}

/* ══ TAB 1 · NOW ═══════════════════════════════════════════════════════════ */
function TabNow({ state, totals, rows, alerts, attention, onOpen }) {
  /* NO PLATFORM-WIDE CHART, AND THIS IS THE SECOND TIME THAT SENTENCE HAS
     BEEN WRITTEN HERE — the first version of this rebuild drew one by summing
     a `months` array off each row. **There is no such field.** The `list`
     payload carries this month's figures per business and no history at all
     (a six-month series only exists inside `get`, one business at a time), so
     the chart rendered "No finished jobs yet" for ever and looked like an
     empty platform rather than a missing field.
     It was caught by loading the screen and reading it, which is the only
     thing that would have caught it: the code was valid, the build was clean,
     and `rows[0].months` is simply `undefined`.
     A platform-wide trend needs one new field on the server — until then this
     says what it actually knows. */
  const live = rows.filter((r) => !r.is_demo);
  const busiest = [...live].sort((a, b) => b.revenue_month - a.revenue_month).slice(0, 5);

  return (
    <>
      {alerts.length > 0 && (
        <div className="pa-alert" style={{ "--i": 0 }}>
          <span className="pa-lab">Needs attention</span>
          <ul>{alerts.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}

      <section className="pa-card" style={{ "--i": 1 }}>
        <div className="pa-hero">
          <div>
            <span className="pa-lab">A month, recurring</span>
            <div className="pa-big">{money((totals.mrr_cents ?? 0) / 100)}</div>
            <p className="pa-sub" style={{ marginTop: 6 }}>
              What the platform earns. Not what flows through it.
            </p>
          </div>
          <div>
            <span className="pa-lab">Earning most this month</span>
            {busiest.length === 0
              ? <p className="pa-none">No real detailers yet — everything on the platform is a demo or a test fixture.</p>
              : (
                <div className="pa-rows" style={{ marginTop: 6 }}>
                  {busiest.map((r) => (
                    <Row key={r.id} k={r.name} v={`${money(r.revenue_month)} · ${r.jobs_month} jobs`} />
                  ))}
                </div>
              )}
          </div>
        </div>
      </section>

      <section className="pa-sec" style={{ "--i": 2 }}>
        <div className="pa-tiles">
          <Tile n={totals.businesses ?? 0} t="Detailers" />
          <Tile n={totals.active ?? 0} t="Paying" />
          <Tile n={totals.suspended ?? 0} t="Suspended" warn={Boolean(totals.suspended)} />
          <Tile n={totals.new_month ?? 0} t="Joined this month" />
          <Tile n={totals.founding_left ?? 0} t="Founding spots left" />
        </div>
      </section>

      <section className="pa-sec" style={{ "--i": 3 }}>
        <div className="pa-h"><h2>Across every detailer, this month</h2></div>
        <div className="pa-tiles">
          <Tile n={totals.jobs_month ?? 0} t="Jobs finished" />
          <Tile n={money(totals.revenue_month ?? 0)} t="Taken by detailers" />
          <Tile n={totals.customers ?? 0} t="Customers served" />
        </div>
        <p className="pa-sub" style={{ marginTop: 10 }}>
          Their money, not ours — the proof the product works.
        </p>
      </section>

      {attention.length > 0 && (
        <section className="pa-sec" style={{ "--i": 4 }}>
          <div className="pa-h">
            <h2>Worth a look</h2>
            <button className="pa-out" type="button" onClick={() => onOpen("who")}>See everyone</button>
          </div>
          <div className="pa-card">
            <div className="pa-rows">
              {attention.map((a) => (
                <Row key={a.id} k={a.name} v={a.reasons?.join(" · ") ?? ""} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/* ══ TAB 2 · DETAILERS ═════════════════════════════════════════════════════ */
const FILTERS = [
  ["all", "Everyone", () => true],
  ["due", "Past due", (r) => billingState(r.subscription)?.pastDue],
  ["setup", "Setup unfinished", (r) => setupProgress(r).done < setupProgress(r).total],
  ["never", "No bookings ever", (r) => !r.last_booking_at],
  ["quiet", "Quiet 30 days", (r) => (daysSince(r.last_booking_at) ?? 999) > 30],
  ["nosite", "No website yet", (r) => !r.site_url],
];

function TabWho({ rows, totals, reload }) {
  const [find, setFind] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
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
  }, [open]);

  return (
    <>
      <section style={{ "--i": 0 }}>
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
                const sp = setupProgress(r);
                const bill = billingState(r.subscription);
                return (
                  <button key={r.id} className="pa-biz" type="button" onClick={() => setOpen(r)}>
                    <span className="pa-biz-n">
                      {r.name}
                      {r.is_demo && <span className="pa-flag">demo</span>}
                      {r.status === "paused" && <span className="pa-flag pa-off">suspended</span>}
                      {bill?.pastDue && <span className="pa-flag pa-off">past due</span>}
                      {sp.done >= sp.total && <span className="pa-flag pa-on">set up</span>}
                    </span>
                    <span className="pa-biz-m">{r.owner_email ?? "no owner account"} · {ago(r.last_booking_at)}</span>
                    <span className="pa-biz-f">
                      <span><b>{r.jobs_month}</b> jobs</span>
                      <span><b>{money(r.revenue_month)}</b></span>
                      <span><b>{r.customers}</b> customers</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        <p className="pa-sub" style={{ marginTop: 12 }}>
          Showing {shown.length} of {rows.length}. {totals.demo ? `${totals.demo} demo or test row${totals.demo === 1 ? "" : "s"} are left out of every figure above.` : ""}
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
  const sp = setupProgress(row);
  const bill = billingState(row.subscription);
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

          {series && (
            <div style={{ "--i": 1, marginTop: 16 }}>
              <span className="pa-lab">Their last six months</span>
              <Chart series={series} />
            </div>
          )}

          <div className="pa-card" style={{ "--i": 2, marginTop: 14 }}>
            <div className="pa-rows">
              <Row k="Finished this month" v={row.jobs_month} />
              <Row k="Taken this month" v={money(row.revenue_month)} />
              <Row k="Taken, all time" v={money(row.revenue_total)} />
              <Row k="Customers" v={row.customers} />
              <Row k="Last booking" v={ago(row.last_booking_at)} />
              <Row k="Requests waiting" v={row.requests_waiting ?? 0} />
              <Row k="Setup" v={`${sp.done} of ${sp.total}`} />
              <Row k="Subscription" v={bill?.label ?? "none"} />
              <Row k="Their page" v={bookability(row)?.label ?? "—"} />
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
            <button className="pa-btn" type="button" disabled={!row.owner_email || busy === "impersonate"}
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
          </div>
          {!row.owner_email && (
            <p className="pa-sub" style={{ "--i": 4, marginTop: 8 }}>
              Nobody has accepted the owner invite yet, so there is no account to open it as.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══ TAB 3 · MONEY ═════════════════════════════════════════════════════════ */
function TabMoney({ state, totals, rows }) {
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

  const p = state?.prices;
  return (
    <>
      {/* THE DISTINCTION THAT THE OLD SCREEN GOT WRONG by putting both figures
          in one row in one style: what the platform EARNS and what flows
          THROUGH it are different numbers by two orders of magnitude, and only
          one of them is income. */}
      <section className="pa-tiles" style={{ "--i": 0 }}>
        <Tile n={money((totals.mrr_cents ?? 0) / 100)} t="Ours, every month" />
        <Tile n={money(totals.revenue_month ?? 0)} t="Detailers' takings this month" />
        <Tile n={totals.founding_left ?? 0} t="Founding spots left" />
      </section>

      <section className="pa-sec" style={{ "--i": 1 }}>
        <div className="pa-h"><h2>What we earn, by plan</h2></div>
        <div className="pa-card">
          {byTier.length === 0
            ? <p className="pa-none">Nobody is paying yet.</p>
            : (
              <div className="pa-rows">
                {byTier.map(([k, v]) => (
                  <Row key={k} k={`${k} · ${v.n} detailer${v.n === 1 ? "" : "s"}`} v={`${money(v.cents / 100)}/mo`} />
                ))}
              </div>
            )}
        </div>
      </section>

      <section className="pa-sec" style={{ "--i": 2 }}>
        <div className="pa-h">
          <h2>What we charge</h2>
          <span className="pa-sub">
            {p?.current ? "Set here, overriding the built-in table" : "The built-in table — nothing is overridden"}
          </span>
        </div>
        <div className="pa-card">
          <div className="pa-rows">
            {Object.entries((p?.current ?? p?.built_in) ?? {}).slice(0, 12).map(([k, v]) => (
              <Row key={k} k={k} v={typeof v === "number" ? money(v) : String(v)} />
            ))}
          </div>
        </div>
      </section>

      <section className="pa-sec" style={{ "--i": 3 }}>
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
      <section className="pa-sec" style={{ "--i": 4 }}>
        <div className="pa-h"><h2>Not here yet</h2></div>
        <div className="pa-card">
          <div className="pa-rows">
            <Row k="What it costs to run — Supabase, Netlify, Resend, the domain" v="needs a place to record them" />
            <Row k="Profit" v="needs the line above" />
            <Row k="Stripe — payouts, failed charges, disputes" v="needs Stripe connected" />
          </div>
        </div>
      </section>
    </>
  );
}

/* ══ TAB 4 · PLUMBING ══════════════════════════════════════════════════════ */
function TabPipes({ state, alerts }) {
  const store = state?.photo_store;
  const mail = state?.email;
  const usedPct = store?.cap_bytes ? Math.min(100, Math.round((store.used_bytes / store.cap_bytes) * 100)) : 0;
  const mailPct = mail?.cap ? Math.min(100, Math.round((mail.sent / mail.cap) * 100)) : 0;

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
                <span className="pa-svc-n"><i className={`pa-dot ${bad ? "pa-bad" : "pa-ok"}`} />{h.job}</span>
                <span className="pa-v" style={{ fontFamily: "var(--f-num)", fontSize: 12 }}>{shortAgo(h.ran_at)}</span>
                <span className="pa-svc-d">Counts as stopped after {limit} minutes without finishing.</span>
              </div>
            );
          })}
          <div className="pa-svc-r">
            <span className="pa-svc-n">
              <i className={`pa-dot ${state?.watch?.outside ? "pa-ok" : "pa-idle"}`} />
              Something watching from outside
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
            <span className="pa-v" style={{ fontSize: 12 }}>{usedPct}%</span>
            <span className="pa-svc-d">Shared across every detailer.</span>
            <div className={`pa-meter${usedPct >= 80 ? " pa-warn" : ""}`}><i style={{ width: `${usedPct}%` }} /></div>
          </div>
        </div>
      </section>

      <section className="pa-sec" style={{ "--i": 3 }}>
        <div className="pa-h"><h2>Not wired up yet</h2></div>
        <div className="pa-card">
          <div className="pa-rows">
            <Row k="Stripe — is it taking money, and did anything fail" v="needs connecting" />
            <Row k="Netlify — builds, credits, bandwidth" v="connected, not read yet" />
            <Row k="Resend — every message, with delivered or bounced" v="confirmed possible" />
            <Row k="Supabase — database, logins, storage" v="needs wiring" />
            <Row k="Was it down on Tuesday?" v="nothing keeps a history yet" />
          </div>
        </div>
      </section>
    </>
  );
}
