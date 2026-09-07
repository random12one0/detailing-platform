// ROADMAP 8.18 — TWO LOGINS AT ONCE.
//
// *"Maybe there's an account switcher — like how on Chrome you could log into
// multiple Google accounts and switch between accounts."*
//
// ---------------------------------------------------------------------------
// WHAT THIS HOLDS THAT NOTHING ELSE CAN.
// ---------------------------------------------------------------------------
// **EVERY DEFECT THIS FEATURE CAN PRODUCE IS INVISIBLE FROM THE SCREEN.** The
// switcher either works or it does not, and that part a browser can see. What
// a browser cannot see is that the button saying *Sign out* leaves a second
// person's refresh token in this browser — the screen looks identical, the
// session really did end, and the hole only exists for whoever picks the
// tablet up next. § 2 and § 5 are that.
//
// **AND § 5 DISCOVERS ITS SUBJECTS RATHER THAN LISTING THEM.** There were
// THREE `auth.signOut(` call sites in `app/src` when this was written and the
// item's own note named one; the other two — the back office's exit and the
// half-finished-signup exit — were found by grepping for the call. A hand-
// written list is short by one the first time somebody adds a fourth door,
// and the fourth door is the one nobody tests.
//
// § 1 RUNS THE MODULE rather than reading it, against a stub `localStorage`,
// because the park's whole job is arithmetic on a list and reading source
// cannot tell you that `takeAccount` removes what it returns.
//
//   node tests/two-logins.test.mjs        (no credentials, no browser)

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
// Strip comments before reading source as text. This repo has shipped four
// checks that passed on a COMMENT describing the thing they were looking for.
const strip = (t) => t
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

// ─── 1. The park is a list, and it behaves like one ───────────────────────
console.log("1. what the park actually does");
{
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const A = await import("../app/src/lib/accounts.js");

  const one = { user: { id: "u1", email: "a@x.com" }, access_token: "at1", refresh_token: "rt1" };
  const two = { user: { id: "u2", email: "b@x.com" }, access_token: "at2", refresh_token: "rt2" };

  check("1a · an empty park lists nothing", A.listAccounts().length === 0);
  A.parkCurrent(one, "biz-1");
  A.parkCurrent(two, "biz-2");
  check("1b · two accounts park", A.listAccounts().length === 2);

  // PARKING THE SAME PERSON TWICE IS ONE ROW. Switching back and forth parks
  // the same user id on every hop; without the replace the list grows for
  // ever and the screen draws the same name four times.
  A.parkCurrent({ ...one, access_token: "at1b", refresh_token: "rt1b" }, "biz-1");
  const after = A.listAccounts();
  check("1c · re-parking the same person replaces, never appends", after.length === 2,
    `${after.length} rows`);
  check("1c-ii · and it is the NEWER pair that is kept",
    after.find((a) => a.userId === "u1")?.refresh_token === "rt1b");

  // TAKING REMOVES. A `takeAccount` that only READ would leave the tokens of
  // the account that is now LIVE sitting in the park — so its own name would
  // appear on its own switcher, and signing out would leave a way back in.
  const got = A.takeAccount("u1");
  check("1d · taking an account returns its tokens", got?.refresh_token === "rt1b");
  check("1d-ii · and REMOVES it from the park",
    A.listAccounts().every((a) => a.userId !== "u1"));
  check("1d-iii · taking an account that is not there answers null",
    A.takeAccount("nobody") === null);

  // THE DEVICE'S CHOSEN BUSINESS TRAVELS WITH THE ACCOUNT. `dp.business` is a
  // fact about this device, so without this a switch lands on whichever
  // membership the query happens to return first.
  check("1e · the account's own business is parked with it", got?.business === "biz-1");

  // A SESSION WITH NO REFRESH TOKEN IS NOT PARKABLE — it is a row that draws
  // a name and cannot be pressed.
  A.parkCurrent({ user: { id: "u3" }, access_token: "at3" }, null);
  check("1f · a session with no refresh token is refused",
    A.listAccounts().every((a) => a.userId !== "u3"));

  // AND A CORRUPT STORE IS AN EMPTY PARK, NEVER A THROW. This module is
  // imported by the sign-in screen, which is the first thing anybody meets.
  store.set("dp.accounts", "{not json");
  check("1g · unparseable storage reads as empty rather than throwing",
    A.listAccounts().length === 0);
  store.set("dp.accounts", JSON.stringify([{ userId: "u9" }, null, 7]));
  check("1g-ii · and a half-written row is dropped rather than drawn",
    A.listAccounts().length === 0);

  A.parkCurrent(one, null);
  A.parkCurrent(two, null);
  A.forgetAll();
  check("1h · forgetAll empties it", A.listAccounts().length === 0);
}

// ─── 2. Signing out ENDS the parked sessions, it does not just forget them ─
console.log("2. sign out means signed out, everywhere");
{
  const OUT = strip(read("app/src/lib/signout.js"));
  const ACC = strip(read("app/src/lib/accounts.js"));
  check("2a · the check has a subject — the one door was read", OUT.length > 200,
    `${OUT.length} chars`);

  // **THE FIRST VERSION ONLY EMPTIED THE PARK LOCALLY AND THE SECURITY REVIEW
  // CAUGHT IT.** Removing the entry revokes nothing, and the `signOut()`
  // beside it runs as the LIVE user, so it ends that user's token family and
  // leaves every parked one valid — for ever, because a parked session is
  // never refreshed and Supabase refresh tokens do not expire on their own.
  // On the shared tablet this feature is FOR, that is the owner pressing Sign
  // out and handing over a working key: a refresh token is bound to neither
  // device nor origin, so a copy taken out of localStorage still works.
  // **SCOPED TO THE FUNCTION BODY, BECAUSE THE IMPORT IS IN THE FILE.**
  // `indexOf` on a name that also appears in an import compares against the
  // import — this repo's most repeated test defect, and baselining caught it
  // here on the very break these two checks exist for.
  const doorAt = OUT.indexOf("export async function signOutEverything");
  const door = doorAt > -1 ? OUT.slice(doorAt) : "";
  check("2b · the check has a subject — the function body was found",
    door.length > 60 && door.includes("auth.signOut"), `${door.length} chars`);
  check("2b-i · it ends the parked sessions rather than only forgetting them",
    /endParkedSessions\(/.test(door));
  // **PRESENCE OF BOTH, THEN ORDER.** `indexOf(a) < indexOf(b)` passes
  // loudest when `a` has been DELETED — -1 is less than every real index — so
  // an ordering check written that way is at its greenest exactly when the
  // thing it guards is gone. This repo has found that four times.
  check("2b-ii · and it does that BEFORE ending the live one",
    door.indexOf("endParkedSessions") > -1 && door.indexOf("auth.signOut") > -1
    && door.indexOf("endParkedSessions") < door.indexOf("auth.signOut"));
  check("2c · it still drops the impersonation note", /endImpersonation\(\)/.test(door));
  // A LOCAL-SCOPE SIGN-OUT WOULD LEAVE THE LIVE SESSION ALIVE ON EVERY OTHER
  // DEVICE, which is the opposite of what the button promises.
  check("2c-ii · and the live sign-out is not scoped", !/scope/.test(OUT));

  // THE REVOCATION IS A REAL ONE. A parked access token is usually expired —
  // they last about an hour — so it has to be refreshed before it can be used
  // to log out, and a `logout` with a stale JWT answers 401 and revokes
  // nothing while looking like it worked.
  check("2d · the revocation refreshes the parked token first",
    /grant_type=refresh_token/.test(ACC));
  check("2d-ii · and then logs it out globally", /auth\/v1\/logout\?scope=global/.test(ACC));

  // AND THE LOCAL CLEAR IS FIRST AND UNCONDITIONAL. A failed round trip must
  // not leave another account reachable from THIS browser — that failure needs
  // no attacker at all, just the next person to pick the tablet up.
  const i = ACC.indexOf("export async function endParkedSessions");
  const body = i > -1 ? ACC.slice(i, i + 700) : "";
  check("2e · the check has a subject — endParkedSessions was found", body.length > 120);
  check("2e-ii · the local clear happens before any request",
    body.indexOf("forgetAll()") > -1
    && body.indexOf("forgetAll()") < body.indexOf("revokeParked"));

  // RUN IT. Reading cannot tell you that a thrown fetch still leaves the park
  // empty, and that is the property the ordering exists for.
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const A = await import("../app/src/lib/accounts.js");
  A.parkCurrent({ user: { id: "u1", email: "a@x" }, access_token: "at1", refresh_token: "rt1" }, null);
  A.parkCurrent({ user: { id: "u2", email: "b@x" }, access_token: "at2", refresh_token: "rt2" }, null);
  const hits = [];
  globalThis.fetch = async (u, init) => {
    hits.push(String(u));
    if (String(u).includes("grant_type=refresh_token")) {
      return { ok: true, json: async () => ({ access_token: "fresh" }) };
    }
    return { ok: true };
  };
  await A.endParkedSessions("https://x.supabase.co", "anon");
  check("2f · both parked sessions were logged out at the server",
    hits.filter((u) => u.includes("/logout")).length === 2, hits.join(" | "));
  check("2f-ii · and the park is empty afterwards", A.listAccounts().length === 0);

  // THE FAILURE CASE, WHICH IS THE ONE THE ORDER EXISTS FOR.
  A.parkCurrent({ user: { id: "u3", email: "c@x" }, access_token: "at3", refresh_token: "rt3" }, null);
  globalThis.fetch = async () => { throw new Error("offline"); };
  await A.endParkedSessions("https://x.supabase.co", "anon");
  check("2g · a network failure still leaves the park empty here",
    A.listAccounts().length === 0);
}

// ─── 3. Parking revokes nothing ───────────────────────────────────────────
console.log("3. adding an account must not destroy the one being parked");
{
  const CTX = strip(read("app/src/context/BusinessContext.jsx"));
  const ACC = strip(read("app/src/lib/accounts.js"));
  const i = CTX.indexOf("addAccount:");
  const end = i > -1 ? CTX.indexOf("\n    },", i) : -1;
  const add = i > -1 && end > i ? CTX.slice(i, end) : "";
  check("3a · the check has a subject — addAccount was found",
    add.length > 80 && add.length < 1400, `${add.length} chars`);

  // **NO SCOPE OF `signOut` DOES WHAT PARKING NEEDS, AND THE FIRST VERSION OF
  // THIS ITEM SHIPPED THE WRONG ONE.** GoTrue's `local` means *revoke the
  // CURRENT session's refresh token* — the exact token parked a line earlier —
  // `global` revokes all of them, `others` revokes everything except the one
  // being abandoned, and `_signOut` POSTs `/logout` for every one. Driving it
  // in a browser is what found it: pressing the parked name landed on the
  // sign-in screen with a null token.
  check("3b · it parks the live session first",
    add.indexOf("parkCurrent") > -1
    && (add.indexOf("endSessionLocally") === -1
        || add.indexOf("parkCurrent") < add.indexOf("endSessionLocally")));
  check("3b-ii · and ends the session locally rather than calling signOut",
    /endSessionLocally\(\)/.test(add));
  check("3b-iii · no scope is passed to anything here", !/scope:/.test(add));

  // THE FALLBACK IS THE HONEST EXIT, NOT A SILENT ONE. If the storage entry
  // cannot be found, leaving somebody signed in with a park they cannot see is
  // worse than making them type a password.
  const tail = add.slice(add.indexOf("endSessionLocally"));
  check("3c · a failure to find the entry signs out of everything",
    /signOutEverything\(\)/.test(tail));

  // AND THE HELPER ITSELF MATCHES BOTH SHAPES supabase-js WRITES. A session
  // too big for one entry is split across `.0`, `.1`, and removing only the
  // first leaves a half-session that reads as signed in.
  check("3d · the local end matches the chunked key shape too",
    ACC.includes("auth-token(\\.\\d+)?"));
  check("3d-ii · and it reports failure rather than pretending",
    /return false;/.test(ACC));

  // AND THE CONTEXT'S OWN `signOut` IS THE ONE DOOR, not a fourth copy of it.
  check("3e · signOut is the shared exit", /signOut: signOutEverything/.test(CTX));

  // **AND SWITCHING PARKS THE SESSION IT IS LEAVING.** Without this the
  // account you switch AWAY from is simply thrown away, which is invisible
  // until somebody tries to switch a second time — and it is exactly what the
  // first version of `ParkedAccounts` did with its own copy of this code.
  const k = CTX.indexOf("useAccount:");
  const kEnd = k > -1 ? CTX.indexOf("\n    },", k) : -1;
  const use = k > -1 && kEnd > k ? CTX.slice(k, kEnd) : "";
  check("3f · the check has a subject — useAccount was found",
    use.length > 120 && use.length < 1600, `${use.length} chars`);
  check("3f-ii · it parks the outgoing session", /parkCurrent\(/.test(use));
  check("3f-iii · and puts that account's own business back",
    /parked\.business/.test(use));
}

// ─── 4. The way back, and it is never inside a form ───────────────────────
console.log("4. five browser scripts sign in through that form");
{
  const LIST = strip(read("app/src/components/ParkedAccounts.jsx"));
  check("4a · the check has a subject — the component was read", LIST.length > 400,
    `${LIST.length} chars`);
  check("4a-ii · it is the one place the parked list is drawn",
    /data-parked-accounts/.test(LIST));
  // **IT SWITCHES THROUGH `useAccount`, NEVER ITSELF.** The park, the outgoing
  // session and this device's chosen business have to move together, and the
  // first draft of this file carried its own copy that silently did NOT park
  // the session it was leaving — so switching away from the create-a-business
  // screen threw that account away. Found by driving it, not by reading it.
  check("4b · it switches through the one implementation",
    /useAccount\(a\.userId\)/.test(LIST));
  check("4b-ii · and does not set a session itself", !/setSession/.test(LIST));
  // A DEAD PARKED SESSION IS DROPPED, NOT LEFT ON THE LIST. It can be dead for
  // reasons nothing here can see — the password changed, the session was
  // revoked elsewhere — and a name that cannot be pressed is worse than no
  // name, because it reads as the feature being broken.
  check("4b-iv · a session that will not restore is redrawn without it",
    /setParked\(listAccounts\(\)\)/.test(LIST));
  // ITS BUTTONS ARE `type="button"`. Inside a form — which is where somebody
  // will eventually put it — a bare <button> SUBMITS, so pressing a name
  // would try to sign in with whatever is typed.
  check("4b-iii · its buttons never submit anything", /type="button"/.test(LIST));

  // **AND EVERY PLACE THAT DRAWS IT IS FOUND RATHER THAN LISTED.** There are
  // two today and the second — the create-a-business screen — was found by
  // driving the feature, not by designing it. `form button.btn.primary` is a
  // DESCENDANT selector used by five browser scripts in this repo, so a
  // second primary button under a form does not fail a test with a useful
  // message: it times out every browser run there is.
  const drawn = [];
  for (const f of ["app/src/screens/Auth.jsx", "app/src/screens/CreateBusiness.jsx",
                   "app/src/components/GearMenu.jsx", "app/src/App.jsx"]) {
    const src = strip(read(f));
    if (src.includes("<ParkedAccounts")) drawn.push([f, src]);
  }
  check("4c · the check has subjects — the list is drawn somewhere",
    drawn.length >= 2, `${drawn.length} screens`);
  for (const [f, src] of drawn) {
    const at = src.indexOf("<ParkedAccounts");
    const open = src.lastIndexOf("<form", at);
    const close = src.lastIndexOf("</form>", at);
    // Inside a form means: a <form opened before it and has not closed since.
    const inside = open > -1 && open > close;
    check(`4d · ${f.split("/").pop()} draws it OUTSIDE the form`, !inside);
  }

  // AND THE SIGN-IN FORM ITSELF STILL HAS EXACTLY ONE PRIMARY BUTTON.
  const AUTH = strip(read("app/src/screens/Auth.jsx"));
  const form = AUTH.indexOf("<form onSubmit={submit}");
  check("4e · the check has a subject — the sign-in form was found", form > -1);
  const inForm = AUTH.slice(form);
  check("4e-ii · and it still has exactly one primary button",
    (inForm.match(/className="btn primary"/g) || []).length === 1,
    String((inForm.match(/className="btn primary"/g) || []).length));
}

// ─── 5. EVERY door out, discovered rather than listed ─────────────────────
console.log("5. every way out of this product, found by walking it");
{
  const SRC = new URL("../app/src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(jsx?|tsx?)$/.test(name)) files.push(full);
    }
  })(SRC);
  check("5a · the check has subjects — the source tree was walked",
    files.length > 40, `${files.length} files`);

  // **THERE IS ONE DOOR AND IT IS `lib/signout.js`.** There were three when
  // this feature was built and the item's own note named one; the other two
  // were found by grepping for the call. Every one of them has to end the
  // impersonation note, end the parked sessions AT THE SERVER, and then end
  // the live one — and "the same three things in three places" is exactly how
  // the third one quietly stops doing the third thing. A fourth `auth.signOut`
  // anywhere in `app/src` fails this.
  const sites = [];
  for (const f of files) {
    const src = strip(readFileSync(f, "utf8"));
    let at = src.indexOf("auth.signOut(");
    while (at > -1) {
      const line = src.slice(0, at).split("\n").length;
      sites.push({ file: `${f.slice(SRC.length).split("\\").join("/")}:${line}`, src, at });
      at = src.indexOf("auth.signOut(", at + 1);
    }
  }
  check("5b · every sign-out in the product was found", sites.length >= 1,
    `${sites.length} call sites`);
  for (const s2 of sites) {
    check(`5c · ${s2.file} — is the one door`, s2.file.startsWith("lib/signout.js"),
      s2.src.slice(s2.at, s2.at + 60).replace(/\s+/g, " "));
  }

  // AND EVERY SCREEN THAT OFFERS A WAY OUT GOES THROUGH IT. A screen that
  // rolls its own is the third-place problem coming straight back.
  const exits = [];
  for (const f of files) {
    const src = strip(readFileSync(f, "utf8"));
    if (/signOutEverything/.test(src)) exits.push(f.slice(SRC.length).split("\\").join("/"));
  }
  check("5d · the one door is used from more than one screen",
    exits.length >= 4, exits.join(", "));
}

// ─── 6. It is not the other switcher ──────────────────────────────────────
console.log("6. two people, not two businesses");
{
  const CTX = strip(read("app/src/context/BusinessContext.jsx"));
  // `switchBusiness` MUST NOT HAVE BECOME THIS. They read almost the same in
  // a screenshot and are entirely different acts: one moves between the
  // memberships of ONE signed-in person and needs no tokens at all.
  // **SLICED TO ITS OWN CLOSING BRACE, NOT TO A CHARACTER COUNT.** A fixed
  // 300-character window ran straight into `addAccount` — the next property in
  // the same object — so this check failed on the very neighbour it exists to
  // tell `switchBusiness` apart from. Same shape as every `indexOf` defect in
  // this repo: the window has to end where the subject does.
  const i = CTX.indexOf("switchBusiness:");
  const end = i > -1 ? CTX.indexOf("\n    },", i) : -1;
  const sw = i > -1 && end > i ? CTX.slice(i, end) : "";
  check("6a · the check has a subject — switchBusiness was found",
    sw.length > 60 && sw.length < 900, `${sw.length} chars`);
  check("6b · it still touches no session at all", !/setSession|signOut|parkCurrent/.test(sw));
  check("6c · and it is still a device preference plus a reload",
    /PREFERRED_KEY/.test(sw) && /reload\(\)/.test(sw));

  const GEAR = strip(read("app/src/components/GearMenu.jsx"));
  check("6d · the gear still offers Switch business on a two-membership account",
    /memberships\.length > 1/.test(GEAR) && /"Switch business"/.test(GEAR));
  check("6e · and the account switcher draws nothing until there is a second person",
    /accounts\.length > 0 &&/.test(GEAR));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
