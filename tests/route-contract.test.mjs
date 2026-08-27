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
  const toRoute = (tpl) => tpl
    .replace(/\$\{PLATFORM_URL\}/g, "")
    .replace(/\$\{businessSiteUrl\([^)]*\)\}/g, "")
    .replace(/\$\{slug\}/g, ":slug")
    .replace(/\$\{bookingId\}/g, ":id");
  check("the site URL's path is a served route", routes.includes(toRoute(site)), toRoute(site));
  check("the receipt URL's path is a served route", routes.includes(toRoute(receipt)), toRoute(receipt));
}

console.log("\ntest 3: the platform URL is overridable per deployment");
{
  check("PLATFORM_URL reads the environment", /Deno\.env\.get\("PLATFORM_URL"\)/.test(config));
  check("it has a default so local dev still works", /DEFAULT_PLATFORM_URL/.test(config));
  check("a trailing slash cannot double up", /replace\(\/\\\/\+\$\/, ""\)/.test(config), "expected trailing-slash strip");
  // The sending domain must NOT follow a preview deployment, or preview mail
  // would claim to come from a domain that isn't the verified sender.
  check("the from-address is not derived from PLATFORM_URL",
    /PLATFORM_FROM_ADDRESS = "bookings@/.test(config));
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
  const appLine = main.split("\n").find((l) => l.includes('path="/*"')) ?? "";
  check("the dashboard catch-all IS wrapped", /Wrapped|BusinessProvider/.test(appLine), appLine.trim());
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
