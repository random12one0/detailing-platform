// ONE DETAILER, SLID OUT OVER WHATEVER PLACE IS OPEN. Health and why, setup,
// bookings, money paid, how to reach them, what happened, suspend/reopen.
//
// Mounted by the shell, not by the Detailers place, so Ctrl K can open it from
// anywhere. The exit is `useLeaving` (hooks/useLeaving.js), the product's one
// exit mechanism. Everything it shows is the list row plus `get`'s detail, read
// once per detailer and cached by the shell.
import { useEffect, useRef, useState } from "react";
import { call } from "./api.js";
import { Arrow, Av, Count, Ring, Spark, usd } from "./ui.jsx";
import { useLeaving } from "../../hooks/useLeaving.js";
import { dateLong, localDate, money } from "../../lib/format.js";
import { STEPS } from "../../lib/setup.js";
import {
  billing, contactOf, daysSince, healthOf, issueOf, paidToUs, setupOf, statusOf, weeklyBookings,
} from "../../lib/officeDetailers.js";

const TONE = { good: "var(--ac)", bad: "var(--bad)", warn: "var(--bo-warn)", cool: "var(--bo-cool)", mute: "var(--fog-2)" };

// Stored action names in plain words (same table the old screen used).
const EVENT_WORDS = {
  impersonate: "You looked at their dashboard", export: "You downloaded their data", suspend: "You suspended them",
  restore: "You reopened them", create: "You created the account", note: "You wrote a note",
  prices: "You changed their prices", promo_new: "You added a promo code", promo_off: "You turned a promo code off",
  resend_invite: "You sent an owner invite", site: "You set their website address", build_start: "You told them work started",
  tier: "You changed their plan",
};

const ago = (iso) => {
  const d = daysSince(iso);
  if (d === null) return "never";
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  if (d < 365) { const m = Math.round(d / 30); return `${m} ${m === 1 ? "month" : "months"} ago`; }
  const y = Math.round(d / 365); return `${y} ${y === 1 ? "year" : "years"} ago`;
};

// What happened, newest first, from what `get` sent: your own actions on the
// account, their paid invoices, their last booking and the day they signed up.
function historyOf(row, detail) {
  const out = [];
  for (const e of detail?.events ?? []) out.push({ at: e.created_at, text: EVENT_WORDS[e.action] ?? e.action, c: "var(--bo-cool)" });
  for (const i of (detail?.invoices ?? []).filter((x) => x.status === "paid")) {
    out.push({ at: i.paid_at ?? i.created_at, text: `Paid you ${usd(i.amount_cents)}`, c: "var(--ac)" });
  }
  if (row.last_booking_at) out.push({ at: row.last_booking_at, text: "Last booking came in", c: "var(--ac)" });
  out.push({ at: row.created_at, text: "Signed up", c: "var(--fog-2)" });
  return out.filter((x) => x.at).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 8);
}

export default function DetailerPanel({ row, detail, ctx }) {
  const [leaving, close] = useLeaving(ctx.close);
  const [busy, setBusy] = useState("");
  const [sure, setSure] = useState(false);
  const [err, setErr] = useState("");
  const closeBtn = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    closeBtn.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); };
  }, [close]);
  useEffect(() => { setSure(false); setErr(""); }, [row.id]);

  const st = statusOf(row), h = healthOf(row), issue = issueOf(row), sp = setupOf(row);
  const c = contactOf(row), bill = billing(row.subscription);
  const weeks = detail && !detail.error ? weeklyBookings(detail.bookings) : null;
  const paid = detail && !detail.error ? paidToUs(detail.invoices) : null;
  const tone = TONE[st.color];
  const suspended = st.key === "suspended";

  const act = async (action) => {
    setBusy(action); setErr("");
    try { await call({ action, business_id: row.id }); await ctx.reload(row.id); setSure(false); }
    catch (e) { setErr(e.message); }
    setBusy("");
  };

  // A new tab, signed in as you, read-only: opened on the click, before the await,
  // or the browser calls it a pop-up and blocks it (same rule as the old screen).
  const look = async () => {
    const tab = window.open("/preview", "_blank");
    if (!tab) { setErr("Your browser blocked the new tab. Allow pop-ups for this site, then try again."); return; }
    setBusy("impersonate"); setErr("");
    try {
      const out = await call({ action: "impersonate", business_id: row.id });
      const who = `who=${encodeURIComponent(row.name)}`;
      if (out.access_token && out.refresh_token) {
        tab.location.replace(`/preview#at=${encodeURIComponent(out.access_token)}&rt=${encodeURIComponent(out.refresh_token)}&${who}`);
      } else {
        const token = out.url && new URL(out.url).searchParams.get("token");
        if (!token) throw new Error("The server did not send back a usable link.");
        tab.location.replace(`/preview#token=${encodeURIComponent(token)}&${who}`);
      }
    } catch (e) { tab.close(); setErr(e.message); }
    setBusy("");
  };

  return (
    <>
      <div className={`bo-scrim on${leaving ? " out" : ""}`} onClick={close} />
      <aside className={`bo-panel on${leaving ? " out" : ""}`} role="dialog" aria-modal="true" aria-label={row.name}>
        <div className="bo-pglow" style={{ "--pc": tone }} />
        <button ref={closeBtn} type="button" className="bo-px" onClick={close} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="bo-pscroll" key={row.id}>
          <div className="bo-phead">
            <Av name={row.name} size={64} />
            <div><div className="bo-pname">{row.name}</div><div className="bo-psub">{row.owner_email ?? "No owner account yet"}</div></div>
          </div>
          <div className="bo-ptags">
            <span className="bo-chip" style={{ color: tone, "--k": tone }}>● {st.label}</span>
            <span className="bo-chip mute">{bill.label}</span>
            {row.is_demo && <span className="bo-chip mute">Test account</span>}
          </div>

          {issue && (
            <div className={`bo-alert ${issue.color}`}>
              <b>{issue.kicker}</b>
              <p>{issue.text}</p>
              {issue.kind === "sms" && <a className="bo-btn go" href={c.sms}>Text them <Arrow /></a>}
              {issue.kind === "mail" && <a className="bo-btn go" href={c.mail}>Email them <Arrow /></a>}
            </div>
          )}

          <section className="bo-psec">
            <div className="bo-label">Health, and why</div>
            <div className="bo-health">
              <Ring score={h.score} big />
              <div className="bo-why">
                {h.parts.map((p, i) => {
                  const w = Math.min(50, (Math.abs(p.points) / 32) * 50), col = p.points > 0 ? "var(--ac)" : "var(--bad)";
                  return (
                    <div className="bo-why-r" key={i}>
                      <span>{p.text}</span>
                      <span className="pts" style={{ color: p.base ? "var(--fog-2)" : col }}>{p.base ? "50" : `${p.points > 0 ? "+" : "−"}${Math.abs(p.points)}`}</span>
                      {!p.base && <div className="bar"><i style={{ [p.points > 0 ? "left" : "right"]: "50%", width: `${w}%`, background: col }} /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="bo-psec">
            <div className="bo-label">Setup · {sp.count} of {sp.total}</div>
            <ul className="bo-steps">
              {STEPS.map(([k, , short]) => (
                <li key={k} className={sp.done.has(k) ? "done" : ""}><i>{sp.done.has(k) ? "✓" : ""}</i>{short}</li>
              ))}
            </ul>
          </section>

          <section className="bo-psec">
            <div className="bo-label">This month</div>
            <div className="bo-kv">
              <div><b><Count to={row.jobs_month ?? 0} /></b><span>jobs</span></div>
              <div><b>{money(row.revenue_month ?? 0)}</b><span>they earned</span></div>
              <div><b><Count to={row.customers ?? 0} /></b><span>customers</span></div>
            </div>
          </section>

          <section className="bo-psec">
            <div className="bo-label">Bookings · last 12 weeks</div>
            {!detail && <p className="bo-dim">Reading…</p>}
            {detail?.error && <p className="bo-dim">Could not read their bookings.</p>}
            {weeks && (weeks.every((v) => !v)
              ? <p className="bo-dim">No bookings in the last 12 weeks.</p>
              : <div className="bo-wk">{weeks.map((v, k) => (
                <i key={k} title={`${v} bookings`} style={{ "--h": Math.max(0.04, v / Math.max(...weeks, 1)), "--k": k, ...(v ? null : { background: "var(--line)" }) }} />))}</div>)}
            {weeks && <div className="bo-wk-l"><span>12 weeks ago</span><span>this week</span></div>}
          </section>

          <section className="bo-psec">
            <div className="bo-label">Paid you</div>
            {paid === null
              ? <p className="bo-dim">{detail?.error ? "Could not read their invoices." : "Reading…"}</p>
              : <div className="bo-paid"><b>{usd(paid)}</b><span>since {dateLong(localDate(row.created_at))}</span></div>}
          </section>

          <section className="bo-psec">
            <div className="bo-label">Get in touch</div>
            <div className="bo-contact">
              {c.sms && <a className="bo-btn ghost" href={c.sms}>Text</a>}
              {c.tel && <a className="bo-btn ghost" href={c.tel}>Call</a>}
              {c.mail && <a className="bo-btn ghost" href={c.mail}>Email</a>}
              {row.site_url && <a className="bo-btn ghost" href={row.site_url} target="_blank" rel="noreferrer">Their site ↗</a>}
              <a className="bo-btn ghost" href={`/book/${row.slug}`} target="_blank" rel="noreferrer">Booking page ↗</a>
              <button type="button" className="bo-btn ghost" disabled={busy === "impersonate"} onClick={look}>Look at their dashboard</button>
            </div>
            {c.phone
              ? <div className="bo-phone">{c.phone}</div>
              : <div className="bo-nophone"><i />No phone number on file, so there is no Text or Call button.</div>}
          </section>

          <section className="bo-psec">
            <div className="bo-label">What happened</div>
            {!detail && <p className="bo-dim">Reading…</p>}
            <ol className="bo-log">
              {historyOf(row, detail).map((l, i) => (
                <li key={i} style={{ "--c": l.c }}><span>{ago(l.at)}</span>{l.text}</li>
              ))}
            </ol>
          </section>

          <section className="bo-psec bo-pfoot">
            {err && <p className="bo-err" role="alert">{err}</p>}
            {suspended
              ? <button type="button" className="bo-btn go" disabled={busy === "restore"} onClick={() => act("restore")}>Reopen account</button>
              : sure
                ? (
                  <div className="bo-sure">
                    <p>Suspend {row.name}? Their booking page stops taking bookings.</p>
                    <button type="button" className="bo-btn danger" disabled={busy === "suspend"} onClick={() => act("suspend")}>Yes, suspend them</button>
                    <button type="button" className="bo-btn ghost" onClick={() => setSure(false)}>Not yet</button>
                  </div>
                )
                : <button type="button" className="bo-btn danger" onClick={() => setSure(true)}>Suspend</button>}
          </section>
        </div>
      </aside>
    </>
  );
}
