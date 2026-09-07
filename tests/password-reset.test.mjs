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

// ─── 4. THE WAY IN — the page itself ──────────────────────────────────────
// ROADMAP 2.25. The owner, seeing it for the first time: *"the sign in page
// needs a face lift with proper spacing, the nice background glow and proper
// spacing etc."*
//
// **THE PART THAT IS NOT TASTE, AND THE REASON THESE ARE CHECKS AT ALL: FIVE
// BROWSER SCRIPTS SIGN IN THROUGH THIS FORM.** `sweep-widths`,
// `shoot-dashboard`, `final-pass`, `two-detailers` and `e2e-booking` all fill
// `input[type=email]` and `input[type=password]` and press
// `form button.btn.primary`. Renaming any of the three does not break a test
// with a useful message — it breaks every browser run in the repo at once,
// with a timeout. CLAUDE.md says so in as many words; this is that sentence
// with teeth.
console.log("\n4. the way in (roadmap 2.25)");
{
  const css = readFileSync("app/src/theme.css", "utf8");

  check("4a · the three selectors five scripts sign in through still exist",
    /type="email"/.test(auth) && /type="password"/.test(auth)
      && /className="btn primary"/.test(auth),
    "renaming one of these times out every browser script in the repo");
  // AND THE SUBMIT IS STILL INSIDE THE FORM. `form button.btn.primary` is a
  // DESCENDANT selector: moving the button out of the <form> keeps it looking
  // right and makes every script fail to find it.
  const formAt = auth.indexOf("<form onSubmit={submit}");
  const btnAt = auth.indexOf('className="btn primary"', formAt);
  check("4a-ii · and the submit button is still inside the form",
    formAt > 0 && btnAt > formAt && auth.indexOf("</form>", formAt) > btnAt);

  // ── THE GROUND IS SHARED, NEVER COPIED ────────────────────────────────
  // A `.authpage` with its own gradients is the two-grounds failure the
  // design system exists to prevent, and it drifts the first time either is
  // touched.
  check("4b · the sign-in page carries the same ground as the dashboard",
    /\.app-shell, \.authpage \{/.test(css)
      && /\.app-shell::before, \.authpage::before \{/.test(css));
  check("4b-ii · and it is the same lattice element, not a second one",
    /className="app-dots"/.test(auth));
  // The desk rail's inset belongs to the dashboard alone — this page has no
  // rail, and inheriting 120px of left padding would shove the card sideways
  // at every desk width.
  // **THE RULE, NOT THE FIRST BREAKPOINT THAT MATCHES.** The first version
  // sliced from `indexOf("@media (min-width: 1024px)")` — and theme.css has
  // more than one of those, the first being about `.emptyscreen` four hundred
  // lines earlier. It was reading a block that could never contain the thing
  // it was asserting about, so it passed with the padding genuinely leaked.
  const railLine = css.split(/\r?\n/).find((l) => /padding-left:\s*120px/.test(l)) ?? "";
  check("4b-iii · but not the rail's padding",
    railLine.includes(".app-shell") && !railLine.includes("authpage"),
    `the rail rule reads: ${railLine.trim() || "not found"}`);

  // ── THE RHYTHM, WHICH WAS THE ACTUAL COMPLAINT ────────────────────────
  // The two inputs used to be stacked with no gap at all: `label.field` onto
  // `label.field`, while every other form in the product wraps them in
  // `.fields`, the one class that owns that spacing.
  check("4c · the fields use the product's own rhythm class",
    /<div className="fields">/.test(auth));
  check("4c-ii · and the card is not spaced by numbers invented here",
    /\.authpage \.card > \* \+ \* \{ margin-top: var\(--sp-4\); \}/.test(css));

  // ── IT SAYS WHERE YOU ARE ─────────────────────────────────────────────
  // An unlabelled card on an empty page is the defect the back office's own
  // door had (testing loop F-021). This is the first screen anybody meets.
  check("4d · the page names the product",
    /className="authmark"/.test(auth) && /Detailing Platform/.test(auth));

  // ── THE GOOGLE BUTTON IS BUILT AND SELF-ENABLING ──────────────────────
  // Drawn from GoTrue's own settings endpoint, so it appears the moment the
  // provider is switched on and never before — no rebuild, and never a button
  // leading to "provider is not enabled". **Nobody should build this again**;
  // 2.25 records that it already exists and is waiting on a Google Cloud
  // client only the owner can make.
  check("4e · Google is offered the moment the provider is on, and not before",
    /providers\.google && !resetting/.test(auth)
      && /auth\/v1\/settings/.test(auth));
  check("4e-ii · and it uses Google's own marque rather than a tinted one",
    /#4285F4/.test(auth) && /#EA4335/.test(auth));

  // ── THE THREE WAYS ON ARE A LADDER ────────────────────────────────────
  // All three used to be the same bold row, which made every option look
  // equally likely on the screen somebody meets first.
  check("4f · signing in is the primary and the others are not",
    /className="btn primary"/.test(auth)
      && /className="authalt"/.test(auth)
      && /className="btn ghost sm"/.test(auth));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
