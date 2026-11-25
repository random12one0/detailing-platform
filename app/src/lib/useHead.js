// Per-route <head> for the marketing pages. index.html carries the home card;
// each marketing route calls this to say its own title, description, canonical
// address and (optionally) structured data, and puts everything back on the way
// out, so a booking page opened next never inherits the pricing page's head.
import { useEffect } from "react";
import { isPlatformHost } from "./host.js";

export const SITE = "https://detailingplatform.com";

// Find-or-create one head element, set it, and return its undo.
function put(sel, make, attr, value) {
  let el = document.head.querySelector(sel);
  const made = !el;
  if (made) { el = make(); document.head.appendChild(el); }
  const was = el.getAttribute(attr);
  el.setAttribute(attr, value);
  return () => { if (made) el.remove(); else el.setAttribute(attr, was); };
}
const meta = (attr, key) => () => { const m = document.createElement("meta"); m.setAttribute(attr, key); return m; };
const canonical = () => Object.assign(document.createElement("link"), { rel: "canonical" });

export function useHead({ title, description, path, jsonLd }) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    // A detailer's own domain shows the landing page as a fallback; the
    // platform's address is not its canonical.
    if (!isPlatformHost()) return undefined;
    const url = SITE + path;
    const undo = [
      put("link[rel=canonical]", canonical, "href", url),
      put('meta[name="description"]', meta("name", "description"), "content", description),
      put('meta[property="og:url"]', meta("property", "og:url"), "content", url),
      put('meta[property="og:title"]', meta("property", "og:title"), "content", title),
      put('meta[property="og:description"]', meta("property", "og:description"), "content", description),
      put('meta[name="twitter:title"]', meta("name", "twitter:title"), "content", title),
      put('meta[name="twitter:description"]', meta("name", "twitter:description"), "content", description),
    ];
    const was = document.title;
    document.title = title;
    let script;
    if (ld) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = ld;
      document.head.appendChild(script);
    }
    return () => { undo.forEach((u) => u()); document.title = was; script?.remove(); };
  }, [title, description, path, ld]);
}
