// ROADMAP 97.13 — `verify-domain` passes a host only when it serves THAT ROW'S OWN token.
//
//   node --test tests/domain-proof.test.mjs
//
// Credential-free, no network: `proveHost` takes its `fetch` as an argument, and every case hands it a fake
// internet. The fake behaves like the real one on the point that matters — asked to FOLLOW a redirect it
// follows it and returns the platform's marker, asked for `redirect: "manual"` it returns the 301 — so the
// redirect case is decided by what the code asks for, not by what the fake was told to answer.
//
// Sabotage is `BREAK=follow|any-token` (an env var, never a flag: docs/gotchas.md 104). Each rewrites
// `domainProof.ts` into a temporary copy with the original defect put back, and the named case must go red.

import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { test, after } from "node:test";
import assert from "node:assert/strict";

const SRC = "supabase/functions/_shared/domainProof.ts";
const BREAK = process.env.BREAK || "";
let modPath = SRC;
if (BREAK) {
  const orig = readFileSync(SRC, "utf8");
  const broken = {
    follow: orig.replace(`redirect: "manual",`, `redirect: "follow",`),
    "any-token": orig.replace("token && values.includes(token)", "values.length > 0"),
  }[BREAK];
  assert.ok(broken && broken !== orig, `BREAK=${BREAK} did not apply`);
  modPath = `supabase/functions/_shared/domainProof.break-${BREAK}.tmp.ts`;
  writeFileSync(modPath, broken);
  after(() => rmSync(modPath, { force: true }));
  console.error(`  SABOTAGE ${BREAK} applied to a temporary copy: ${modPath}`);
}
const { proveHost, MARKER, PROOF_LABEL } = await import(pathToFileURL(modPath).href);

const MINE = "aaaaaaaabbbbbbbbccccccccdddddddd";
const THEIRS = "11111111222222223333333344444444";

// hosts: { [host]: { marker?: string, redirectTo?: string, status?: number } }; txt: { [name]: string[] }
function internet({ hosts = {}, txt = {} }) {
  const calls = [];
  const f = async (url, opts = {}) => {
    calls.push({ url: String(url), redirect: opts.redirect });
    const u = new URL(url);
    if (u.hostname === "cloudflare-dns.com") {
      const vals = txt[u.searchParams.get("name")] ?? [];
      return Response.json({ Status: 0, Answer: vals.map((v) => ({ type: 16, data: v })) });
    }
    const h = hosts[u.hostname];
    if (!h) throw new TypeError("dns error: no such host");
    if (h.redirectTo) {
      if (opts.redirect === "manual") return new Response(null, { status: 301, headers: { location: `https://${h.redirectTo}${u.pathname}` } });
      return f(`https://${h.redirectTo}${u.pathname}`, opts);
    }
    return new Response(h.marker ?? MARKER, { status: h.status ?? 200 });
  };
  f.calls = calls;
  return f;
}

const HOST = "book.mine.test";
const NAME = `${PROOF_LABEL}.${HOST}`;

test("1 · the host reaches us AND publishes this row's token: verified", async () => {
  const f = internet({ hosts: { [HOST]: {} }, txt: { [NAME]: [`"${MINE}"`] } });
  assert.deepEqual(await proveHost(HOST, MINE, f), { verified: true });
  assert.ok(f.calls.some((c) => c.url.includes(encodeURIComponent(NAME))), "the TXT lookup was never made");
});

test("2 · the host publishes ANOTHER row's token: refused", async () => {
  const f = internet({ hosts: { [HOST]: {} }, txt: { [NAME]: [`"${THEIRS}"`] } });
  const r = await proveHost(HOST, MINE, f);
  assert.equal(r.verified, false);
  assert.match(r.reason, /TXT record/);
});

test("3 · no token at all (the shared marker alone, as every platform host serves it): refused", async () => {
  const f = internet({ hosts: { "detailingplatform.com": {} } });
  assert.equal((await proveHost("detailingplatform.com", MINE, f)).verified, false);
});

test("4 · a host that only REDIRECTS to one of ours is refused, even with the right token", async () => {
  const f = internet({ hosts: { [HOST]: { redirectTo: "detailingplatform.com" }, "detailingplatform.com": {} }, txt: { [NAME]: [`"${MINE}"`] } });
  const r = await proveHost(HOST, MINE, f);
  assert.equal(r.verified, false, "a redirect to the platform passed");
  assert.match(r.reason, /answered 301/);
  assert.equal(f.calls[0].redirect, "manual");
});

test("5 · the right token but the host does not serve our marker: refused", async () => {
  const f = internet({ hosts: { [HOST]: { marker: "<!doctype html>" } }, txt: { [NAME]: [`"${MINE}"`] } });
  assert.equal((await proveHost(HOST, MINE, f)).verified, false);
});

test("6 · a token split into DNS's quoted chunks is joined back together", async () => {
  const f = internet({ hosts: { [HOST]: {} }, txt: { [NAME]: [`"${MINE.slice(0, 10)}" "${MINE.slice(10)}"`] } });
  assert.equal((await proveHost(HOST, MINE, f)).verified, true);
});

test("7 · an empty token never matches an empty record", async () => {
  const f = internet({ hosts: { [HOST]: {} }, txt: { [NAME]: ['""'] } });
  assert.equal((await proveHost(HOST, "", f)).verified, false);
});
