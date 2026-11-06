// THE SITE SPEC: what a Studio revision holds, and the check that refuses a bad one.
// STUDIO-SPEC.md §2c layer 1 and §6c. Pure JS — no React, no DOM — so the Studio,
// the connection check and node tests run exactly this file.
//
// A spec has NO PLACE FOR A FACT. Prices, services, hours, photos, reviews, the
// phone number: none of them can be written into a spec. They appear only as
// bindings, short allow-listed addresses the renderer looks up in the detailer's
// public profile every time a customer opens the page. `validateSpec` refuses:
//   - an unknown binding shape                    (code "unknown_binding")
//   - a binding to an id the profile lacks        (code "missing_id")
//   - a digit, currency sign or % typed into copy (code "typed_fact")
//   - any key the schema does not name            (code "unknown_key")
// so "$185" in a headline cannot be saved, and a binding to a deleted service fails.
import { faqFor, groupServices, paymentMethods } from "../book/core.js";

// ---------------------------------------------------------------- bindings
// The whole allow-list. No expressions: a binding is one of these shapes or nothing.
const SHAPES = [
  ["service", /^service:([\w-]+)\.(name|price|description|duration|features|sizes)$/],
  ["service_group", /^service_group:([\w-]+)$/],
  ["add_ons", /^add_ons$/],
  ["plans", /^plans$/],
  ["sale", /^sale$/],
  ["gallery", /^gallery:([\w-]+)$/],
  ["gallery.best", /^gallery\.best\(([1-9]|1[0-9]|20)\)$/],
  ["reviews.top", /^reviews\.top\(([1-9]|1[0-9]|20)\)$/],
  ["hours.week", /^hours\.week$/],
  ["area", /^area$/],
  ["contact.phone", /^contact\.phone$/],
  ["faq", /^faq$/],
  ["pay", /^pay$/],
  ["book", /^book$/],
];

/** "service:302.price" → { kind:"service", id:"302", field:"price" }; anything else → null. */
export function parseBinding(text) {
  if (typeof text !== "string") return null;
  for (const [kind, re] of SHAPES) {
    const m = re.exec(text);
    if (!m) continue;
    if (kind === "service") return { kind, id: m[1], field: m[2] };
    if (kind === "service_group" || kind === "gallery") return { kind, id: m[1] };
    if (kind === "gallery.best" || kind === "reviews.top") return { kind, n: Number(m[1]) };
    return { kind };
  }
  return null;
}

// ---------------------------------------------------------------- the schema
// Per section type: its copy fields (prose, never facts), its binding slots and
// which binding kinds each slot takes, and its variants. Five types for S1.
export const SECTION_TYPES = {
  hero: {
    variants: ["poster"],
    copy: { eyebrow: false, headline: true, sub: false },
    slots: { photo: ["gallery", "gallery.best"], prices: ["service_group"], cta: ["book"], call: ["contact.phone"], area: ["area"], sale: ["sale"] },
  },
  catalog: {
    variants: ["ticket"],
    copy: { title: true, intro: false },
    slots: { group: ["service_group"], add_ons: ["add_ons"], plans: ["plans"], sale: ["sale"] },
  },
  proof: {
    variants: ["wipe"],
    copy: { title: true, intro: false },
    slots: { gallery: ["gallery.best", "gallery"], reviews: ["reviews.top"] },
  },
  visit: {
    variants: ["board"],
    copy: { title: true, intro: false },
    slots: { hours: ["hours.week"], area: ["area"], contact: ["contact.phone"], faq: ["faq"], pay: ["pay"] },
  },
  booking: {
    variants: ["inline"],
    copy: { title: true, intro: false },
    slots: { book: ["book"] },
  },
};

// Fonts are a curated list, not free text: the axes each one is loaded with.
export const FONTS = {
  Newsreader: "ital,opsz,wght@0,6..72,400..800;1,6..72,400..600",
  Chivo: "wght@400..800",
};
const HEX = /^#[0-9a-f]{6}$/i;
// Own-key lookups only: `"toString" in FONTS` is true, `Object.hasOwn(FONTS, "toString")` is not.
const own = (table, key) => typeof key === "string" && Object.hasOwn(table, key);
const TOKENS = {
  font_display: (v) => own(FONTS, v), font_body: (v) => own(FONTS, v),
  ink: (v) => HEX.test(v), paper: (v) => HEX.test(v), paper_2: (v) => HEX.test(v),
  accent: (v) => HEX.test(v), on_accent: (v) => HEX.test(v), soft: (v) => HEX.test(v),
  radius: (v) => Number.isInteger(v) && v >= 0 && v <= 24,
};

// Tokens a site cannot be drawn without. The rest fall back to these.
const REQUIRED_TOKENS = ["paper", "ink", "accent", "font_display", "font_body"];

// A NUMBER IN PROSE IS A FACT TYPED BY HAND, in any of the ways one can be typed:
// - any digit in any script (Nd: 1, １, ١), any other numeric character
//   (No: ⑱, ½, ²; Nl: Ⅶ), any currency sign (Sc: $ ₹ ¥ ₩ ₽ ₱ …), and %;
// - Roman numerals of two or more letters from I, V, X ("VII days", "XX years").
//   L, C, D and M are left out on purpose: "LLC", "CD", "DC" are ordinary words;
// - number words. "one" is NOT on the list, on purpose: it is mostly a pronoun
//   ("the one place", "no one", "one-stop"), so listing it would refuse good copy.
//   "free" and "half" ARE on it, because "free wax" and "half price" are price
//   claims ("feel free" is refused too; reword it). Words match whole, plural
//   allowed, and a word that ENDS a hyphenated compound is allowed, so "often",
//   "weight", "hassle-free" and "streak-free" pass while "five-star",
//   "twenty-four", "free wax" and "hundreds" are refused.
// This cannot catch every way of writing a number ("a couple", "a few bucks" is
// caught, "a few" is not); the critic is the backstop for prose, this is the floor.
const TYPED_FACT = /[\p{Nd}\p{No}\p{Nl}\p{Sc}%]/u;
const ROMAN = /(?<![\p{L}])[IVX]{2,}(?![\p{L}])/u;
const NUMBER_WORDS = new RegExp(`(?<![\\p{L}-])(${[
  "zero", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "thirty",
  "forty", "fifty", "sixty", "seventy", "eighty", "ninety", "hundred", "thousand", "million", "billion",
  "dozen", "half", "percent", "free", "dollar", "buck",
].join("|")})s?(?![\\p{L}])`, "iu");
/** The typed fact in a piece of prose, or null. Exported for the Studio's text box. */
export function typedFact(text) {
  return TYPED_FACT.exec(text)?.[0] ?? ROMAN.exec(text)?.[0] ?? NUMBER_WORDS.exec(text)?.[0] ?? null;
}
// Ids and paths end up in addresses and the picker; they carry no numbers either.
const ID = /^[a-z]+(-[a-z]+)*$/;

// ---------------------------------------------------------------- validation
/**
 * @param spec     the revision's JSON
 * @param profile  normalizeProfile(get_public_business_profile(...)) — or null to
 *                 check shape only (ids are then unchecked)
 * @returns { ok, errors: [{ path, code, message }] }
 */
// `live: true` is the renderer's own check on a customer's visit. There a photo
// the detailer has since deleted only drops out of its slot (the section draws
// without it, §2a "no empty box"), instead of taking the whole site down. Every
// other missing id still refuses, and saving a revision (no `live`) refuses a
// missing photo too.
export function validateSpec(spec, profile = null, { live = false } = {}) {
  const errors = [];
  const err = (path, code, message) => errors.push({ path, code, message });
  const keysOnly = (obj, allowed, path) => {
    for (const k of Object.keys(obj)) if (!allowed.includes(k)) err(`${path}.${k}`, "unknown_key", `"${k}" is not part of the spec`);
  };
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return { ok: false, errors: [{ path: "", code: "bad_shape", message: "A spec is a JSON object" }] };
  keysOnly(spec, ["schema", "slug", "tokens", "pages"], "spec");
  if (spec.schema !== 1) err("spec.schema", "bad_shape", "schema must be 1");
  // S1 specs are committed examples, bound to a slug no real business can hold (see site/main.jsx).
  if (typeof spec.slug !== "string" || !/^example_[a-z0-9-]+$/.test(spec.slug)) err("spec.slug", "bad_shape", "an example spec's slug is example_<name>");

  const tokens = spec.tokens;
  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) err("spec.tokens", "bad_shape", "tokens are required");
  else {
    for (const [k, v] of Object.entries(tokens)) {
      if (!own(TOKENS, k)) err(`spec.tokens.${k}`, "unknown_key", `"${k}" is not a design token`);
      else if (!TOKENS[k](v)) err(`spec.tokens.${k}`, "bad_shape", `${JSON.stringify(v)} is not allowed for ${k}`);
    }
    for (const k of REQUIRED_TOKENS) if (!Object.hasOwn(tokens, k)) err(`spec.tokens.${k}`, "bad_shape", `${k} is required`);
  }

  // One page until multi-page exists: the renderer draws "/" and nothing else.
  if (!Array.isArray(spec.pages) || spec.pages.length !== 1) err("spec.pages", "bad_shape", 'exactly one page, "/", is supported');
  const ids = new Set();
  const count = { hero: 0, booking: 0 };
  (Array.isArray(spec.pages) ? spec.pages : []).forEach((page, pi) => {
    const pp = `spec.pages[${pi}]`;
    if (!page || typeof page !== "object") return err(pp, "bad_shape", "a page is an object");
    keysOnly(page, ["path", "sections"], pp);
    if (page.path !== "/") err(`${pp}.path`, "bad_shape", 'the only page is "/"');
    if (!Array.isArray(page.sections)) return err(`${pp}.sections`, "bad_shape", "sections must be a list");
    page.sections.forEach((sec, si) => {
      const sp = `${pp}.sections[${si}]`;
      if (!sec || typeof sec !== "object" || Array.isArray(sec)) return err(sp, "bad_shape", "a section is an object");
      if (!own(SECTION_TYPES, sec.type)) return err(`${sp}.type`, "unknown_type", `unknown section type ${JSON.stringify(sec.type)}`);
      const type = SECTION_TYPES[sec.type];
      if (Object.hasOwn(count, sec.type)) count[sec.type]++;
      if (typeof sec.id !== "string" || !ID.test(sec.id)) err(`${sp}.id`, "bad_shape", "id must be lower-case words joined by dashes, no digits");
      else if (ids.has(sec.id)) err(`${sp}.id`, "bad_shape", `duplicate section id ${sec.id}`);
      else ids.add(sec.id);
      if (sec.variant !== undefined && !type.variants.includes(sec.variant)) err(`${sp}.variant`, "bad_shape", `${sec.type} has no variant ${JSON.stringify(sec.variant)}`);
      keysOnly(sec, ["id", "type", "variant", "copy", ...Object.keys(type.slots)], sp);

      const copy = sec.copy ?? {};
      if (typeof copy !== "object" || Array.isArray(copy)) err(`${sp}.copy`, "bad_shape", "copy is an object of strings");
      else {
        keysOnly(copy, Object.keys(type.copy), `${sp}.copy`);
        for (const [k, required] of Object.entries(type.copy)) {
          const v = copy[k];
          if (v === undefined) { if (required) err(`${sp}.copy.${k}`, "bad_shape", `${k} is required`); continue; }
          if (typeof v !== "string" || !v.trim()) { err(`${sp}.copy.${k}`, "bad_shape", `${k} must be text`); continue; }
          const hit = typedFact(v);
          // The whole word that holds it ("$185", not "$"), and the reason in plain words: the Studio shows this as is.
          const word = v.split(/\s+/).find((w) => typedFact(w))?.replace(/^[^\p{L}\p{N}\p{Sc}%]+|[^\p{L}\p{N}\p{Sc}%]+$/gu, "") || hit;
          if (hit) err(`${sp}.copy.${k}`, "typed_fact", `"${word}" is a price or a number typed into the wording. Prices, hours and other facts come from the dashboard, so they cannot be typed in.`);
        }
      }

      for (const [slot, kinds] of Object.entries(type.slots)) {
        const v = sec[slot];
        if (v === undefined) continue;
        const at = `${sp}.${slot}`;
        if (!v || typeof v !== "object" || Array.isArray(v)) { err(at, "bad_shape", `${slot} must be { "bind": "..." }`); continue; }
        keysOnly(v, ["bind"], at);
        const b = parseBinding(v.bind);
        if (!b) { err(`${at}.bind`, "unknown_binding", `${JSON.stringify(v.bind)} is not an allowed binding`); continue; }
        if (!kinds.includes(b.kind)) { err(`${at}.bind`, "unknown_binding", `${slot} takes ${kinds.join(" or ")}, not ${b.kind}`); continue; }
        if (profile) {
          const missing = live && b.kind === "gallery" ? null : missingId(b, profile);
          if (missing) err(`${at}.bind`, "missing_id", missing);
        }
      }
    });
  });
  // The must-haves: one first screen (one h1), and booking built into the site (M1).
  if (Array.isArray(spec.pages) && spec.pages.length) {
    if (count.hero !== 1) err("spec.pages[0].sections", "bad_shape", `exactly one hero section is required, found ${count.hero}`);
    if (count.booking !== 1) err("spec.pages[0].sections", "bad_shape", `exactly one booking section is required, found ${count.booking}`);
  }
  return { ok: errors.length === 0, errors };
}

function missingId(b, p) {
  if (b.kind === "service" && !p.services.some((s) => String(s.id) === b.id)) return `no active service ${b.id} in the dashboard`;
  // Through the same call `resolve` uses, so "valid" and "draws something" cannot disagree.
  if (b.kind === "service_group" && !groupServices(p.services, p.serviceGroups).some((g) => String(g.key) === b.id && g.items.length)) return `no service group ${b.id} with active services in the dashboard`;
  if (b.kind === "gallery" && !p.gallery.some((g) => String(g.id) === b.id)) return `no photo ${b.id} in the gallery`;
  return null;
}

// ---------------------------------------------------------------- resolution
// What a binding means, read from the profile at render time. Never cached in the spec.
// `profile` is normalizeProfile()'s shape. Absent data returns null/[] so a section
// can disappear rather than draw an empty box.
export function resolve(bind, p) {
  const b = parseBinding(bind);
  if (!b) throw new Error(`unknown binding ${bind}`);
  switch (b.kind) {
    case "service": {
      const s = p.services.find((x) => String(x.id) === b.id);
      return s ? { service: s, field: b.field } : null;
    }
    case "service_group": {
      const g = groupServices(p.services, p.serviceGroups).find((x) => String(x.key) === b.id);
      return g && g.items.length ? g : null;
    }
    case "add_ons": return p.addOns;
    case "plans": return p.plans;
    case "sale": {
      const s = p.settings;
      return s.site_discount_active && Number(s.site_discount_percent) > 0
        ? { percent: Number(s.site_discount_percent), label: s.site_discount_label || null } : null;
    }
    case "gallery": return p.gallery.find((x) => String(x.id) === b.id) ?? null;
    // "Best" is the detailer's own order, before/after pairs first: the order
    // they set is the only judgement of best we have.
    case "gallery.best": return [...p.gallery].sort((a, c) => (c.kind === "before_after") - (a.kind === "before_after")).slice(0, b.n);
    case "reviews.top": return p.testimonials.slice(0, b.n);
    case "hours.week": return p.hours;
    case "area": {
      const zones = (p.settings.travel_zones ?? []).filter((z) => z?.name);
      const text = p.business?.service_area || null;
      return text || zones.length ? { text, zones, dropoff: p.business?.dropoff_address || null } : null;
    }
    case "contact.phone": return p.business?.phone || null;
    case "faq": return faqFor(p.settings);
    case "pay": return paymentMethods(p.settings);
    case "book": return true;
    default: return null;
  }
}

/** Every binding a spec uses, with the section it sits in (for checks and the Studio's data panel). */
export function bindingsOf(spec) {
  const out = [];
  for (const page of spec?.pages ?? []) for (const sec of page.sections ?? []) {
    for (const slot of Object.keys(own(SECTION_TYPES, sec?.type) ? SECTION_TYPES[sec.type].slots : {})) if (sec[slot]?.bind) out.push({ section: sec.id, slot, bind: sec[slot].bind });
  }
  return out;
}
