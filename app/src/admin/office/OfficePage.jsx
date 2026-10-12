// THE BACK OFFICE (ROADMAP 9.12a). It lived at /admin/office while it was built
// built a place at a time; the old five-tab /admin stays up until the last place
// lands (slice 6e / ROADMAP 99.3b), when it replaced the old screen outright at /admin.
//
// WHAT HAS NOT CHANGED, AND MUST NOT:
// * every byte comes from the `platform-admin` edge function (api.js) and the
//   gate is `platform_admins` on the server. This file is a view;
// * a non-admin gets the product's own 404, never "you are not an admin";
// * it sits OUTSIDE BusinessProvider (no current business), like /admin;
// * no class here is shared with theme.css: every class is `bo-` and office.css
//   takes only its tokens.
//
// THE SHAPE: a gate, one `list` read, a shell (side rail on a laptop, bottom dock
// on a phone, Ctrl K), and the active place from places.jsx. The side panel and
// the finder are mounted here so they work from any place.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import NotFound from "../../screens/NotFound.jsx";
import { supabase } from "../../lib/supabase.js";
import { signOutEverything } from "../../lib/signout.js";
import { call } from "./api.js";
import Ground from "./Ground.jsx";
import Palette from "./Palette.jsx";
import DetailerPanel from "./DetailerPanel.jsx";
import { PLACES, placeOf } from "./places.jsx";
import "./office.css";

const TODAY = () => new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
// Plan step 8 (ROADMAP 99.3): the rail shows who is signed in. The address
// before the @, de-dotted; never a hardcoded name.
const nameOf = (email) => {
  const who = String(email ?? "").split("@")[0].replace(/[._-]+/g, " ").trim();
  return who ? who.replace(/\b\w/g, (c) => c.toUpperCase()) : "Back office";
};
const CONCURRENCY = 5;

export default function OfficePage() {
  const [status, setStatus] = useState("checking");   // checking | anon | denied | ok
  const [email, setEmail] = useState("");
  const [state, setState] = useState(null);
  const [err, setErr] = useState("");
  const [placeKey, setPlaceKey] = useState(() => placeOf((window.location.hash || "").slice(1)).key);
  const [openId, setOpenId] = useState(null);
  const [preset, setPreset] = useState(null);         // what a link from another place asks the next one to start on
  const [finder, setFinder] = useState(false);
  const [details, setDetails] = useState({});         // id -> get payload | { error: true }
  const asked = useRef(new Set());
  /* ── the door: unsigned visitors sign in HERE since 6e moved the /admin
     address onto this page. Same words and same one-message refusal as the
     old screen's door; `bo-` styling. ── */
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [doorErr, setDoorErr] = useState("");
  const queue = useRef([]);
  const running = useRef(0);

  const load = useCallback(async () => {
    try { setState(await call({ action: "list" })); setErr(""); } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const s = data?.session;
      if (!live) return;
      // No session: the door below signs them in (6e). Nothing to bounce to.
      if (!s) { setStatus("anon"); return; }
      setEmail(s.user?.email ?? "");
      try { await call({ action: "whoami" }); if (!live) return; setStatus("ok"); load(); }
      catch { if (live) setStatus("denied"); }
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

  // `get` for one detailer, five at a time, once. `force` re-reads after a change.
  const pump = useCallback(() => {
    while (running.current < CONCURRENCY && queue.current.length) {
      const id = queue.current.shift();
      running.current += 1;
      call({ action: "get", business_id: id })
        .then((d) => setDetails((m) => ({ ...m, [id]: d })))
        .catch(() => setDetails((m) => ({ ...m, [id]: { error: true } })))
        .finally(() => { running.current -= 1; pump(); });
    }
  }, []);
  const ensure = useCallback((id, force) => {
    if (!force && asked.current.has(id)) return;
    asked.current.add(id);
    queue.current.push(id);
    pump();
  }, [pump]);

  const go = useCallback((k, want = null) => {
    setPlaceKey(placeOf(k).key); setOpenId(null); setPreset(want);
    try { window.history.replaceState(null, "", `#${placeOf(k).key}`); } catch { /* ignore */ }
    window.scrollTo(0, 0);
  }, []);
  const open = useCallback((id) => { setOpenId(id); ensure(id); }, [ensure]);
  const reload = useCallback(async (id) => { await load(); if (id) ensure(id, true); }, [load, ensure]);

  const rows = state?.rows ?? [];
  const ctx = useMemo(() => ({
    state, rows, totals: state?.totals ?? {}, details, ensure, openId, open, close: () => setOpenId(null),
    go, reload, preset, find: () => setFinder(true),
  }), [state, rows, details, ensure, openId, open, go, reload, preset]);

  // Keys: Ctrl/Cmd K or "/" finds, 1..n jumps to a place, Esc is handled by whichever layer is open.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName ?? "");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setFinder((v) => !v); return; }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") { e.preventDefault(); setFinder(true); return; }
      const n = Number(e.key);
      if (n >= 1 && n <= PLACES.length) go(PLACES[n - 1].key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (status === "checking") return <div className="bo"><Ground /></div>;
  // THE DOOR. Same words as the retired screen's door, own `bo-` styling.
  if (status === "anon") {
    return (
      <div className="bo">
        <Ground />
        <div className="bo-door">
          <div className="bo-door-in">
            <span className="bo-door-eyebrow">Detailing Platform · back office</span>
            <h1>Sign in</h1>
            <p className="bo-door-sub">This is the platform&apos;s own screen, not a detailer&apos;s.</p>
            <form onSubmit={signIn}>
              <label className="bo-field">
                <span>Email</span>
                <input type="email" autoComplete="username" required
                       value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="bo-field">
                <span>Password</span>
                <span className="bo-pw">
                  <input type={showPw ? "text" : "password"} autoComplete="current-password" required
                         value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <button type="button" aria-pressed={showPw}
                          aria-label={showPw ? "Hide password" : "Show password"}
                          onClick={() => setShowPw((v) => !v)}>
                    {showPw ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                  </button>
                </span>
              </label>
              {doorErr && <p className="bo-err">{doorErr}</p>}
              <div className="bo-door-acts">
                <button className="bo-btn go" type="submit">Sign in</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
  if (status === "denied") return <NotFound />;

  const place = placeOf(placeKey);
  const Place = place.Place;
  const openRow = openId ? rows.find((r) => r.id === openId) : null;

  return (
    <div className="bo">
      <Ground />
      <div className="bo-app">
        <nav className="bo-rail" aria-label="Back office">
          <div className="bo-brand">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
              <path d="M17 2C17 2 6 14 6 21a11 11 0 0 0 22 0C28 14 17 2 17 2Z" fill="var(--ac)" />
              <path d="M12 21.5a5 5 0 0 0 5 5" stroke="#04150C" strokeWidth="2.2" strokeLinecap="round" opacity=".6" />
            </svg>
            <div><b>Detailing Platform</b><span>Back office</span></div>
          </div>
          {/* The sliding highlight is placed by CSS from the active tab's position in
              the row (--at of --n), never measured in JS: a measured one was right only
              at the width it was measured at, and a frozen review copy shown at another
              width put it 19-25px off its tab (9.12b, 2026-10-11). */}
          <div className="bo-navlist" style={{ "--at": PLACES.findIndex((p) => p.key === place.key), "--n": PLACES.length }}>
            <span className="bo-navpill" />
            {PLACES.map((p) => {
              const n = state ? p.badge?.(ctx) ?? 0 : 0;
              return (
                <button key={p.key} type="button" className={`bo-nav${p.key === place.key ? " on" : ""}`}
                        aria-current={p.key === place.key ? "page" : undefined} onClick={() => go(p.key)}>
                  <p.Icon size={20} strokeWidth={1.8} aria-hidden="true" />{p.label}
                  {n > 0 && <span className="cnt" aria-label={`${n} need you`}>{n}</span>}
                </button>
              );
            })}
          </div>
          <div className="fill" />
          <button type="button" className="bo-find" onClick={() => setFinder(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            Find a detailer<kbd>Ctrl K</kbd>
          </button>
          <div className="bo-me">
            <span className="bo-av" style={{ "--c": "#38E08B" }}>{(email[0] ?? "A").toUpperCase()}</span>
            <div><b>{nameOf(email)}</b><button type="button" onClick={signOutEverything}>Sign out</button></div>
          </div>
        </nav>

        <main className="bo-main">
          <header className="bo-top">
            <div className="bo-ghost" aria-hidden="true">{place.label}</div>
            <div>
              <div className="bo-date"><span>{TODAY()}</span><span className="live"><i />Live</span></div>
              <h1 className="bo-place" key={place.key} aria-label={place.label}>
                {[...place.label].map((c, i) => <span key={i} className="ch" aria-hidden="true" style={{ animationDelay: `${i * 38}ms` }}>{c}</span>)}
              </h1>
            </div>
            <button type="button" className="bo-find-top" onClick={() => setFinder(true)} aria-label="Find a detailer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            </button>
          </header>

          {err && <div className="bo-error" role="alert"><b>Could not load</b><p>{err}</p><button type="button" className="bo-btn ghost" onClick={load}>Try again</button></div>}
          {!state && !err && <p className="bo-none">Reading the platform…</p>}
          {state && <div className="bo-place-in" key={place.key}><Place ctx={ctx} /></div>}
        </main>
      </div>

      {openRow && <DetailerPanel key={openRow.id} row={openRow} detail={details[openRow.id]} ctx={ctx} />}
      {finder && <Palette ctx={ctx} onClose={() => setFinder(false)} />}
    </div>
  );
}
