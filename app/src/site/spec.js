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
const TOKENS = {
  font_display: (v) => v in FONTS, font_body: (v) => v in FONTS,
  ink: (v) => HEX.test(v), paper: (v) => HEX.test(v), paper_2: (v) => HEX.test(v),
  accent: (v) => HEX.test(v), on_accent: (v) => HEX.test(v), soft: (v) => HEX.test(v),
  radius: (v) => Number.isInteger(v) && v >= 0 && v <= 24,
};

// A digit, a currency sign or a percent in prose is a fact typed by hand.
const TYPED_FACT = /[0-9$€£¢%]/;

// ---------------------------------------------------------------- validation
/**
 * @param spec     the revision's JSON
 * @param profile  normalizeProfile(get_public_business_profile(...)) — or null to
 *                 check shape only (ids are then unchecked)
 * @returns { ok, errors: [{ path, code, message }] }
 */
export function validateSpec(spec, profile = null) {
  const errors = [];
  const err = (path, code, message) => errors.push({ path, code, message });
  const keysOnly = (obj, allowed, path) => {
    for (const k of Object.keys(obj)) if (!allowed.includes(k)) err(`${path}.${k}`, "unknown_key", `"${k}" is not part of the spec`);
  };
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return { ok: false, errors: [{ path: "", code: "bad_shape", message: "A spec is a JSON object" }] };
  keysOnly(spec, ["schema", "slug", "tokens", "pages"], "spec");
  if (spec.schema !== 1) err("spec.schema", "bad_shape", "schema must be 1");
  if (typeof spec.slug !== "string" || !/^[a-z0-9-]+$/.test(spec.slug)) err("spec.slug", "bad_shape", "slug must be lower-case letters, digits and dashes");

  const tokens = spec.tokens;
  if (!tokens || typeof tokens !== "object") err("spec.tokens", "bad_shape", "tokens are required");
  else for (const [k, v] of Object.entries(tokens)) {
    if (!(k in TOKENS)) err(`spec.tokens.${k}`, "unknown_key", `"${k}" is not a design token`);
    else if (!TOKENS[k](v)) err(`spec.tokens.${k}`, "bad_shape", `${JSON.stringify(v)} is not allowed for ${k}`);
  }

  if (!Array.isArray(spec.pages) || !spec.pages.length) err("spec.pages", "bad_shape", "at least one page is required");
  const ids = new Set();
  (Array.isArray(spec.pages) ? spec.pages : []).forEach((page, pi) => {
    const pp = `spec.pages[${pi}]`;
    if (!page || typeof page !== "object") return err(pp, "bad_shape", "a page is an object");
    keysOnly(page, ["path", "sections"], pp);
    if (typeof page.path !== "string" || !page.path.startsWith("/")) err(`${pp}.path`, "bad_shape", "path must start with /");
    if (!Array.isArray(page.sections)) return err(`${pp}.sections`, "bad_shape", "sections must be a list");
    page.sections.forEach((sec, si) => {
      const sp = `${pp}.sections[${si}]`;
      const type = SECTION_TYPES[sec?.type];
      if (!type) return err(`${sp}.type`, "unknown_type", `unknown section type ${JSON.stringify(sec?.type)}`);
      if (typeof sec.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(sec.id)) err(`${sp}.id`, "bad_shape", "id must be lower-case, start with a letter");
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
          const hit = TYPED_FACT.exec(v);
          if (hit) err(`${sp}.copy.${k}`, "typed_fact", `"${hit[0]}" typed into prose: facts like prices must come from a binding, not be written in`);
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
          const missing = missingId(b, profile);
          if (missing) err(`${at}.bind`, "missing_id", missing);
        }
      }
    });
  });
  return { ok: errors.length === 0, errors };
}

function missingId(b, p) {
  if (b.kind === "service" && !p.services.some((s) => String(s.id) === b.id)) return `no active service ${b.id} in the dashboard`;
  if (b.kind === "service_group" && !p.serviceGroups.some((g) => String(g.id) === b.id)) return `no service group ${b.id} in the dashboard`;
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
    for (const slot of Object.keys(SECTION_TYPES[sec.type]?.slots ?? {})) if (sec[slot]?.bind) out.push({ section: sec.id, slot, bind: sec[slot].bind });
  }
  return out;
}
