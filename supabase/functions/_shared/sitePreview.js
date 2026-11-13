// The site-preview function's rules, with no IO, so Node tests run the same code Deno serves
// (tests/site-preview.test.mjs; the site-preview function). The Studio on Andrew's laptop applies every event again with its own rules
// (studio.mjs linkAct); these only keep the hosted page honest until it does.

export const WORDS = {
  none: "There is nothing at this link. Check that you opened the whole link.",
  expired: "This link has expired. Reply to our email and we will send a new one.",
  cancelled: "This link has been cancelled. Reply to our email and we will send a new one.",
};
export const TOKEN = /^[A-Za-z0-9_-]{43}$/;
export const PATH = /\/p\/([^/]{1,100})(?:\/(comment|thumbs|happy|pick))?\/?$/;
export const MAX_BODY = 8000, MAX_COMMENTS = 300;

// What a row lets the page see: 404 when there is none, 410 when cancelled or expired (an unreadable date is expired).
export function stateOf(row, now = Date.now()) {
  if (!row) return { code: 404, said: WORDS.none };
  if (row.revoked_at) return { code: 410, said: WORDS.cancelled };
  if (!(Date.parse(row.expires_at) > now)) return { code: 410, said: WORDS.expired };
  return null;
}

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const sectionsOf = (view) => (view?.spec?.pages?.[0]?.sections || []).map((s) => s?.id).filter((x) => typeof x === "string");

// One action on one link's view. Returns { ok, code, said, view (the new view), event (what the Studio pulls) }.
// Nothing in the body can name another link or site: the row is found by the secret's hash before this runs.
export function act(row, what, b, now = new Date()) {
  const view = structuredClone(row.view || {});
  if (!isObj(b)) return { ok: false, code: 400, said: "That could not be read." };
  if (what === "comment" || what === "thumbs") {
    if (row.purpose !== "review") return { ok: false, code: 400, said: "This link is for picking a look." };
    const okSection = sectionsOf(view).includes(b.section) || (b.section === "website" && Array.isArray(view.from_website) && view.from_website.length > 0);
    if (typeof b.section !== "string" || !okSection) return { ok: false, code: 400, said: "That part is not on this site." };
    if (what === "thumbs") {
      if (b.section === "website") return { ok: false, code: 400, said: "That part is not on this site." };
      const thumbs = b.thumbs === "up" || b.thumbs === "down" ? b.thumbs : null;
      view.thumbs = { ...(view.thumbs || {}) };
      if (thumbs) view.thumbs[b.section] = thumbs; else delete view.thumbs[b.section];
      return { ok: true, said: thumbs ? "Thank you." : "Your vote is removed.", view, event: { section: b.section, thumbs } };
    }
    if (typeof b.text !== "string") return { ok: false, code: 400, said: "Say what should change." };
    const text = b.text.replace(/\s+/g, " ").trim().slice(0, 1000);
    if (!text) return { ok: false, code: 400, said: "Say what should change." };
    view.comments = Array.isArray(view.comments) ? view.comments : [];
    if (view.comments.length >= MAX_COMMENTS) return { ok: false, code: 429, said: "This link has taken as many comments as it can. Reply to our email and we will read the rest there." };
    const part = typeof b.part === "string" && /^[a-z0-9_]{1,30}$/.test(b.part) ? b.part : null;
    const at = isObj(b.at) && Number.isFinite(+b.at.x) && Number.isFinite(+b.at.y) ? { x: Math.max(0, Math.min(1000, Math.round(+b.at.x))), y: Math.max(0, Math.min(100000, Math.round(+b.at.y))) } : null;
    const c = { section: b.section, part, at, text };
    view.comments.push({ id: `h${view.comments.length + 1}`, ...c, created_at: now.toISOString() });
    return { ok: true, said: "Thank you. Your comment is with us.", view, event: c };
  }
  if (what === "happy") {
    if (row.purpose !== "review") return { ok: false, code: 400, said: "This link is for picking a look." };
    view.approved_at = view.approved_at || now.toISOString();
    return { ok: true, said: "Thank you. We will be in touch before anything goes live.", view, event: {} };
  }
  if (what === "pick") {
    if (row.purpose !== "choose") return { ok: false, code: 400, said: "This link is for looking at one site." };
    if (!(view.looks || []).some((l) => l.letter === b.letter)) return { ok: false, code: 400, said: "That is not one of the looks." };
    view.picked = b.letter;
    return { ok: true, said: "Thank you. We will continue with that look.", view, event: { letter: b.letter } };
  }
  return { ok: false, code: 404, said: "Nothing here." };
}
