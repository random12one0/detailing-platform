// Netlify edge function - STUDIO S8 (STUDIO-SPEC.md §6d "Serving published sites").
//
// `/` on a detailer's own verified address: if they have a published site (a live release, an active business with
// an active website subscription: get_published_site_by_host decides), the request is rewritten to site.html, the
// Studio renderer's own page, so the customer sees exactly the page and stylesheet the detailer approved in the
// preview, at their own address. Otherwise, or if the lookup fails or the env is missing, the request passes through
// untouched and the app answers `/` as before (the booking page for that address; the marketing page on ours).
// Every other path passes through: only `/` changes with the host (ROADMAP 3.3's rule).
//
// One file on purpose, like booking-meta.mjs (Netlify treats every file here as its own edge function). The platform
// host list is a copy of app/src/lib/host.js; tests/tenant-site-edge.test.mjs holds the two equal. The Vite dev
// server runs the same handleRequest (app/vite.config.js), so the offline tests exercise this code.
//
// Env: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, readable by functions, as for booking-meta.

export const config = { path: "/" };

export const PLATFORM_HOSTS = ["detailingplatform.com", "www.detailingplatform.com", "localhost", "127.0.0.1", "[::1]"];
export const PLATFORM_SUFFIXES = [".netlify.app", ".netlify.live"];
export function isPlatformHost(hostname) {
  const h = String(hostname ?? "").toLowerCase();
  if (!h) return true;
  return PLATFORM_HOSTS.includes(h) || PLATFORM_SUFFIXES.some((s) => h.endsWith(s));
}
export const tenantHost = (hostname) => String(hostname ?? "").toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");

// The whole decision with its IO injected: the URL to rewrite to, or null to pass through.
export async function decide(url, fetchPublished) {
  const u = new URL(url);
  if (u.pathname !== "/" || isPlatformHost(u.hostname)) return null;
  let live = null;
  try { live = await fetchPublished(tenantHost(u.hostname)); } catch { return null; }
  return live && typeof live.spec === "object" && live.spec ? new URL("/site.html" + u.search, u) : null;
}

export async function fetchPublished(host, { base, key, timeoutMs = 2500 } = {}) {
  if (!base || !key) throw new Error("tenant-site: Supabase env missing");
  const res = await fetch(`${base}/rest/v1/rpc/get_published_site_by_host`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_host: host }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`published-site lookup ${res.status}`);
  return res.json();
}

// Returning a URL from a Netlify edge function rewrites to it; returning nothing passes the request through.
export default async (request) => {
  const to = await decide(request.url, (h) => fetchPublished(h, { base: Netlify.env.get("VITE_SUPABASE_URL"), key: Netlify.env.get("VITE_SUPABASE_ANON_KEY") }));
  return to ?? undefined;
};
