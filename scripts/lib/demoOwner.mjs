// THE DEMO TENANT'S OWNER LOGIN — ONE COPY, READ FROM THE ENVIRONMENT.
//
// **IT WAS THIRTY COPIES.** The owner's password was written out as a literal in 30
// files under `scripts/` on 2026-10-02 — in `const OWNER = {...}`, in bare
// `page.fill("input[type=password]", …)` calls, and in prose quoting Andrew's
// own sentence about it. A session reported it as "the fifth copy" an hour
// before counting them, which is this repo's own subject: a number written
// into prose once and never re-run. `grep -rn <the value> scripts/ tests/` answers
// it in one command.
//
// **AND THIS FILE'S OWN FIRST DRAFT PRINTED THE VALUE TWICE**, in the paragraph
// explaining why nothing should print the value. Caught by grepping the finished
// module rather than by writing it carefully.
//
// **WHY IT MATTERS EVEN THOUGH THE ACCOUNT IS FAKE.** CLAUDE.md's rule is
// absolute and has no judgement call in it: no password goes in a file. The
// account being a seeded fixture on a database with no real data is a reason
// the damage is nil, not a reason the rule bends — and a rule with an
// exception in it is the one somebody applies to the wrong account later.
// `scripts/admin-account.mjs` is the worked example: the all-seeing admin
// password was a published credential in a public repo for weeks, next to the
// URL it worked at, because the same reasoning had been applied one account
// over.
//
// **WHERE THE VALUE LIVES NOW: `.env`, which is gitignored**, beside every
// other credential these scripts already need. The documented line at the top
// of CLAUDE.md loads it:
//
//     set -a; . ./.env; set +a
//
// **IT FAILS LOUDLY AND NEVER FALLS BACK.** A default here would put the
// literal back in a file, one import deeper, and every caller would keep
// working so nobody would ever notice it had. A missing variable is a stopped
// script with an instruction, which is the only version of this that stays
// true.

const EMAIL = "demo@detailplatform.com";  // mail-sink: a seeded login, not a secret

/**
 * The demo tenant's owner. Throws rather than guessing.
 * `{ email, password }` — the shape every caller already used.
 */
export function demoOwner() {
  const password = process.env.DEMO_OWNER_PW;
  if (!password) {
    throw new Error(
      "DEMO_OWNER_PW is not set, so this script cannot sign in as the demo tenant's owner.\n"
      + "  It is the seeded owner password and it lives in `.env`, which is gitignored.\n"
      + "  Load it the way CLAUDE.md documents, from the repo root:\n"
      + "      set -a; . ./.env; set +a\n"
      + "  If `.env` has no DEMO_OWNER_PW line, add one. The value is whatever\n"
      + "  `scripts/seed-demo.mjs` seeded; re-run that script if nobody remembers it.\n"
      + "  NOTHING WAS MEASURED. This is not a pass.",
    );
  }
  return { email: EMAIL, password };
}

/** The owner's email alone, for the callers that only needed that. */
export const demoOwnerEmail = EMAIL;

const STAFF_EMAIL = "demo-staff@detailplatform.com";  // mail-sink: a seeded login

/**
 * The demo tenant's STAFF member. `seed-demo.mjs` creates both accounts, so
 * both passwords were literals in it and both are read from the environment
 * now. Same contract: it throws rather than guessing.
 */
export function demoStaff() {
  const password = process.env.DEMO_STAFF_PW;
  if (!password) {
    throw new Error(
      "DEMO_STAFF_PW is not set. It is the seeded staff password and it lives in `.env`,\n"
      + "  which is gitignored. Load it from the repo root:\n"
      + "      set -a; . ./.env; set +a\n"
      + "  NOTHING WAS MEASURED. This is not a pass.",
    );
  }
  return { email: STAFF_EMAIL, password };
}
