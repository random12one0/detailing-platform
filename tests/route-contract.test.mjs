// The email builder and the router are two files that must agree about
// URLs, and nothing connected them.
//
// They disagreed. supabase/functions/_shared/config.ts emitted
//   /{slug}                    and  /{slug}/booking/{id}
// while app/src/main.jsx served
//   /book/:slug                and  /booking/:id
// so "View, change or cancel this booking" in a customer's confirmation
// email fell through to the catch-all route and showed the customer the
// STAFF SIGN-IN screen. Every unit test passed the whole time, because a
// unit test never follows a link.
//
// This reads both files and fails if they drift again.
//
//   node tests/route-contract.test.mjs

import { readFile } from "node:fs/promises";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name} ${detail}`); }
};

const config = await readFile("supabase/functions/_shared/config.ts", "utf8");
const main = await readFile("app/src/main.jsx", "utf8");

// What the router actually serves.
const routes = [...main.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
console.log("routes served:", routes.join(", "));

console.log("\ntest 1: the routes the emails point at exist");
{
  check("router serves /book/:slug", routes.includes("/book/:slug"), routes.join(","));
  check("router serves /booking/:id", routes.includes("/booking/:id"), routes.join(","));
  // **THE CATCH-ALL IS A 404 PAGE NOW, NOT THE DASHBOARD — roadmap item P,
  // 2026-09-10.** It used to be `/*` → the dashboard, which meant an unknown
  // address answered with a SIGN-IN FORM: a customer who mistyped a booking
  // link was asked to make an account to see their own appointment, and a
  // detailer following a stale link concluded they had been signed out. This
  // asserted the old arrangement by name, so it is restated as what the rule
  // was always FOR — every address resolves to something deliberate.
  check("router still has a catch-all", routes.includes("*") || routes.includes("/*"));
  check("the landing page owns /", routes.includes("/"));
  // `/app` plus its five tab names, rather than `/app/*` swallowing everything
  // beneath it — or `/app/nonsense` is the one address left that pretends to
  // exist. The names are exported from App.jsx so a sixth tab is not a 404.
  check("the dashboard lives at /app and its tabs",
    routes.includes("/app") && /TAB_PATHS\.map/.test(main),
    routes.join(","));
}

console.log("\ntest 2: config.ts builds those exact paths");
{
  // Pull the template literals out of the two builders rather than
  // executing Deno-flavoured TS.
  const site = config.match(/export function businessSiteUrl[\s\S]*?return `([^`]+)`/)?.[1] ?? "";
  const receipt = config.match(/export function receiptUrl[\s\S]*?return `([^`]+)`/)?.[1] ?? "";
  check("businessSiteUrl builds /book/{slug}", site.includes("/book/${slug}"), site);
  check("receiptUrl builds /booking/{bookingId}", receipt.includes("/booking/${bookingId}"), receipt);

  // The generated path, with the placeholders filled, must match a route.
  //
  // ROADMAP 3.3 — `${site}` JOINED `${PLATFORM_URL}` HERE, and the two are the
  // same thing for this test's purposes: the ORIGIN is now per-tenant (a
  // detailer's own verified address, or the platform's) while the PATH is what
  // this file exists to pin. Stripping both leaves the path, which is the only
  // half the router serves. **If a builder ever stops stripping to a path that
  // starts with `/`, that is this check going vacuous** — so the assertion
  // below demands exactly that.
  const toRoute = (tpl) => tpl
    .replace(/\$\{PLATFORM_URL\}/g, "")
    .replace(/\$\{site\}/g, "")
    .replace(/\$\{businessSiteUrl\([^)]*\)\}/g, "")
    .replace(/\$\{slug\}/g, ":slug")
    .replace(/\$\{bookingId\}/g, ":id");
  check("the site URL's path is a served route", routes.includes(toRoute(site)), toRoute(site));
  check("the receipt URL's path is a served route", routes.includes(toRoute(receipt)), toRoute(receipt));
  // ROADMAP 3.3 — THE CHECK THAT THE CHECKS ABOVE HAVE SUBJECTS. Every builder
  // must reduce to a bare path, because the moment one reduces to something
  // else — a new origin variable this helper does not know about — the
  // `routes.includes()` above becomes a comparison against a string that can
  // never match, or worse, against `""`, which is the vacuity this repo has
  // already shipped twice. Same shape as `email-brand` 7a-iii.
  check("every builder reduces to a path, so the checks above have subjects",
    [site, receipt].every((t) => toRoute(t).startsWith("/") && !toRoute(t).includes("${")),
    [toRoute(site), toRoute(receipt)].join(" · "));

  // ROADMAP 2.14 STEP 3 — two more builders, and both are in exactly the
  // position `receiptUrl` was in when it silently pointed a customer at the
  // staff sign-in screen: a URL that only ever appears inside an email, so
  // nothing in the app ever follows it and no unit test ever would.
  const plan = config.match(/export function planUrl[\s\S]*?return `([^`]+)`/)?.[1] ?? "";
  const plans = config.match(/export function plansUrl[\s\S]*?return `([^`]+)`/)?.[1] ?? "";
  check("planUrl builds /plan/{memberId}", plan.includes("/plan/${memberId}"), plan);
  check("plansUrl builds /book/{slug}/plans", plans.includes("/book/${slug}/plans"), plans);
  const toRoute2 = (tpl) => toRoute(tpl).replace(/\$\{memberId\}/g, ":memberId");
  check("router serves the plan member page", routes.includes(toRoute2(plan)), toRoute2(plan));
  check("router serves the plans page", routes.includes(toRoute2(plans)), toRoute2(plans));

  // ROADMAP 2.19 — and this one is the sharpest case this test has ever had.
  // The other builders point at pages a customer can also reach some other
  // way; the opt-out link exists NOWHERE except at the bottom of a marketing
  // email. If it drifted, the symptom would be a customer pressing
  // "stop these emails", landing on the staff sign-in screen, and the business
  // still emailing them — which is the failure this test was written for, with
  // a legal obligation attached.
  const unsub = config.match(/export function unsubscribeUrl[\s\S]*?return `([^`]+)`/)?.[1] ?? "";
  check("unsubscribeUrl builds /unsubscribe/{customerId}", unsub.includes("/unsubscribe/${customerId}"), unsub);
  const toRoute3 = (tpl) => toRoute(tpl).replace(/\$\{customerId\}/g, ":customerId");
  check("router serves the opt-out page", routes.includes(toRoute3(unsub)), toRoute3(unsub));
}

console.log("\ntest 3: the platform URL is overridable per deployment");
{
  check("PLATFORM_URL reads the environment", /Deno\.env\.get\("PLATFORM_URL"\)/.test(config));
  check("it has a default so local dev still works", /DEFAULT_PLATFORM_URL/.test(config));
  check("a trailing slash cannot double up", /replace\(\/\\\/\+\$\/, ""\)/.test(config), "expected trailing-slash strip");
  // The sending domain must NOT follow a preview deployment, or preview mail
  // would claim to come from a domain that isn't the verified sender.
  // It reads its own env var, with a literal domain as the fallback — never
  // a template over PLATFORM_URL/PLATFORM_DOMAIN.
  const fromExpr = config.match(/PLATFORM_FROM_ADDRESS =\n?([\s\S]*?);/)?.[1] ?? "";
  check("the from-address is not derived from PLATFORM_URL",
    /"bookings@[a-z.]+"/.test(fromExpr) && !/PLATFORM_URL|PLATFORM_DOMAIN/.test(fromExpr),
    fromExpr.trim());
}

console.log("\ntest 4: the public routes sit outside the owner's session context");
{
  // A customer arriving from a text message has no session. If the public
  // routes were inside BusinessProvider they would wait on an auth round
  // trip they can never satisfy.
  const bookLine = main.split("\n").find((l) => l.includes('path="/book/:slug"')) ?? "";
  const manageLine = main.split("\n").find((l) => l.includes('path="/booking/:id"')) ?? "";
  check("/book/:slug is not wrapped in the session provider",
    !/Wrapped|BusinessProvider/.test(bookLine), bookLine.trim());
  check("/booking/:id is not wrapped in the session provider",
    !/Wrapped|BusinessProvider/.test(manageLine), manageLine.trim());
  // Roadmap 2.14 step 3 — the same rule for the two plan pages. A plan member
  // is a customer, not staff: waiting on a session they can never have is the
  // failure this test was written for.
  const planLine = main.split("\n").find((l) => l.includes('path="/plan/:memberId"')) ?? "";
  const plansLine = main.split("\n").find((l) => l.includes('path="/book/:slug/plans"')) ?? "";
  check("/plan/:memberId is not wrapped in the session provider",
    !!planLine && !/Wrapped|BusinessProvider/.test(planLine), planLine.trim());
  check("/book/:slug/plans is not wrapped in the session provider",
    !!plansLine && !/Wrapped|BusinessProvider/.test(plansLine), plansLine.trim());
  // Roadmap 2.19. Somebody unsubscribing is the LEAST likely person in the
  // product to have a session, and making them wait on one would be a page
  // that never resolves for exactly the people the law says must be able to
  // leave.
  const unsubLine = main.split("\n").find((l) => l.includes('path="/unsubscribe/:customerId"')) ?? "";
  check("/unsubscribe/:customerId is not wrapped in the session provider",
    !!unsubLine && !/Wrapped|BusinessProvider/.test(unsubLine), unsubLine.trim());
  const appLine = main.split("\n").find((l) => l.includes('path="/app"')) ?? "";
  check("the dashboard at /app IS wrapped", /Wrapped|BusinessProvider/.test(appLine), appLine.trim());
  const tabLine = main.split("\n").find((l) => l.includes("path={`/app/${tab}`}")) ?? "";
  check("and so is every tab route", /Wrapped|BusinessProvider/.test(tabLine), tabLine.trim());
  // **AND THE 404 IS DELIBERATELY *NOT* WRAPPED.** Somebody who mistyped an
  // address is usually a customer with no session, and the provider would make
  // the page that explains the mistake wait on an auth round trip it can never
  // satisfy. `NotFound` asks Supabase for a session itself, which is one
  // request it can survive failing.
  const missLine = main.split("\n").find((l) => l.includes('path="*"')) ?? "";
  check("the 404 page is NOT wrapped in the session provider",
    !!missLine && !/Wrapped|BusinessProvider/.test(missLine), missLine.trim());
  // A customer landing on / is a visitor, not staff: no session round trip.
  const rootLine = main.split("\n").find((l) => l.includes('path="/"')) ?? "";
  check("the landing page is not wrapped in the session provider",
    !/Wrapped|BusinessProvider/.test(rootLine), rootLine.trim());
}

// ---------------------------------------------------------------------------
// THE EXAMPLE PAGES NEED THEIR SLASH REWRITTEN, AND THE ORDER IS THE RULE.
//
// **THE TEN NUMBERED /exampleN PAGES WERE DELETED 2026-09-10** at the owner's
// instruction — his second time asking, and the reason is in
// `scripts/build-examples.mjs` where the list used to be. This check followed
// them: it asserted ten rewrites that must no longer exist, and a test that
// pins a deleted feature is a test that stops the deletion.
//
// **What it holds now is /ex1 … /ex5**, which are the sites he is building one
// at a time and the only ones served. The mechanism is unchanged and so is the
// bug it guards: each page is built as `ex1/index.html`, a DIRECTORY — so
// `/ex1/` resolves and `/ex1` does not: it matches no file, falls through to
// `/* /index.html 200`, and serves the app shell, which (roadmap item P) draws
// a SIGN-IN FORM. `/ex1` without the slash is the URL he asked for and the one
// he would send somebody.
//
// `_redirects` is FIRST-MATCH-WINS, so the generated rules are worthless
// unless they sit ABOVE the catch-all. That ordering is the only thing a
// check here can hold, and it is the thing that would silently break.
// ---------------------------------------------------------------------------
{
  console.log("\nthe example-page rewrites");
  const dist = new URL("../app/dist/_redirects", import.meta.url);
  const red = await readFile(dist, "utf8").catch(() => null);

  if (red === null) {
    // A GUARD THAT SKIPS MUST SAY SO — this repo's most repeated finding is
    // that a skipped check reads exactly like a passing one.
    console.log("  NOT MEASURED — app/dist/_redirects is absent." +
      " Run `npm run build --prefix app` first; these rules are generated at build time.");
  } else {
    const catchAll = red.indexOf("/*    /index.html");
    check("the catch-all is still there", catchAll > -1,
      "without it /book/:slug 404s, and a 404 there is a lost booking");
    check("every example path is rewritten to its own index.html",
      Array.from({ length: 5 }, (_, i) => `/ex${i + 1}    /ex${i + 1}/index.html`)
        .every((r) => red.includes(r)) && red.includes("/examples    /examples/index.html"),
      "a slashless /exN falls through and draws the sign-in screen");
    check("and every one of them sits ABOVE the catch-all",
      catchAll > -1 && red.indexOf("/ex1    ") > -1 &&
      red.lastIndexOf("/examples    /examples/index.html") < catchAll,
      "_redirects is first-match-wins — below the catch-all they never fire");
    // AND THE DELETED ONES STAY DELETED. Without this the rewrites could come
    // back with the pages and nothing would say so — which is exactly how they
    // survived being asked for once already.
    check("and no /exampleN rewrite came back",
      !/\/example\d/.test(red),
      "the ten numbered pages were deleted on purpose — scripts/build-examples.mjs says why");
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
