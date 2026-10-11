// What detailers pay: the platform's own price table, grouped by plan, and the
// editor that changes it (`prices`, the one write here that decides what a
// detailer's card is charged). Moved from the old Money tab, 9.12a slice 6b.
// NOTHING IS VALIDATED HERE: the server runs the table through `pricesFrom`, the
// function the checkout charges from, and its refusal sentence is shown as-is.
// "Go back" sends `null`, which means read the built-in files, never a copy of them.
import { useState } from "react";
import { priceRows, priceValue, say, tableOf } from "../../../../lib/officeMoney.js";
import { call } from "../../api.js";

const TONE = { website: "var(--ac)", bookingOnly: "#5FB4E2", founding: "var(--bo-warn)" };
const when = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function Prices({ ctx, i }) {
  const p = ctx.state?.prices;
  const table = p?.current ?? p?.built_in;
  const rows = priceRows(table);
  const [draft, setDraft] = useState(null);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const open = () => { setErr(""); setSure(false); setDraft(Object.fromEntries(rows.map((r) => [r.path.join("."), String(r.raw)]))); };
  const shut = () => { setDraft(null); setSure(false); setErr(""); };
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

  return (
    <section className="bo-sec bo-prices" style={{ "--i": i }} aria-label="What detailers pay">
      <div className="bo-label">
        What detailers pay
        {table && (
          <span className="bo-prices-from">{p.current ? `Changed here${p.updated_at ? ` · ${when(p.updated_at)}` : ""}` : "Built-in prices"}</span>
        )}
      </div>
      {!table ? <p className="bo-dim">Could not read the prices.</p> : (
        <>
          <div className="bo-pgroups">
            {groups.map((g) => (
              <div key={g.key} className="bo-pgroup" style={{ "--c": TONE[g.key] ?? "var(--fog)" }}>
                <h3>{say(g.key)}</h3>
                <dl>
                  {g.rows.map((r) => {
                    const key = r.path.join("."), last = r.path.at(-1);
                    const typed = draft?.[key];
                    return (
                      <div key={key} data-price={key} className={draft ? "editing" : ""}>
                        <dt className="k">{say(last)}</dt>
                        {draft && (
                          <input data-price={key} type="text" inputMode="decimal" aria-label={r.label} value={typed}
                                 onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                        )}
                        {/* While typing, what it WILL read as: 0.5 is half, 50 says 5000% out loud. */}
                        <dd className="v">{draft ? (String(typed).trim() === "" ? "Blank" : priceValue(last, Number(typed))) : r.value}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
          {err && <p className="bo-err" role="alert">{err}</p>}
          {!draft ? (
            <div className="acts"><button type="button" className="bo-btn ghost" onClick={open}>Change these prices</button></div>
          ) : sure ? (
            <div className="bo-sure">
              <p>Go back to the built-in prices? What is set here is forgotten.</p>
              <button type="button" className="bo-btn danger" disabled={busy} onClick={() => send(null)}>Yes, go back</button>
              <button type="button" className="bo-btn ghost" onClick={() => setSure(false)}>Not yet</button>
            </div>
          ) : (
            <div className="acts">
              <button type="button" className="bo-btn go" disabled={busy} onClick={() => send(tableOf(draft))}>{busy ? "Saving…" : "Save these prices"}</button>
              <button type="button" className="bo-btn ghost" disabled={busy} onClick={shut}>Cancel</button>
              {p.current && <button type="button" className="bo-btn danger" disabled={busy} onClick={() => setSure(true)}>Go back to the built-in prices</button>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
