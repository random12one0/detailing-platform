// Services & add-ons — the detailer's whole catalogue.
//
// Flat services, as many as they want, named anything. Services are
// DEACTIVATED, never deleted (bookings reference them).
//
// ROADMAP 2.8b put four of its five items in this one screen, because four of
// them are the same sentence: what shape is a detailer's menu?
//   W25  CATEGORIES, with the selection rule ON THE CATEGORY — his "one per
//        category". A real table, so a retyped label cannot silently become a
//        second category with no rule.
//   W10  REORDERING for services and add-ons. `sort_order` has existed since
//        the foundation and nothing ever wrote it.
//   W21  the what's-included editor. It ships AFTER the booking page's
//        disclosure and never before — see StepServices.jsx.
//   W9   "from $220", and the vehicle sizes becoming the detailer's own list
//        rather than our fixed small/medium/large.
// The research and the owner's answers behind all four:
// docs/detailer-research-2026-08-31.md.

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { money } from "../../lib/format.js";
import Sheet from "../../components/Sheet.jsx";
import { Segmented, Setting, Switch } from "../../components/controls.jsx";

// Today's three, and the fallback for a business whose settings row predates
// the column. Defined once here and once in the migration's DEFAULT; they say
// the same thing because they are the same list.
const DEFAULT_SIZES = [
  { key: "small", label: "Small", examples: "Coupe, sedan, hatchback" },
  { key: "medium", label: "Medium", examples: "Small SUV, crossover, wagon" },
  { key: "large", label: "Large", examples: "Truck, large SUV, van" },
];
// Measured against the running booking page at 392x844 AND 1440x900: with
// four sizes the vehicle step has 39px and 23px of room, with five it is 40px
// and 66px over. StepVehicle switches to a drop-down past this rather than
// overflowing, so a longer list is supported — it just stops being boxes.
// Keep this number and StepVehicle's in step; they are the same measurement.
const SIZE_CARD_CEILING = 4;

const EMPTY_SVC = {
  name: "", description: "", features: "", price: "", price_is_from: false,
  duration_minutes: "60", group_id: "", is_active: true, adj: {},
  // Roadmap 2.8c — per-service availability. "either" and null are what every
  // service has meant since the foundation.
  where: "either", weekdays: null,
};
// 0 = Sunday, matching business_hours.weekday and JavaScript's getDay().
const DOW = [["S", 0], ["M", 1], ["T", 2], ["W", 3], ["T", 4], ["F", 5], ["S", 6]];
const EMPTY_ADDON = { name: "", description: "", price: "", duration_minutes: "0", is_active: true };
const EMPTY_GROUP = { name: "", max_select: "1", is_exclusive: false, description: "" };
const TITLE = { service: "service", addon: "add-on", group: "category", size: "vehicle size" };

// features is jsonb — an array of strings in the database, one per line in the
// box. Blank lines are dropped rather than stored, so a stray Enter does not
// become an empty bullet on the booking page.
const linesToFeatures = (text) => {
  const out = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return out.length ? out : null;
};
const featuresToLines = (v) => (Array.isArray(v) ? v.join("\n") : "");

const slugKey = (label, taken) => {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "size";
  let k = base;
  for (let n = 2; taken.includes(k); n++) k = `${base}-${n}`;
  return k;
};

export default function Catalog() {
  const { business, settings, reload } = useBusiness();
  const [groups, setGroups] = useState([]);
  const [services, setServices] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [editing, setEditing] = useState(null); // {kind, id?, form}
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const v = settings?.vehicle_sizes;
    setSizes(Array.isArray(v) && v.length ? v : DEFAULT_SIZES);
  }, [settings]);

  const load = useCallback(async () => {
    const [g, s, a] = await Promise.all([
      supabase.from("service_groups").select("*").eq("business_id", business.id).order("sort_order").order("name"),
      supabase.from("services").select("*").eq("business_id", business.id).order("sort_order").order("name"),
      supabase.from("add_ons").select("*").eq("business_id", business.id).order("sort_order").order("name"),
    ]);
    setGroups(g.data ?? []);
    setServices(s.data ?? []);
    setAddOns(a.data ?? []);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  // ── Reordering (W10) ────────────────────────────────────────────────────
  // His words: "if they could add, like, groups maybe… or maybe you could
  // reorder stuff." The research settled which: real add-on lists run 3–9
  // items and not one of the five detailer menus studied subdivides them. A
  // list of nine does not need categories, it needs to be in the order the
  // detailer sells it in. (Services DO group in the wild — that is the
  // category system above, a different mechanism for a different list.)
  const TABLES = { group: "service_groups", service: "services", addon: "add_ons" };
  const LISTS = { group: [groups, setGroups], service: [services, setServices], addon: [addOns, setAddOns] };

  const move = async (kind, index, delta) => {
    const [list, setList] = LISTS[kind];
    const to = index + delta;
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    [next[index], next[to]] = [next[to], next[index]];
    setList(next);   // optimistic: the row moves under the thumb, not a round trip later
    // Renumber the whole list rather than swapping two values. Every row a
    // detailer has ever added by hand carries the column's default of 0, so on
    // a list that has never been ordered a swap is a no-op and the arrow does
    // nothing at all.
    await Promise.all(
      next
        .map((row, i) => (row.sort_order === i
          ? null
          : supabase.from(TABLES[kind]).update({ sort_order: i }).eq("id", row.id).eq("business_id", business.id)))
        .filter(Boolean),
    );
    load();
  };

  const Reorder = ({ kind, index, length }) => (
    <>
      <button className="btn sm inline icon" aria-label="Move up" disabled={index === 0}
        onClick={(e) => { e.stopPropagation(); move(kind, index, -1); }}><ChevronUp strokeWidth={2} /></button>
      <button className="btn sm inline icon" aria-label="Move down" disabled={index === length - 1}
        onClick={(e) => { e.stopPropagation(); move(kind, index, 1); }}><ChevronDown strokeWidth={2} /></button>
    </>
  );

  // ── Editors ─────────────────────────────────────────────────────────────
  const set = (patch) => setEditing((e) => ({ ...e, form: { ...e.form, ...patch } }));

  const openService = (svc) =>
    setEditing({
      kind: "service",
      id: svc?.id,
      form: svc
        ? {
          name: svc.name, description: svc.description || "",
          features: featuresToLines(svc.features),
          price: String(svc.price), price_is_from: !!svc.price_is_from,
          duration_minutes: String(svc.duration_minutes),
          group_id: svc.group_id || "", is_active: svc.is_active,
          adj: svc.vehicle_size_adjustments || {},
          where: svc.allows_mobile === false ? "dropoff" : svc.allows_dropoff === false ? "mobile" : "either",
          weekdays: Array.isArray(svc.available_weekdays) ? svc.available_weekdays : null,
        }
        : { ...EMPTY_SVC, adj: {} },
    });

  const saveService = async () => {
    const f = editing.form;
    // group_label is written ALONGSIDE group_id, not instead of it. Nothing
    // reads it in preference any more, but every deployed edge function and
    // every existing row still carries it, and the migration is append-only.
    const group = groups.find((g) => g.id === f.group_id) || null;
    const adjustments = {};
    sizes.forEach((s, i) => {
      adjustments[s.key] = i === 0
        ? { price: 0, duration_minutes: 0 }
        : {
          price: Number(f.adj?.[s.key]?.price) || 0,
          duration_minutes: Number(f.adj?.[s.key]?.duration_minutes) || 0,
        };
    });
    const payload = {
      business_id: business.id,
      name: f.name.trim(),
      description: f.description.trim() || null,
      features: linesToFeatures(f.features),
      price: Number(f.price) || 0,
      price_is_from: f.price_is_from,
      duration_minutes: Number(f.duration_minutes) || 60,
      group_id: f.group_id || null,
      group_label: group ? group.name : null,
      is_active: f.is_active,
      // A three-way choice, so "neither" — which would make the service
      // unbookable — cannot be expressed. The database has the same CHECK.
      allows_mobile: f.where !== "dropoff",
      allows_dropoff: f.where !== "mobile",
      // An empty list means "no days", which is not what anyone means by
      // ticking nothing; null is "any day the business is open".
      available_weekdays: Array.isArray(f.weekdays) && f.weekdays.length ? f.weekdays : null,
      vehicle_size_adjustments: adjustments,
    };
    const q = editing.id
      ? supabase.from("services").update(payload).eq("id", editing.id).eq("business_id", business.id)
      : supabase.from("services").insert(payload);
    const { error } = await q;
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) setEditing(null);
    load();
  };

  const saveAddOn = async () => {
    const f = editing.form;
    const payload = {
      business_id: business.id,
      name: f.name.trim(),
      description: f.description.trim() || null,
      price: Number(f.price) || 0,
      duration_minutes: Number(f.duration_minutes) || 0,
      is_active: f.is_active,
    };
    const q = editing.id
      ? supabase.from("add_ons").update(payload).eq("id", editing.id).eq("business_id", business.id)
      : supabase.from("add_ons").insert(payload);
    const { error } = await q;
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) setEditing(null);
    load();
  };

  const saveGroup = async () => {
    const f = editing.form;
    const payload = {
      business_id: business.id,
      name: f.name.trim(),
      // "Just one" is max_select 1; "Any number" is NULL, which is how the
      // column says unlimited. An integer rather than a boolean so "up to two"
      // never needs a second migration.
      max_select: f.max_select === "any" ? null : 1,
      is_exclusive: f.is_exclusive,
      description: f.description.trim() || null,
      sort_order: editing.id ? undefined : groups.length,
    };
    if (payload.sort_order === undefined) delete payload.sort_order;
    const q = editing.id
      ? supabase.from("service_groups").update(payload).eq("id", editing.id).eq("business_id", business.id)
      : supabase.from("service_groups").insert(payload);
    const { error } = await q;
    setMsg(error
      ? { ok: false, text: error.code === "23505" ? "You already have a category with that name." : error.message }
      : { ok: true, text: "Saved." });
    if (!error) setEditing(null);
    load();
  };

  // A category is the only thing here that can be DELETED rather than
  // deactivated, and it is safe because no booking references one: the FK on
  // services.group_id is `on delete set null`, so its services fall back to an
  // ungrouped list instead of disappearing. Without this a mistyped category
  // would be a permanent heading on a live booking page.
  const deleteGroup = async () => {
    const inUse = services.filter((s) => s.group_id === editing.id).length;
    if (inUse && !confirm(
      `${inUse} service${inUse === 1 ? "" : "s"} ${inUse === 1 ? "is" : "are"} in this category. `
      + "Deleting it keeps them — they just stop being grouped. Continue?")) return;
    const { error } = await supabase.from("service_groups").delete()
      .eq("id", editing.id).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Category deleted." });
    if (!error) setEditing(null);
    load();
  };

  // ── Vehicle sizes (W9) ──────────────────────────────────────────────────
  // The KEY never changes once created: it is the jsonb key every service's
  // price adjustment hangs off AND the value stored on every past booking.
  // Renaming edits the label only, which is why bookings snapshot the label
  // at booking time.
  const saveSizes = async (next) => {
    setSizes(next);
    const { error } = await supabase.from("business_settings")
      .update({ vehicle_sizes: next }).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Vehicle sizes saved." });
    if (!error) reload();
  };
  const saveSize = async () => {
    const f = editing.form;
    const label = f.label.trim();
    if (!label) return;
    // Two sizes may not share a NAME. Their keys would differ, so nothing
    // breaks in the data — but the booking page would draw two identical
    // cards, which is a broken-looking page rather than a broken one.
    if (sizes.some((z, i) => i !== editing.index && z.label.toLowerCase() === label.toLowerCase())) {
      setMsg({ ok: false, text: `You already have a size called "${label}".` });
      return;
    }
    const next = [...sizes];
    if (editing.index == null) {
      next.push({ key: slugKey(label, sizes.map((s) => s.key)), label, examples: f.examples.trim() });
    } else {
      next[editing.index] = { ...next[editing.index], label, examples: f.examples.trim() };
    }
    setEditing(null);
    await saveSizes(next);
  };
  const removeSize = (i) => {
    if (sizes.length <= 1) return;
    if (!confirm(`Remove "${sizes[i].label}"? Bookings already taken keep the size they were booked at.`)) return;
    saveSizes(sizes.filter((_, n) => n !== i));
  };
  const moveSize = (i, d) => {
    const to = i + d;
    if (to < 0 || to >= sizes.length) return;
    const next = [...sizes];
    [next[i], next[to]] = [next[to], next[i]];
    saveSizes(next);
  };

  const groupRule = (g) => (g.is_exclusive
    ? "Booked on its own — nothing else can be added"
    : g.max_select === 1 ? "Customers pick one" : "Customers pick any number");

  return (
    // A plain container, not a .card: the services inside it ARE the cards,
    // and a card holding cards is boxes in boxes at one surface value.
    <div>
      {/* CATEGORIES FIRST, because they are what the services below sit in.
          W25, and the rule lives here rather than on the business: his own
          menu is Interior (one), Exterior (one) and add-ons (several), which
          one business-wide switch cannot express. */}
      <div className="row between">
        <h3>Categories</h3>
        <button className="btn inline" onClick={() => setEditing({ kind: "group", form: { ...EMPTY_GROUP } })}>+ Add</button>
      </div>
      <p className="muted" style={{ marginBottom: "var(--sp-3)" }}>
        Optional. A category groups services on your booking page and decides
        whether a customer picks one of them or as many as they like.
      </p>
      <div className="tight">
        {groups.map((g, i) => (
          <div className="card row between" key={g.id}>
            <div className="tappable" onClick={() => setEditing({ kind: "group", id: g.id, form: { name: g.name, max_select: g.max_select === 1 ? "1" : "any", is_exclusive: !!g.is_exclusive, description: g.description || "" } })}
              style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
              <strong>{g.name}</strong>
              <div className="muted">{groupRule(g)}</div>
            </div>
            <Reorder kind="group" index={i} length={groups.length} />
          </div>
        ))}
      </div>
      {groups.length === 0 && <p className="muted">No categories — every service shows in one plain list.</p>}

      <div className="row between" style={{ marginTop: "var(--sp-5)" }}>
        <h3>Services</h3>
        <button className="btn inline" onClick={() => openService(null)}>+ Add</button>
      </div>
      <div className="tight">
      {services.map((s, i) => (
        <div className="card row between" key={s.id} style={{ opacity: s.is_active ? 1 : 0.5 }}>
          <div className="tappable" onClick={() => openService(s)} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
            <strong>{s.name}</strong>
            <div className="muted">
              {s.price_is_from ? "from " : ""}{money(s.price)} · {s.duration_minutes} min
              {s.group_label ? ` · ${s.group_label}` : ""}
            </div>
          </div>
          <Reorder kind="service" index={i} length={services.length} />
        </div>
      ))}
      </div>
      {services.length === 0 && <p className="muted">No services yet — customers can't book until you add one.</p>}

      <div className="row between" style={{ marginTop: "var(--sp-5)" }}>
        <h3>Add-ons</h3>
        <button className="btn inline" onClick={() => setEditing({ kind: "addon", form: { ...EMPTY_ADDON } })}>+ Add</button>
      </div>
      <div className="tight">
      {addOns.map((a, i) => (
        <div className="card row between" key={a.id} style={{ opacity: a.is_active ? 1 : 0.5 }}>
          <div className="tappable" style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
            onClick={() => setEditing({ kind: "addon", id: a.id, form: { name: a.name, description: a.description || "", price: String(a.price), duration_minutes: String(a.duration_minutes), is_active: a.is_active } })}>
            <strong>{a.name}</strong>
            <div className="muted">{money(a.price)}{a.duration_minutes ? ` · +${a.duration_minutes} min` : ""}</div>
          </div>
          <Reorder kind="addon" index={i} length={addOns.length} />
        </div>
      ))}
      </div>

      {/* VEHICLE SIZES ARE THE DETAILER'S OWN LIST NOW (W9, his answer). They
          live in this screen rather than in Booking rules because they are the
          axis every service is priced along, and the per-service numbers are
          three lines further down the same sheet. */}
      <div className="row between" style={{ marginTop: "var(--sp-5)" }}>
        <h3>Vehicle sizes</h3>
        <button className="btn inline" onClick={() => setEditing({ kind: "size", form: { label: "", examples: "" } })}>+ Add</button>
      </div>
      <p className="muted" style={{ marginBottom: "var(--sp-3)" }}>
        The first one is your base price; each of the others can add money and
        time, per service.
      </p>
      <div className="tight">
        {sizes.map((s, i) => (
          <div className="card row between" key={s.key}>
            <div className="tappable" style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
              onClick={() => setEditing({ kind: "size", index: i, form: { label: s.label, examples: s.examples || "" } })}>
              <strong>{s.label}</strong>
              <div className="muted">{i === 0 ? "Base price" : s.examples || "Costs extra"}</div>
            </div>
            <button className="btn sm inline icon" aria-label="Move up" disabled={i === 0}
              onClick={() => moveSize(i, -1)}><ChevronUp strokeWidth={2} /></button>
            <button className="btn sm inline icon" aria-label="Move down" disabled={i === sizes.length - 1}
              onClick={() => moveSize(i, 1)}><ChevronDown strokeWidth={2} /></button>
            <button className="btn sm inline icon" aria-label={`Remove ${s.label}`} disabled={sizes.length <= 1}
              onClick={() => removeSize(i)}><X strokeWidth={2} /></button>
          </div>
        ))}
      </div>
      {sizes.length > SIZE_CARD_CEILING && (
        <p className="muted" style={{ marginTop: "var(--sp-2)" }}>
          Past {SIZE_CARD_CEILING} sizes your booking page shows them as a drop-down
          instead of boxes — {SIZE_CARD_CEILING + 1} boxes do not fit on one screen.
          Everything still works; it just looks like a list.
        </p>
      )}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}

      {editing && (
        <Sheet onClose={() => setEditing(null)}
          title={`${editing.id || editing.index != null ? "Edit" : "New"} ${TITLE[editing.kind]}`}>

          {editing.kind === "size" ? (
            <>
              <label className="field"><span>Name</span>
                <input value={editing.form.label} placeholder="e.g. Pickup truck"
                  onChange={(e) => set({ label: e.target.value })} /></label>
              <label className="field"><span>Examples (optional)</span>
                <input value={editing.form.examples} placeholder="e.g. F-150, Silverado, Ram"
                  onChange={(e) => set({ examples: e.target.value })} /></label>
              <p className="muted">
                {editing.index === 0
                  ? "This is your base size — every price you set is the price for this one."
                  : "You set what this size adds, per service, in each service's own screen."}
              </p>
              <button className="btn primary" onClick={saveSize}>Save</button>
            </>
          ) : editing.kind === "group" ? (
            <>
              <label className="field"><span>Name</span>
                <input value={editing.form.name} placeholder="e.g. Interior"
                  onChange={(e) => set({ name: e.target.value })} /></label>
              <label className="field"><span>Description (optional)</span>
                <input value={editing.form.description} placeholder="e.g. Everything inside the car"
                  onChange={(e) => set({ description: e.target.value })} /></label>
              <p className="muted" style={{ marginTop: 6, marginBottom: "var(--sp-4)" }}>
                One line under the heading on your booking page. Leave it blank
                unless it earns its space — that screen is tight on a phone.
              </p>

              <Setting label="How many can they choose?"
                help={editing.form.max_select === "any" ? undefined
                  : "Picking another swaps it."}
                stacked>
                <Segmented value={editing.form.max_select} onChange={(v) => set({ max_select: v })}
                  options={[["1", "Just one"], ["any", "Any number"]]}
                  disabled={editing.form.is_exclusive} />
              </Setting>

              {/* ROADMAP 2.8c, and it is the owner's own question answered. A
                  complete package already contains the standalone interior and
                  exterior work, and no per-category rule can see that — it is a
                  relationship BETWEEN categories. Measured on a real shop's
                  menu: $1,645 booked for work a $625 package included. */}
              <Switch label="Booked on its own"
                help={editing.form.is_exclusive
                  ? "Choosing anything in here clears everything else — for a complete package that already includes your other services."
                  : "Customers can combine these with services from your other categories."}
                checked={editing.form.is_exclusive}
                onChange={(v) => set({ is_exclusive: v })} />
              <button className="btn primary" onClick={saveGroup}>Save</button>
              {editing.id && (
                <button className="btn danger" style={{ marginTop: "var(--sp-3)" }} onClick={deleteGroup}>
                  Delete category
                </button>
              )}
            </>
          ) : (
            <>
              <label className="field"><span>Name</span>
                <input value={editing.form.name} onChange={(e) => set({ name: e.target.value })} /></label>
              <label className="field"><span>Description</span>
                <textarea value={editing.form.description} onChange={(e) => set({ description: e.target.value })} /></label>
              <div className="grid2">
                <label className="field"><span>Price ($)</span>
                  <input type="number" inputMode="decimal" value={editing.form.price}
                    onChange={(e) => set({ price: e.target.value })} /></label>
                <label className="field"><span>Duration (min)</span>
                  <input type="number" inputMode="numeric" value={editing.form.duration_minutes}
                    onChange={(e) => set({ duration_minutes: e.target.value })} /></label>
              </div>

              {editing.kind === "service" && (
                <>
                  {/* W9's from-price. Off by default, so nothing changes for a
                      service the detailer is happy quoting blind. It changes
                      what the number CLAIMS TO BE and never the arithmetic. */}
                  <Switch label="Show this as a starting price"
                    help={editing.form.price_is_from
                      ? `Customers see "from ${money(Number(editing.form.price) || 0)}".`
                      : "Customers read this as a firm quote."}
                    checked={editing.form.price_is_from}
                    onChange={(v) => set({ price_is_from: v })} />

                  {/* W21's other half, and it ships only because the booking
                      page's disclosure already does. StepServices renders this
                      list behind the eye; inline it would push step 1 off the
                      bottom of a phone for every tenant who filled it in. */}
                  <label className="field"><span>What's included (one per line)</span>
                    <textarea rows={5} value={editing.form.features}
                      placeholder={"Hand wash and dry\nClay bar decontamination\nMachine polish\nSix-month sealant"}
                      onChange={(e) => set({ features: e.target.value })} /></label>
                  <p className="muted" style={{ marginTop: 6, marginBottom: "var(--sp-4)" }}>
                    Customers see these behind the eye on your booking page, so
                    the list can be as long as it needs to be.
                  </p>

                  <label className="field"><span>Category (optional)</span>
                    <select value={editing.form.group_id} onChange={(e) => set({ group_id: e.target.value })}>
                      <option value="">No category</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select></label>

                  {/* ROADMAP 2.8c — the two rules that belong to a SERVICE and
                      could only ever be said about a business or a date before.
                      A ceramic coating needs a garage; a maintenance wash may
                      only be offered midweek. */}
                  <Setting label="Where this one can be done"
                    help={editing.form.where === "either"
                      ? "Wherever you work — the customer chooses."
                      : editing.form.where === "dropoff"
                        ? "Drop-off only. A customer who picks this can't choose mobile."
                        : "Mobile only. A customer who picks this can't choose drop-off."}
                    stacked>
                    <Segmented value={editing.form.where} onChange={(v) => set({ where: v })}
                      options={[["either", "Either"], ["mobile", "Mobile only"], ["dropoff", "Drop-off only"]]} />
                  </Setting>

                  <Setting label="Days you offer it"
                    help={editing.form.weekdays === null
                      ? "Any day you're open."
                      : "Only the days you've picked. Other days close on your booking page."}
                    stacked>
                    <div className="row wrap" style={{ gap: 6 }}>
                      {DOW.map(([label, n], i) => {
                        const on = editing.form.weekdays === null || editing.form.weekdays.includes(n);
                        return (
                          <button key={i} className={`chip ${on ? "active" : ""}`} aria-pressed={on}
                            onClick={() => {
                              const cur = editing.form.weekdays ?? DOW.map(([, d]) => d);
                              const next = cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort();
                              // Back to every day rather than storing all seven,
                              // so "any day" stays one value and not two.
                              set({ weekdays: next.length === 7 ? null : next });
                            }}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </Setting>

                  <div className="section-title">Bigger vehicles (added on top)</div>
                  {sizes.length < 2 ? (
                    <p className="muted">One size, so one price.</p>
                  ) : (
                    <div className="grid2">
                      {sizes.slice(1).map((sz) => (
                        <SizeAdj key={sz.key} size={sz} form={editing.form} set={set} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ACTIVE MOVED OFF THE ROW AND INTO THE EDITOR (W10). The row
                  carries the reorder arrows now, and a row cannot hold a worded
                  button and two arrows at 392px — measured, not guessed. It
                  belongs here on its own merits too: reordering is something
                  you do to the LIST, active is a property of the thing, and
                  this sheet is what edits properties. */}
              <Switch label="Show on your booking page"
                help={editing.form.is_active
                  ? undefined
                  : "Hidden from customers. Past bookings keep it."}
                checked={editing.form.is_active}
                onChange={(v) => set({ is_active: v })} />
              <button className="btn primary" onClick={editing.kind === "service" ? saveService : saveAddOn}>Save</button>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}

// One size's two numbers. Built from the tenant's own list, so a detailer with
// twelve classes gets twelve pairs and one with a flat price gets none.
function SizeAdj({ size, form, set }) {
  const cur = form.adj?.[size.key] || {};
  const patch = (k, v) => set({ adj: { ...form.adj, [size.key]: { ...cur, [k]: v } } });
  return (
    <>
      <label className="field"><span>{size.label} +$</span>
        <input type="number" inputMode="decimal" value={cur.price ?? 0}
          onChange={(e) => patch("price", e.target.value)} /></label>
      <label className="field"><span>{size.label} +min</span>
        <input type="number" inputMode="numeric" value={cur.duration_minutes ?? 0}
          onChange={(e) => patch("duration_minutes", e.target.value)} /></label>
    </>
  );
}
