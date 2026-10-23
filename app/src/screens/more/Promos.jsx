// Promo codes + the site-wide sale. Codes are unique per business — two
// different detailers can both run "SUMMER10".
//
// ═══════════════════════════════════════════════════════════════════════════
// REBUILT 2026-09-13 — THE CODE COMPOSER WAS FOUR NAKED BOXES AND A CHECKBOX
// ═══════════════════════════════════════════════════════════════════════════
//
// Picked by counting, the way Business info was: the SALE half of this screen
// was already the product's own vocabulary — `Group`, `Switch`, `Setting`,
// `DurationChoice` — and the CODES half, eight lines below it, was `Code`,
// `Value`, `Usage limit (blank = unlimited)` and a raw `<input
// type="checkbox">`. One screen speaking two languages, with the better one
// sitting directly above the worse one for comparison.
//
// **THE FAULT WAS NOT THE NUMBER OF BOXES. IT WAS THAT EVERY RELATIONSHIP ON
// THIS SCREEN WAS DESCRIBED SOMEWHERE ELSE OR NOWHERE.**
//
//   - `Value` meant dollars or percent depending on `Type`, a control two
//     boxes away, and said so NOWHERE. A detailer typing 20 got 20% off or
//     $20 off and the screen never told them which. **The control IS the unit
//     now:** `% off` draws the same `DurationChoice` the sale above uses,
//     `$ off` draws `MoneyField`, which has the dollar sign inside the box.
//   - `Usage limit (blank = unlimited)` put the rule in brackets in the label,
//     which is the exact shape Business info was rebuilt out of. An empty box
//     meaning unlimited is a fact nothing on screen carries. It is a
//     `Segmented` now: *No limit* or *A set number*, and the number only
//     exists once you have said you want one.
//   - **THE CONSEQUENCE IS A SENTENCE, not arithmetic the detailer does.**
//     The sale's switch has always said "Every booking is 15% cheaper right
//     now"; the code composer said nothing at all. It now says what a customer
//     typing this code actually pays, in that code's own words.
//
// **BOTH LIMITS ARE BEHIND A `Folded` ROW, because both have a default nobody
// changes** — no limit, reusable — and `Folded`'s own rule is that the summary
// must state the current setting in words. It does: *"No limit · reusable by
// the same customer"*. The common case is three rows now, not five.
//
// **THE EXISTING CODES ARE A `.menu-row` LIST AND NOT CARDS INSIDE A CARD.**
// They were `.card row between` nested in the composer's own `.card`, so the
// screen had a card containing cards. `.menu-row` is Catalog's shape and
// Business info's, and `span.menu-name` exists precisely for a row whose name
// is not a button — these are read and toggled, never edited.
//
// LAW 1, HONESTLY: two settings groups and one ruled list of rows. Business
// info shipped four `Group`s the night before, so a settings screen being made
// of settings groups is the product's answer rather than a shortcut — the
// variety is in the CONTROLS inside them, and in the list being a list.
//
// FIVE STRINGS ON THIS SCREEN RENDERED IN ENGLISH ON A SPANISH DASHBOARD and
// four of them already had Spanish sitting in `appEs.js`, waiting for a `t()`
// that was never added: "Code added.", "Sale settings saved.", the sale blurb,
// "Activate"/"Deactivate" and "· once per customer". The fifth, the sale's own
// "Every booking is N% cheaper right now", had no key at all. Same family as
// the bare JSX text Catalog's header warns about: `i18n-coverage` counts
// `t("literal")`, so a string outside a call is invisible to it.
//
// ONE BUG, AND IT IS OLD: `addCode` cleared `code` and `value` OUTSIDE the
// error branch, so a duplicate code — the single most likely failure on this
// form — printed the error and wiped what had just been typed.

import { Fragment, useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { money } from "../../lib/format.js";
// Segmented was USED at the type picker and never imported — the Promos
// screen crashed the whole app the moment it rendered. Found by roadmap
// 2.3's settings sweep; pre-existing, not caused by the restyle.
import { DurationChoice, Folded, Group, MoneyField, Segmented, Setting, Switch } from "../../components/controls.jsx";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";
// ROADMAP 101.8 - Save sale stays disabled while a running sale has no real
// percentage, so a 0% "sale" can never be published.
import { saleSaveBlocked, saleSaveDisabled, withBusy } from "../../lib/sale.js";

// The sale's own ladder, reused rather than re-chosen. A discount a detailer
// offers is the same set of round numbers whether it is site-wide or behind a
// code, and two different preset lists on one screen would be the product
// disagreeing with itself within twelve inches.
const OFF_PRESETS = [[5, "5%"], [10, "10%"], [15, "15%"], [20, "20%"], [25, "25%"]];
// What a flyer actually says. `Custom` covers everything else, so this is a
// shortcut and never a ceiling — which is the one thing the old
// `<input type="number">` could not be, having no shortcut at all.
const USE_PRESETS = [[10, "10"], [25, "25"], [50, "50"], [100, "100"]];

export default function Promos() {
  useAppLocale();
  const { business, settings, reload } = useBusiness();
  // ROADMAP 101.3 - `null` while loading, so a failed load and an empty list
  // are no longer the same screen.
  const [codes, setCodes] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percentage", value: "", usage_limit: "", once_per_customer: false });
  const [sale, setSale] = useState({
    active: settings?.site_discount_active ?? false,
    percent: String(settings?.site_discount_percent ?? 0),
    label: settings?.site_discount_label ?? "",
  });
  // ROADMAP 101.3 - one message per button, drawn directly under the button
  // that was pressed. A single shared message drew under the whole list, out
  // of view at 390, so Add code and Save sale looked like they did nothing.
  const [saleMsg, setSaleMsg] = useState(null);
  const [codeMsg, setCodeMsg] = useState(null);
  // { id, text } - a failed Activate/Deactivate, shown under that code's row.
  const [rowErr, setRowErr] = useState(null);
  // Self-review 1 (101.8) - Billing's own `busy` shape, so a second press
  // while the save is in flight is refused, not sent twice.
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("promo_codes").select("*").eq("business_id", business.id).order("created_at", { ascending: false });
    setLoadFailed(Boolean(error));
    setCodes(error ? [] : data ?? []);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const addCode = async () => {
    if (!form.code.trim() || !Number(form.value)) return;
    setCodeMsg(null);
    const code = form.code.trim().toUpperCase();
    const { error } = await supabase.from("promo_codes").insert({
      business_id: business.id,
      code,
      type: form.type,
      value: Number(form.value),
      usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
      once_per_customer: form.once_per_customer,
    });
    // **THE RESET USED TO RUN WHETHER OR NOT THE INSERT WORKED**, so the one
    // failure this form actually produces — a code that already exists — threw
    // away what had just been typed along with the error about it.
    // 23505 is the unique (business, code) constraint: say it in words, not
    // the database's own "duplicate key value violates…".
    if (error) {
      setCodeMsg({ ok: false, text: error.code === "23505" ? t("You already have a code called {code}.", { code }) : error.message });
      return;
    }
    setCodeMsg({ ok: true, text: t("Code added.") });
    setForm({ ...form, code: "", value: "" });
    load();
  };

  const toggleCode = async (c) => {
    setRowErr(null);
    // ROADMAP 101.3 - the error used to be ignored, so a failed Deactivate
    // looked like a button that did nothing.
    const { error } = await supabase.from("promo_codes").update({ is_active: !c.is_active }).eq("id", c.id).eq("business_id", business.id);
    if (error) setRowErr({ id: c.id, text: c.is_active ? t("Could not deactivate {code}. Try again.", { code: c.code }) : t("Could not activate {code}. Try again.", { code: c.code }) });
    load();
  };

  const saveSale = async () => {
    // ROADMAP 101.8 - the disabled button is the refusal; this guard is the
    // belt-and-braces so a 0% running sale is never written.
    if (busy || saleSaveBlocked(sale)) return;
    // ROADMAP 101.8 F1 - the whole write runs inside `withBusy`, so a throw
    // (the read-only preview guard throws during `update`) still clears the
    // flag and a later retry is permitted.
    await withBusy(setBusy, async () => {
      setSaleMsg(null);
      const { error } = await supabase.from("business_settings").update({
        site_discount_active: sale.active,
        site_discount_percent: Number(sale.percent) || 0,
        site_discount_label: sale.label.trim() || null,
      }).eq("business_id", business.id);
      setSaleMsg(error ? { ok: false, text: error.message } : { ok: true, text: t("Sale settings saved.") });
      if (!error) reload();
    });
  };

  // WHAT A CUSTOMER GETS, IN WORDS. One key per shape rather than English
  // glued around a number — Spanish puts the preposition somewhere else, which
  // is `appEs.js`'s own rule at the top of that file.
  const offWords = (type, value) =>
    type === "percentage"
      ? t("{n}% off", { n: Number(value) || 0 })
      : t("{amount} off", { amount: money(Number(value) || 0) });

  // The composer's live consequence. The code is the DETAILER'S OWN WORD and
  // is interpolated untouched — never translated.
  const consequence = () => {
    // NOT "Pick how much comes off" — that repeated the label above it and told
    // a detailer nothing the control does not already say, which is the copy
    // rule Andrew set in 2026-09-01. The empty state carries the one fact the
    // two segments do not: what the choice between them actually decides.
    if (!Number(form.value)) return t("A percentage scales with the size of the job. A dollar amount is the same on every job.");
    if (!form.code.trim()) return t("A customer who types the code gets {off}.", { off: offWords(form.type, form.value) });
    return t("A customer who types {code} gets {off}.", { code: form.code.trim(), off: offWords(form.type, form.value) });
  };

  // `Folded`'s summary has to STATE the current setting, or the row has hidden
  // something instead of putting it away.
  // **AND IT HAS TO FIT. `.nav-row .now` CLAMPS TO ONE LINE**, so at 320 in
  // Spanish "Sin límite · el mismo cliente lo puede volver a usar" came back as
  // "Sin límite · el mismo cliente lo pued…" — a summary that has hidden half
  // of what it exists to say. So the DEFAULT half is dropped: "reusable by the
  // same customer" is what every code is unless somebody says otherwise, and a
  // clause that is true of everything carries nothing. Only the exception is
  // worth the width.
  const limitWords = [
    form.usage_limit === "" ? t("No limit") : t("{n} uses in total", { n: Number(form.usage_limit) }),
    form.once_per_customer ? t("once per customer") : null,
  ].filter(Boolean).join(" · ");

  const live = (codes ?? []).filter((c) => c.is_active).length;

  return (
    <>
      <Group title={t("Site-wide sale")}
        blurb={t("Comes off every booking automatically. No code for the customer to enter.")}>
        <Switch label={t("Sale is running")} checked={sale.active}
          help={sale.active
            ? t("Every booking is {n}% cheaper right now.", { n: Number(sale.percent) || 0 })
            : undefined}
          onChange={(v) => setSale({ ...sale, active: v })} />
        {sale.active && (
          <>
            <Setting label={t("How much off")} stacked
              help={t("Applied before any promo code the customer enters.")}>
              <DurationChoice value={Number(sale.percent) || 0} unit="percent" customMax={90}
                presets={OFF_PRESETS}
                onChange={(v) => setSale({ ...sale, percent: v })} />
            </Setting>
            <Setting label={t("What to call it")} stacked
              help={t("Shown on the booking page beside the discount. Leave blank for just the percentage.")}>
              <input value={sale.label} placeholder={t("e.g. Spring Sale")}
                onChange={(e) => setSale({ ...sale, label: e.target.value })} />
            </Setting>
          </>
        )}
      </Group>
      <button className="btn" onClick={saveSale} disabled={saleSaveDisabled(sale, busy)} style={{ marginBottom: "var(--sp-5)" }}>{t("Save sale")}</button>
      {saleMsg && <div className={saleMsg.ok ? "ok-box" : "error-box"} style={{ marginTop: "calc(-1 * var(--sp-4))", marginBottom: "var(--sp-5)" }}>{saleMsg.text}</div>}

      <Group title={t("Promo codes")}
        blurb={t("A word the customer types when booking. The sale above comes off first.")}>
        {/* SIZED TO ITS CONTENT (CLAUDE.md § SCREEN RULES). A promo code is a
            short word, and a short word in a 690px box at 1440 is part of what
            made every row on this screen the same shape. The wrapper is a
            `<label>` and not a `<span>`, because the sizing rule is
            `label.field.w-code > input` — the same trap that rendered Business
            info's year and phone full width.
            UPPERCASED AS YOU TYPE, because `addCode` uppercases it on the way
            to the database anyway. Showing "summer10" and storing "SUMMER10"
            is the product quietly disagreeing with what it just showed. */}
        <Setting label={t("Code")}>
          <label className="field w-code">
            <input value={form.code} placeholder="SUMMER10"
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </label>
        </Setting>

        {/* **THE UNIT IS THE CONTROL, NOT A LABEL TO REMEMBER.** These were two
            separate boxes — a segmented `% off / $ off` and a bare number — and
            nothing joined them, so the number meant something different
            depending on a control above it that the screen never mentioned
            again. A percentage gets the sale's own ladder; an amount gets the
            field with the dollar sign inside it. */}
        <Setting label={t("How much off")} stacked help={consequence()}>
          <div className="tight">
            <Segmented value={form.type} label={t("Type of discount")}
              onChange={(v) => setForm({ ...form, type: v })}
              options={[["percentage", "% off"], ["amount", "$ off"]]} />
            {form.type === "percentage" ? (
              <DurationChoice value={form.value === "" ? "" : Number(form.value)} unit="percent" customMax={90}
                presets={OFF_PRESETS}
                onChange={(v) => setForm({ ...form, value: String(v) })} />
            ) : (
              <MoneyField value={form.value} onChange={(v) => setForm({ ...form, value: v })} />
            )}
          </div>
        </Setting>

        {/* TWO SETTINGS WITH A DEFAULT NOBODY CHANGES — no limit, reusable — so
            they are put away rather than hidden, and the row says what they
            currently are. */}
        <Folded name={t("Limits")} now={limitWords}>
          <Setting label={t("How many times it can be used")} stacked>
            <div className="tight">
              <Segmented value={form.usage_limit === "" ? "any" : "some"}
                label={t("How many times it can be used")}
                onChange={(v) => setForm({ ...form, usage_limit: v === "any" ? "" : "10" })}
                options={[["any", "No limit"], ["some", "A set number"]]} />
              {form.usage_limit !== "" && (
                <DurationChoice value={Number(form.usage_limit)} unit="uses" customMax={100000}
                  presets={USE_PRESETS}
                  onChange={(v) => setForm({ ...form, usage_limit: String(v) })} />
              )}
            </div>
          </Setting>
          {/* A `Switch`, not a raw `<input type="checkbox">`. The one on this
              screen sat fifty lines under a `Switch` doing the same job for the
              sale, which is two answers to one question on one screen. */}
          <Switch label={t("One use per customer")}
            help={form.once_per_customer
              ? t("Each customer can use it once, however many uses are left.")
              : undefined}
            checked={form.once_per_customer}
            onChange={(v) => setForm({ ...form, once_per_customer: v })} />
        </Folded>
      </Group>

      <button className="btn" onClick={addCode}
        disabled={!form.code.trim() || !Number(form.value)}
        style={{ marginBottom: "var(--sp-5)" }}>{t("Add code")}</button>
      {codeMsg && <div className={codeMsg.ok ? "ok-box" : "error-box"} style={{ marginTop: "calc(-1 * var(--sp-4))", marginBottom: "var(--sp-5)" }}>{codeMsg.text}</div>}

      {/* THE LIST IS A DIFFERENT SHAPE FROM THE TWO GROUPS ABOVE IT (law 1),
          and it is the shape Catalog and Business info already use. The count
          is in the heading because "how many of these are live" is the one
          question this list answers that no single row can. */}
      {loadFailed && <div className="error-box">{t("Could not load your promo codes.")}</div>}
      {codes?.length === 0 && !loadFailed && <p className="muted">{t("No codes yet.")}</p>}
      {codes?.length > 0 && (
        <div className="tight">
          <span className="label">{t("Your codes · {n} live", { n: live })}</span>
          <div className="credlist">
            {codes.map((c) => (
              <Fragment key={c.id}>
              <div className={`menu-row${c.is_active ? "" : " off"}`}>
                <span className="menu-name">
                  {/* A promo code is USER DATA with no spaces in it — the case
                      `.member-id` was written for. `.n` ellipses rather than
                      overflowing, which is the same answer. */}
                  <span className="n">{c.code}</span>
                  <span className="m">
                    {offWords(c.type, c.value)}
                    {" · "}
                    {c.usage_limit
                      ? t("{used} of {limit} used", { used: c.times_used, limit: c.usage_limit })
                      : t("used {n} times", { n: c.times_used })}
                    {c.once_per_customer ? ` · ${t("once per customer")}` : ""}
                  </span>
                </span>
                <button className="btn sm inline ghost" onClick={() => toggleCode(c)}>
                  {c.is_active ? t("Deactivate") : t("Activate")}
                </button>
              </div>
              {rowErr?.id === c.id && <div className="error-box">{rowErr.text}</div>}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
