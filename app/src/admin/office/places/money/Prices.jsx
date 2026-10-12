// What detailers pay: the platform's own price table, grouped by plan, and the
// editor that changes it (`prices`, the one write here that decides what a
// detailer's card is charged). Moved from the old Money tab, 9.12a slice 6b.
// 9.12c: ONE press opens it already editable — the boxes hold the stored figures
// and only what is typed is kept, so Save and Cancel appear once something differs.
// NOTHING IS VALIDATED HERE: the server runs the table through `pricesFrom`, the
// function the checkout charges from, and its refusal sentence is shown as-is.
// "Go back" sends `null`, which means read the built-in files, never a copy of them.
import { useState } from "react";
import { priceRows, priceValue, say, tableOf } from "../../../../lib/officeMoney.js";
import { call } from "../../api.js";
import { ChevronDown, Minus, Plus } from "lucide-react";

const TONE = { website: "var(--ac)", bookingOnly: "#5FB4E2", founding: "var(--bo-warn)" };
// The founding offer goes last: it only ever applies to three people (Andrew, 2026-10-12).
const ORDER = ["website", "bookingOnly", "term", "founding"];
const rank = (k) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length - 1);
const when = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function Prices({ ctx, i }) {
  const p = ctx.state?.prices;
  const table = p?.current ?? p?.built_in;
  const rows = priceRows(table);
  const [edits, setEdits] = useState({});
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const stored = Object.fromEntries(rows.map((r) => [r.path.join("."), String(r.raw)]));
  const draft = { ...stored, ...edits };
  const dirty = Object.keys(stored).some((k) => draft[k] !== stored[k]);
  const type = (key, v) => { setSure(false); setEdits((e) => ({ ...e, [key]: v })); };
  const step = (key, amount) => type(key, String(Math.round((Number(draft[key]) + amount) * 100) / 100));
  const shut = () => { setEdits({}); setSure(false); setErr(""); };
  const send = async (prices) => {
    setBusy(true); setErr("");
    try { await call({ action: "prices", prices }); await ctx.reload(); shut(); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };

  const groups = [];
  for (const r of rows) {
    const g = groups.find((x) => x.key === r.path[0]) ?? (groups.push({ key: r.path[0], rows: [] }), groups.at(-1));
    g.rows.push(r);
  }
  groups.sort((a, b) => rank(a.key) - rank(b.key));
  const fig = (g, k) => rows.find((r) => r.path[0] === g && r.path[1] === k);
  const peek = [[fig("website", "monthly"), "website", " / month"], [fig("bookingOnly", "monthly"), "bookingOnly", " / month"], [fig("website", "setup"), "website", " one time", "Setup fee"]].filter(([r]) => r);

  return (
    <section className="bo-sec bo-prices" style={{ "--i": i }} aria-label="What detailers pay">
      <details className="bo-price-fold">
      <summary className="bo-price-summary" onClick={(e) => { if (busy) e.preventDefault(); }}>
      <span className="bo-label">
        What detailers pay
        {table && (
          <span className="bo-prices-from">{p.current ? `Changed here${p.updated_at ? ` · ${when(p.updated_at)}` : ""}` : "Built-in prices"}</span>
        )}
      </span>
      {table && <span className="bo-price-preview">
        {peek.map(([r, g, unit, name]) => (
          <span key={r.path.join(".")} style={{ "--c": TONE[g] }}>
            <span>{name ?? say(g)}</span>
            <b>{r.value}<small>{unit}</small></b>
          </span>
        ))}
      </span>}
      <span className="bo-price-more">All prices and contract <ChevronDown size={18} aria-hidden="true" /></span>
      </summary>
      <div className="bo-price-body">
      {!table ? <p className="bo-dim">Could not read the prices.</p> : (
        <>
          <div className="bo-pgroups">
            {groups.map((g) => (
              <div key={g.key} className="bo-pgroup" style={{ "--c": TONE[g.key] ?? "var(--fog)" }}>
                <h3>{say(g.key)}</h3>
                <dl>
                  {g.rows.map((r) => {
                    const key = r.path.join("."), last = r.path.at(-1);
                    const typed = draft[key];
                    const bad = String(typed).trim() === "" || !Number.isFinite(Number(typed));
                    const by = last === "exitFeeShare" ? 0.05 : last === "months" ? 1 : 5;
                    return (
                      <div key={key} data-price={key}>
                        <dt className="k">
                          {say(last)}
                          {/* The one figure stored differently from how it reads: 0.5 is half, 50 says 5000% out loud. */}
                          {last === "exitFeeShare" && <small className="v">{bad ? "Blank" : priceValue(last, Number(typed))}</small>}
                        </dt>
                        <dd className="bo-price-control">
                          <button type="button" className="bo-price-step" aria-label={`Decrease ${r.label}`} disabled={busy || bad}
                            onClick={() => step(key, -by)}><Minus size={15} aria-hidden="true" /></button>
                          <label className="bo-price-entry">
                            {!["months", "exitFeeShare"].includes(last) && <span aria-hidden="true">$</span>}
                            <input data-price={key} type="text" inputMode="decimal" aria-label={r.label} value={typed} disabled={busy}
                              style={{ width: `${Math.max(1, String(typed).length) + 0.4}ch` }}
                              onChange={(e) => type(key, e.target.value)} />
                            {last === "months" && <span aria-hidden="true">mo</span>}
                          </label>
                          <button type="button" className="bo-price-step" aria-label={`Increase ${r.label}`} disabled={busy || bad}
                            onClick={() => step(key, by)}><Plus size={15} aria-hidden="true" /></button>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
          {err && <p className="bo-err" role="alert">{err}</p>}
          {sure ? (
            <div className="bo-sure">
              <p>Go back to the built-in prices? What is set here is forgotten.</p>
              <button type="button" className="bo-btn danger" disabled={busy} onClick={() => send(null)}>Yes, go back</button>
              <button type="button" className="bo-btn ghost" onClick={() => setSure(false)}>Not yet</button>
            </div>
          ) : (dirty || p.current) && (
            <div className="acts">
              {dirty && <button type="button" className="bo-btn go" disabled={busy} onClick={() => send(tableOf(draft))}>{busy ? "Saving…" : "Save these prices"}</button>}
              {dirty && <button type="button" className="bo-btn ghost" disabled={busy} onClick={shut}>Cancel</button>}
              {p.current && <button type="button" className="bo-btn danger" disabled={busy} onClick={() => setSure(true)}>Go back to the built-in prices</button>}
            </div>
          )}
        </>
      )}
      </div>
      </details>
    </section>
  );
}
