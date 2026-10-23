// ROADMAP 97.44 — the picture a shared link shows (og:image).
// index.html carries the platform card statically; that is all a crawler that
// never runs JS will see. A booking page swaps in the business's first gallery
// photo, else its logo, else the generic tenant card, for unfurlers that do run
// the page. Card names: app/public/og-default.png and og-tenant.png.

const SITE = "https://detailingplatform.com";
export const PLATFORM_CARD = { title: "A website for your detailing business, and the dashboard that runs it", image: `${SITE}/og-default.png` };
export const TENANT_FALLBACK_IMAGE = `${SITE}/og-tenant.png`;

const url = (s) => (typeof s === "string" && /^https:\/\//.test(s.trim()) ? s.trim() : null);

export function shareMetaFor(profile) {
  const name = profile?.business?.name?.trim?.();
  if (!name) return PLATFORM_CARD;
  const photo = (profile.gallery ?? []).map((g) => url(g?.image_url)).find(Boolean);
  return { title: name, image: photo || url(profile.branding?.logo_url) || TENANT_FALLBACK_IMAGE };
}

export function setShareMeta({ title, image }) {
  const set = (sel, v) => document.head.querySelector(sel)?.setAttribute("content", v);
  set('meta[property="og:image"]', image);
  set('meta[name="twitter:image"]', image);
  set('meta[property="og:title"]', title);
  set('meta[name="twitter:title"]', title);
}
