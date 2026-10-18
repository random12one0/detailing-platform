// ROADMAP 97.13 — what it takes for a business to own a web address.
//
// TWO PROOFS, BECAUSE THEY ANSWER DIFFERENT QUESTIONS:
//
//   1. `https://<host>/platform-host.txt` answers our marker, fetched with
//      `redirect: "manual"`. That proves the host REACHES THIS APP — the links
//      the platform emails will not 404. It cannot prove who owns the host:
//      every platform address serves the same file, and before this item a
//      redirect to any of them passed too.
//   2. DNS publishes the ROW'S OWN token as a TXT record at
//      `_detailing-platform.<host>`. Only whoever controls the domain's DNS can
//      do that, and every row has a different token, so a business cannot
//      claim the platform's own address, another business's address, or an
//      address it verified once and then renamed.
//
// The DNS read is DNS-over-HTTPS through `fetch`, so a test can hand it a fake
// answer exactly the way it hands the marker fetch one. Cloudflare's resolver
// receives the hostname being checked and nothing else.

import { can, type Member } from "./permissions.ts";

export const MARKER = "detailing-platform-host-v1";
export const PROOF_LABEL = "_detailing-platform";
export const DOH_URL = "https://cloudflare-dns.com/dns-query";

// Ten seconds. A host that is slow to answer a 27-byte static file is a host
// that will be slow serving somebody's booking, and a verification that hangs
// looks to the detailer exactly like one that failed.
const TIMEOUT_MS = 10_000;

export type Proof = { verified: boolean; reason?: string };

// A TXT answer arrives as `"abc" "def"` — quoted chunks of at most 255 bytes
// that DNS joins back into one string.
const txtValue = (data: string) =>
  String(data || "").match(/"((?:[^"\\]|\\.)*)"/g)?.map((c) => c.slice(1, -1)).join("") ?? String(data || "");

// `fetch` is a parameter so a test can hand in a fake internet; it keeps the
// global's name so the outbound-call census in tests/legal-promises.test.mjs
// still counts both calls.
export async function proveHost(host: string, token: string, fetch: typeof globalThis.fetch = globalThis.fetch): Promise<Proof> {
  const url = `https://${host}/platform-host.txt`;
  try {
    // WHY THE ANSWER IS READ AS TEXT AND TRIMMED: a CDN or a proxy may append
    // a newline, and a host that returns the SPA's index.html instead — what
    // happens if somebody deletes the static file — never equals the marker.
    // `redirect: "manual"` because a host that merely REDIRECTS to one of ours
    // is a host that does not serve this app.
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.status !== 200) {
      return { verified: false, reason: `${host} answered ${res.status} for /platform-host.txt.` };
    }
    if ((await res.text()).trim() !== MARKER) {
      return { verified: false, reason: `${host} answered, but it is not pointing at this app yet.` };
    }
  } catch (e) {
    // A DNS failure, a TLS failure and a timeout are the same sentence to a
    // detailer: it did not answer. The technical reason goes to the logs.
    console.error("verify-domain fetch failed:", url, e);
    return { verified: false, reason: `${host} did not answer. Check the DNS record, then try again.` };
  }

  const name = `${PROOF_LABEL}.${host}`;
  const missing = { verified: false, reason: `${host} reaches us, but the TXT record ${name} does not hold this address's code yet.` };
  try {
    const res = await fetch(`${DOH_URL}?name=${encodeURIComponent(name)}&type=TXT`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/dns-json" },
    });
    if (!res.ok) return missing;
    const answer = (await res.json())?.Answer;
    const values = Array.isArray(answer) ? answer.filter((a) => a?.type === 16).map((a) => txtValue(a.data).trim()) : [];
    return token && values.includes(token) ? { verified: true } : missing;
  } catch (e) {
    console.error("verify-domain TXT lookup failed:", name, e);
    return missing;
  }
}

// ---------------------------------------------------------------------------
// THE REQUEST ITSELF, after `requireMember` has answered. Here rather than in
// `verify-domain/index.ts` so `tests/domain-request.test.mjs` can drive the
// real code with a fake database and a fake internet: Deno.serve and the
// database client cannot be imported into Node, and a behaviour copied into a
// test is a behaviour the test no longer checks.
// ---------------------------------------------------------------------------

// The same shape the column's check constraint and the by-host RPC use: a bare
// lower-case hostname, no scheme, no path, no port, no leading `www.`.
export const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export function normaliseHost(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

// deno-lint-ignore no-explicit-any
type Db = { from: (table: string) => any };
export type Reply = { status: number; body: Record<string, unknown> };

export async function handleDomainRequest(
  // deno-lint-ignore no-explicit-any
  body: any,
  member: Member | null,
  db: Db,
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<Reply> {
  if (!member) return { status: 401, body: { error: "Unauthorized" } };
  // Same permission that owns every other business setting. There is no
  // `domains` tick and there should not be one: whoever can change the
  // prices can change the address.
  if (!can(member, "settings")) return { status: 403, body: { error: "Not allowed" } };

  // ADDING. `business_id` comes from the caller's MEMBERSHIP, never from the
  // body, and `verified_at` is never written here: the row starts unproved.
  if (body?.action === "add") {
    const domain = normaliseHost(body.domain);
    if (!HOST_RE.test(domain)) return { status: 400, body: { error: `"${body.domain ?? ""}" is not a web address.` } };
    const { data: added, error } = await db
      .from("business_domains")
      .insert({ business_id: member.businessId, domain })
      .select("id, domain, verification_token, verified_at, created_at")
      .single();
    // UNIQUE across every business: the one error worth naming, because
    // "duplicate key" tells a detailer nothing.
    if (error?.code === "23505") return { status: 409, body: { error: "taken", domain } };
    if (error) throw error;
    return { status: 200, body: { added } };
  }

  const domainId = String(body?.domain_id ?? "");
  if (!domainId) return { status: 400, body: { error: "domain_id is required" } };

  const { data: row, error } = await db
    .from("business_domains")
    .select("id, business_id, domain, verification_token, verified_at")
    .eq("id", domainId)
    .eq("business_id", member.businessId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return { status: 404, body: { error: "No such domain on this business" } };

  const host = normaliseHost(row.domain);
  if (!HOST_RE.test(host)) return { status: 200, body: { verified: false, reason: `"${row.domain}" is not a hostname.` } };

  const proof = await proveHost(host, row.verification_token, fetch);
  if (!proof.verified) return { status: 200, body: { verified: false, reason: proof.reason } };

  // The host is normalised ON THE WAY IN as well as on the way out, so a
  // detailer who typed `https://WWW.Example.com/` ends up with the same row
  // the by-host RPC will match at request time. Writing `domain` and
  // `verified_at` together is what the 97.13 trigger lets keep its stamp.
  const { error: upErr } = await db
    .from("business_domains")
    .update({ domain: host, verified_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("business_id", member.businessId);
  if (upErr) throw upErr;
  return { status: 200, body: { verified: true, domain: host } };
}
