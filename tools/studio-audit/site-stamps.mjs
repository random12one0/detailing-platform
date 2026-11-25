// THE STAMP CHECKER: one, shared (Studio review S2-5, 2026-11-05).
//
// Every fact a site shows from the detailer's dashboard is stamped data-from="<binding>". Two tools judge those
// stamps: the site grader's G0 (site-browser.mjs) and the Studio's connection check (the platform copy's
// scripts/studio/studio-check.mjs). They used to have a checker each, so they could drift. Both now use this file.
//
// It is the stricter of the two: a stamp must show its binding's whole value (a price "$95" is not found inside
// "$950"), per binding, read from the profile with the renderer's own resolve(); case is ignored (a label may be set
// in capitals by CSS). The renderer's helpers come in as `deps` (spec.js and the booking code live in the platform
// repo, not here), so this file has no import of its own:
//   const S = stampChecker({ parseBinding, resolve, vehicleSizeExtra, money, duration, time12 });
//   S.stampProblem(stamp, profile)            -> null | why
//   S.staleProblem(stamp, oldProfile, profile) -> null | why (an old value still shown)
// A stamp is what readStamps() (run in the page) returns for one [data-from] element.

const flat = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const esc = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// The whole value, not a piece of a longer number: "$95" is not in "$950" or "$95.50".
export const shows = (text, s) => { const v = flat(s); if (!v) return false; return new RegExp("(?<![\\d.,])" + esc(v) + "(?![\\d.,])", "i").test(text); };
export const same = (a, b) => flat(a).toLowerCase() === flat(b).toLowerCase();
// For a contract's declared figure (G0's older sites): the whole value, also when only the punctuation differs
// ("562-555-0100" against "(562) 555-0100").
const words = (s) => flat(String(s ?? "").replace(/[^\p{L}\p{N}]+/gu, " "));
export const figureShows = (text, source) => source != null && String(source) !== "" && (shows(text, String(source)) || shows(words(text), words(source)));

// Run in the page: every stamped element, with what a check needs to judge it.
export function readStamps() {
  return [...document.querySelectorAll("[data-from]")].map((e) => ({
    from: e.dataset.from, text: e.innerText.replace(/\s+/g, " ").trim(), href: e.getAttribute("href"),
    imgs: [...e.querySelectorAll("img")].map((i) => i.getAttribute("src")),
    items: e.querySelectorAll(":scope > li").length, zones: e.querySelectorAll(".zones li").length,
  }));
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const photoUrls = (g) => [g.after_url, g.before_url, g.image_url].filter(Boolean);

export function stampChecker({ parseBinding, resolve, vehicleSizeExtra, money, duration, time12 }) {
  const dayLine = (h) => `${DAYS[h.weekday]} ${h.open_time && h.close_time ? `${time12(h.open_time)} – ${time12(h.close_time)}` : "Closed"}`;
  const payWord = (x) => (x.key === "other" ? x.handle : x.handle ? `${x.label} ${x.handle}` : x.label);
  // What one stamp must show for a profile: { why } when the binding has nothing behind it, else
  // texts (each must appear), exact (the whole text), urls (pictures: a list of acceptable srcs each), items (a count).
  function wantOf(st, p) {
    const b = parseBinding(st.from);
    if (!b) return { why: `"${st.from}" is not an allowed binding` };
    let v;
    try { v = resolve(st.from, p); } catch (e) { return { why: e.message }; }
    switch (b.kind) {
      case "service": {
        if (!v) return { why: `no active service ${b.id} in the dashboard` };
        const s = v.service;
        if (b.field === "price") return { texts: [money(s.price)] };
        if (b.field === "name") return { exact: flat(s.name) };
        if (b.field === "duration") return { texts: [duration(s.duration_minutes)] };
        if (b.field === "description") return { texts: [s.description] };
        if (b.field === "features") return { texts: (s.features || []).filter(Boolean) };
        if (b.field === "sizes") return { texts: (p.settings.vehicle_sizes || []).map((z) => { const x = vehicleSizeExtra([s], z.key); return `${z.label} ${x ? `+${money(x)}` : "Base"}`; }) };
        return { texts: [] };
      }
      case "service_group": return v ? { texts: v.items.map((s) => s.name) } : { why: `no service group ${b.id} with active services` };
      case "gallery": return v ? { urls: [photoUrls(v)], only: true } : { why: `no photo ${b.id} in the gallery` };
      case "gallery.best": return { urls: v.map(photoUrls), only: true };
      case "reviews.top": { const w = v.filter((r) => r.quote); return { texts: w.map((r) => r.quote), items: w.length }; }
      case "hours.week": return { texts: v.map(dayLine) };
      case "contact.phone": return v ? { phone: String(v).replace(/\D/g, "") } : { why: "the dashboard has no phone" };
      case "sale": return v ? { texts: [`${v.percent}% off`, ...(v.label ? [v.label] : [])] } : { why: "shows a sale the dashboard does not have" };
      // the zone list is drawn only where the section has room for it (the visit board, not the hero line)
      case "area": return v ? { texts: [v.text, ...(st.zones ? v.zones.map((z) => z.name) : [])].filter(Boolean) } : { why: "shows an area the dashboard does not have" };
      case "add_ons": return { texts: (v || []).flatMap((a) => [a.name, `+${money(a.price)}`]) };
      case "plans": return { texts: (v || []).map((x) => x.name) };
      case "faq": return { texts: (v || []).map((x) => x.q) };
      case "pay": return { texts: (v || []).map(payWord) };
      default: return { texts: [] };
    }
  }
  const phoneOk = (st, d) => (st.href || "").replace(/\D/g, "").endsWith(d) || st.text.replace(/\D/g, "").includes(d);
  function stampProblem(st, p) {
    const w = wantOf(st, p);
    if (w.why) return w.why;
    if (w.exact != null && !same(st.text, w.exact)) return `shows "${st.text}", the dashboard says "${w.exact}"`;
    const miss = (w.texts || []).find((t) => !shows(st.text, t));
    if (miss) return `does not show "${flat(miss)}" (it shows "${st.text.slice(0, 60)}")`;
    if (w.phone && !phoneOk(st, w.phone)) return "does not lead to the dashboard's phone";
    if (w.urls) {
      if (w.urls.find((alts) => !alts.some((u) => st.imgs.includes(u)))) return "a photo from the dashboard is not drawn";
      const allowed = w.urls.flat(), extra = st.imgs.filter((u) => !allowed.includes(u));
      if (w.only && extra.length) return `draws a picture the dashboard does not have (${extra[0].slice(0, 40)})`;
    }
    if (w.items != null && st.items !== w.items) return `draws ${st.items}, the dashboard has ${w.items}`;
    return null;
  }
  function staleProblem(st, oldP, newP) {
    const o = wantOf(st, oldP), w = wantOf(st, newP);
    if (o.why || w.why) return null;
    const now = new Set([...(w.texts || []), w.exact].filter((x) => x != null).map(flat));
    const old = [...(o.texts || []), o.exact].filter((x) => x != null).map(flat).filter((x) => x && !now.has(x));
    const left = old.find((t) => (o.exact === t ? same(st.text, t) : shows(st.text, t)));
    if (left) return `still shows the old "${left}" (it shows "${st.text.slice(0, 80)}")`;
    if (o.phone && o.phone !== w.phone && phoneOk(st, o.phone)) return "still leads to the old phone";
    const nowUrls = new Set((w.urls || []).flat());
    return (o.urls || []).flat().find((u) => !nowUrls.has(u) && st.imgs.includes(u)) ? "still draws an old photo" : null;
  }
  return { wantOf, stampProblem, staleProblem, dayLine };
}
