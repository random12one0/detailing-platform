// Your web address — the seventeenth settings screen. Roadmap 3.3.
//
// `business_domains` has existed since the first tenant migration and nothing
// had ever read OR written it. This is the writing half; the reading half is
// `get_public_business_profile_by_host` (a customer landing on the address)
// and `business_canonical_host` (every link the platform emails).
//
// WHAT IT ACTUALLY CHANGES, and the screen says it in those words: the links
// in a customer's confirmation, reminder and receipt emails. Until a detailer
// has an address of their own, every one of those says detailingplatform.com
// — the one seam a customer can see, in the one artifact the detailer did not
// write (contract §6a).
//
// THREE STEPS AND ONE OF THEM IS OURS, WHICH IS THE THING NOT TO HIDE. A
// detailer cannot finish this alone: the address has to be added as an alias
// on our own hosting before it can answer at all. A screen that offered
// "Add" and "Check" without saying so would leave somebody pressing Check
// forever and concluding the product is broken — which is the push-switch
// defect roadmap 2.11 stage 6 spent a pass removing, one screen over.
//
// THE CHECK IS A FETCH AND NOT A TICK. `verify-domain` asks the address
// itself for a marker file this app serves. Nothing the detailer types can
// make that true, which is why `verified_at` is revoked from `authenticated`
// at column level — RLS chooses rows, not columns.

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { api } from "../../lib/api.js";
import { useBusiness } from "../../context/BusinessContext.jsx";

// The same normalisation the server and the database use. Three copies of a
// string rule is two too many, but this one is a COURTESY — it shows the
// detailer what will be stored while they are still typing, and the server
// normalises again on the way in. The one that decides is `verify-domain`.
const tidy = (v) => String(v || "").trim().toLowerCase()
  .replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").replace(/^www\./, "");

export default function WebAddress() {
  const { business } = useBusiness();
  const [rows, setRows] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(null);   // the id being checked
  const [note, setNote] = useState(null);           // {ok, text}

  const load = useCallback(async () => {
    setBusy(true);
    // NOT `const { data } = await` and the error dropped — an empty list and a
    // failed read look identical and mean opposite things. Fourth site of the
    // line that taught this repo the difference.
    const { data, error: err } = await supabase
      .from("business_domains")
      .select("id, domain, verification_token, verified_at, created_at")
      .eq("business_id", business.id)
      .order("created_at");
    setError(err ? (err.message || "Could not load your addresses.") : "");
    if (data) setRows(data);
    setBusy(false);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const domain = tidy(input);
    if (!domain) return;
    setNote(null);
    const { error: err } = await supabase.from("business_domains")
      .insert({ business_id: business.id, domain });
    // The column is UNIQUE across every business, so this is the one error
    // worth translating: "duplicate key" tells a detailer nothing.
    if (err) {
      setNote({ ok: false, text: /duplicate|unique/i.test(err.message)
        ? `${domain} is already set up on an account.`
        : err.message });
      return;
    }
    setInput("");
    load();
  };

  const check = async (row) => {
    setChecking(row.id);
    setNote(null);
    try {
      const r = await api.verifyDomain(business.id, row.id);
      setNote(r?.verified
        ? { ok: true, text: `${r.domain} is live. Your customers' emails will use it from now on.` }
        : { ok: false, text: r?.reason || "That address isn't answering yet." });
    } catch (e) {
      setNote({ ok: false, text: e.message });
    }
    setChecking(null);
    load();
  };

  const remove = async (row) => {
    if (!confirm(`Stop using ${row.domain}? Your links go back to detailingplatform.com.`)) return;
    await supabase.from("business_domains").delete()
      .eq("id", row.id).eq("business_id", business.id);
    load();
  };

  const live = rows.find((r) => r.verified_at);

  return (
    <div className="card">
      <div className="thoughts">
        {/* THE FACT THE LABEL DOES NOT CARRY: what this changes. "Web address"
            reads as the website; what it really moves is every link in every
            email the platform sends on their behalf. */}
        <p className="quiet" style={{ marginTop: 0 }}>
          {live
            ? `Your booking page and every link in your customers' emails use ${live.domain}.`
            : `Your booking page is detailingplatform.com/book/${business.slug}, and that is what your customers' emails link to. Put your own address here and they use yours instead.`}
        </p>

        <label className="field"><span>Your address</span>
          <input value={input} placeholder="e.g. book.yourdetailing.com" inputMode="url"
            onChange={(e) => setInput(e.target.value)} /></label>
        {/* SAID BEFORE THEY TYPE IT, not after it fails. A subdomain is the
            ordinary answer because most detailers' main address already
            points at a website of their own, and an apex that already serves
            something cannot also serve this. */}
        <p className="muted" style={{ marginTop: "calc(-1 * var(--sp-2))" }}>
          Usually a subdomain like <strong>book.</strong>yourdetailing.com. It has to be one
          you are not already using for something else.
        </p>

        <div className="btnrow">
          <button className="btn primary" disabled={!tidy(input)} onClick={add}>Add this address</button>
        </div>

        {note && <div className={note.ok ? "ok-box" : "error-box"}>{note.text}</div>}
        {error && <div className="error-box">{error}</div>}

        {!busy && rows.length === 0 && (
          <p className="body">Nothing here yet — you are on detailingplatform.com.</p>
        )}

        <div className={`rows rows-stack${busy ? " refreshing" : ""}`} aria-busy={busy || undefined}>
          {rows.map((r) => (
            <div className="row-item" key={r.id} style={{ cursor: "default" }}>
              <span className="txt">
                <span className="nm">{r.domain}</span>
                <span className="sub">
                  {r.verified_at ? "Live" : "Not answering yet — the three steps below"}
                </span>
              </span>
              {r.verified_at
                ? <span className="pill completed" aria-label="Live"><Check size={14} strokeWidth={2.5} /></span>
                : (
                  <button className="btn sm inline ghost" disabled={checking === r.id}
                    onClick={() => check(r)}>
                    {checking === r.id ? "Checking" : "Check it"}
                  </button>
                )}
              <button className="btn sm inline icon ghost" aria-label={`Remove ${r.domain}`}
                onClick={() => remove(r)}><X strokeWidth={2} /></button>
            </div>
          ))}
        </div>

        {rows.length > 0 && !live && (
          <>
            <div className="section-title">What has to happen</div>
            {/* A NUMBERED LIST, WHICH THE DESIGN SYSTEM ALLOWS ONLY FOR A REAL
                SEQUENCE — and this is one: none of these three works before
                the one above it. */}
            <ol className="body" style={{ paddingLeft: "1.2em", display: "grid", gap: "var(--sp-3)" }}>
              <li>You add the address above. Done.</li>
              {/* SAYING OUT LOUD THAT ONE STEP IS OURS. A detailer who does
                  not know this presses Check, sees it fail, and concludes the
                  feature is broken. */}
              <li><strong>We switch it on at our end.</strong> Tell us the address and we do it — it takes a couple of minutes and it cannot be done from here.</li>
              <li>You point the address at us with your domain company (a CNAME record). Then press <strong>Check it</strong>.</li>
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
