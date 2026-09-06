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

// THE FOUR FILTERS THE SPEC NAMES AND NO MORE. Each one is a question he would
// otherwise answer with a query; a fifth would be a filter nobody presses.
const FILTERS = [
  ["all", "Everyone", () => true],
  ["past_due", "Past due", (r) => ["past_due", "unpaid", "suspended"].includes(r.subscription?.status)
    || !!r.subscription?.suspended_at || r.status === "paused"],
  ["unfinished", "Setup unfinished", (r) => r.setup && r.setup.count < r.setup.total],
  ["never", "No bookings ever", (r) => r.bookings_total === 0],
  ["quiet", "Quiet 30 days", (r) => r.bookings_total > 0 && (r.days_since_booking ?? 0) >= 30],
];

export default function AdminPage() {
  const [state, setState] = useState({ status: "loading" });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);      // business id
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await call({ action: "list" });
      setState({ status: "ready", ...r });
    } catch (e) {
      // 404 IS THE ORDINARY CASE HERE, not an error: everybody who is not an
      // admin gets one, including a detailer who typed the URL.
      setState({ status: /Not found/i.test(e.message) ? "denied" : "error", error: e.message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openBusiness = async (id) => {
    setOpen(id);
    setDetail(null);
    setMsg(null);
    try {
      const d = await call({ action: "get", business_id: id });
      setDetail(d);
      setNote(d.business?.admin_notes_platform ?? "");
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
  };

  const act = async (body, after) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await call(body);
      setMsg({ ok: true, text: after(r) });
      await load();
      if (open) await openBusiness(open);
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
    setBusy(false);
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

  if (state.status === "loading") {
    return <div className="pa" data-loading="1"><div className="pa-wrap"><p className="pa-quiet">Loading…</p></div></div>;
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
          {/* FOUR FIGURES ACROSS THE TOP AND NOTHING ELSE — the spec's own
              limit. Monthly recurring revenue is normalised to a month, so a
              yearly subscriber counts as a twelfth rather than as twelve
              months of income this month. */}
          <div className="pa-nums">
            <div><span className="pa-num">{t.businesses ?? 0}</span><span className="pa-lab">businesses</span></div>
            <div><span className="pa-num">{t.active ?? 0}</span><span className="pa-lab">not suspended</span></div>
            <div><span className="pa-num">{money((t.mrr_cents ?? 0) / 100)}</span><span className="pa-lab">a month</span></div>
            <div><span className="pa-num">{t.founding_left ?? 0}</span><span className="pa-lab">founding spots left</span></div>
          </div>
        </header>

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

        {rows.length === 0 && <p className="pa-quiet">Nobody matches that.</p>}

        <div className="pa-list">
          {rows.map((r) => (
            <div key={r.id} className={`pa-row ${open === r.id ? "on" : ""}`}>
              <button className="pa-rowbtn" onClick={() => (open === r.id ? setOpen(null) : openBusiness(r.id))}>
                <span className="pa-name">
                  {r.name}
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
                  {" · "}{detail.counts.services} services
                  {" · "}{detail.members.length} people
                  {detail.domains?.length
                    ? ` · ${detail.domains[0].domain}${detail.domains[0].verified_at ? "" : " (unverified)"}`
                    : " · no address of their own"}
                </p>

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
