// START FROM A BUSINESS (issue #4) and the cloud side of PUBLISH.
//
// Turns a real business (its public profile + the answers it gave in the website brief) into a first site spec, and
// writes releases to the platform database (tables sites / revisions / releases, migration 20261125120000).
// No AI here: the words come from the detailer's own answers when they pass the spec's fact rules, else from plain
// defaults. A spec holds bindings and words only; prices, hours, photos and reviews are read live by the page.

import { validateSpec, typedFact, claimWord, hiddenChar } from "../../app/src/site/spec.js";
import { normalizeProfile, groupServices } from "../../app/src/book/core.js";
import { createHash } from "node:crypto";
import { rest } from "./studio-cloud.mjs";

const SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;
export const isSlug = (s) => SLUG.test(String(s || ""));

export async function loadBusiness(cfg, slug) {
  if (!isSlug(slug)) throw new Error("That is not a business address name.");
  const [b] = await rest(cfg, "GET", `businesses?select=id,slug,name,status,service_area,contact_email&slug=eq.${slug}`);
  if (!b) throw new Error(`There is no business "${slug}".`);
  const [intake] = await rest(cfg, "GET", `site_intake?select=answers,submitted_at&business_id=eq.${b.id}`);
  const raw = await rest(cfg, "POST", "rpc/get_public_business_profile", { p_slug: slug });
  if (!raw) throw new Error(`"${slug}" has no public profile.`);
  return { business: b, answers: intake?.answers || {}, submitted_at: intake?.submitted_at || null, profile: normalizeProfile(raw) };
}

// One short sentence of the detailer's own words, or null if it breaks a spec rule (a number, a claim, a hidden character).
export function sayable(text, max = 140) {
  const t = String(Array.isArray(text) ? text.join(" ") : text ?? "").replace(/\s+/g, " ").trim();
  const first = (t.match(/^.+?[.!?](?=\s|$)/)?.[0] || t).trim();
  if (!first || first.length > max || hiddenChar(first) || typedFact(first) || claimWord(first)) return null;
  return first;
}

const DEFAULTS = {
  eyebrow: "Auto detailing", headline: "Careful detailing, priced up front.", sub: "Every price on this page comes straight from our booking system, so what you read is what you get quoted.",
  menu: "What we do", menuIntro: "Pick the care you want, then your vehicle. The price is worked out for you.",
  proof: "The work and what people say", visit: "Where we work, and when", book: "Request a time", bookIntro: "Your price is worked out as you go. Nothing is charged on this page.",
};

export function buildSpec({ business, profile, answers = {} }) {
  const groups = groupServices(profile.services, profile.serviceGroups).filter((g) => g.items.length);
  if (!groups.length) throw new Error("This business has no active services yet, so there is nothing to build a site from.");
  const a = answers, hasPhoto = profile.gallery.length > 0, hasReviews = profile.testimonials.length > 0;
  const copy = {
    eyebrow: sayable(business.service_area ? `Detailing in ${business.service_area}` : "", 60) || DEFAULTS.eyebrow,
    headline: sayable(a.A3, 90) || DEFAULTS.headline,
    sub: sayable(a.A2, 160) || DEFAULTS.sub,
  };
  const ids = ["menu", "menu-more", "menu-also"];
  const sections = [
    { id: "hero", type: "hero", variant: "stack", copy: { ...copy },
      ...(hasPhoto ? { photo: { bind: "gallery.best(1)" } } : {}), prices: { bind: `service_group:${groups[0].key}` },
      cta: { bind: "book" }, call: { bind: "contact.phone" }, area: { bind: "area" }, sale: { bind: "sale" } },
    ...groups.slice(0, 3).map((g, i) => ({ id: ids[i], type: "catalog", variant: "ticket",
      copy: i === 0 ? { title: DEFAULTS.menu, intro: DEFAULTS.menuIntro } : { title: DEFAULTS.menu },
      group: { bind: `service_group:${g.key}` }, ...(i === 0 ? { add_ons: { bind: "add_ons" }, plans: { bind: "plans" } } : {}) })),
    ...(hasPhoto || hasReviews ? [{ id: "work", type: "proof", variant: "wipe", copy: { title: DEFAULTS.proof },
      ...(hasPhoto ? { gallery: { bind: "gallery.best(1)" } } : {}), ...(hasReviews ? { reviews: { bind: "reviews.top(3)" } } : {}) }] : []),
    { id: "visit", type: "visit", variant: "board", copy: { title: DEFAULTS.visit },
      hours: { bind: "hours.week" }, area: { bind: "area" }, contact: { bind: "contact.phone" }, pay: { bind: "pay" }, faq: { bind: "faq" } },
    { id: "book", type: "booking", variant: "inline", copy: { title: DEFAULTS.book, intro: DEFAULTS.bookIntro }, book: { bind: "book" } },
  ];
  const spec = { schema: 1, slug: business.slug,
    tokens: { font_display: "Newsreader", font_body: "Chivo", paper: "#0f2a2b", paper_2: "#16393a", ink: "#efece4", soft: "#a9bab6", accent: "#ef5a3c", on_accent: "#1a0703", radius: 6 },
    pages: [{ path: "/", sections }] };
  // The dashboard may refuse a wording ("ceramic" with no ceramic service): put the plain default back in that place.
  for (let round = 0; round < 3; round++) {
    const v = validateSpec(spec, profile);
    if (v.ok) return spec;
    let fixed = false;
    for (const e of v.errors) {
      const m = /^spec\.pages\[0\]\.sections\[(\d+)\]\.copy\.(\w+)$/.exec(e.path);
      const sec = m && sections[Number(m[1])], d = m && (sec.id === "hero" ? DEFAULTS[m[2]] : null);
      if (d && sec.copy[m[2]] !== d) { sec.copy[m[2]] = d; fixed = true; }
    }
    if (!fixed) throw new Error(`The first draft is refused: ${v.errors[0].message}`);
  }
  const v = validateSpec(spec, profile);
  if (!v.ok) throw new Error(`The first draft is refused: ${v.errors[0].message}`);
  return spec;
}

// ---------------------------------------------------------------- the live check (a real business has no offline copy)
export function liveCheck(spec, profile) {
  const v = validateSpec(spec, profile);
  const lines = v.ok ? [{ pass: true, says: "The spec fits the business's live dashboard", detail: "every binding points at something that exists, no typed fact" }]
    : v.errors.slice(0, 20).map((e) => ({ pass: false, says: e.path, detail: e.message }));
  return { ok: v.ok, lines };
}

// ---------------------------------------------------------------- the database side of publish and rollback
const eq = (v) => encodeURIComponent(v);
async function siteRow(cfg, businessId) {
  const [s] = await rest(cfg, "GET", `sites?select=id,live_release_id&business_id=eq.${businessId}`);
  if (s) return s;
  return (await rest(cfg, "POST", "sites", { business_id: businessId }, "return=representation"))[0];
}
export async function dbPublish(cfg, { businessId, spec, note, approval, hosts, rendererVersion }) {
  const specHash = createHash("sha256").update(JSON.stringify(spec)).digest("hex");   // the database keeps the full hash
  const site = await siteRow(cfg, businessId);
  let [rev] = await rest(cfg, "GET", `revisions?select=id,n&site_id=eq.${site.id}&spec_hash=eq.${eq(specHash)}`);
  if (!rev) [rev] = await rest(cfg, "POST", "revisions", { site_id: site.id, spec, spec_hash: specHash, note }, "return=representation");
  const [rel] = await rest(cfg, "POST", "releases", { site_id: site.id, revision_id: rev.id, spec_hash: specHash, renderer_version: rendererVersion,
    approval, hosts, published_by: "studio", previous_id: site.live_release_id || null }, "return=representation");
  await rest(cfg, "PATCH", `sites?id=eq.${site.id}`, { live_release_id: rel.id });
  return { release: rel.n, revision: rev.n };
}
// Back to the newest earlier release that is not rolled back; the current one is marked rolled back.
export async function dbRollback(cfg, businessId) {
  const site = await siteRow(cfg, businessId);
  if (!site.live_release_id) throw new Error("Nothing is live in the database.");
  const [cur] = await rest(cfg, "GET", `releases?select=id,n&id=eq.${site.live_release_id}`);
  const [prev] = await rest(cfg, "GET", `releases?select=id,n&site_id=eq.${site.id}&n=lt.${cur.n}&rolled_back_at=is.null&order=n.desc&limit=1`);
  if (!prev) throw new Error("There is no earlier release in the database.");
  await rest(cfg, "PATCH", `sites?id=eq.${site.id}`, { live_release_id: prev.id });
  await rest(cfg, "PATCH", `releases?id=eq.${cur.id}`, { rolled_back_at: new Date().toISOString() });
  return { release: prev.n };
}
// What the dashboard says: active, paying for a website, verified addresses.
export async function dbFacts(cfg, slug) {
  const [b] = await rest(cfg, "GET", `businesses?select=id,name,status,contact_email,service_area&slug=eq.${eq(slug)}`);
  if (!b) return null;
  const subs = await rest(cfg, "GET", `platform_subscriptions?select=plan,status&business_id=eq.${b.id}`);
  const doms = await rest(cfg, "GET", `business_domains?select=domain,verified_at&business_id=eq.${b.id}&verified_at=not.is.null`);
  return { id: b.id, name: b.name, area: b.service_area || "", email: b.contact_email || "", status: b.status,
    paying: b.status === "active" && subs.some((x) => x.plan === "website" && x.status === "active"), domains: doms.map((d) => d.domain.toLowerCase()) };
}
