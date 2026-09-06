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
  check("router still has a catch-all", routes.includes("/*"));
  check("the landing page owns /", routes.includes("/"));
  check("the dashboard lives at /app/*", routes.includes("/app/*"));
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
  const appLine = main.split("\n").find((l) => l.includes('path="/app/*"')) ?? "";
  check("the dashboard at /app/* IS wrapped", /Wrapped|BusinessProvider/.test(appLine), appLine.trim());
  const legacyLine = main.split("\n").find((l) => l.includes('path="/*"')) ?? "";
  check("the legacy catch-all IS wrapped", /Wrapped|BusinessProvider/.test(legacyLine), legacyLine.trim());
  // A customer landing on / is a visitor, not staff: no session round trip.
  const rootLine = main.split("\n").find((l) => l.includes('path="/"')) ?? "";
  check("the landing page is not wrapped in the session provider",
    !/Wrapped|BusinessProvider/.test(rootLine), rootLine.trim());
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
