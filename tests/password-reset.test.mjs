// The way back in — item N, ranked *blocks launch* by roadmap 7.3's final
// pass and built 2026-09-06.
//
// **UNTIL THAT DAY A DETAILER WHO FORGOT THEIR PASSWORD COULD NOT GET INTO
// THEIR OWN BUSINESS AT ALL.** No link on the sign-in screen, no route, and
// nothing anywhere in `app/src` that called `resetPasswordForEmail` or
// `updateUser`. The only remedy was the platform owner editing the auth table
// by hand, which is not a support answer — it is the absence of one.
//
// WHAT THIS FILE PINS IS THE THREE THINGS THAT ARE INVISIBLE FROM THE SCREEN.
// The flow itself was exercised end to end against a real recovery link (a new
// password saved, signed in, and the same link then refused) — a browser can
// see that. It cannot see that the confirmation says the same thing whether or
// not the address exists, that the page never reads the URL hash itself, or
// that a member with no permission ticks can still change their own password.
// Each of those is a sentence about what the code does NOT do.
//
// Run: node tests/password-reset.test.mjs   (credential-free)

import { readFileSync } from "node:fs";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}\n        ${detail}`); }
};

// Comments AND JSX comments out before anything reads source as text. This
// repo has been caught SEVEN times in two days by a check failing — or
// passing — on the prose that explains it.
const strip = (t) => t
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const auth = strip(readFileSync("app/src/screens/Auth.jsx", "utf8"));
const reset = strip(readFileSync("app/src/screens/ResetPassword.jsx", "utf8"));
const pw = strip(readFileSync("app/src/screens/more/Password.jsx", "utf8"));
const main = strip(readFileSync("app/src/main.jsx", "utf8"));
const gear = strip(readFileSync("app/src/components/GearMenu.jsx", "utf8"));
const registry = strip(readFileSync("app/src/screens/more/index.js", "utf8"));

// ─── 1. There is a way in, and a way to change it ─────────────────────────
console.log("1. the two doors exist");
{
  check("the sign-in screen can ask for a link",
    /resetPasswordForEmail\(/.test(auth) && /I forgot my password/.test(auth),
    "this is the whole of item N: without it the only remedy is editing the auth table");
  check("the link comes back to a route this app serves",
    /redirectTo:\s*`\$\{window\.location\.origin\}\/reset`/.test(auth));
  check("that route exists", /path="\/reset"/.test(main));
  // OUTSIDE `Wrapped`: the person arriving has a session but no business
  // loaded, and `BusinessProvider` would make them wait on a membership they
  // are not using.
  check("and is not wrapped in the business provider",
    !/<Wrapped><ResetPassword/.test(main) && /element=\{<ResetPassword \/>\}/.test(main));
  check("a signed-in person can change it too", /updateUser\(\{ password \}\)/.test(pw));
  check("from a row behind the gear", /"password", "Your password"/.test(gear)
    && /password: \[Password, "Your password"\]/.test(registry));
}

// ─── 2. The three things a browser cannot see ─────────────────────────────
console.log("\n2. what the screen cannot show");
{
  // ADDRESS ENUMERATION. "No account with that email" turns a sign-in form
  // into a way of asking which of a list of addresses is a customer of ours —
  // the same reasoning that made `plan-link` take an email IN and send a link
  // OUT rather than answering a lookup (roadmap 2.14 step 3).
  const branch = auth.slice(auth.indexOf("if (resetting)"), auth.indexOf("const { error: err } = creating"));
  check("2a · the reset branch has subjects", branch.length > 80, `${branch.length} chars`);
  check("2b · the answer never says whether the address exists",
    !/setError\(/.test(branch) && /setSent\(true\)/.test(branch),
    "showing the error here is address enumeration with a friendly face");
  check("2c · and the message says 'if' rather than 'we have'",
    /If we have an account for/.test(auth));

  // THE SESSION IS ALREADY SPENT BY THE TIME THE PAGE RENDERS. `supabase-js`
  // has `detectSessionInUrl` on, so it reads the token out of the hash,
  // exchanges it and clears the address bar before React mounts. A page that
  // reads the hash itself finds an empty one and calls a working link bad.
  check("2d · the reset page never reads the URL hash itself",
    !/location\.hash/.test(reset) && /getSession\(\)/.test(reset));
  check("2e · it waits for the exchange rather than deciding on the first tick",
    /onAuthStateChange/.test(reset) && /setTimeout/.test(reset));

  // A member with NO permission ticks must still be able to change their own
  // password: a password belongs to the person, not to the business, and
  // staff are exactly the people handed one by somebody else.
  const row = gear.slice(gear.indexOf('["password"'));
  check("2f · the password row is gated by nothing",
    /\["password", "Your password", KeyRound, "[^"]*", null\]/.test(row),
    "a permission here would lock staff out of their own credential");
}

// ─── 3. A lockout must not be fixable into another lockout ────────────────
console.log("\n3. the failure this screen exists to fix");
{
  // A TYPO IN A PASSWORD YOU THEN CANNOT SIGN IN WITH LOCKS YOU OUT AGAIN,
  // from the page that was supposed to be the way back.
  for (const [what, src] of [["the reset page", reset], ["the settings screen", pw]]) {
    check(`3a · ${what} asks for it twice`,
      (src.match(/autoComplete="new-password"/g) ?? []).length === 2
        && /password !== again/.test(src));
    check(`3b · ${what} refuses a short one`, /minLength=\{8\}/.test(src));
  }
  // A dead link is the ORDINARY case — a recovery link works once and lasts an
  // hour, and mail scanners follow links — so it gets a state of its own
  // rather than a form that fails on submit.
  check("3c · an expired link says so instead of failing on save",
    /"dead"/.test(reset) && /That link has expired/.test(reset));
  check("3d · and offers the way to ask for another",
    /Back to sign in/.test(reset));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
