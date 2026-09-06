// ROADMAP 3.3 — is the browser on OUR address, or on a detailer's?
//
// One question, asked once, on the root route only. Everything else in this
// app works identically on either host: the tenant's domain is aliased onto
// this same site, so `/book/:slug`, `/booking/:id`, `/plan/:id` and
// `/unsubscribe/:id` serve exactly what they always did. **`/` is the only
// path where the answer differs**, and it differs completely — our marketing
// page, or that detailer's booking page.
//
// THE LIST IS AN ALLOWLIST OF OURS, NOT A LOOKUP, AND THAT IS THE WHOLE
// DESIGN. The obvious version asks the database "is this host a tenant?" on
// every visit — which puts a round trip in front of the marketing page for
// the 99% of visitors who are on it, to answer a question that is almost
// always no. Here the marketing page pays nothing, a preview deploy pays
// nothing, and only a host we do not recognise is looked up.
//
// A HOST WE DO NOT RECOGNISE AND CANNOT RESOLVE FALLS BACK TO THE MARKETING
// PAGE. That is the safe direction: a new platform domain nobody added here
// shows the product rather than a broken booking page, and the failure is
// visible to us rather than to a customer.

const PLATFORM_HOSTS = new Set([
  "detailingplatform.com",
  "www.detailingplatform.com",
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

// Netlify gives every branch and deploy preview its own hostname, and there
// is no list of them — they are generated. A suffix is the only way to say
// "any of ours".
const PLATFORM_SUFFIXES = [".netlify.app", ".netlify.live"];

export function isPlatformHost(hostname = globalThis.location?.hostname ?? "") {
  const h = String(hostname).toLowerCase();
  if (!h) return true;
  if (PLATFORM_HOSTS.has(h)) return true;
  return PLATFORM_SUFFIXES.some((s) => h.endsWith(s));
}

// The hostname to ask the database about, normalised the way
// `get_public_business_profile_by_host` normalises what it stores: lower
// case, no port, no leading `www.`. Both halves have to agree or a verified
// domain resolves to nothing and the detailer is told their address does not
// work while it plainly does.
export function tenantHost(hostname = globalThis.location?.hostname ?? "") {
  return String(hostname).toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
}
