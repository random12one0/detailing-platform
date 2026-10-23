// Netlify edge function - ROADMAP 97.42.
//
// Every /book/<slug> serves the same index.html, whose <title> and Open Graph
// tags describe the platform, and a link-preview crawler does not run the
// JavaScript that knows whose page it is. This rewrites <head> from the
// business row before the page leaves the edge. Unknown slug, failed lookup or
// missing env: the page passes through untouched (platform tags, loads
// normally).
//
// Only ONE file lives in this folder on purpose: Netlify treats every file
// here as its own edge function, so a helper module would break the deploy.
//
// Env: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (public client values, the
// same ones the bundle ships) must be readable by functions in Netlify's env
// settings, or this silently passes every page through.

export const config = { path: "/book/*" };

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The tenant slug in /book/<slug>; null for anything else or a malformed path.
export function extractSlug(pathname) {
  const m = /^\/book\/([^/?#]+)\/?$/.exec(String(pathname || ""));
  if (!m) return null;
  let slug;
  try { slug = decodeURIComponent(m[1]).trim().toLowerCase(); } catch { return null; }
  return slug && slug.length <= 64 ? slug : null;
}

// Tagline, then about copy, then a built sentence, so every business gets its
// own description rather than the platform's.
export function tenantDescription(profile) {
  const b = profile?.business ?? {};
  const br = profile?.branding ?? {};
  const joined = [br.tagline, br.about_copy].map((s) => String(s ?? "").trim()).filter(Boolean).join(" ");
  if (joined) return joined.length > 300 ? joined.slice(0, 297) + "..." : joined;
  const area = String(b.service_area ?? "").trim();
  return `Book detailing with ${b.name}${area ? ` in ${area}` : ""}.`;
}

// Title = the business name, exactly what BookingBusinessContext.jsx sets as
// document.title after load. Replacers are functions so a `$` in a name is
// never read as a replacement pattern.
export function rewriteHead(html, { profile, pageUrl } = {}) {
  const name = String(profile?.business?.name ?? "").trim();
  if (!name) return html;
  const n = esc(name);
  const d = esc(tenantDescription(profile));
  let out = String(html).replace(/<title>[\s\S]*?<\/title>/, () => `<title>${n}</title>`);
  const set = (attr, key, content) => {
    const tag = `<meta ${attr}="${key}" content="${content}" />`;
    const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`);
    out = re.test(out) ? out.replace(re, () => tag) : out.replace("</head>", () => `${tag}\n  </head>`);
  };
  set("name", "description", d);
  set("property", "og:title", n);
  set("property", "og:description", d);
  set("property", "og:site_name", n);
  set("name", "twitter:title", n);
  set("name", "twitter:description", d);
  if (pageUrl) set("property", "og:url", esc(pageUrl));
  return out;
}

// The whole handler with its IO injected, so node can run it in the test.
export async function handleRequest(request, getResponse, fetchProfile) {
  const url = new URL(request.url);
  const slug = extractSlug(url.pathname);
  const response = await getResponse();
  if (!slug) return response;
  if (!(response.headers?.get?.("content-type") ?? "").includes("text/html")) return response;
  let profile = null;
  try { profile = await fetchProfile(slug); } catch { return response; }
  if (!profile?.business?.name) return response;
  const html = rewriteHead(await response.text(), { profile, pageUrl: url.origin + url.pathname });
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, { status: response.status, headers });
}

async function fetchProfile(slug) {
  const base = Netlify.env.get("VITE_SUPABASE_URL");
  const key = Netlify.env.get("VITE_SUPABASE_ANON_KEY");
  if (!base || !key) throw new Error("booking-meta: Supabase env missing");
  const res = await fetch(`${base}/rest/v1/rpc/get_public_business_profile`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: slug }),
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) throw new Error(`profile lookup ${res.status}`);
  return res.json();
}

export default (request, context) => handleRequest(request, () => context.next(), fetchProfile);
