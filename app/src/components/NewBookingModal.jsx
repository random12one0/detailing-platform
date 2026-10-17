// Owner-created booking. Goes through the SAME create-booking edge function
// as a customer booking (the old NewBookingModal wrote straight to the
// table, skipping every server-side guard) — so hours, blockouts, buffer,
// advance rules and pricing all apply, and slots come from available-slots.
//
// HIS REVIEW, 2026-09-10: *"make sure they can do everything they would want
// to, no limitations. Also make it look nicer."* It had drifted a long way
// behind the customer's own booking page — it posted ELEVEN fields where
// `bookingRequest` posts twenty — so a detailer typing a job in by hand could
// not reach eight things their own customers could reach unaided: a second
// car, a travel zone, the vehicle's condition, the water and power questions,
// a promo code, a monthly plan's discount, the customer's own note, or the
// language their confirmation goes out in.
//
// THE REPAIR IS TO STOP HAND-ASSEMBLING THE PAYLOAD AND CALL `book/core.js`,
// which is where CLAUDE.md says the rules live and what `/book/:slug` itself
// posts. That is why all eight arrive at once, and it is why the ninth will
// arrive on its own: a rule added to the core reaches this form with no edit
// here. The previous version's eleven hand-written keys are exactly how a
// form falls eight features behind without anything reporting it.
//
// WHAT IS DELIBERATELY NOT HERE: `splitDays` — one customer's cars on
// DIFFERENT days. The core supports it (`bookingRequests` posts one call per
// car and groups them), but drawing it costs a date and a time control per
// vehicle, and a detailer who wants two days has always just made two
// bookings. ponytail: same-day multi-vehicle only; add per-car dates if he
// asks for them.
//
// AND THE CAMPAIGN FIELDS ARE OMITTED ON PURPOSE rather than forgotten.
// `campaign_slug` and `visitor_id` answer "which printed link did this come
// from"; a booking the detailer typed came from the detailer, and attributing
// it to a flyer would put a number in Where customers come from that nobody
// earned.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { api, slotsForType } from "../lib/api.js";
import { supabase } from "../lib/supabase.js";
import { money, phone, time12, todayLocal } from "../lib/format.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import Sheet from "./Sheet.jsx";
import { Segmented } from "./controls.jsx";
import {
  VEHICLE_CONDITIONS, bookingRequest, groupServices, initialForm, maxVehicles,
  normalizeSettings, quoteRequest, setVehicleCount, toggleService, vehicleCount,
} from "../book/core.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// A SECTION, NOT A `.section-title` ALONE. The old form was one 3,200-pixel
// scroll at 392 with three bare headings in it and no other structure, which
// is the whole of *"make it look nicer"*: a person filling it in could not
// tell how much was left. Each block states what it is for in one line and
// nothing states what its own controls already say — the owner's copy rule.
function Block({ title, hint, children }) {
  return (
    <div className="nb-block">
      <div className="section-title">{title}</div>
      {hint && <p className="muted nb-hint">{hint}</p>}
      {children}
    </div>
  );
}

export default function NewBookingModal({ onClose, onCreated, initialDate, initialCustomer = null }) {
  useAppLocale();
  const { business, settings } = useBusiness();
  const s = useMemo(() => normalizeSettings(settings), [settings]);
  const sizes = s.vehicle_sizes;
  const cap = maxVehicles(settings);

  const [catalog, setCatalog] = useState({ services: [], addOns: [], groups: [] });
  // ROADMAP 9.8 — UNKNOWN, NOT EMPTY, UNTIL THE FETCH RETURNS. `catalog`
  // starts as empty arrays because `grouped` below is a `useMemo` that runs
  // on every render, including the first one before the effect has asked —
  // it cannot receive `null` without a guard at every read site. This flag
  // carries the fact `catalog`'s own shape cannot: the same `null`-until-
  // fetched idiom `slots` already uses a few lines down, done as a sibling
  // boolean instead of reshaping `catalog` because `catalog.services` is
  // read unconditionally by that memo and by three places in the render
  // below. Same distinction, smaller diff.
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [form, setForm] = useState(() => ({
    ...initialForm(settings),
    bookingDate: initialDate || todayLocal(business.timezone),
  }));
  // NOT part of `form`: the core's form shape is the CUSTOMER's answers, and
  // a private note is the one field on this sheet that no customer has. It
  // rides beside `bookingRequest`'s output rather than inside it, so the core
  // keeps posting exactly what a tenant site posts.
  const [adminNotes, setAdminNotes] = useState("");
  const [lang, setLang] = useState("en");

  // The existing customer, when one was picked. `null` is a new customer and
  // is the ordinary case for a walk-up.
  const [picked, setPicked] = useState(null);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState(null);   // null = not searched yet
  const [plan, setPlan] = useState(null);         // this customer's live plan

  const [quote, setQuote] = useState(null);
  const [slots, setSlots] = useState(null);
  const [promoState, setPromoState] = useState(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    (async () => {
      const [sv, ao, gr] = await Promise.all([
        supabase.from("services").select("*").eq("business_id", business.id).eq("is_active", true).order("sort_order"),
        supabase.from("add_ons").select("*").eq("business_id", business.id).eq("is_active", true).order("sort_order"),
        supabase.from("service_groups").select("*").eq("business_id", business.id).order("sort_order"),
      ]);
      setCatalog({ services: sv.data ?? [], addOns: ao.data ?? [], groups: gr.data ?? [] });
      setCatalogLoaded(true);
    })();
  }, [business.id]);

  // --- THE CUSTOMER ---------------------------------------------------------
  // The gap he would have felt every single day: there was no way to pick
  // somebody who has booked before, so every repeat job meant retyping a
  // name, a phone number, an email and an address that were already in the
  // Clients tab. Same query Clients.jsx uses.
  const runSearch = useCallback(async (term) => {
    const q = term.trim();
    if (!q) { setMatches(null); return; }
    const { data } = await supabase
      .from("customers").select("*").eq("business_id", business.id)
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("created_at", { ascending: false }).limit(6);
    setMatches(data ?? []);
  }, [business.id]);

  // A PLAN IS READ, NEVER TYPED. `create-booking` re-reads the membership and
  // prices it server-side; this only asks which plan to quote against, and a
  // customer with no live membership quotes at full price exactly as before.
  const pick = async (c) => {
    setPicked(c);
    setMatches(null);
    setSearch("");
    set({
      customerName: c.name ?? "",
      customerPhone: c.phone ?? "",
      customerEmail: c.email ?? "",
      customerAddress: c.address ?? form.customerAddress,
    });
    const { data } = await supabase
      .from("plan_members").select("plan_id, status, plans(name)")
      .eq("business_id", business.id).eq("customer_id", c.id)
      .neq("status", "ended").limit(1);
    setPlan(data?.[0] ?? null);

    // ── ROADMAP 9.7 — THE LAST VEHICLE COMES WITH THEM ────────────────────
    // **Found live by Andrew: the client card said "Large · Ford F-150" and
    // Book again opened on Small with the model blank, so one tap books a
    // large truck at the small price.** The size is the one field on this form
    // that carries a PRICE, and it was the one field defaulting.
    //
    // **IT GOES IN `pick()` RATHER THAN IN THE BOOK-AGAIN BRANCH, WHICH IS
    // THIS ITEM'S OWN EARLIER RULING KEPT RATHER THAN OVERTURNED.** 9.7
    // considered enriching Book again alone and refused it, because that would
    // make it behave differently from a manual search for the identical
    // customer. Both routes run this function, so both now carry the vehicle
    // and they stay byte-identical — which is the property that ruling was
    // protecting.
    //
    // **THE SAME BOOKING THE CLIENT CARD CALLS "Last"** — most recent by
    // `start_at`, the customer's own history — so the card and the form the
    // card opens cannot disagree, which is the whole complaint.
    //
    // EACH FIELD ONLY IF THE PREVIOUS BOOKING HAD ONE. A blank model must not
    // wipe a typed one and a null travel zone must not clear a chosen zone;
    // absent means "nothing to carry", never "set it to empty".
    const { data: prev } = await supabase
      .from("bookings")
      .select("vehicle_size, vehicle_model, travel_zone")
      .eq("business_id", business.id)
      .eq(c.id ? "customer_id" : "customer_phone", c.id ?? c.phone)
      .is("deleted_at", null)
      .order("start_at", { ascending: false })
      .limit(1);
    const last = prev?.[0];
    if (last) {
      set({
        ...(last.vehicle_size ? { vehicleSize: last.vehicle_size } : {}),
        ...(last.vehicle_model ? { vehicleModel: last.vehicle_model } : {}),
        ...(last.travel_zone ? { travelZone: last.travel_zone } : {}),
      });
    }
  };

  // ROADMAP 9.7 — "BOOK AGAIN," AND IT ROUTES INTO THE SAME FUNCTION A
  // MANUAL SEARCH ALREADY USES, NOT A SECOND VERSION OF IT. `pick()` is
  // exactly what runs when a detailer types a name and taps a search
  // result; this runs it once, at mount, for a customer Clients.jsx
  // already has in hand, so a "Book again" press is byte-identical to
  // that same search-and-tap, never a different path with its own rules.
  // Mount-only (`initialCustomer` does not change while this modal is
  // open — a fresh open is a fresh mount, the same way `initialDate`
  // already works two lines up), so there is nothing to reconcile if it
  // changed mid-session.
  useEffect(() => {
    if (initialCustomer) pick(initialCustomer);
  }, [initialCustomer]);

  const clearCustomer = () => {
    setPicked(null);
    setPlan(null);
    set({ customerName: "", customerPhone: "", customerEmail: "", customerAddress: "" });
  };

  // --- QUOTE AND SLOTS ------------------------------------------------------
  // Both re-derive from the server on every change that can move a price or a
  // duration. The key carries the promo and the plan too, because a booking
  // priced without them is the number the detailer would read out loud.
  const selKey = useMemo(() => JSON.stringify([
    form.serviceIds, form.addOns, form.vehicleSize, form.vehicleCondition,
    form.bookingDate, form.serviceType, form.travelZone,
    (form.extraVehicles ?? []).map((v) => v.size),
    promoState?.ok ? promoState.code : null, plan?.plan_id ?? null,
  ]), [form, promoState, plan]);

  useEffect(() => {
    if (!form.serviceIds.length) { setQuote(null); setSlots(null); return; }
    let stale = false;
    (async () => {
      try {
        const q = await api.calculateBooking(business.slug, quoteRequest(form, {
          planId: plan?.plan_id, promoApplied: promoState?.ok ? promoState.code : null,
        }));
        if (stale) return;
        setQuote(q.quote);
        const day = await api.availableSlots(business.slug, {
          booking_date: form.bookingDate,
          duration_minutes: q.quote.total_duration,
        });
        // Only the times this service type can have (W4). The dashboard
        // books through the same gate a customer does, so offering the rest
        // would just mean a 409 after the form was filled in.
        if (!stale) setSlots(slotsForType(day, form.serviceType));
      } catch (e) {
        if (!stale) setError(e.message);
      }
    })();
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, business.slug]);

  const applyPromo = async () => {
    const code = form.promoCode.trim();
    if (!code) return;
    setCheckingPromo(true);
    try {
      const r = await api.validatePromo(business.slug, code, form.customerEmail || null, form.customerPhone || null);
      setPromoState(r?.valid
        ? { ok: true, code, text: t("Applied.") }
        : { ok: false, code, text: r?.reason || t("That code cannot be used.") });
    } catch (e) {
      setPromoState({ ok: false, code, text: e.message });
    }
    setCheckingPromo(false);
  };

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      await api.createMemberBooking(business.slug, {
        ...bookingRequest(form, {
          planId: plan?.plan_id,
          promoApplied: promoState?.ok ? promoState.code : null,
          lang,
        }),
        admin_notes: adminNotes.trim() || null,
      });
      onCreated?.();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const grouped = useMemo(
    () => groupServices(catalog.services, catalog.groups),
    [catalog.services, catalog.groups],
  );
  const cars = vehicleCount(form);
  const mobile = form.serviceType === "mobile";
  const askWater = mobile && s.water_requirement === "ask";
  const askPower = mobile && s.power_requirement === "ask";
  const zones = mobile ? s.travel_zones : [];
  const ready = form.startTime && form.customerName.trim() && form.customerPhone.trim();
  // Whether anything moved the price off the plain sum of the services.
  const adjusted = !!quote && (quote.vehicle_size_fee > 0 || quote.travel_fee > 0
    || quote.promo_discount > 0 || quote.site_discount > 0 || quote.total !== quote.subtotal);

  return (
    <Sheet onClose={onClose} title={t("New booking")}>

      <Block title={t("Customer")}
        hint={t("Search a customer who has booked before, or type in a new one.")}>
        {picked ? (
          <div className="row between sunken flush">
            <span className="row" style={{ gap: 8, minWidth: 0 }}>
              <Check size={15} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span className="body" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {picked.name}{picked.phone ? ` · ${phone(picked.phone)}` : ""}
              </span>
            </span>
            <button className="btn sm inline ghost" aria-label={t("Use a different customer")}
              onClick={clearCustomer}><X strokeWidth={2} /></button>
          </div>
        ) : (
          <div className="tight">
            <div className="row" style={{ gap: 8 }}>
              <input value={search} placeholder={t("Name or phone")}
                onChange={(e) => { setSearch(e.target.value); runSearch(e.target.value); }} />
              <button className="btn sm inline" onClick={() => runSearch(search)} aria-label={t("Search")}>
                <Search size={15} strokeWidth={2} />
              </button>
            </div>
            {matches?.map((c) => (
              <button key={c.id} className="row between sunken flush nb-match" onClick={() => pick(c)}>
                <span className="body">{c.name}</span>
                <span className="quiet">{phone(c.phone)}</span>
              </button>
            ))}
            {matches?.length === 0 && <p className="quiet">{t("Nobody by that name yet.")}</p>}
          </div>
        )}

        {/* THE PLAN IS STATED RATHER THAN OFFERED. The detailer is not
            choosing to discount this job; the customer already pays a monthly
            fee and the server applies it whatever this form says. Saying so
            here is the difference between a price that looks wrong and one
            that explains itself. */}
        {plan && (
          <div className="ok-box">
            {t("On {plan}. The plan price is applied automatically.", { plan: plan.plans?.name ?? t("a monthly plan") })}
          </div>
        )}

        <label className="field"><span>{t("Customer name")}</span>
          <input value={form.customerName} onChange={(e) => set({ customerName: e.target.value })} /></label>
        <div className="grid2">
          <label className="field"><span>{t("Phone")}</span>
            <input value={form.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} /></label>
          <label className="field"><span>{t("Email (optional)")}</span>
            <input value={form.customerEmail} onChange={(e) => set({ customerEmail: e.target.value })} /></label>
        </div>
        {/* ROADMAP 8.17 — WHICH LANGUAGE THEIR EMAILS GO OUT IN. It was
            hard-wired to English here while every customer booking carried
            the language its form was filled in in, so a Spanish-speaking
            customer the detailer booked by hand got English confirmations
            and English reminders with nothing anywhere reporting it. */}
        <label className="field"><span>{t("Send their emails in")}</span>
          <Segmented value={lang} onChange={setLang}
            options={[["en", "English"], ["es", "Español"]]} /></label>
      </Block>

      <Block title={t("Vehicle")}>
        <div className="grid2">
          <label className="field"><span>{t("Vehicle size")}</span>
            {/* Segmented up to four, a drop-down past it. Same rule as the
                customer's booking page and the same reason: a segmented
                control is for a choice you can see all of at once, and a
                detailer with twelve vehicle classes has a list. */}
            {sizes.length <= 4 ? (
              <Segmented value={form.vehicleSize} onChange={(v) => set({ vehicleSize: v })}
                options={sizes.map((z) => [z.key, z.label])} />
            ) : (
              <select value={form.vehicleSize} onChange={(e) => set({ vehicleSize: e.target.value })}>
                {sizes.map((z) => <option key={z.key} value={z.key}>{z.label}</option>)}
              </select>
            )}</label>
        </div>
        <label className="field"><span>{t("Make and model (optional)")}</span>
          <input value={form.vehicleModel} onChange={(e) => set({ vehicleModel: e.target.value })} /></label>

        {/* ROADMAP 8.10 — only a business that has raised its own limit sees
            any of this. One car is the resting state and the payload is then
            byte-identical to the one this form has always sent. */}
        {cap > 1 && (
          <label className="field"><span>{t("How many cars")}</span>
            <Segmented value={String(cars)}
              onChange={(v) => set({ extraVehicles: setVehicleCount(form, Number(v), settings) })}
              options={Array.from({ length: cap }, (_, i) => [String(i + 1), String(i + 1)])} /></label>
        )}
        {(form.extraVehicles ?? []).map((v, i) => (
          <div className="grid2" key={i}>
            <label className="field"><span>{t("Car {n} size", { n: i + 2 })}</span>
              <select value={v.size} onChange={(e) => {
                const next = [...form.extraVehicles];
                next[i] = { ...next[i], size: e.target.value };
                set({ extraVehicles: next });
              }}>
                {sizes.map((z) => <option key={z.key} value={z.key}>{z.label}</option>)}
              </select></label>
            <label className="field"><span>{t("Car {n} model", { n: i + 2 })}</span>
              <input value={v.model ?? ""} onChange={(e) => {
                const next = [...form.extraVehicles];
                next[i] = { ...next[i], model: e.target.value };
                set({ extraVehicles: next });
              }} /></label>
          </div>
        ))}

        {s.ask_vehicle_condition && (
          <label className="field"><span>{t("Condition")}</span>
            <Segmented value={form.vehicleCondition || "light"}
              onChange={(v) => set({ vehicleCondition: v })}
              options={VEHICLE_CONDITIONS.map((c) => [c.key, t(c.label)])} /></label>
        )}
      </Block>

      {/* ROADMAP 9.9 — the mobile/drop-off choice used to sit under the
          VEHICLE heading, which answers "what", not "where". It is the
          first question this block asks now; the address fields below it
          stay conditional on the answer being Mobile. */}
      {(s.mobile_enabled && s.dropoff_enabled || mobile) && (
        <Block title={t("Where")}>
          {/* Only a business that offers both is asked. */}
          {s.mobile_enabled && s.dropoff_enabled && (
            <label className="field"><span>{t("Type")}</span>
              <Segmented value={form.serviceType}
                onChange={(v) => set({ serviceType: v, startTime: "" })}
                options={[["mobile", "Mobile"], ["dropoff", "Drop-off"]]} /></label>
          )}
          {mobile && (
            <>
              <label className="field"><span>{t("Address")}</span>
                <input value={form.customerAddress} onChange={(e) => set({ customerAddress: e.target.value })} /></label>
              {/* The travel charge was simply never applied to a booking made
                  here, so a job forty minutes out was quoted as if it were next
                  door and the detailer read that number to the customer. */}
              {zones.length > 0 && (
                <label className="field"><span>{t("Travel zone")}</span>
                  <select value={form.travelZone} onChange={(e) => set({ travelZone: e.target.value })}>
                    {zones.map((z) => (
                      <option key={z.key} value={z.key}>
                        {z.label}{z.fee ? ` · ${money(z.fee)}` : ""}
                      </option>
                    ))}
                  </select></label>
              )}
              {(askWater || askPower) && (
                <div className="grid2">
                  {askWater && (
                    <label className="field"><span>{t("Water on site")}</span>
                      <Segmented value={form.hasWater ? "y" : "n"}
                        onChange={(v) => set({ hasWater: v === "y" })}
                        options={[["y", "Yes"], ["n", "No"]]} /></label>
                  )}
                  {askPower && (
                    <label className="field"><span>{t("Power on site")}</span>
                      <Segmented value={form.hasPower ? "y" : "n"}
                        onChange={(v) => set({ hasPower: v === "y" })}
                        options={[["y", "Yes"], ["n", "No"]]} /></label>
                  )}
                </div>
              )}
            </>
          )}
        </Block>
      )}

      <Block title={t("Services")}>
        {/* ROADMAP 9.8 — UNKNOWN IS NOT THE SAME SCREEN AS KNOWN-EMPTY. Before
            the fetch answers, `catalog.services` is `[]` for the same reason
            it would be for a detailer with genuinely no active services —
            nothing distinguished "has not asked yet" from "asked and there
            is nothing", so this block told every detailer opening a slow
            connection that they had no services at all. Three pills instead
            of the sentence below until `catalogLoaded` is true; the sentence
            itself only fires once the answer is actually known. */}
        {!catalogLoaded ? (
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <div className="nb-chip-skel" style={{ "--w": "92px" }} />
            <div className="nb-chip-skel" style={{ "--w": "68px" }} />
            <div className="nb-chip-skel" style={{ "--w": "110px" }} />
          </div>
        ) : (
          <>
            {/* GROUPED THE WAY THE CUSTOMER'S PAGE GROUPS THEM. A detailer with
                twenty services had them in one undifferentiated wrap of chips
                here and in their own categories on their own booking page. */}
            {grouped.map((g) => (
              <div key={g.key || "ungrouped"} className="nb-group">
                {/* `groupServices` returns { key, name, items } — a detailer with
                    no categories gets ONE group whose name is "", and a heading
                    over the only list on screen is the copy rule's own example of
                    a sentence that says what the control already says. */}
                {grouped.length > 1 && g.name && <p className="quiet nb-grouplabel">{g.name}</p>}
                <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                  {g.items.map((sv) => (
                    <button key={sv.id} className={`chip ${form.serviceIds.includes(sv.id) ? "active" : ""}`}
                      onClick={() => set({
                        serviceIds: toggleService(form.serviceIds, sv.id, {
                          services: catalog.services, serviceGroups: catalog.groups,
                        }),
                        startTime: "",
                      })}>
                      {sv.name} · {money(sv.price)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {catalog.services.length === 0 &&
              <p className="muted">{t("No active services yet. Add them in the More tab under Services.")}</p>}
          </>
        )}

        {catalogLoaded && catalog.addOns.length > 0 && (
          <>
            <p className="quiet nb-grouplabel">{t("Add-ons")}</p>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {catalog.addOns.map((a) => (
                <button key={a.id} className={`chip ${form.addOns.includes(a.id) ? "active" : ""}`}
                  onClick={() => set({
                    addOns: form.addOns.includes(a.id)
                      ? form.addOns.filter((x) => x !== a.id)
                      : [...form.addOns, a.id],
                    startTime: "",
                  })}>
                  {a.name} · {money(a.price)}
                </button>
              ))}
            </div>
          </>
        )}
      </Block>

      <Block title={t("When")}>
        <label className="field"><span>{t("Date")}</span>
          <input type="date" value={form.bookingDate}
            onChange={(e) => set({ bookingDate: e.target.value, startTime: "" })} /></label>
        {!form.serviceIds.length && <p className="quiet">{t("Pick a service and the open times appear.")}</p>}
        {slots && (
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {slots.map((sl) => (
              <button key={sl} className={`chip ${form.startTime === sl ? "active" : ""}`}
                onClick={() => set({ startTime: sl })}>
                {time12(sl)}
              </button>
            ))}
            {slots.length === 0 && <p className="muted">{t("No open slots that day.")}</p>}
          </div>
        )}
      </Block>

      <Block title={t("Price and notes")}>
        {/* A promo code a customer can type and a detailer cannot is the
            shape of this whole item: the feature exists, the by-hand form
            just never grew the field. Validated by the same function the
            booking page calls, so an expired or used-up code is refused here
            for the same reason it is refused there. */}
        <label className="field"><span>{t("Promo code (optional)")}</span>
          <div className="row" style={{ gap: 8 }}>
            <input value={form.promoCode}
              onChange={(e) => { set({ promoCode: e.target.value }); setPromoState(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }} />
            <button className="btn sm inline" disabled={checkingPromo || !form.promoCode.trim()}
              onClick={applyPromo}>{checkingPromo ? t("Checking…") : t("Apply")}</button>
          </div></label>
        {promoState && (
          <div className={promoState.ok ? "ok-box" : "error-box"}>{promoState.text}</div>
        )}

        <label className="field"><span>{t("Note from the customer (optional)")}</span>
          <input value={form.customerNotes} onChange={(e) => set({ customerNotes: e.target.value })} /></label>
        <label className="field"><span>{t("Private note")}</span>
          <input value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} /></label>

        {/* THE BREAKDOWN, NOT ONE NUMBER. The old sheet printed "Estimated
            total" and nothing else, which is unreadable the moment a travel
            fee, a size surcharge, a plan or a promo is in play — and all four
            are new here. Every line is the server's own figure. */}
        {quote && (
          <div className="card nb-quote">
            {/* A SUBTOTAL LINE THAT EQUALS THE TOTAL SAYS NOTHING — the
                owner's copy rule, applied to a number instead of a sentence.
                One service and no surcharge is the commonest booking there
                is, and "Services $65 / Total $65" is that case printed twice. */}
            {adjusted && (
              <div className="row between"><span>{t("Services")}</span><span>{money(quote.subtotal)}</span></div>
            )}
            {quote.vehicle_size_fee > 0 && (
              <div className="row between"><span>{t("Vehicle size")}</span><span>{money(quote.vehicle_size_fee)}</span></div>
            )}
            {quote.travel_fee > 0 && (
              <div className="row between">
                <span>{quote.travel_zone ? t("Travel · {zone}", { zone: quote.travel_zone }) : t("Travel")}</span>
                <span>{money(quote.travel_fee)}</span>
              </div>
            )}
            {quote.promo_discount > 0 && (
              <div className="row between">
                <span>{t("Promo {code}", { code: quote.promo_code })}</span>
                <span>-{money(quote.promo_discount)}</span>
              </div>
            )}
            {quote.site_discount > 0 && (
              <div className="row between"><span>{t("Discount")}</span><span>-{money(quote.site_discount)}</span></div>
            )}
            <div className="row between nb-total"><strong>{t("Total")}</strong><strong>{money(quote.total)}</strong></div>
          </div>
        )}
      </Block>

      {error && <div className="error-box">{error}</div>}
      <button className="btn primary" disabled={busy || !ready} onClick={create}>
        {busy ? t("Booking…") : t("Create booking")}
      </button>
    </Sheet>
  );
}
