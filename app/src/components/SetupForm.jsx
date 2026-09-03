// FIRST RUN, HALF ONE: the setup form. Roadmap 2.11 step 6, stage 7.
//
// The owner overruled the recommendation to build this as empty states
// (DECISIONS.md → "Roadmap 2.11, steps 3-5", Q1). He asked for a form AND,
// SEPARATELY, a guided tour — *"they could, like, skip stuff or enter it
// later"* — and screen designs §13 keeps them two on purpose. This file is
// the form; `Walkthrough.jsx` is the tour. Building them as one is how the
// form becomes a wizard, which is the thing people abandon.
//
// THE SHAPE, ALL OF IT FROM §13a AND PHONE PASS §14:
//   - one question a step, seven steps, one column at every width. A stepped
//     form that widened would put more air around one question.
//   - SKIPPABLE means every step carries "I'll do this later" and skipping
//     never blocks the next step.
//   - RESUMABLE means Business carries a row until this is finished or
//     dismissed, and re-entering lands on the first unfinished step.
//   - the order is the order a BOOKING needs — what you sell, when you work,
//     who you are — so a detailer who quits after two steps still has a
//     bookable page.
//   - each step commits ON LEAVING IT, so a failure costs one step, not
//     seven. Every editor below is therefore held in one `draft` object and
//     written by one `commit()`, rather than each having a Save of its own.
//
// THE SEVEN STEPS AND THE PROGRESS ARITHMETIC ARE IN `lib/setup.js`, with no
// React in them, because that number is printed HERE and on Business and the
// two must never disagree — and because `tests/setup-progress.test.mjs` can
// only pin it if it can be imported without a DOM. Same reason
// `client-list.js` and `accountant-export.js` are their own files. The
// seventh step's provenance is written there too.
//
// WHAT IS REUSED AND WHAT IS WRITTEN FRESH, because the split is not
// arbitrary: *Your colour* renders `screens/more/Appearance.jsx` whole, since
// it commits on the tap that picks a swatch and has no Save button to lose.
// The other six are small editors here rather than their settings screens,
// for one reason: those screens end in a Save button, and a step whose
// Continue does not save is a step that silently throws away what was typed
// into it. One question, one write, committed by Continue.
//
// STAFF NEVER SEE THIS (§13b) — they are not setting up a business, and the
// database refuses them most of these writes anyway. App.jsx gates it.

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import { Segmented } from "./controls.jsx";
import { setupProgress, STEPS } from "../lib/setup.js";
import Appearance from "../screens/more/Appearance.jsx";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The three counting reads the form and Business both need. One place, so the
// two screens cannot end up counting differently.
export async function loadSetupCounts(businessId) {
  const head = { count: "exact", head: true };
  const [s, a, p, h] = await Promise.all([
    supabase.from("services").select("id", head).eq("business_id", businessId).eq("is_active", true),
    supabase.from("add_ons").select("id", head).eq("business_id", businessId).eq("is_active", true),
    supabase.from("promo_codes").select("id", head).eq("business_id", businessId).eq("is_active", true),
    supabase.from("business_hours").select("open_time").eq("business_id", businessId),
  ]);
  return {
    services: s.count, addOns: a.count, promos: p.count,
    hoursOpen: (h.data ?? []).some((r) => r.open_time),
  };
}

// ── the editors ────────────────────────────────────────────────────────────
// A thing you sell: services and add-ons are the same three questions against
// two tables, so they are one editor. Add-ons default to no extra time, which
// is true of most of them (a scent, a sealant) and is what the slot engine
// wants when nobody says otherwise.
function ThingEditor({ kind, draft, set, rows, onAdd }) {
  const noun = kind === "services" ? "service" : "add-on";
  return (
    <>
      {/* WHAT IS ALREADY THERE, as `.facts` rather than `.rows`: a ruled list
          of things you can TAP is `.row-item`, and none of these open
          anything — they are the answer so far, read back. */}
      {rows.length > 0 && (
        <div className="facts">
          {rows.map((r) => (
            <div key={r.id}>
              <span>{r.name}</span>
              <span className="v strong num">${Number(r.price).toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <div className="thoughts">
          <label className="field"><span>Name</span>
            <input value={draft.name} autoComplete="off"
              placeholder={kind === "services" ? "Full detail" : "Pet hair removal"}
              onChange={(e) => set({ ...draft, name: e.target.value })} /></label>
          <div className="grid2">
            <label className="field"><span>Price</span>
              <input type="number" inputMode="decimal" value={draft.price}
                onChange={(e) => set({ ...draft, price: e.target.value })} /></label>
            <label className="field"><span>{kind === "services" ? "Minutes" : "Extra minutes"}</span>
              <input type="number" inputMode="numeric" value={draft.minutes}
                onChange={(e) => set({ ...draft, minutes: e.target.value })} /></label>
          </div>
          {/* "another" only when there IS another. On a first run this list
              is empty and the button was offering to add a second service
              before there was a first. */}
          <button className="btn" disabled={!draft.name.trim()} onClick={onAdd}>
            {rows.length ? `Add another ${noun}` : `Add this ${noun}`}
          </button>
        </div>
      </div>
    </>
  );
}

// THE BULK EDITOR AND NOTHING ELSE, which is a decision `Hours.jsx`'s own
// header already argued: "setting seven days one at a time is not how a
// detailer sets hours — they work Tuesday to Saturday, ten to six, and want
// to say that once". Per-day fine-tuning lives on the settings screen; on the
// first morning it is one question with one answer.
function HoursEditor({ draft, set }) {
  const toggle = (d) => set({
    ...draft,
    days: draft.days.includes(d) ? draft.days.filter((x) => x !== d) : [...draft.days, d].sort(),
  });
  return (
    <div className="card">
      <div className="thoughts">
        <div className="row wrap" style={{ gap: 6 }}>
          {DAYS.map((name, i) => (
            <button key={i} type="button" aria-pressed={draft.days.includes(i)}
              className={`chip ${draft.days.includes(i) ? "active" : ""}`}
              onClick={() => toggle(i)}>{name}</button>
          ))}
        </div>
        <div className="grid2 wide">
          <label className="field"><span>Open</span>
            <input type="time" value={draft.open}
              onChange={(e) => set({ ...draft, open: e.target.value })} /></label>
          <label className="field"><span>Close</span>
            <input type="time" value={draft.close}
              onChange={(e) => set({ ...draft, close: e.target.value })} /></label>
        </div>
      </div>
    </div>
  );
}

// ── the form ───────────────────────────────────────────────────────────────
export default function SetupForm({ onClose }) {
  const { business, branding, settings, reload: reloadTenant } = useBusiness();
  const [counts, setCounts] = useState(null);
  const [rows, setRows] = useState({ services: [], addons: [], promos: [] });
  const [i, setI] = useState(0);
  // Which way the last move went, so the step that arrives comes from the
  // side it was travelling from rather than always from the right.
  const [dir, setDir] = useState(1);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [err, setErr] = useState(null);
  const heading = useRef(null);

  const [draft, setDraft] = useState({
    services: { name: "", price: "", minutes: "120" },
    addons: { name: "", price: "", minutes: "0" },
    promos: { code: "", type: "percentage", value: "" },
    hours: { days: [1, 2, 3, 4, 5], open: "09:00", close: "17:00" },
    where: "both",
    contact: { phone: "", email: "" },
  });
  const put = (key) => (v) => setDraft((d) => ({ ...d, [key]: v }));

  const load = useCallback(async () => {
    setCounts(await loadSetupCounts(business.id));
    const [s, a, p] = await Promise.all([
      supabase.from("services").select("id,name,price").eq("business_id", business.id).eq("is_active", true).order("sort_order"),
      supabase.from("add_ons").select("id,name,price").eq("business_id", business.id).eq("is_active", true).order("sort_order"),
      supabase.from("promo_codes").select("id,code,type,value").eq("business_id", business.id).eq("is_active", true),
    ]);
    setRows({
      services: s.data ?? [],
      addons: a.data ?? [],
      promos: (p.data ?? []).map((r) => ({ id: r.id, name: r.code, price: r.value })),
    });
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  // Seed the two editors whose answer may already exist, so a returning
  // detailer is shown what they have rather than an empty box that reads as
  // "nothing is set".
  useEffect(() => {
    setDraft((d) => ({
      ...d,
      contact: { phone: business.contact_phone || "", email: business.contact_email || "" },
      where: settings?.mobile_enabled && settings?.dropoff_enabled ? "both"
        : settings?.dropoff_enabled ? "dropoff" : "mobile",
    }));
  }, [business.contact_phone, business.contact_email, settings?.mobile_enabled, settings?.dropoff_enabled]);

  const progress = setupProgress({ business, branding, settings, counts });

  // RESUME WHERE IT STOPPED — the other half of "resumable". The first
  // unfinished step, or the last one if everything is done. Runs once, when
  // the counts land: re-running it on every change would drag the detailer
  // forward the moment they finished a step.
  const placed = useRef(false);
  useEffect(() => {
    if (placed.current || !counts) return;
    placed.current = true;
    const first = STEPS.findIndex(([k]) => !progress.done.has(k));
    setI(first === -1 ? STEPS.length - 1 : first);
  }, [counts]);

  // One write per step, in one place, so "each step commits on leaving it" is
  // a property of this function rather than of six editors that each have to
  // remember. Returns an error string, or null.
  const commit = async (key) => {
    const d = draft[key];
    if (key === "services" || key === "addons") {
      if (!d.name.trim()) return null;
      const table = key === "services" ? "services" : "add_ons";
      const { error } = await supabase.from(table).insert({
        business_id: business.id,
        name: d.name.trim(),
        price: Number(d.price) || 0,
        duration_minutes: Number(d.minutes) || (key === "services" ? 60 : 0),
      });
      if (error) return error.message;
      setDraft((s) => ({ ...s, [key]: { ...s[key], name: "", price: "" } }));
      return null;
    }
    if (key === "promos") {
      if (!d.code.trim() || !Number(d.value)) return null;
      const { error } = await supabase.from("promo_codes").insert({
        business_id: business.id,
        code: d.code.trim().toUpperCase(),
        type: d.type,
        value: Number(d.value),
      });
      if (error) return error.message;
      setDraft((s) => ({ ...s, promos: { ...s.promos, code: "", value: "" } }));
      return null;
    }
    if (key === "hours") {
      // A row per weekday, always — closed is a present row with null times,
      // which is what lets the slot engine tell "we don't work Sundays" from
      // "hours were never set up". Hours.jsx keeps the same invariant.
      const all = [0, 1, 2, 3, 4, 5, 6].map((w) => ({
        business_id: business.id, weekday: w,
        open_time: d.days.includes(w) ? d.open : null,
        close_time: d.days.includes(w) ? d.close : null,
      }));
      const { error } = await supabase.from("business_hours")
        .upsert(all, { onConflict: "business_id,weekday" });
      return error?.message ?? null;
    }
    if (key === "where") {
      const { error } = await supabase.from("business_settings").update({
        mobile_enabled: d !== "dropoff",
        dropoff_enabled: d !== "mobile",
      }).eq("business_id", business.id);
      return error?.message ?? null;
    }
    if (key === "contact") {
      const { error } = await supabase.from("businesses").update({
        contact_phone: d.phone.trim() || null,
        contact_email: d.email.trim() || null,
      }).eq("id", business.id);
      return error?.message ?? null;
    }
    return null;   // colour writes itself the moment a swatch is tapped
  };

  // The stored half of the progress (see setupProgress): only ever appended
  // to, and read back off `settings` so two tabs cannot clobber each other's
  // list with a stale copy.
  const patchSetup = async (patch) => {
    const now = settings?.setup ?? {};
    await supabase.from("business_settings")
      .upsert({ business_id: business.id, setup: { ...now, ...patch } }, { onConflict: "business_id" });
    await reloadTenant();
  };

  // OPENING IT IS WHAT MARKS IT SEEN, and it has to be written here rather
  // than by whatever opened it, because both doors lead to this component.
  // Without it the form is a first run every morning: `seen` is the only
  // thing App.jsx's auto-open reads, and finishing all seven steps does not
  // set it. Found by running the whole form through once and then reloading.
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current || !settings || settings.setup?.seen) return;
    marked.current = true;
    patchSetup({ seen: true });
  }, [settings]);

  const go = async (n, mark) => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      if (mark) {
        const key = STEPS[i][0];
        const problem = await commit(key);
        if (problem) { setErr(problem); return; }
        const done = [...new Set([...(settings?.setup?.done ?? []), key])];
        await patchSetup({ done });
        await load();
      }
      if (n >= STEPS.length) { close(); return; }
      setDir(n > i ? 1 : -1);
      setI(Math.max(0, n));
    } finally { setBusy(false); }
  };

  // ENTRANCE AND EXIT IN THE SAME CHANGE — CLAUDE.md's standing rule since
  // 2026-09-02. The form is a thing somebody OPENED (from first run, or from
  // Business's own row), so it has to come from somewhere and go back there;
  // `Sheet.jsx` has used exactly this leaving-then-unmount pattern since it
  // was written, and reusing it is one less mechanic in the product.
  const close = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onClose?.(), 180);   // --t-exit
  }, [onClose]);

  // A new question is a new heading, and a screen reader has no other way to
  // know the step changed — the surrounding chrome does not move.
  useEffect(() => { heading.current?.focus(); }, [i]);

  const [key, question, name] = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className={`group setupform${leaving ? " leaving" : ""}`}>
      <div className="settings-head">
        <button className="btn icon ghost" aria-label="Back" disabled={i === 0}
          onClick={() => go(i - 1, false)}>
          <ChevronLeft strokeWidth={2} />
        </button>
        {/* SHORT ON PURPOSE, and it was measured: "Set up your booking page"
            wrapped to two lines at 392 beside a back control and a close,
            which is stage 6's own finding about a settings page's title one
            screen over. The step underneath says what is being set up, so the
            title only has to name where you are — and this is the name the
            feature inventory already gives rows 118 and 119. */}
        <h1 className="display">Getting started</h1>
        <button className="x" aria-label="Close setup" onClick={close}>
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* THE PROGRESS RULE (component inventory §1b). Seven segments, filled
          by what is FINISHED rather than by where you are — so a skipped step
          leaves a hole, and the hole is the instruction to come back. Where
          you are is said in words underneath, which is also the accessible
          form of it: the segments are decoration and say so. */}
      <div className="tight">
        <div className="progress-rule" aria-hidden="true">
          {STEPS.map(([k]) => <span key={k} className={progress.done.has(k) ? "on" : ""} />)}
        </div>
        <span className="label">Step {i + 1} of {STEPS.length} · {name}</span>
      </div>

      <div className={`setupstep ${dir > 0 ? "fwd" : "back"}`} key={key}>
        <h2 className="title" ref={heading} tabIndex={-1}>{question}</h2>

        {key === "services" && (
          <ThingEditor kind="services" draft={draft.services} set={put("services")}
            rows={rows.services} onAdd={() => go(i, true)} />
        )}
        {key === "addons" && (
          <ThingEditor kind="addons" draft={draft.addons} set={put("addons")}
            rows={rows.addons} onAdd={() => go(i, true)} />
        )}
        {key === "promos" && (
          <div className="card">
            <div className="thoughts">
              {rows.promos.length > 0 && (
                <p className="quiet">
                  Already running: {rows.promos.map((r) => r.name).join(", ")}
                </p>
              )}
              <div className="grid2">
                <label className="field"><span>Code</span>
                  <input value={draft.promos.code} autoComplete="off" placeholder="SUMMER10"
                    onChange={(e) => put("promos")({ ...draft.promos, code: e.target.value })} /></label>
                <label className="field"><span>Type</span>
                  <Segmented value={draft.promos.type} label="Discount type"
                    onChange={(v) => put("promos")({ ...draft.promos, type: v })}
                    options={[["percentage", "% off"], ["amount", "$ off"]]} /></label>
              </div>
              <label className="field"><span>How much</span>
                <input type="number" inputMode="decimal" value={draft.promos.value}
                  onChange={(e) => put("promos")({ ...draft.promos, value: e.target.value })} /></label>
            </div>
          </div>
        )}
        {key === "hours" && <HoursEditor draft={draft.hours} set={put("hours")} />}
        {key === "where" && (
          <Segmented value={draft.where} onChange={put("where")} label="Where the work happens"
            options={[["mobile", "I go to them"], ["dropoff", "They come to me"], ["both", "Both"]]} />
        )}
        {key === "contact" && (
          <div className="card">
            <div className="thoughts">
              <label className="field"><span>Phone</span>
                <input type="tel" value={draft.contact.phone} autoComplete="tel"
                  onChange={(e) => put("contact")({ ...draft.contact, phone: e.target.value })} /></label>
              <label className="field"><span>Email</span>
                <input type="email" value={draft.contact.email} autoComplete="email"
                  onChange={(e) => put("contact")({ ...draft.contact, email: e.target.value })} /></label>
            </div>
          </div>
        )}
        {key === "colour" && <Appearance />}

        {err && <div className="error-box">{err}</div>}
      </div>

      <div className="setupfoot">
        {/* SKIPPING NEVER BLOCKS THE NEXT STEP — §13a, in the owner's own
            words. It also never marks the step done, which is what leaves the
            hole in the rule above. */}
        <button className="btn" disabled={busy} onClick={() => go(i + 1, false)}>
          I'll do this later
        </button>
        <button className="btn primary" disabled={busy} onClick={() => go(i + 1, true)}>
          {busy ? "Saving…" : last ? "Finish" : "Continue"}
        </button>
      </div>
      {/* The one way to stop being asked. It is here rather than on Business's
          row because the row is a nav-row — a control inside it would be a
          button inside a button — and because the decision belongs where the
          thing being dismissed is, not on the screen it nags from. */}
      <button className="btn sm inline ghost setupquit"
        onClick={async () => { await patchSetup({ dismissed: true }); close(); }}>
        Don't remind me again
      </button>
    </div>
  );
}
