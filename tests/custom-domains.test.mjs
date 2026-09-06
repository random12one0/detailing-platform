// A DETAILER'S OWN WEB ADDRESS — roadmap 3.3.
//
// Two things had to be true before this item, and neither was:
//   * `business_domains` has existed since the first tenant migration and
//     NOTHING had ever read or written it;
//   * every customer-facing URL the platform emits came from one global
//     `PLATFORM_URL`, so a detailer on their own domain still sent
//     confirmation emails pointing at detailingplatform.com. That is the seam
//     a customer can actually see, in the one artifact the detailer did not
//     write (contract §6a).
//
// **WHAT THIS FILE MOSTLY GUARDS IS A SEAM THAT COMES BACK SILENTLY.** A
// forgotten `site` argument at one of thirteen call sites does not fail
// anything: that one email keeps working, on the wrong domain, and the only
// person who ever sees it is a customer. So most of the checks below read
// source as TEXT, which is the only instrument that can see an argument that
// was not passed.
//
// The other half is the normalisation, which exists in THREE places by
// necessity — the browser, the edge function and SQL — and where the three
// disagreeing means a detailer is told their working address does not work.
//
// Credential-free, no dev server, no browser.
//
//   node tests/custom-domains.test.mjs

import { readFileSync } from "node:fs";
import { isPlatformHost, tenantHost } from "../app/src/lib/host.js";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

const read = (p) => readFileSync(p, "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*(\/\/|--).*$/gm, "");

const config = read("supabase/functions/_shared/config.ts");
const verify = read("supabase/functions/verify-domain/index.ts");
const migration = read("supabase/migrations/20260906000000_custom_domains.sql");
const hostLib = read("app/src/lib/host.js");

// ─── 1. Which host is ours ────────────────────────────────────────────────
console.log("\n1. is this our address, or a detailer's?");
{
  check("the platform's own domain is ours", isPlatformHost("detailingplatform.com"));
  check("...with www", isPlatformHost("www.detailingplatform.com"));
  check("localhost is ours, or every dev session is a tenant",
    isPlatformHost("localhost") && isPlatformHost("127.0.0.1"));
  check("a Netlify preview is ours", isPlatformHost("deploy-preview-12--dp.netlify.app"),
    "branch deploys are generated names — a suffix is the only way to say 'any of ours'");
  check("a detailer's address is NOT ours", isPlatformHost("book.coastlinedetail.com") === false);
  check("case does not decide it", isPlatformHost("DetailingPlatform.com"));
  check("AN EMPTY HOSTNAME IS OURS", isPlatformHost("") === true,
    "no hostname means no browser — a build step or a test — and the marketing page is the safe answer");
  check("a lookalike is not ours", isPlatformHost("detailingplatform.com.evil.test") === false,
    "endsWith on the platform domain would have passed this");
}

// ─── 2. The three normalisations agree ────────────────────────────────────
console.log("\n2. the browser, the edge function and SQL agree on a hostname");
{
  check("the browser lower-cases", tenantHost("Book.Example.COM") === "book.example.com");
  check("the browser drops a port", tenantHost("book.example.com:5173") === "book.example.com");
  check("THE BROWSER DROPS www.", tenantHost("www.example.com") === "example.com");
  // The three exist because they run in three languages. What they may never
  // do is disagree: a stored domain that does not equal what the by-host RPC
  // computes from a real request resolves nothing, and the detailer is told a
  // working address does not work.
  check("the edge function drops www. too", /replace\(\/\^www\\\.\/, ""\)/.test(verify),
    "verify-domain normaliseHost");
  check("the edge function lower-cases", /\.toLowerCase\(\)/.test(verify));
  check("SQL drops www. too", /www\\\./.test(migration) && /lower\(/.test(migration),
    "get_public_business_profile_by_host");
  check("the edge function stores the NORMALISED host, not what was typed",
    /update\(\{[^}]*domain: host/.test(strip(verify)),
    "a verified row whose domain does not match what a browser sends proved nothing");
}

// ─── 3. No URL builder still reaches for the global ───────────────────────
console.log("\n3. every customer-facing URL is per-tenant");
{
  const builders = ["businessSiteUrl", "receiptUrl", "planUrl", "plansUrl", "unsubscribeUrl"];
  for (const b of builders) {
    const body = strip(config).match(new RegExp(`export function ${b}\\([\\s\\S]*?\\n\\}`))?.[0] ?? "";
    check(`${b} takes the site as its first argument`,
      new RegExp(`export function ${b}\\(site: string`).test(config), body.split("\n")[0] ?? "(not found)");
    check(`${b} does not fall back to PLATFORM_URL`, !/PLATFORM_URL/.test(body),
      "a default is a call site that can forget the tenant and keep the seam");
  }
  // THE ASSERTION THAT THE FIVE ABOVE HAVE SUBJECTS. A builder renamed out of
  // this list is a builder nothing here checks, and the loop would pass by
  // having nothing to look at.
  check("all five builders were actually found in the file",
    builders.every((b) => config.includes(`export function ${b}(`)), builders.join(","));
}

// ─── 4. Every caller passes one ───────────────────────────────────────────
console.log("\n4. no call site forgot the tenant");
{
  // The thirteen places that build a customer-facing URL. A forgotten argument
  // here is `undefined` in a link — which `scripts/render-emails.mjs` also
  // fails on — but this is the check that names WHICH file.
  const callers = [
    "accept-quote", "cancel-booking", "create-booking", "plan-link",
    "reschedule-booking", "respond-to-booking", "send-campaign",
    "send-invoice", "send-owner-reminders",
  ];
  const CALL = /\b(businessSiteUrl|receiptUrl|planUrl|plansUrl|unsubscribeUrl)\(([^)]*)\)/g;
  let seen = 0;
  for (const fn of callers) {
    const src = strip(read(`supabase/functions/${fn}/index.ts`));
    for (const m of src.matchAll(CALL)) {
      seen++;
      const args = m[2].trim();
      check(`${fn}: ${m[1]} is given a site`,
        /^(site\b|await siteFor\()/.test(args), `${m[1]}(${args})`);
    }
  }
  // Same guard as § 3: if the regex ever stops matching, every check above
  // vanishes and the run still prints green.
  check("the call sites were actually found", seen >= 10, `matched ${seen}`);

  const brand = strip(read("supabase/functions/_shared/email.ts"));
  check("the brand's own siteUrl is per-tenant too",
    /siteUrl: businessSiteUrl\(await siteFor\(/.test(brand),
    "this is the choke point all sixteen templates read their masthead link from");
}

// ─── 5. Verification is a fetch, not a tick ───────────────────────────────
console.log("\n5. a domain is proved, not claimed");
{
  const v = strip(verify);
  check("it fetches the address itself", /await fetch\(/.test(v) && /platform-host\.txt/.test(v),
    "nothing a detailer types can make a host serve our marker file");
  check("the marker file really exists in the build",
    read("app/public/platform-host.txt").trim() === "detailing-platform-host-v1",
    "a check against a file we do not serve fails for everybody, for ever");
  check("the fetch cannot hang", /AbortSignal\.timeout/.test(v),
    "a verification that hangs looks exactly like one that failed");
  check("it compares the trimmed body, not the whole response",
    /\.trim\(\) *(===|==) *MARKER|text === MARKER/.test(v),
    "a proxy may add a newline; a missing file returns the whole SPA");
  check("it only stamps a row belonging to the caller's business",
    /\.eq\("business_id", member\.businessId\)/.test(v));
  check("it needs the settings permission", /can\(member, "settings"\)/.test(v));
  check("VERIFIED_AT IS REVOKED FROM authenticated AT COLUMN LEVEL",
    /revoke update \(verified_at, verification_token\) on public\.business_domains from authenticated/.test(migration),
    "RLS chooses ROWS, not columns — without this a detailer stamps their own row and the fetch above is decoration");
}

// ─── 6. Only a verified domain resolves ───────────────────────────────────
console.log("\n6. an unverified row is a claim and nothing else");
{
  const byHost = migration.match(/create or replace function public\.get_public_business_profile_by_host[\s\S]*?\$\$;/)?.[0] ?? "";
  check("the by-host lookup was found", byHost.length > 0);
  check("it filters on verified_at", /d\.verified_at is not null/.test(byHost),
    "serving a business from an unverified claim lets anyone who can type a hostname decide what it shows");
  check("it delegates to the one profile function rather than copying it",
    /public\.get_public_business_profile\(b\.slug\)/.test(byHost),
    "a second copy of the profile is the thing that goes stale the next time a key is added");
  const canonical = migration.match(/create or replace function public\.business_canonical_host[\s\S]*?\$\$;/)?.[0] ?? "";
  check("the canonical-host lookup was found", canonical.length > 0);
  check("it filters on verified_at too", /verified_at is not null/.test(canonical));
  check("ONE rule for which of several domains wins, in SQL",
    /order by d\.created_at\s*\n?\s*limit 1/.test(canonical),
    "a rule written at four call sites is a rule that forks");
}

// ─── 7. The root route is the only path that forks ────────────────────────
console.log("\n7. the hostname changes exactly one route");
{
  const main = read("app/src/main.jsx");
  check("`/` asks which host it is on", /path="\/" element=\{isPlatformHost\(\)/.test(main));
  check("...and falls back to the marketing page when nothing resolves",
    /byHost notFound=\{<LandingPage \/>\}/.test(main),
    "the day somebody buys a second platform domain and forgets lib/host.js, / must show the product");
  const others = [...main.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]);
  check("no OTHER route branches on the hostname",
    (strip(main).match(/isPlatformHost\(/g) ?? []).length === 1,
    "every other path serves the same thing on either host, because the tenant's domain is aliased onto this same site");
  check("the routes the emails point at all still exist",
    ["/book/:slug", "/booking/:id", "/plan/:memberId", "/unsubscribe/:customerId"]
      .every((r) => others.includes(r)), others.join(" "));
}

// ─── 8. The allowlist is an allowlist ─────────────────────────────────────
console.log("\n8. host.js does no I/O");
{
  const h = strip(hostLib);
  check("no fetch, no supabase, no database", !/fetch\(|supabase|rpc\(/.test(h),
    "the marketing page must not pay a round trip to learn it is the marketing page");
  check("it exports both halves", /export function isPlatformHost/.test(h) && /export function tenantHost/.test(h));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
