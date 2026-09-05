// Plans — what a detailer offers on a rhythm, and who is on one.
// Roadmap 2.14, the owner's ask of 2026-08-31 and his own decision of
// 2026-09-04 after four rounds of research (docs/plans-research-2026-09-04.md).
//
//   > "we need a way for the detailer within the app to log this customer as a
//   > monthly plan, and they could set all the settings — if it's weekly,
//   > biweekly, monthly, which tier it is, or if it's a percent discount, if
//   > it's a bundle."
//
// THE PLAN IS LOGGED, NEVER SOLD. We take no money, so there is no card on
// this screen, no charge, no renewal and no word implying one. The detailer
// agrees the price and the dates with their customer off the product; this
// remembers what was agreed and says who is owed a visit.
//
// ONE LIST OF MEMBERS, NOT TWO. The research's most valuable finding was
// Housecall Pro's "Unscheduled Visits" — who is owed a visit nobody has
// booked — and the obvious build is a second list at the top of the screen.
// It is the SAME PEOPLE, so it is the Clients screen's shape instead: one
// list, a count in the label, and a chip that cuts it down. That is a pattern
// this product already has and a detailer has already learned, and two lists
// of the same rows is where the two go out of step.
//
// THE ARITHMETIC IS NOT IN HERE — `lib/plans.js`, with `tests/plans.test.mjs`
// on it. Same reason as `client-list.js`: the owed figure is the one number
// this feature exists to print, and a number computed inside a component is a
// number nothing can check.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { dateLong, money, todayLocal } from "../../lib/format.js";
import {
  STATUS_WORDS, cadenceWords, ledgerFor, priceWords, visitWords, visitsOwed,
} from "../../lib/plans.js";
import { MoneyField, Segmented, Setting, Stepper, Switch } from "../../components/controls.jsx";

const PRICE_KINDS = [["monthly", "$ a month"], ["per_visit", "$ a visit"], ["percent_off", "% off"]];
const UNITS = [["week", "weeks"], ["month", "months"], ["year", "years"]];
const STATUSES = [["active", "Active"], ["paused", "Paused"], ["ended", "Ended"]];
// The status pills reuse the three the product already paints, so no new
// vocabulary and no new colour: law 11b — the accent is identity, never
// meaning — is why "Active" is not the accent-tinted `.completed` pill.
const PILL = { active: "confirmed", paused: "pending", ended: "waived" };

const BLANK_PLAN = {
  name: "", description: "", repeats: true, cadence_count: 1, cadence_unit: "month",
  visits_per_period: 1, price_kind: "monthly", price_amount: "", term_months: "",
  is_active: true,
};

const planToForm = (p) => ({
  name: p.name ?? "",
  description: p.description ?? "",
  repeats: !!p.cadence_unit,
  cadence_count: p.cadence_count ?? 1,
  cadence_unit: p.cadence_unit ?? "month",
  visits_per_period: p.visits_per_period ?? 1,
  price_kind: p.price_kind,
  price_amount: String(p.price_amount ?? ""),
  term_months: p.term_months == null ? "" : String(p.term_months),
  is_active: p.is_active,
});

export default function Plans() {
  const { business, can } = useBusiness();
  // Logging a member records what somebody pays, so the database gates it on
  // the same tick that hides lifetime spend on Clients. A role that can read
  // this screen but not write it gets the lists and no forms — rather than
  // forms whose save the database will refuse.
  const mayWrite = can("money");
  const maySetPlans = can("settings");
  const today = todayLocal(business.timezone);

  const [plans, setPlans] = useState([]);
  const [members, setMembers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState(null);
  // "NO PLANS YET" MUST NOT BE PAINTED BEFORE THE ANSWER ARRIVES. Caught by
  // screenshotting at 1440 rather than by any check: the first render has
  // empty arrays, so a detailer with three plans meets "No plans yet. Most
  // detailers start with one…" for as long as the read takes. It is the
  // "a failed read must not look like an empty business" rule one state
  // earlier — the same sentence is equally untrue while loading.
  const [loaded, setLoaded] = useState(false);

  const [editPlan, setEditPlan] = useState(null);      // plan id, or "new"
  const [planForm, setPlanForm] = useState(BLANK_PLAN);
  const [editMember, setEditMember] = useState(null);  // member id, or "new"
  const [memberForm, setMemberForm] = useState(null);
  const [owedOnly, setOwedOnly] = useState(false);

  const load = useCallback(async () => {
    const [p, m, c, v, b] = await Promise.all([
      supabase.from("plans").select("*").eq("business_id", business.id).order("sort_order").order("name"),
      supabase.from("plan_members").select("*").eq("business_id", business.id).order("created_at", { ascending: false }),
      supabase.from("customers").select("id,name,phone").eq("business_id", business.id).order("name"),
      supabase.from("plan_visits").select("member_id,kind,delta,due_on,note").eq("business_id", business.id),
      // Only the linked ones. The used half of the ledger is a count of these
      // (lib/plans.js), so the read is the whole business's and the filtering
      // is done once, in the file the test can reach.
      supabase.from("bookings").select("id,plan_member_id,status,deleted_at,start_at")
        .eq("business_id", business.id).not("plan_member_id", "is", null),
    ]);
    // A FAILED READ MUST NOT LOOK LIKE A BUSINESS WITH NO PLANS — the fourth
    // site of this defect in the dashboard (useBookings, Money, Clients).
    const failed = p.error || m.error || c.error || v.error || b.error;
    setError(failed ? (failed.message || "Could not load your plans.") : "");
    if (p.data) setPlans(p.data);
    if (m.data) setMembers(m.data);
    if (c.data) setCustomers(c.data);
    if (v.data) setVisits(v.data);
    if (b.data) setBookings(b.data);
    setLoaded(true);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const plansById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
  const custById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const owed = useMemo(
    () => visitsOwed(members, plansById, visits, bookings),
    [members, plansById, visits, bookings],
  );
  const owedIds = useMemo(() => new Set(owed.map((r) => r.member.id)), [owed]);
  const shown = owedOnly ? members.filter((m) => owedIds.has(m.id)) : members;
  const memberCount = (planId) => members.filter((m) => m.plan_id === planId && m.status !== "ended").length;

  // --- writes ---------------------------------------------------------------

  const savePlan = async () => {
    if (!planForm.name.trim()) return;
    setMsg(null);
    const row = {
      business_id: business.id,
      name: planForm.name.trim(),
      description: planForm.description.trim() || null,
      cadence_count: planForm.repeats ? Number(planForm.cadence_count) || 1 : null,
      cadence_unit: planForm.repeats ? planForm.cadence_unit : null,
      visits_per_period: planForm.repeats ? Number(planForm.visits_per_period) || 1 : 1,
      price_kind: planForm.price_kind,
      price_amount: Number(planForm.price_amount) || 0,
      term_months: planForm.term_months === "" ? null : Number(planForm.term_months),
      is_active: planForm.is_active,
    };
    const { error: e } = editPlan === "new"
      ? await supabase.from("plans").insert({ ...row, sort_order: plans.length })
      : await supabase.from("plans").update(row).eq("id", editPlan).eq("business_id", business.id);
    setMsg(e ? { ok: false, text: e.message } : { ok: true, text: "Plan saved." });
    if (!e) { setEditPlan(null); load(); }
  };

  const saveMember = async () => {
    const f = memberForm;
    if (!f?.customer_id || !f?.plan_id) return;
    setMsg(null);
    if (editMember === "new") {
      const { error: e } = await supabase.from("plan_members").insert({
        business_id: business.id,
        plan_id: f.plan_id,
        customer_id: f.customer_id,
        started_on: f.started_on,
        // ACCRUAL STARTS THE DAY THEY JOINED, not today: a detailer logging
        // somebody who has been on the plan since June should see June's
        // visits owed, which is the whole reason the ledger exists.
        accrue_from: f.started_on,
        price_kind: f.price_kind,
        price_amount: Number(f.price_amount) || 0,
        notes: f.notes || null,
      });
      setMsg(e
        ? { ok: false, text: /plan_members_one_live/.test(e.message)
          ? "That customer is already on a plan. End the old one first." : e.message }
        : { ok: true, text: "Member logged." });
      if (!e) { setEditMember(null); load(); }
      return;
    }
    const was = members.find((m) => m.id === editMember);
    const patch = {
      plan_id: f.plan_id,
      status: f.status,
      started_on: f.started_on,
      price_kind: f.price_kind,
      price_amount: Number(f.price_amount) || 0,
      notes: f.notes || null,
      ended_on: f.status === "ended" ? (was?.ended_on ?? today) : null,
    };
    // COMING BACK FROM A PAUSE MOVES THE ACCRUAL LINE, and that is the whole
    // point of pausing. Without it the sweep backfills every visit the pause
    // was meant to skip the moment they return — the opposite of what the
    // customer asked for. Nothing else touches `accrue_from`.
    if (was?.status !== "active" && f.status === "active") patch.accrue_from = today;
    const { error: e } = await supabase.from("plan_members").update(patch)
      .eq("id", editMember).eq("business_id", business.id);
    setMsg(e ? { ok: false, text: e.message } : { ok: true, text: "Saved." });
    if (!e) { setEditMember(null); load(); }
  };

  // A skip and a goodwill visit are the same write with the sign flipped. The
  // ledger is append-only — nothing here edits a grant — which is what makes
  // it something a charge could be posted against later.
  const adjust = async (member, delta, note) => {
    setMsg(null);
    const { error: e } = await supabase.from("plan_visits").insert({
      business_id: business.id, member_id: member.id, kind: "adjusted",
      delta, due_on: today, note,
    });
    setMsg(e ? { ok: false, text: e.message } : { ok: true, text: delta < 0 ? "Visit skipped." : "Visit added." });
    if (!e) load();
  };

  // --- render ---------------------------------------------------------------

  const planEditor = (
    <div className="thoughts">
      <label className="field"><span>Name</span>
        <input value={planForm.name} maxLength={60} placeholder="Every-other-week wash"
          onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} /></label>
      <label className="field"><span>What's included</span>
        <textarea value={planForm.description} rows={3}
          placeholder="Exterior wash, wheels, glass and a quick interior wipe-down."
          onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} /></label>

      {/* A PLAN WITHOUT A RHYTHM IS A REAL PLAN — a member rate with no
          schedule (the research found two of them). It is a switch rather
          than a "none" option in the interval, because the two questions
          underneath it disappear with it. */}
      <Switch label="Repeats on a schedule" checked={planForm.repeats}
        help={planForm.repeats ? undefined : "A member rate with no set visits — they book when they like."}
        onChange={(v) => setPlanForm({ ...planForm, repeats: v })} />
      {planForm.repeats && (
        <>
          <Setting stacked label="How often"
            help="Counted from the day each member joined.">
            {/* WRAPS, AND THE NUMBER KEEPS A FIXED WIDTH. At 320 the flex row
                squeezed this box to about 40px and its own digit disappeared
                behind the padding — a control that shows nothing at all, on
                the width PRODUCT.md promises. `flex: 0 0` plus a wrapping row
                is theme.css's own 320 floor answer: paired controls stack
                rather than shrink. */}
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <input type="number" inputMode="numeric" min={1} max={52}
                style={{ flex: "0 0 76px", width: 76 }}
                aria-label="How many" value={planForm.cadence_count}
                onChange={(e) => setPlanForm({ ...planForm, cadence_count: e.target.value })} />
              <Segmented label="Weeks, months or years" value={planForm.cadence_unit} options={UNITS}
                onChange={(v) => setPlanForm({ ...planForm, cadence_unit: v })} />
            </div>
          </Setting>
          <Setting label="Visits each time"
            help="More than one is a bundle — two washes a month, say.">
            <Stepper value={planForm.visits_per_period} min={1} max={10}
              onChange={(v) => setPlanForm({ ...planForm, visits_per_period: v })} />
          </Setting>
        </>
      )}

      {/* ALL THREE SHAPES ARE IN THE SAMPLE and forcing one would exclude real
          businesses — a monthly amount, a per-visit amount, and a member rate
          expressed as a percentage. */}
      <Setting stacked label="How it's priced">
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Segmented label="Price shape" value={planForm.price_kind} options={PRICE_KINDS}
            onChange={(v) => setPlanForm({ ...planForm, price_kind: v })} />
          {planForm.price_kind === "percent_off" ? (
            <input type="number" inputMode="numeric" min={0} max={100}
              style={{ flex: "0 0 90px", width: 90 }}
              aria-label="Percent off" value={planForm.price_amount}
              onChange={(e) => setPlanForm({ ...planForm, price_amount: e.target.value })} />
          ) : (
            <MoneyField value={planForm.price_amount}
              onChange={(v) => setPlanForm({ ...planForm, price_amount: v })} />
          )}
        </div>
      </Setting>

      {/* A SWITCH, NOT A HIDE BUTTON. Roadmap 2.14 step 3 puts the active
          plans on the booking page, so this control's real subject is what a
          customer meets — and saying that is more use than "Hide", which does
          not say hidden from what. A plan somebody is on is never deleted;
          the schema refuses it (`on delete no action`). */}
      <Switch label="Offered on your booking page" checked={planForm.is_active}
        help="Turn it off to stop new sign-ups. Anyone already on it stays on it."
        onChange={(v) => setPlanForm({ ...planForm, is_active: v })} />

      <Setting stacked label="Minimum term"
        help="Leave blank for none. Most detailers advertise cancel-anytime as a selling point.">
        <input type="number" inputMode="numeric" min={1} style={{ maxWidth: 120 }}
          placeholder="No term" value={planForm.term_months}
          onChange={(e) => setPlanForm({ ...planForm, term_months: e.target.value })} />
      </Setting>

      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary inline" onClick={savePlan}>Save plan</button>
        <button className="btn ghost inline" onClick={() => setEditPlan(null)}>Cancel</button>
      </div>
    </div>
  );

  const memberEditor = (m) => {
    const f = memberForm;
    if (!f) return null;
    const l = m ? ledgerFor(m, plansById.get(m.plan_id), visits, bookings) : null;
    const who = m ? custById.get(m.customer_id) : null;
    return (
      <div className="thoughts">
        {/* WHO THIS IS ABOUT. The customer picker below only exists while
            logging somebody NEW, so without this the editor for an existing
            member is five controls about a person it never names — caught by
            looking at it at 1920, not by any check in the repo. */}
        {who && (
          <div>
            <strong>{who.name}</strong>
            <div className="muted">{who.phone}</div>
          </div>
        )}
        {/* A NATIVE DROP-DOWN, DELIBERATELY. The design system's rule is that
            three choices are a segmented control; a customer list is two
            hundred, and the platform's own picker is better than anything
            drawn here. */}
        {!m && (
          <label className="field"><span>Customer</span>
            <select value={f.customer_id} onChange={(e) => setMemberForm({ ...f, customer_id: e.target.value })}>
              <option value="">Choose someone…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
            </select></label>
        )}
        <label className="field"><span>Plan</span>
          <select value={f.plan_id} onChange={(e) => {
            const p = plansById.get(e.target.value);
            // The price follows the plan when the plan changes, and stays
            // editable: it is SNAPSHOTTED on the member, so a detailer raising
            // the plan price later never raises it for this person.
            setMemberForm({
              ...f, plan_id: e.target.value,
              price_kind: p?.price_kind ?? f.price_kind,
              price_amount: String(p?.price_amount ?? f.price_amount),
            });
          }}>
            <option value="">Choose a plan…</option>
            {plans.filter((p) => p.is_active || p.id === f.plan_id)
              .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></label>

        {m && (
          <Setting stacked label="Status"
            help="Pausing stops the visits counting up. Coming back starts again from today — the paused ones are not owed.">
            <Segmented label="Status" value={f.status} options={STATUSES}
              onChange={(v) => setMemberForm({ ...f, status: v })} />
          </Setting>
        )}

        <div className="grid2">
          <label className="field"><span>Member since</span>
            <input type="date" value={f.started_on}
              onChange={(e) => setMemberForm({ ...f, started_on: e.target.value })} /></label>
          <label className="field"><span>What they pay</span>
            {f.price_kind === "percent_off" ? (
              <input type="number" inputMode="numeric" min={0} max={100} value={f.price_amount}
                onChange={(e) => setMemberForm({ ...f, price_amount: e.target.value })} />
            ) : (
              <MoneyField value={f.price_amount}
                onChange={(v) => setMemberForm({ ...f, price_amount: v })} />
            )}</label>
        </div>

        <label className="field"><span>Notes</span>
          <textarea value={f.notes} rows={2} placeholder="Agreed on the phone, first Tuesday of the month."
            onChange={(e) => setMemberForm({ ...f, notes: e.target.value })} /></label>

        {m && (
          <div className="tight">
            <span className="label">Visits</span>
            <div className="ledger two">
              <div><span className="figure">{l.used}</span><span className="lbl">taken</span></div>
              <div><span className="figure">{l.owed}</span><span className="lbl">owed</span></div>
            </div>
            {/* A SKIP IS THE TRADE'S OWN ANTI-BREAKAGE TOOL, not a penalty:
                ZS Clean sells "one free skip per year" and Tang lets you
                pause while you travel. Six of ten sampled detailers advertise
                against contracts. */}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn ghost inline" onClick={() => adjust(m, -1, "Skipped")}>Skip a visit</button>
              <button className="btn ghost inline" onClick={() => adjust(m, 1, "Added by hand")}>Add a visit</button>
            </div>
          </div>
        )}

        <div className="row" style={{ gap: 8 }}>
          <button className="btn primary inline" onClick={saveMember}>{m ? "Save" : "Log this member"}</button>
          <button className="btn ghost inline" onClick={() => setEditMember(null)}>Cancel</button>
        </div>
      </div>
    );
  };

  // A PLAN ROW AND A MEMBER ROW ARE BOTH RULED ROWS, NOT CARDS, and that is a
  // decision `composition`'s card rule made for the right reason. A card is
  // for a small set of objects you act on one at a time; a member list grows
  // with the business, and eight bordered cards fill a phone where rows fit
  // three times as many. It is the Clients grammar exactly — name, a two-part
  // subtitle, and the figure you came to check — so nothing new is invented
  // and `.rows.cols` is reused rather than re-styled.
  //
  // AND THE EDITOR REPLACES THE LIST rather than opening inside a row. There
  // is only ever one open, which is what SettingsHost's own header argues for
  // ("reached one at a time"), and it means no card is ever mapped over.
  const planRow = (p) => {
    const Tag = maySetPlans ? "button" : "div";
    return (
      <Tag key={p.id} className="row-item" style={{ opacity: p.is_active ? 1 : 0.5 }}
        onClick={maySetPlans ? () => { setPlanForm(planToForm(p)); setEditPlan(p.id); } : undefined}
        aria-label={`${p.name}, ${cadenceWords(p)}, ${priceWords(p.price_kind, p.price_amount, money)}, ${memberCount(p.id)} members`}>
        <span className="c-who nm">{p.name}</span>
        <span className="c-sub">
          <span className="c-date">{cadenceWords(p)}</span>
          {/* A BARE NUMBER IN THE FIGURE COLUMN SAID NOTHING. It was the
              member count, sitting where the member rows below print money,
              so two lists on one screen used the same column for two things.
              The price is what both lists are scanned for; the count is a
              word in the subtitle, where it can say what it counts. */}
          <span className="c-what">
            {p.cadence_unit && p.visits_per_period > 1 ? `${visitWords(p)} each time · ` : ""}
            {memberCount(p.id) === 0 ? "nobody on it"
              : `${memberCount(p.id)} ${memberCount(p.id) === 1 ? "member" : "members"}`}
            {p.is_active ? "" : " · hidden"}
          </span>
        </span>
        <span className="c-total figure sm">{priceWords(p.price_kind, p.price_amount, money)}</span>
      </Tag>
    );
  };

  const memberRow = (m) => {
    const c = custById.get(m.customer_id);
    const pl = plansById.get(m.plan_id);
    const l = ledgerFor(m, pl, visits, bookings);
    // WHAT THE SECOND CELL SAYS IS THE WHOLE POINT OF THE SCREEN: a visit
    // owed and unbooked outranks a date, because it is the thing to act on.
    const when = m.status !== "active" ? STATUS_WORDS[m.status]
      : l.owed > 0 ? `${l.owed} ${l.owed === 1 ? "visit" : "visits"} owed`
        : l.nextDue ? `Next due ${dateLong(l.nextDue)}`
          : "No set schedule";
    const Tag = mayWrite ? "button" : "div";
    return (
      <Tag key={m.id} className="row-item"
        onClick={mayWrite ? () => {
          setMemberForm({
            customer_id: m.customer_id, plan_id: m.plan_id, status: m.status,
            started_on: m.started_on, price_kind: m.price_kind,
            price_amount: String(m.price_amount ?? ""), notes: m.notes ?? "",
          });
          setEditMember(m.id);
        } : undefined}
        aria-label={`${c?.name ?? "Customer"}, ${pl?.name ?? "plan"}, ${when}`}>
        <span className="c-who nm">{c?.name ?? "Customer"}</span>
        <span className="c-sub">
          <span className="c-date">{pl?.name ?? "Plan"}</span>
          <span className="c-what">{when}</span>
        </span>
        <span className="c-total figure sm">
          {priceWords(m.price_kind, m.price_amount, money)}
        </span>
      </Tag>
    );
  };

  return (
    <div>
      {error && <div className="error-box">{error}</div>}

      <div className="section-title" style={{ marginTop: 0 }}>Your plans</div>
      <p className="muted" style={{ marginBottom: 8 }}>
        What you offer on a rhythm. You agree the price and the dates with the customer
        yourself — this remembers them and tells you who is owed a visit.
      </p>
      {/* THE LIST AND THE EDITOR ARE ONE FRAME WITH ITS CONTENTS REPLACED,
          which is the owner's own third kind of motion: "the GUI kind of
          doesn't really change, but the actual text inside of it changes."
          `.swap` is a marker plus a React key and carries no animation of its
          own — the parts arrive on their own 20ms beats. */}
      {/* `swap tight` RATHER THAN A `.tight` INSIDE THE SWAP, and it is the
          difference between one beat and six. `.swap > *` is what staggers, so
          a single wrapper child makes the whole list arrive as one plane —
          which is exactly the uniform movement the owner rejected on sight
          ("it just looks like a page refresh"). The class carries the gap; the
          parts stay direct children. */}
      <div className="swap tight" key={editPlan ?? "plan-list"}>
        {editPlan ? <div className="card">{planEditor}</div> : (
          <>
            {loaded && plans.length === 0 && (
              <p className="body">
                No plans yet. Most detailers start with one — a wash every other week, or a
                monthly rate.
              </p>
            )}
            {plans.length > 0 && <div className="rows cols">{plans.map(planRow)}</div>}
            {loaded && maySetPlans && (
              <button className="btn inline" onClick={() => { setPlanForm(BLANK_PLAN); setEditPlan("new"); }}>
                Add a plan
              </button>
            )}
          </>
        )}
      </div>

      <div className="section-title">Members</div>
      <p className="muted" style={{ marginBottom: 8 }}>
        Who is on a plan, and who is owed a visit nobody has booked yet.
      </p>
      <div className="swap tight" key={editMember ?? (owedOnly ? "owed" : "member-list")}>
        {editMember ? (
          <div className="card">{memberEditor(members.find((m) => m.id === editMember) ?? null)}</div>
        ) : (
          <>
            {/* THE COUNT AND THE CHIP ARE ONE FACT, the Clients screen's own
                shape. A control that cannot change anything is noise, so the
                chip is absent when nobody is owed a visit. */}
            {owed.length > 0 && (
              <div className="chiprow wrap">
                <button className={`chip${owedOnly ? " active" : ""}`} aria-pressed={owedOnly}
                  onClick={() => setOwedOnly((v) => !v)}>
                  Owed a visit · {owed.length}
                </button>
              </div>
            )}
            {loaded && members.length === 0 && (
              <p className="body">
                {plans.length === 0
                  ? "Add a plan first, then log the customers who are on it."
                  : "Nobody logged yet."}
              </p>
            )}
            {shown.length > 0 && <div className="rows cols">{shown.map(memberRow)}</div>}
            {loaded && owedOnly && shown.length === 0 && <p className="body">Nobody is waiting on a visit.</p>}
            {mayWrite && plans.length > 0 && (
              <button className="btn inline" onClick={() => {
                const pl = plans.find((x) => x.is_active) ?? plans[0];
                setMemberForm({
                  customer_id: "", plan_id: pl?.id ?? "", status: "active", started_on: today,
                  price_kind: pl?.price_kind ?? "monthly",
                  price_amount: String(pl?.price_amount ?? ""), notes: "",
                });
                setEditMember("new");
              }}>Log a member</button>
            )}
          </>
        )}
      </div>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
    </div>
  );
}
