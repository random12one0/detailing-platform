// ROADMAP 4.4 — the platform owner's back office.
//
// **ITS OWN ROUTE AND ITS OWN LAYOUT, never a tab inside the detailer
// dashboard**, which is 4.4's own security requirement and not a preference:
// a screen that can see every business must not be one CSS mistake away from
// a screen a detailer opens. It sits OUTSIDE `BusinessProvider` for the same
// reason the public booking pages do — it has no "current business", and
// wrapping it in one would make it wait on a membership it does not use.
//
// EVERY BYTE COMES FROM THE `platform-admin` EDGE FUNCTION. There is not one
// `supabase.from()` in this file, and that is the design: no row-level policy
// anywhere grants cross-tenant read, so the browser genuinely cannot reach
// another tenant's rows even if this screen were served to the wrong person.
//
// THE SHAPE COMES FROM THE SPEC'S ONE SENTENCE — *a back office exists to
// answer questions you are currently answering by opening the database.* So:
// four figures, one searchable list, one business's page, and the actions.
// **No charts.** He has fewer than ten customers and every trend line is
// noise; `docs/platform-admin-2026-09-04.md` says so in as many words, and
// the temptation to add one is exactly what makes back offices rot.
//
// AND IT ANSWERS 404 TO EVERYONE ELSE, matching the server. A 403 that says
// "you are not an admin" tells a curious detailer that this page exists and
// that the only thing between them and it is a row somewhere.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { money } from "../lib/format.js";
import { setupProgress } from "../lib/setup.js";
import { needsALook } from "../lib/attention.js";
import "./admin.css";

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
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  if (d < 365) return `${Math.round(d / 30)} months ago`;
  return `${Math.round(d / 365)} years ago`;
};

// THE FOUR FILTERS THE SPEC NAMES, AND ONE THE SITE COLUMN ADDS. Each is a
// question he would otherwise answer with a query. *No website yet* is not a
// fifth idea — it is the site column's own filter, and it is the one this
// product needs that a normal SaaS back office would not: he BUILDS these
// sites by hand, so "who am I still owing one" is a work queue rather than a
// statistic. Anything past these would be a filter nobody presses.
const FILTERS = [
  ["all", "Everyone", () => true],
  ["past_due", "Past due", (r) => ["past_due", "unpaid", "suspended"].includes(r.subscription?.status)
    || !!r.subscription?.suspended_at || r.status === "paused"],
  ["unfinished", "Setup unfinished", (r) => r.setup && r.setup.count < r.setup.total],
  ["never", "No bookings ever", (r) => r.bookings_total === 0],
  ["quiet", "Quiet 30 days", (r) => r.bookings_total > 0 && (r.days_since_booking ?? 0) >= 30],
  ["nosite", "No website yet", (r) => !r.site_url],
];

// The same shape the database's own check constraint allows, applied while he
// types so the refusal is never a Postgres error message.
const slugify = (v) => String(v || "").toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 62);

// A DEFAULT TIMEZONE RATHER THAN A BLANK, because a business quietly running
// on the wrong clock books every job at the wrong time and nothing shows it
// until a customer turns up three hours early. His own zone is the right
// guess for somebody he is standing next to.
const BLANK_NEW = {
  name: "", slug: "", slugTouched: false, owner_email: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
};

// THE FOUNDING LADDER FOLLOWS THE LIST LADDER'S OWN TWO RULES rather than
// being a second set of opinions — $600 is two months free on $60 exactly as
// $400 is on $40, and $75 is the same 25% no-commitment premium as $50.
// `pricing.js` says so and `tests/landing-pricing.test.mjs` pins the RULES
// rather than the figures, so the owner is told whether a NEW number still
// makes sense rather than that it changed.
//
// SO THE SCREEN SAYS WHAT THE RULES WOULD GIVE AND REFUSES NOTHING. They are
// his prices and his positioning — $999 rather than $900 was his own call —
// and a form that will not save a number he chose is a form he stops using.
// What it must not do is let him change one figure and quietly leave the page
// promising "two months free" about a ladder that no longer offers it.
const ladderSays = (monthly) => {
  const m = Number(monthly);
  if (!Number.isFinite(m) || m <= 0) return null;
  return { annual: Math.round(m * 10), monthToMonth: Math.round(m * 1.25) };
};

const NUM = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));

// The row's shape is `platformBilling.ts`'s `PRICES`, which is the CHARGING
// side's spelling. The pricing page keeps its own dialect (`annual` and
// `monthToMonth` at the top level) and converts; this screen edits the row.
const priceFields = [
  ["website", "setup", "Build fee"],
  ["website", "monthly", "Monthly, on the year"],
  ["website", "annual", "A year up front"],
  ["website", "monthToMonth", "Month to month"],
  ["founding", "setup", "Founding build fee"],
  ["founding", "monthly", "Founding monthly"],
  ["founding", "annual", "Founding year up front"],
  ["founding", "monthToMonth", "Founding month to month"],
];

// ITEM D — HOW LONG IS TOO LONG, PER JOB, IN ONE PLACE.
//
// The reminder sweep is scheduled every fifteen minutes and the accrual once
// a night, so the windows are three missed runs and a day and a half: long
// enough that a slow run or a clock skew is not an alarm, short enough that
// a detailer has not yet noticed their alerts stopped.
//
// **IT IS SHOWN WHETHER OR NOT ANYTHING IS WRONG.** A monitor that only
// appears when it is unhappy is a monitor nobody believes when it does — you
// cannot tell "healthy" from "not wired up any more".
// `ago()` bottoms out at "today", which is useless about a job that runs
// every fifteen minutes — "Reminders LAST RAN today" is a sentence with no
// information in it, and that is what the first version printed. Minutes and
// hours here, and `ago()` beyond a day.
const since = (iso) => {
  const ms = Date.now() - Date.parse(iso);
  if (ms < 90_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} minutes ago`;
  if (ms < 86_400_000) {
    const h = Math.round(ms / 3_600_000);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  return ago(iso);
};

const JOBS = [
  ["send-owner-reminders", "Reminders", 45 * 60_000],
  ["accrue-plan-visits", "Plan visits", 36 * 3_600_000],
];

export default function AdminPage() {
  const [state, setState] = useState({ status: "loading" });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK_NEW);
  const [invite, setInvite] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);      // business id
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [site, setSite] = useState("");
  const [pricing, setPricing] = useState(false);
  const [pt, setPt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [gate, setGate] = useState({ email: "", password: "" });

  const load = useCallback(async () => {
    // **NO SESSION IS NOT AN ERROR, IT IS A LOCKED DOOR** — and until
    // 2026-09-06 this page treated the two the same. Opening /admin in a
    // browser that had never signed in called the endpoint with no token,
    // got a 401, and drew *Something went wrong · Request failed (401)*.
    // The owner hit it on the live site and had no way in: the back office
    // has never had a door of its own, and the only way to reach it was to
    // know to sign in at /app first — which is knowledge the product should
    // not require anybody to have.
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) { setState({ status: "anon" }); return; }
    try {
      const r = await call({ action: "list" });
      setState({ status: "ready", ...r });
      // SEEDED FROM WHAT IS LIVE, which is the built-in table until he
      // overrides it. An empty form beside a page already printing $60 would
      // invite him to fill it in from memory.
      setPt(structuredClone(r.prices?.current ?? r.prices?.built_in ?? null));
    } catch (e) {
      // 404 IS THE ORDINARY CASE HERE, not an error: everybody who is not an
      // admin gets one, including a detailer who typed the URL.
      setState({ status: /Not found/i.test(e.message) ? "denied" : "error", error: e.message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // `keepMsg` is passed when this is a REFRESH after an action rather than a
  // person opening a business. Without it the confirmation was drawn and
  // wiped in the same breath — see `act`.
  const openBusiness = async (id, keepMsg = false) => {
    setOpen(id);
    setDetail(null);
    if (!keepMsg) setMsg(null);
    // TAKE HIM TO WHAT HE OPENED — testing loop F-015, 2026-09-06. The panel
    // renders BELOW the whole list, so at fifteen tenants it was already off
    // the bottom of the screen and at a hundred it is a hundred rows down:
    // pressing a detailer's name appeared to do nothing at all. Only on a
    // fresh open, never on the refresh after an action — that would drag him
    // away from the button he just pressed. `requestAnimationFrame` because
    // the panel does not exist until this render lands.
    if (!keepMsg) {
      requestAnimationFrame(() => {
        document.querySelector(".pa-row.on ~ .pa-panel, .pa-list ~ .pa-panel")
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    }
    try {
      const d = await call({ action: "get", business_id: id });
      setDetail(d);
      setNote(d.business?.admin_notes_platform ?? "");
      setSite(d.business?.site_url ?? "");
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  };

  const act = async (body, after) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await call(body);
      // THE MESSAGE IS SET AFTER THE REFRESH, and it was set before until
      // 2026-09-06 — when `openBusiness` cleared it two lines later, so
      // **every confirmation on this screen was drawn and wiped in the same
      // tick.** "Saved.", "Suspended", "Invite sent to…": none of them was
      // ever on screen long enough to read. Found by pressing a button and
      // looking at what happened, which is the only thing that could have
      // found it — the action worked, the list refreshed, and the only thing
      // missing was the sentence saying so.
      // SHOWN AT ONCE AND KEPT THROUGH THE REFRESH. It was set before the
      // reload until 2026-09-06, and `openBusiness` cleared it two lines
      // later — so **every confirmation on this screen was drawn and wiped in
      // the same tick**: "Saved.", "Suspended", "Invite sent to…", none of
      // them ever on screen long enough to read. Found by pressing a button
      // and looking, which is the only thing that could have found it: the
      // action worked, the list refreshed, and the only thing missing was the
      // sentence saying so.
      setMsg({ ok: true, text: after(r) });
      await load();
      if (open) await openBusiness(open, true);
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
    setBusy(false);
  };

  // A JOB THAT HAS NEVER REPORTED IS TREATED AS STALE, not as fine. The row
  // is absent before a job has run once — which is also what it looks like
  // after somebody drops the table.
  const stale = (key, windowMs) => {
    const beat = (state.heartbeats ?? []).find((h) => h.job === key);
    return !beat || Date.now() - Date.parse(beat.ran_at) > windowMs;
  };

  const rows = useMemo(() => {
    // THE SAME FUNCTION THE DETAILER'S OWN SCREEN RUNS. The server sends the
    // INPUTS rather than an answer, so the back office and the detailer can
    // never print two different "3 of 7"s about the same business.
    const list = (state.rows ?? []).map((r) => ({
      ...r,
      setup: r.setup_inputs ? setupProgress(r.setup_inputs) : null,
    }));
    const f = FILTERS.find((x) => x[0] === filter)?.[2] ?? (() => true);
    const needle = q.trim().toLowerCase();
    return list.filter(f).filter((r) => !needle
      || `${r.name} ${r.slug} ${r.owner_email ?? ""}`.toLowerCase().includes(needle));
  }, [state.rows, q, filter]);

  // ── NEEDS A LOOK ──────────────────────────────────────────────────────
  // `docs/platform-admin-audit-2026-09-06.md` Q3. The rules are in
  // `lib/attention.js` so a test can run them with no browser: they decide
  // what the owner is SHOWN, and a wrong threshold means a failing tenant
  // never surfaces and nothing anywhere says so.
  //
  // FROM `state.rows` AND NOT `rows`: a search or a chip is a question about
  // part of the list; this is a question about all of it.
  const attention = useMemo(() => needsALook(state.rows), [state.rows]);

  if (state.status === "loading") {
    return <div className="pa" data-loading="1"><div className="pa-wrap"><p className="pa-quiet">Loading…</p></div></div>;
  }
  // ── THE DOOR ──────────────────────────────────────────────────────────
  // **A SIGNED-OUT VISITOR GETS A LOGIN; A SIGNED-IN NON-ADMIN STILL GETS
  // 404, and keeping those two different is the whole care in this screen.**
  //
  // The rule this page has always followed is that a detailer who wanders
  // here is told *Page not found* rather than *you are not an admin* —
  // naming the gate invites somebody to go looking for the row. That is
  // untouched: it is about somebody who HAS an account.
  //
  // What changes is the signed-out case. A login box here does disclose
  // that something lives at /admin, which is a real cost and is accepted
  // deliberately: **the owner needs a door, and the alternative was that the
  // only way in was knowing to sign in on a different page first.** The gate
  // is the `platform_admins` row either way — this form authenticates, it
  // does not authorise, and signing in with a perfectly good detailer
  // account still lands on *Page not found*.
  if (state.status === "anon") {
    return (
      <div className="pa"><div className="pa-wrap pa-gate">
        {/* IT SAYS WHERE YOU ARE — testing loop F-021, 2026-09-06. An
            unlabelled "Sign in" card pinned to the top-left of an empty page
            is what the owner meets when he opens his own back office cold,
            and it is indistinguishable from a half-built screen. It discloses
            nothing the box itself did not already disclose: anybody reading
            this has typed /admin and been shown a login. */}
        <p className="pa-lab2">Detailing Platform</p>
        <h1 className="pa-h1">The back office</h1>
        <p className="pa-quiet" style={{ marginTop: -4, marginBottom: 18 }}>
          Sign in with the account that runs the platform.
        </p>
        <form className="pa-panel" onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg(null);
          const { error } = await supabase.auth.signInWithPassword({
            email: gate.email.trim(), password: gate.password,
          });
          setBusy(false);
          // ONE MESSAGE FOR BOTH WRONG-EMAIL AND WRONG-PASSWORD, which is
          // the same reason the password-reset screen says the same thing
          // whether or not an address exists: telling them which half was
          // wrong is address enumeration with a friendly face.
          if (error) { setMsg({ ok: false, text: "That email and password do not match." }); return; }
          setState({ status: "loading" });
          load();
        }}>
          <label className="pa-field"><span>Email</span>
            <input className="pa-input" type="email" autoComplete="username" required
              value={gate.email} onChange={(e) => setGate({ ...gate, email: e.target.value })} /></label>
          <label className="pa-field"><span>Password</span>
            <input className="pa-input" type="password" autoComplete="current-password" required
              value={gate.password} onChange={(e) => setGate({ ...gate, password: e.target.value })} /></label>
          {msg && !msg.ok && <p className="pa-bad">{msg.text}</p>}
          <div className="pa-btns">
            <button className="pa-btn" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
            <a className="pa-link" href="/reset">Forgot your password?</a>
          </div>
        </form>
      </div></div>
    );
  }

  // THE SAME ANSWER THE SERVER GIVES, and deliberately not "you are not an
  // admin". This page's existence is not a secret worth keeping on its own,
  // but naming the gate invites somebody to go looking for the row.
  if (state.status === "denied") {
    return (
      <div className="pa"><div className="pa-wrap">
        <h1 className="pa-h1">Page not found</h1>
        <p className="pa-quiet">There is nothing at this address.</p>
      </div></div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="pa"><div className="pa-wrap">
        <h1 className="pa-h1">Something went wrong</h1>
        <p className="pa-quiet">{state.error}</p>
      </div></div>
    );
  }

  // MB UNDER A GIGABYTE, GB OVER IT. "0.01 GB used" is a number nobody can
  // picture; "10 MB" is. One decimal either way — a back office is read at a
  // glance and a second decimal is noise on a figure that moves in megabytes.
  const gb = (b) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${Math.round(b / 1024 / 1024)} MB`);
  const t = state.totals ?? {};
  const b = detail?.business;
  const progress = detail && b
    ? setupProgress({ business: b, branding: detail.branding, settings: detail.settings, counts: detail.counts })
    : null;

  return (
    <div className="pa">
      <div className="pa-wrap">
        <header className="pa-top">
          <h1 className="pa-h1">Detailers</h1>
          {/* SIX FIGURES SINCE 2026-09-06, AND THE FOUR-FIGURE RULE IS
              DELIBERATELY RETIRED. The spec's own limit was four and it was
              right for what this page was — an administrative tool. The
              owner asked for the opposite: *"I don't wanna have anything
              that's could be visible hidden."*

              **THE TWO NEW ONES ARE ABOUT THE PRODUCT, NOT THE BUSINESS**,
              which is why they earn a place beside four that are about the
              business. Businesses, suspended, MRR and founding spots all
              answer "how is my company doing". Jobs and money THROUGH the
              platform this month answer "is the thing I built actually
              carrying work" — the number to have in front of you on a sales
              call, and it was unanswerable here until now.

              Monthly recurring revenue is normalised to a month, so a yearly
              subscriber counts as a twelfth rather than as twelve months of
              income this month. The two new figures are the CALENDAR month,
              not a rolling thirty days, because this page is read beside an
              invoice and a bank statement and both of those are calendar
              months. */}
          <div className="pa-nums">
            {/* THE FIGURES ARE REAL DETAILERS, AND THE LABEL SAYS SO WHEN
                THERE IS ANYTHING ELSE IN THE LIST — testing loop F-014. */}
            <div><span className="pa-num">{t.businesses ?? 0}</span>
              <span className="pa-lab">{t.demo ? `detailers · ${t.demo} demo` : "detailers"}</span></div>
            <div><span className="pa-num">{t.active ?? 0}</span><span className="pa-lab">not suspended</span></div>
            <div><span className="pa-num">{money((t.mrr_cents ?? 0) / 100)}</span><span className="pa-lab">a month</span></div>
            <div><span className="pa-num">{t.founding_left ?? 0}</span><span className="pa-lab">founding spots left</span></div>
            {/* IT COUNTS FINISHED JOBS — testing loop F-016. Unlabelled, "0
                jobs this month" sat beside a row reading "30 bookings, last
                today" and read as a broken number; both were right and the
                tile was not saying which question it answered. */}
            <div><span className="pa-num">{t.jobs_month ?? 0}</span><span className="pa-lab">jobs finished this month</span></div>
            <div><span className="pa-num">{money(t.revenue_month ?? 0)}</span><span className="pa-lab">through the platform</span></div>
          </div>
        </header>

        {/* Under the figures, above everything he came here to do. One line,
            and it goes `pa-bad` rather than quiet when a job has stopped. */}
        <p className={JOBS.some(([k, , win]) => stale(k, win)) ? "pa-bad" : "pa-quiet"}>
          {JOBS.map(([key, label, win]) => {
            const beat = (state.heartbeats ?? []).find((h) => h.job === key);
            return `${label} ${beat ? (stale(key, win) ? `LAST RAN ${since(beat.ran_at)}` : `ran ${since(beat.ran_at)}`) : "have never reported"}`;
          }).join(" · ")}
        </p>

        {/* THE PHOTO STORE, on its own line beside the jobs one. A
            detailer's allowance is this divided by a hundred, so the total
            is the only figure he can decide — and **what has been PROMISED
            is the half that goes wrong first**: the store can be 4% used and
            140% promised at once, and only the second predicts the morning
            somebody cannot upload. It turns `pa-bad` on that, not on usage. */}
        {state.photo_store && (
          <p className={state.photo_store.committed_bytes > state.photo_store.total_bytes ? "pa-bad" : "pa-quiet"}>
            {`Photos: ${gb(state.photo_store.used_bytes)} used of ${gb(state.photo_store.total_bytes)}`}
            {` · ${gb(state.photo_store.share_bytes)} each for ${state.photo_store.businesses} `}
            {state.photo_store.businesses === 1 ? "detailer" : "detailers"}
            {/* THE PROMISED TOTAL IS PRINTED ONLY WHEN IT IS THE PROBLEM —
                testing loop F-017, 2026-09-06. Under the ceiling it is
                exactly `share x businesses`, which the two figures beside it
                have just stated — so it added nothing AND read as an
                arithmetic error, because both halves are rounded
                independently: 10.24 MB a head became "10 MB each for 15
                detailers · 154 MB promised", and 10 x 15 is 150. Two
                roundings that disagree inside one sentence is a number
                nobody trusts afterwards, including the ones that are right.
                Over the ceiling it is the whole point, so it stays there,
                where the sentence says why it does not match. */}
            {state.photo_store.committed_bytes > state.photo_store.total_bytes
              && ` · PROMISED ${gb(state.photo_store.committed_bytes)} — more than exists`}
          </p>
        )}

        <div className="pa-tools">
          <input className="pa-input" value={q} placeholder="Search a name, a link or an email"
            onChange={(e) => setQ(e.target.value)} />
          <div className="pa-chips">
            {FILTERS.map(([k, label]) => (
              <button key={k} className={`pa-chip ${filter === k ? "on" : ""}`}
                aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
            ))}
          </div>
        </div>

        {msg && <div className={msg.ok ? "pa-ok" : "pa-bad"}>{msg.text}</div>}
        {/* THE LINK IS SHOWN, NOT ONLY EMAILED, and that is the whole point of
            signing somebody up in person: he is standing next to them, so if
            the email is slow or the address was mistyped, reading it off his
            own screen finishes the job. */}
        {invite && (
          <div className="pa-ok">
            {invite.emailed ? "Invite emailed to " : "Could not email "}{invite.email}.
            Their link, in case you want to read it out: <code>{invite.link}</code>
          </div>
        )}

        {/* ADDING A BUSINESS BY HAND — in-person onboarding, the spec's own
            case. Behind a button because it is the rarest action on this
            screen and a form always open is a form always in the way. */}
        <div className="pa-btns">
          <button className="pa-btn" onClick={() => { setAdding(!adding); setInvite(null); }}>
            {adding ? "Never mind" : "Add a detailer"}
          </button>
        </div>
        {adding && (
          <div className="pa-panel">
            <label className="pa-field"><span>Business name</span>
              <input className="pa-input" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slugTouched ? form.slug : slugify(e.target.value) })} /></label>
            <label className="pa-field"><span>Their booking address</span>
              <input className="pa-input" value={form.slug} placeholder="riverside-detail"
                onChange={(e) => setForm({ ...form, slug: e.target.value, slugTouched: true })} /></label>
            <label className="pa-field"><span>Owner's email — the invite goes here</span>
              <input className="pa-input" value={form.owner_email} inputMode="email"
                onChange={(e) => setForm({ ...form, owner_email: e.target.value })} /></label>
            {/* TYPED, NOT PICKED, and only here. The signup form has a real
                timezone picker; this is one field on one screen used by one
                person who knows what he is doing, and a second copy of that
                picker is a second thing to keep in step. */}
            <label className="pa-field"><span>Timezone</span>
              <input className="pa-input" value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></label>
            <div className="pa-btns">
              <button className="pa-btn" disabled={busy || !form.name.trim() || !form.slug.trim()}
                onClick={() => act({ action: "create", ...form }, (r) => {
                  setAdding(false);
                  setForm(BLANK_NEW);
                  if (r.invite) setInvite(r.invite);
                  return `${r.business.name} created.`;
                })}>
                Create and invite
              </button>
            </div>
          </div>
        )}

        {rows.length === 0 && <p className="pa-quiet">Nobody matches that.</p>}

        {/* WHAT WE CHARGE — roadmap 4.4's "platform settings", and it has
            exactly one job. Behind a button for the same reason the add form
            is: it is the rarest thing on this screen. */}
        <div className="pa-btns">
          <button className="pa-btn" onClick={() => setPricing(!pricing)}>
            {pricing ? "Hide the prices" : "What we charge"}
          </button>
        </div>
        {pricing && pt && (
          <div className="pa-panel">
            <p className="pa-quiet">
              {state.prices?.current
                ? `Your own prices, saved ${ago(state.prices.updated_at)}.`
                : "The built-in prices. Nothing has been overridden."}
              {" "}An edit only changes what the NEXT detailer is offered —
              everybody already paying keeps the price they agreed to.
            </p>
            <div className="pa-grid">
            {priceFields.map(([group, key, label]) => (
              <label className="pa-field" key={`${group}.${key}`}><span>{label}</span>
                <input className="pa-input" inputMode="decimal" value={pt[group]?.[key] ?? ""}
                  onChange={(e) => setPt({ ...pt, [group]: { ...pt[group], [key]: NUM(e.target.value) } })} /></label>
            ))}
            <label className="pa-field"><span>Booking only, a month</span>
              <input className="pa-input" inputMode="decimal" value={pt.bookingOnly?.monthly ?? ""}
                onChange={(e) => setPt({ ...pt, bookingOnly: { monthly: NUM(e.target.value) } })} /></label>
            <label className="pa-field"><span>The commitment, in months</span>
              <input className="pa-input" inputMode="numeric" value={pt.term?.months ?? ""}
                onChange={(e) => setPt({ ...pt, term: { ...pt.term, months: NUM(e.target.value) } })} /></label>
            <label className="pa-field"><span>Early exit — the share of what is left</span>
              <input className="pa-input" inputMode="decimal" value={pt.term?.exitFeeShare ?? ""}
                onChange={(e) => setPt({ ...pt, term: { ...pt.term, exitFeeShare: NUM(e.target.value) } })} /></label>
            </div>

            {/* THE RULES, SAID OUT LOUD RATHER THAN ENFORCED. The pricing page
                prints "two months free" and "no commitment costs 25% more"
                as sentences; a monthly changed without its ladder leaves the
                page making a promise the numbers no longer keep. */}
            {["website", "founding"].map((g) => {
              const says = ladderSays(pt[g]?.monthly);
              if (!says) return null;
              const off = says.annual !== Number(pt[g]?.annual) || says.monthToMonth !== Number(pt[g]?.monthToMonth);
              return !off ? null : (
                <p className="pa-quiet" key={g}>
                  On ${pt[g].monthly} a month the ladder's own rules give{" "}
                  <strong>${says.annual}</strong> a year (two months free) and{" "}
                  <strong>${says.monthToMonth}</strong> month to month (25% more for no
                  commitment). Yours say ${pt[g].annual} and ${pt[g].monthToMonth}, so the
                  pricing page will say "{Math.round(((pt[g].monthly * 12 - pt[g].annual) / pt[g].monthly) * 10) / 10} months free".
                </p>
              );
            })}

            <div className="pa-btns">
              <button className="pa-btn" disabled={busy}
                onClick={() => act({ action: "prices", prices: pt }, () => "Saved — that is what the next detailer is offered.")}>
                Save these prices
              </button>
              {state.prices?.current && (
                <button className="pa-btn" disabled={busy}
                  onClick={() => act({ action: "prices", prices: null }, () => "Back to the built-in prices.")}>
                  Back to the built-in prices
                </button>
              )}
            </div>
          </div>
        )}

        {/* ABOVE THE LIST AND BELOW THE FIGURES, and absent when empty —
            §1a's rule reaches this page too: an empty section is not drawn,
            and "nothing needs attention" is a sentence that trains you to
            stop reading the place where things needing attention appear. */}
        {attention.length > 0 && (
          <div className="pa-attn">
            <div className="pa-lab2">Needs a look</div>
            {attention.map((r) => (
              <button key={r.id} className="pa-attn-row" onClick={() => openBusiness(r.id)}>
                <span className="pa-name">{r.name}</span>
                <span className="pa-sub">{r.why.join(" · ")}</span>
              </button>
            ))}
          </div>
        )}

        <div className="pa-list">
          {rows.map((r) => (
            <div key={r.id} className={`pa-row ${open === r.id ? "on" : ""}`}>
              <button className="pa-rowbtn" onClick={() => (open === r.id ? setOpen(null) : openBusiness(r.id))}>
                <span className="pa-name">
                  {r.name}
                  {/* NOT A CUSTOMER — testing loop F-014, and it goes FIRST
                      because it changes what every figure after it means. */}
                  {r.is_demo && <span className="pa-tag">demo</span>}
                  {r.status === "paused" && <span className="pa-tag bad">suspended</span>}
                  {r.plan_tier === "founding" && <span className="pa-tag">founding</span>}
                  {r.has_note && <span className="pa-tag">note</span>}
                </span>
                {/* WHAT HE WOULD OTHERWISE QUERY, on one line: who they are,
                    whether they are paying, and when they last did any work.
                    "Last activity" is the column the spec says earns its
                    place — no booking in three weeks is a holiday or a
                    leaver, and both are worth knowing before the card
                    fails. */}
                <span className="pa-sub">
                  {r.owner_email ?? "no owner account"}
                  {" · "}{r.subscription?.status ?? "no subscription"}
                  {/* WRITTEN AS A SENTENCE, not as fields joined by commas.
                      `N bookings, last never` was the first version and it
                      printed "1 bookings" and "0 bookings, last never" — two
                      figures where the answer is one fact, and the one that
                      matters most (nobody has ever booked) said the least. */}
                  {" · "}{r.bookings_total === 0
                    ? "never booked"
                    : `${r.bookings_total} booking${r.bookings_total === 1 ? "" : "s"}, last ${ago(r.last_booking_at)}`}
                  {r.requests_waiting > 0 ? ` · ${r.requests_waiting} waiting` : ""}
                </span>
                {/* THE SECOND LINE, ADDED 2026-09-06. The line above answers
                    "who are they and are they alive"; this one answers the
                    question actually asked first about any tenant — **is
                    this working for them.** The server already had every
                    figure on it and the screen was throwing them away, which
                    is the audit's Tier 1 in one line of markup. */}
                <span className="pa-sub">
                  {/* "finished", for the reason the tile above carries —
                      testing loop F-016. On this line the contradiction is
                      sharper still, because the words "3 bookings, last
                      today" are four characters to the left of it. */}
                  {r.jobs_month ?? 0} finished this month
                  {" · "}{money(r.revenue_month ?? 0)} taken
                  {" · "}{r.customers ?? 0} customer{(r.customers ?? 0) === 1 ? "" : "s"}
                </span>
              </button>
              <a className="pa-link" href={`/book/${r.slug}`} target="_blank" rel="noreferrer">their page</a>
            </div>
          ))}
        </div>

        {open && (
          <div className="pa-panel">
            {!detail && <p className="pa-quiet">Loading…</p>}
            {detail && b && (
              <>
                <h2 className="pa-h2">{b.name}</h2>
                <p className="pa-quiet">
                  {/* THE SAME SEVEN-STEP NUMBER THE DETAILER SEES, from
                      `lib/setup.js`. The spec is explicit: surface that
                      rather than invent a second completeness figure, because
                      two numbers about the same thing is how a support call
                      starts with an argument. */}
                  {progress ? `Setup ${progress.count} of ${progress.total}` : ""}
                  {" · "}{detail.settings?.booking_mode === "request" ? "takes requests" : "books directly"}
                  {/* Pluralised, like the two lines above it — testing loop
                      F-008. "1 services" on a screen that says "1 customer"
                      four rows up. */}
                  {" · "}{detail.counts.services} service{detail.counts.services === 1 ? "" : "s"}
                  {" · "}{detail.members.length} {detail.members.length === 1 ? "person" : "people"}
                </p>

                {/* THEIR SITE — the spec's one column that is specific to
                    this product, because he builds these by hand: *do they
                    have one, what is its address, is a custom domain pointed
                    at it, and when was it last touched.* Three of those four
                    are facts about work done OUTSIDE the product and live on
                    `businesses`; the fourth is `business_domains`, which
                    roadmap 3.3 already built and which means something
                    narrower — a hostname that resolves to THIS app, so the
                    receipt and the plan page stop carrying our brand. They
                    are drawn as two lines rather than one because conflating
                    them is how a host that does not serve this app ends up in
                    that table. */}
                <label className="pa-field"><span>Their website</span>
                  <input className="pa-input" value={site} placeholder="ridgelineautodetail.com"
                    onChange={(e) => setSite(e.target.value)} /></label>
                <p className="pa-quiet">
                  {b.site_url
                    ? <>Last touched {ago(b.site_updated_at)} · <a className="pa-link" href={b.site_url} target="_blank" rel="noreferrer">open it</a></>
                    : "No website yet"}
                  {" · "}
                  {detail.domains?.length
                    ? detail.domains.map((d) => `${d.domain}${d.verified_at ? " (pointed here)" : " (not verified)"}`).join(", ")
                    : "booking page on our address"}
                </p>
                <div className="pa-btns">
                  <button className="pa-btn" disabled={busy}
                    onClick={() => act({ action: "site", business_id: b.id, site_url: site },
                      (r) => (r.site_url ? `Saved — ${r.site_url}` : "Cleared."))}>
                    Save their website
                  </button>
                </div>

                <label className="pa-field"><span>Your notes</span>
                  <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="Wants a gallery page. Call back after the 3rd." /></label>
                <div className="pa-btns">
                  <button className="pa-btn" disabled={busy}
                    onClick={() => act({ action: "note", business_id: b.id, note }, () => "Saved.")}>
                    Save notes
                  </button>
                </div>

                <div className="pa-btns">
                  {/* EVERY ONE OF THESE EXISTS BECAUSE THE ALTERNATIVE IS
                      EDITING THE DATABASE BY HAND. That is the admission
                      test, and it is why there is no button here for
                      anything Stripe's own dashboard does better. */}
                  {/* ITEM H — the file a detailer gets when they ask for
                      their data, and the file that answers a deletion
                      request. It is downloaded rather than shown: it is every
                      customer and every booking they have, and a screen that
                      prints that is a screen somebody leaves open. */}
                  <button className="pa-btn" disabled={busy}
                    onClick={() => act({ action: "export", business_id: b.id }, (r) => {
                      const url = URL.createObjectURL(
                        new Blob([JSON.stringify(r.export, null, 2)], { type: "application/json" }));
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${b.slug}-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      const n = Object.keys(r.export?.tables ?? {}).length;
                      return `Downloaded — ${n} tables, everything they own.`;
                    })}>
                    Export everything
                  </button>
                  <button className="pa-btn" disabled={busy}
                    onClick={() => act(
                      { action: b.status === "paused" ? "restore" : "suspend", business_id: b.id },
                      (r) => (r.status === "paused"
                        ? "Suspended — their booking page is dark and nothing has been deleted."
                        : "Restored — their booking page is live again."),
                    )}>
                    {b.status === "paused" ? "Restore" : "Suspend"}
                  </button>
                  <button className="pa-btn" disabled={busy}
                    onClick={() => act(
                      { action: "tier", business_id: b.id, plan_tier: b.plan_tier === "founding" ? "standard" : "founding" },
                      (r) => (r.plan_tier === "founding"
                        ? "Marked founding — that is one spot fewer."
                        : "Moved to standard — their founding spot is back."),
                    )}>
                    {b.plan_tier === "founding" ? "Release founding spot" : "Mark founding"}
                  </button>
                  {/* THE BIGGEST SINGLE TIME-SAVER IN ANY BACK OFFICE, and the
                      one that will look worst if it is ever questioned — so
                      the button says out loud that it is written down. The
                      server refuses the action outright if the audit row will
                      not insert. */}
                  <button className="pa-btn warn" disabled={busy}
                    onClick={() => {
                      if (!confirm(`Sign in as ${b.name}? You will be signed out of your own account, and this is written down: who, when, and whose dashboard.`)) return;
                      act({ action: "impersonate", business_id: b.id }, (r) => {
                        if (r.url) window.location.href = r.url;
                        return `Signing in as ${r.as}…`;
                      });
                    }}>
                    Open their dashboard
                  </button>
                </div>

                {/* RESEND AN INVITE — "the support request that otherwise
                    needs him to open the auth table". One button per person
                    who has not accepted yet, rather than a form, because the
                    address is already known and retyping it is how the wrong
                    one gets sent. */}
                {detail.members.length === 0 && (
                  <div className="pa-btns">
                    <button className="pa-btn" disabled={busy}
                      onClick={() => {
                        const email = prompt("Which address should the invite go to?", b.contact_email || "");
                        if (!email) return;
                        act({ action: "resend_invite", business_id: b.id, email }, (r) => {
                          setInvite(r.invite);
                          return r.invite.emailed ? `Invite sent to ${email}.` : `Could not email ${email} — the link is above.`;
                        });
                      }}>
                      Resend the owner's invite
                    </button>
                  </div>
                )}

                {detail.events?.length > 0 && (
                  <>
                    <div className="pa-lab2">What has been done to this account</div>
                    <ul className="pa-log">
                      {detail.events.map((e, i) => (
                        <li key={i}>{e.action} · {e.admin_email} · {ago(e.created_at)}</li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
