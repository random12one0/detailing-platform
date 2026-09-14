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

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { duration, money } from "../../lib/format.js";
import Sheet from "../../components/Sheet.jsx";
import { Segmented, Setting, Switch } from "../../components/controls.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { DEFAULT_VEHICLE_SIZES, isPlatformSizeText } from "../../book/core.js";
import { getAppLocale, t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

// **THE LIST COMES FROM `core.js` NOW — it was a verbatim second copy here,
// 2026-09-12.** `isPlatformSizeText` compares a saved label against the CORE's
// list to decide whose words it is, so a local copy that drifted by one word
// would make this screen seed a value the booking page then treats as the
// detailer's own. Two copies of the same three strings, one of them load-
// bearing for a translation decision.
const DEFAULT_SIZES = DEFAULT_VEHICLE_SIZES;

// The tier text as a PERSON should read it — ours in their language, theirs
// untouched. Identical to the booking page's rule because it IS the booking
// page's rule; `core.js` owns it.
const sizeText = (z, field) => (isPlatformSizeText(z, field) ? t(z[field]) : z[field]);
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
// ROADMAP 8.17 STAGE 2B — EIGHT WHOLE KEYS, not "Edit"/"New" glued to a noun.
// Spanish agrees the article and the adjective with the noun's gender —
// *Nuevo servicio* but *Nueva categoria* — so the two halves cannot be
// translated apart. Same finding as Money's period sentences.
const SHEET_TITLE = {
  service: { edit: "Edit service", add: "New service" },
  addon: { edit: "Edit add-on", add: "New add-on" },
  group: { edit: "Edit category", add: "New category" },
  size: { edit: "Edit vehicle size", add: "New vehicle size" },
};

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
  useAppLocale();
  const { business, settings, reload } = useBusiness();
  const [groups, setGroups] = useState([]);
  const [services, setServices] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [editing, setEditing] = useState(null); // {kind, id?, form}
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const v = settings?.vehicle_sizes;
    // **THE DEFAULT IS SEEDED IN ENGLISH AND SHOWN IN THEIR LANGUAGE —
    // corrected 2026-09-12, and it was losing a detailer their bookings.**
    //
    // It used to seed `t(d.label)`, the DETAILER's language, straight into the
    // value. `saveSizes` then writes the WHOLE array, so a Spanish-speaking
    // detailer who touched ANY tier — renamed one, removed one, even added a
    // fourth — froze `Pequeño / Mediano / Grande` as their own words. Those
    // never translate back, because they no longer match the platform's, so
    // every ENGLISH-speaking customer that detailer ever got saw Spanish size
    // names. Undiagnosable from outside, and Long Beach and Lakewood make a
    // Spanish-speaking detailer a likely customer rather than an edge case.
    //
    // The stored value is now the platform's own English. `sizeText` renders it
    // in the reader's language on this screen exactly as the booking page does,
    // so a Spanish detailer still READS Spanish — nothing about their
    // experience changes. What changed is what gets written down.
    //
    // **Their own words are still theirs**: type anything and it stops matching
    // the default, and nothing translates it ever again.
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

  // ONE ARROW PER ROW, NOT TWO — Part B row 17, the second half of it. Two
  // 34px buttons on every row of the longest list in the product is more
  // furniture than list, and the pair is redundant: moving a row UP past the
  // one above it reaches every order a pair of arrows reaches. The first row
  // has nothing above it, so it draws no arrow at all rather than a dead one
  // — a disabled control still costs the row its width.
  //
  // `above` is the index to swap WITH rather than a direction, because a
  // service’s neighbour on the screen is the previous one IN ITS CATEGORY,
  // which is not always the previous one in the flat list.
  const Reorder = ({ kind, index, above }) => (
    above === null || above === undefined ? <span className="reorder-gap" aria-hidden="true" /> : (
      <button className="btn sm inline icon" aria-label={t("Move up")}
        onClick={(e) => { e.stopPropagation(); move(kind, index, above - index); }}><ChevronUp strokeWidth={2} /></button>
    )
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
      ? { ok: false, text: error.code === "23505" ? t("You already have a category with that name.") : error.message }
      : { ok: true, text: t("Saved.") });
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
      t(inUse === 1
        ? "{count} service is in this category. Deleting it keeps them. They just stop being grouped. Continue?"
        : "{count} services are in this category. Deleting it keeps them. They just stop being grouped. Continue?",
      { count: inUse }))) return;
    const { error } = await supabase.from("service_groups").delete()
      .eq("id", editing.id).eq("business_id", business.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: t("Category deleted.") });
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
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: t("Vehicle sizes saved.") });
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
      // **OPENING A TIER AND PRESSING SAVE MUST CHANGE NOTHING.** The box is
      // filled with what the detailer READS — translated, if the text is still
      // ours — so a Spanish detailer who opens "Pequeño" and saves without
      // typing would otherwise store "Pequeño" as their own word and bring back
      // the exact bug this screen was just fixed for. Unchanged means unchanged:
      // if what came back equals what was shown, the stored value is kept.
      const cur = next[editing.index];
      const untouched = (field, typed) => typed === (sizeText(cur, field) || "");
      next[editing.index] = {
        ...cur,
        label: untouched("label", label) ? cur.label : label,
        examples: untouched("examples", f.examples.trim()) ? cur.examples : f.examples.trim(),
      };
    }
    setEditing(null);
    await saveSizes(next);
  };
  const removeSize = (i) => {
    if (sizes.length <= 1) return;
    if (!confirm(t("Remove \"{name}\"? Bookings already taken keep the size they were booked at.",
      { name: sizeText(sizes[i], "label") }))) return;
    saveSizes(sizes.filter((_, n) => n !== i));
  };
  const moveSize = (i, d) => {
    const to = i + d;
    if (to < 0 || to >= sizes.length) return;
    const next = [...sizes];
    [next[i], next[to]] = [next[to], next[i]];
    saveSizes(next);
  };

  // THE MENU, IN THE ORDER THE CUSTOMER MEETS IT. Each service keeps its
  // index in the FLAT list, because that is what `move` renumbers — a
  // service’s neighbour on the screen is its neighbour in its category, and
  // the two are only the same while every category’s services happen to be
  // contiguous. Swapping two non-adjacent flat positions moves exactly those
  // two rows, so what a detailer sees inside a category is a clean swap and
  // no other category’s internal order changes.
  const indexed = services.map((s, i) => ({ s, i }));
  const sections = [
    ...groups.map((group, gi) => ({ group, gi, rows: indexed.filter(({ s }) => s.group_id === group.id) })),
    // Uncategorised services last, and only drawn as a named section when
    // there are categories for them to be outside OF.
    { group: null, gi: null, rows: indexed.filter(({ s }) => !groups.some((g) => g.id === s.group_id)) },
  ].filter(({ group, rows }) => group || rows.length);

  const groupRule = (g) => (g.is_exclusive
    ? t("Booked on its own · nothing else can be added")
    : g.max_select === 1 ? t("Customers pick one") : t("Customers pick any number"));

  return (
    // A plain container, not a .card: the services inside it ARE the cards,
    // and a card holding cards is boxes in boxes at one surface value.
    <div>
      {/* GROUPED THE WAY THE CUSTOMER MEETS IT — Part B row 17. This screen
          drew a flat list of categories and then a flat list of services, so
          the detailer had to hold the menu in their head to see what their
          booking page actually looks like. It IS the menu; it should look
          like the menu. The category is the heading its services sit under,
          which is both what the customer sees and where the category’s own
          rule ("pick one" / "pick any number") is legible against the things
          it governs. */}
      {/* WRAPS AT 320, WHERE "Services" + two buttons is 12px more than the
          screen. The pair drops under the heading rather than either button
          shrinking — § THE 320 FLOOR's own answer for a row that no longer
          fits, and the two are the same size on both lines. */}
      <div className="row wrap between">
        <h3>{t("Services")}</h3>
        <div className="row wrap" style={{ gap: 6 }}>
          <button className="btn inline" onClick={() => setEditing({ kind: "group", form: { ...EMPTY_GROUP } })}>+ {t("Category")}</button>
          <button className="btn inline" onClick={() => openService(null)}>+ {t("Service")}</button>
        </div>
      </div>

      {/* ═══ THE MENU ═══════════════════════════════════════════════════════
          **THIS WAS A LIST OF SERVICES AND, 300px FURTHER DOWN, AN UNRELATED
          LIST OF VEHICLE SIZES.** The fact that binds them — a size is a
          MULTIPLIER on every service, which is how this trade actually prices
          — was on the screen nowhere, and a detailer who wanted to know what a
          truck pays for a full detail had to open the service and read a field
          called "Large +$".

          So the two lists are one table: the detailer's services down, the
          detailer's own sizes across, and **the real number a customer pays**
          in every cell. Nothing here is a new fact — every figure is
          `price + vehicle_size_adjustments[key].price`, the same arithmetic
          `core.js` does for the booking page. It had simply never been shown.

          The category stays the band it already was; grouping was the part of
          this screen that was RIGHT, and it is what makes the table read as a
          menu rather than as a spreadsheet. */}
      <div className="menu" style={{ "--cols": sizes.length }}>
        {sizes.length > 1 && (
          <div className="menu-head">
            <span className="menu-name label">{t("What a customer pays")}</span>
            <div className="menu-ladder">
              {sizes.map((z) => (
                <div className="menu-cell head" key={z.key}>
                  <span className="v" title={sizeText(z, "label")}>{sizeText(z, "label")}</span>
                </div>
              ))}
            </div>
            <span className="reorder-gap" aria-hidden="true" />
          </div>
        )}

        {sections.map(({ group, gi, rows }) => (
          <Fragment key={group ? group.id : "loose"}>
            {group ? (
              <div className="menu-band">
                {/* Not `between`: a heading with no box around it spans the
                    whole column, so `between` throws the category's own arrow
                    700px from the words it moves. The control sits beside what
                    it acts on. */}
                <button className="cat-head"
                  onClick={() => setEditing({ kind: "group", id: group.id, form: { name: group.name, max_select: group.max_select === 1 ? "1" : "any", is_exclusive: !!group.is_exclusive, description: group.description || "" } })}>
                  <span className="label">{group.name}</span>
                  <span className="muted">{groupRule(group)}</span>
                </button>
                {gi > 0 && <Reorder kind="group" index={gi} above={gi - 1} />}
              </div>
            ) : groups.length > 0 && (
              <div className="menu-band"><span className="label">{t("Not in a category")}</span></div>
            )}

            {rows.map(({ s, i }, k) => (
              <div className={`menu-row${s.is_active ? "" : " off"}`} key={s.id}>
                <button className="menu-name" onClick={() => openService(s)}>
                  <span className="n">{s.name}</span>
                  {/* **THE DETAILER SEES WHAT THE CUSTOMER SEES** — an outside
                      review, 2026-09-11. This row read `300 min` while the
                      booking page read `about 5 hrs` off the same field. */}
                  <span className="m">
                    {duration(s.duration_minutes, getAppLocale())}
                    {s.is_active ? "" : ` · ${t("Hidden")}`}
                  </span>
                </button>
                <div className="menu-ladder">
                  {sizes.map((z, zi) => {
                    const addP = zi === 0 ? 0 : Number(s.vehicle_size_adjustments?.[z.key]?.price) || 0;
                    const addM = zi === 0 ? 0 : Number(s.vehicle_size_adjustments?.[z.key]?.duration_minutes) || 0;
                    return (
                      <div className={`menu-cell${zi === 0 ? " base" : ""}`} key={z.key}>
                        {/* "from" ONCE, ON THE BASE. It is a claim about the
                            SERVICE — that the quote is a starting point — not
                            about each size, and printing it in all three cells
                            read as three separate hedges. */}
                        <span className="v">
                          {s.price_is_from && zi === 0 ? `${t("from")} ` : ""}{money(Number(s.price) + addP)}
                        </span>
                        {/* The column heading names the size at desk width and
                            is hidden on a phone, where the ladder wraps under
                            the name and a heading would label the wrong thing.
                            So the cell carries both and the stylesheet picks. */}
                        <span className="u sz">{sizeText(z, "label")}</span>
                        {addM !== 0 && (
                          <span className="u tm">+{duration(addM, getAppLocale())}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Reorder kind="service" index={i} above={k === 0 ? null : rows[k - 1].i} />
              </div>
            ))}

            {/* An empty CATEGORY is drawn, unlike an empty section elsewhere:
                it is a thing the detailer made and can open, and hiding it
                would make a category they created disappear. */}
            {group && rows.length === 0 && (
              <p className="muted" style={{ padding: "0 var(--sp-3)" }}>{t("Nothing in this one yet.")}</p>
            )}
          </Fragment>
        ))}
      </div>

      {services.length === 0 && <p className="muted">{t("No services yet. Customers can't book until you add one.")}</p>}

      <div className="row between" style={{ marginTop: "var(--sp-5)" }}>
        <h3>{t("Add-ons")}</h3>
        <button className="btn inline" onClick={() => setEditing({ kind: "addon", form: { ...EMPTY_ADDON } })}>+ {t("Add")}</button>
      </div>
      <div className="tight">
      {addOns.map((a, i) => (
        <div className="card row between" key={a.id} style={{ opacity: a.is_active ? 1 : 0.5 }}>
          <div className="tappable" style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
            onClick={() => setEditing({ kind: "addon", id: a.id, form: { name: a.name, description: a.description || "", price: String(a.price), duration_minutes: String(a.duration_minutes), is_active: a.is_active } })}>
            <strong>{a.name}</strong>
            <div className="muted">{money(a.price)}{a.duration_minutes ? ` · +${duration(a.duration_minutes, getAppLocale())}` : ""}</div>
          </div>
          <Reorder kind="addon" index={i} above={i === 0 ? null : i - 1} />
        </div>
      ))}
      </div>

      {/* ═══ THE COLUMNS ════════════════════════════════════════════════════
          **THE VEHICLE SIZES ARE NOT A THIRD LIST ON THIS PAGE. THEY ARE THE
          AXIS OF THE TABLE ABOVE**, and drawing them as another stack of rows
          is what made the two halves of this screen look unrelated when one
          multiplies the other.

          So they are drawn ACROSS, in the order and with the words they carry
          as column headings, which is also the roadmap's own point about them:
          *a detailer setting up tiers is designing a screen they never see.*
          These are the boxes the customer will pick between.

          Law 1 gets a real answer rather than a contrived one here: services
          are a table, add-ons are a ruled list, and the sizes are a row of
          columns. Three sections, three skeletons, one ground. */}
      <div className="row wrap between" style={{ marginTop: "var(--sp-5)" }}>
        <h3>{t("Vehicle sizes")}</h3>
        <button className="btn inline" onClick={() => setEditing({ kind: "size", form: { label: "", examples: "" } })}>+ {t("Add")}</button>
      </div>
      <p className="muted" style={{ marginBottom: "var(--sp-3)" }}>
        {/* **BARE JSX TEXT IS INVISIBLE TO EVERY CHECK HERE — 2026-09-12.**
            `i18n-coverage` counts `t("literal")`; a sentence written straight
            into the markup is not a call at all, so this line sat in English on
            a Spanish dashboard while the ratchet read 100%. */}
        {t("These are the columns above. The first one is your base price; each of the others adds money and time, per service.")}
      </p>
      <div className="sizecols">
        {sizes.map((s, i) => (
          <div className={`sizecol${i === 0 ? " base" : ""}`} key={s.key}>
            <button className="sizecol-open"
              onClick={() => setEditing({ kind: "size", index: i, form: { label: sizeText(s, "label"), examples: sizeText(s, "examples") || "" } })}>
              <span className="label">{i === 0 ? t("Base price") : t("Adds on top")}</span>
              <span className="n">{sizeText(s, "label")}</span>
              <span className="m">{sizeText(s, "examples") || t("No examples yet")}</span>
            </button>
            {/* EARLIER AND LATER, NOT UP AND DOWN. These read left to right at
                a desk and wrap into a grid that still reads left to right on a
                phone, so the arrow matches the axis it moves along — the rule
                CLAUDE.md sets for motion, applied to a control. */}
            <div className="sizecol-move">
              <button className="btn sm inline icon" aria-label={t("Move earlier")} disabled={i === 0}
                onClick={() => moveSize(i, -1)}><ChevronLeft strokeWidth={2} /></button>
              <button className="btn sm inline icon" aria-label={t("Move later")} disabled={i === sizes.length - 1}
                onClick={() => moveSize(i, 1)}><ChevronRight strokeWidth={2} /></button>
              <button className="btn sm inline icon" aria-label={t("Remove {name}", { name: sizeText(s, "label") })} disabled={sizes.length <= 1}
                onClick={() => removeSize(i)}><X strokeWidth={2} /></button>
            </div>
          </div>
        ))}
      </div>
      {sizes.length > SIZE_CARD_CEILING && (
        <p className="muted" style={{ marginTop: "var(--sp-2)" }}>
          {t("Past {n} sizes your booking page shows them as a drop-down instead of boxes, because {m} boxes do not fit on one screen. Everything still works; it just looks like a list.",
            { n: SIZE_CARD_CEILING, m: SIZE_CARD_CEILING + 1 })}
        </p>
      )}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}

      {editing && (
        <Sheet onClose={() => setEditing(null)}
          title={t(SHEET_TITLE[editing.kind][editing.id || editing.index != null ? "edit" : "add"])}>

          {editing.kind === "size" ? (
            <>
              <label className="field"><span>{t("Name")}</span>
                <input value={editing.form.label} placeholder={t("e.g. Pickup truck")}
                  onChange={(e) => set({ label: e.target.value })} /></label>
              <label className="field"><span>{t("Examples (optional)")}</span>
                <input value={editing.form.examples} placeholder={t("e.g. F-150, Silverado, Ram")}
                  onChange={(e) => set({ examples: e.target.value })} /></label>
              <p className="muted">
                {editing.index === 0
                  ? t("This is your base size. Every price you set is the price for this one.")
                  : t("You set what this size adds, per service, in each service's own screen.")}
              </p>
              <button className="btn primary" onClick={saveSize}>{t("Save")}</button>
            </>
          ) : editing.kind === "group" ? (
            <>
              <label className="field"><span>{t("Name")}</span>
                <input value={editing.form.name} placeholder={t("e.g. Interior")}
                  onChange={(e) => set({ name: e.target.value })} /></label>
              <label className="field"><span>{t("Description (optional)")}</span>
                <input value={editing.form.description} placeholder={t("e.g. Everything inside the car")}
                  onChange={(e) => set({ description: e.target.value })} /></label>
              <p className="muted" style={{ marginTop: 6, marginBottom: "var(--sp-4)" }}>
                {t("One line under the heading on your booking page. Leave it blank unless it earns its space, because that screen is tight on a phone.")}
              </p>

              <Setting label={t("How many can they choose?")}
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
              <Switch label={t("Booked on its own")}
                help={editing.form.is_exclusive
                  ? t("Choosing anything in here clears everything else. Use it for a complete package that already includes your other services.")
                  : t("Customers can combine these with services from your other categories.")}
                checked={editing.form.is_exclusive}
                onChange={(v) => set({ is_exclusive: v })} />
              <button className="btn primary" onClick={saveGroup}>{t("Save")}</button>
              {editing.id && (
                <button className="btn danger" style={{ marginTop: "var(--sp-3)" }} onClick={deleteGroup}>
                  {t("Delete category")}
                </button>
              )}
            </>
          ) : (
            <>
              <label className="field"><span>{t("Name")}</span>
                <input value={editing.form.name} onChange={(e) => set({ name: e.target.value })} /></label>
              <label className="field"><span>{t("Description")}</span>
                <textarea value={editing.form.description} onChange={(e) => set({ description: e.target.value })} /></label>
              {/* AN ADD-ON HAS NO SIZE AXIS — it costs what it costs on any
                  vehicle — so it keeps the plain pair. A SERVICE gets the
                  ladder, which carries its base price as its first row. */}
              {editing.kind === "addon" ? (
                <div className="grid2">
                  <label className="field"><span>{t("Price ($)")}</span>
                    <input type="number" inputMode="decimal" value={editing.form.price}
                      onChange={(e) => set({ price: e.target.value })} /></label>
                  <label className="field"><span>{t("Time it adds (min)")}</span>
                    <input type="number" inputMode="numeric" value={editing.form.duration_minutes}
                      onChange={(e) => set({ duration_minutes: e.target.value })} /></label>
                </div>
              ) : (
                <PriceLadder sizes={sizes} form={editing.form} set={set} />
              )}

              {editing.kind === "service" && (
                <>
                  {/* W9's from-price. Off by default, so nothing changes for a
                      service the detailer is happy quoting blind. It changes
                      what the number CLAIMS TO BE and never the arithmetic. */}
                  <Switch label={t("Show this as a starting price")}
                    help={editing.form.price_is_from
                      ? t("Customers see \"from {amount}\".", { amount: money(Number(editing.form.price) || 0) })
                      : t("Customers read this as a firm quote.")}
                    checked={editing.form.price_is_from}
                    onChange={(v) => set({ price_is_from: v })} />

                  {/* W21's other half, and it ships only because the booking
                      page's disclosure already does. StepServices renders this
                      list behind the eye; inline it would push step 1 off the
                      bottom of a phone for every tenant who filled it in. */}
                  <label className="field"><span>{t("What's included (one per line)")}</span>
                    <textarea rows={5} value={editing.form.features}
                      placeholder={t("Hand wash and dry\nClay bar decontamination\nMachine polish\nSix-month sealant")}
                      onChange={(e) => set({ features: e.target.value })} /></label>
                  <p className="muted" style={{ marginTop: 6, marginBottom: "var(--sp-4)" }}>
                    {t("Customers see these behind the eye on your booking page, so the list can be as long as it needs to be.")}
                  </p>

                  <label className="field"><span>{t("Category (optional)")}</span>
                    <select value={editing.form.group_id} onChange={(e) => set({ group_id: e.target.value })}>
                      <option value="">{t("No category")}</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select></label>

                  {/* ROADMAP 2.8c — the two rules that belong to a SERVICE and
                      could only ever be said about a business or a date before.
                      A ceramic coating needs a garage; a maintenance wash may
                      only be offered midweek. */}
                  <Setting label={t("Where this one can be done")}
                    help={editing.form.where === "either"
                      ? t("Wherever you work · the customer chooses.")
                      : editing.form.where === "dropoff"
                        ? t("Drop-off only. A customer who picks this can't choose mobile.")
                        : t("Mobile only. A customer who picks this can't choose drop-off.")}
                    stacked>
                    <Segmented value={editing.form.where} onChange={(v) => set({ where: v })}
                      options={[["either", "Either"], ["mobile", "Mobile only"], ["dropoff", "Drop-off only"]]} />
                  </Setting>

                  <Setting label={t("Days you offer it")}
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

                </>
              )}

              {/* ACTIVE MOVED OFF THE ROW AND INTO THE EDITOR (W10). The row
                  carries the reorder arrows now, and a row cannot hold a worded
                  button and two arrows at 392px — measured, not guessed. It
                  belongs here on its own merits too: reordering is something
                  you do to the LIST, active is a property of the thing, and
                  this sheet is what edits properties. */}
              <Switch label={t("Show on your booking page")}
                help={editing.form.is_active
                  ? undefined
                  : "Hidden from customers. Past bookings keep it."}
                checked={editing.form.is_active}
                onChange={(v) => set({ is_active: v })} />
              <button className="btn primary" onClick={editing.kind === "service" ? saveService : saveAddOn}>{t("Save")}</button>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}

// ═══ THE PRICE LADDER — the base and every vehicle size as ONE object ══════
//
// **THIS REPLACED FOURTEEN FIELDS WITH FIVE, AND THAT IS THE SMALLER HALF OF
// IT.** A service with four sizes used to open a sheet with `Price ($)` and
// `Duration (min)` near the top and, 200px below under a heading called
// "Bigger vehicles (added on top)", eight more inputs: `Medium +$`,
// `Medium +min`, `Large +$`, `Large +min`, and so on. Andrew's phrase for this
// screen was *a thousand text boxes* and on this sheet it was close to literal.
//
// **THE BIGGER HALF IS THAT IT ASKED FOR THE WRONG NUMBER.** A detailer knows
// a truck full detail is $180. The product asked for `+$60` and printed $180
// nowhere — not in the editor, not in the list, not anywhere on the screen.
// So this takes the price a customer actually pays and stores `total - base`,
// which means `services.vehicle_size_adjustments` keeps exactly the shape it
// has always had and `core.js`, `create-booking`, `booking-core` and every
// deployed function are untouched by this.
//
// **AND THE TIME COLUMN IS HIDDEN UNTIL IT IS USED.** Most detailers charge
// more for a bigger vehicle and block out the same slot, so a second column of
// inputs that are all zero is half the remaining fields earning nothing. It
// opens by itself for a service that already varies its time, so nothing a
// detailer has set can hide from them.
//
// AN EMPTY CELL MEANS "same as the base" rather than "$0", which is what a
// blank actually means to somebody filling in a price ladder — and it leaves
// `0` free to mean zero, for anyone who wants a size to cost nothing.
function PriceLadder({ sizes, form, set }) {
  const base = Number(form.price) || 0;
  const baseMin = Number(form.duration_minutes) || 0;
  const extras = sizes.slice(1);
  const [timed, setTimed] = useState(() =>
    extras.some((z) => (Number(form.adj?.[z.key]?.duration_minutes) || 0) !== 0));

  const cellFor = (z) => form.adj?.[z.key] || {};
  const setCell = (z, k, v) =>
    set({ adj: { ...form.adj, [z.key]: { ...cellFor(z), [k]: v } } });

  const rowClass = `sizeladder-row${timed ? " timed" : ""}`;
  return (
    <>
      <div className="section-title">{t("What a customer pays")}</div>
      <div className="sizeladder">
        <div className={`${rowClass} sizeladder-head`}>
          <span>{sizes.length > 1 ? t("Vehicle") : t("Every vehicle")}</span>
          <span>{t("Price")}</span>
          {timed && <span>{t("Minutes")}</span>}
        </div>

        {/* THE BASE IS A ROW OF THE LADDER, not a field 200px above it. It is
            the number every other row is built from, so putting it anywhere
            else is what made them look like two unrelated settings. */}
        <div className={rowClass}>
          <span className="who">
            <span className="n">{sizes.length ? sizeText(sizes[0], "label") : t("Base price")}</span>
            <span className="m">{t("Your base price")}</span>
          </span>
          <input type="number" inputMode="decimal" aria-label={t("Base price")}
            value={form.price} onChange={(e) => set({ price: e.target.value })} />
          {timed && (
            <input type="number" inputMode="numeric" className="t" aria-label={t("Minutes")}
              value={form.duration_minutes} onChange={(e) => set({ duration_minutes: e.target.value })} />
          )}
        </div>

        {extras.map((z) => {
          const cur = cellFor(z);
          const addP = Number(cur.price) || 0;
          const addM = Number(cur.duration_minutes) || 0;
          return (
            <div className={rowClass} key={z.key}>
              <span className="who">
                <span className="n">{sizeText(z, "label")}</span>
                {sizeText(z, "examples") && <span className="m">{sizeText(z, "examples")}</span>}
              </span>
              <input type="number" inputMode="decimal"
                aria-label={t("What {name} pays", { name: sizeText(z, "label") })}
                value={cur.price === undefined || cur.price === "" ? "" : String(base + addP)}
                placeholder={String(base)}
                onChange={(e) => setCell(z, "price", e.target.value === "" ? "" : Number(e.target.value) - base)} />
              {timed && (
                <input type="number" inputMode="numeric" className="t"
                  aria-label={t("How long {name} takes", { name: sizeText(z, "label") })}
                  value={cur.duration_minutes === undefined || cur.duration_minutes === "" ? "" : String(baseMin + addM)}
                  placeholder={String(baseMin)}
                  onChange={(e) => setCell(z, "duration_minutes", e.target.value === "" ? "" : Number(e.target.value) - baseMin)} />
              )}
            </div>
          );
        })}
      </div>

      {extras.length > 0 && !timed && (
        <button className="btn sm inline" style={{ marginTop: "var(--sp-2)" }}
          onClick={() => setTimed(true)}>
          + {t("A bigger vehicle also takes longer")}
        </button>
      )}
      {sizes.length < 2 && (
        <p className="muted" style={{ marginTop: "var(--sp-2)" }}>
          {t("You have one vehicle size, so one price. Add sizes on this screen to charge more for bigger vehicles.")}
        </p>
      )}
    </>
  );
}
