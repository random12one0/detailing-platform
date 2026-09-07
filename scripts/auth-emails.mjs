// THE SIGN-IN SYSTEM'S OWN EMAILS, RENDERED WITH THE PRODUCT'S OWN KIT.
//
//   node --env-file=.env scripts/auth-emails.mjs            # write them out
//   node --env-file=.env scripts/auth-emails.mjs --apply    # ...and install
//
// **WHY THIS EXISTS.** Supabase's GoTrue sends the password-reset email, and
// out of the box it is a bare sentence and a naked link on a white page. It is
// the ONLY email in this product that was not built with `emailKit.ts`, and it
// is the one a detailer meets at the worst moment — locked out of their own
// dashboard, wondering whether the thing they paid for is real. The owner:
// *"make the email better and look professional and nice."*
//
// **IT IS RENDERED, NOT WRITTEN.** The templates come out of the same
// `shell()`, the same blocks and the same palette as the other twenty-five, so
// they cannot drift into a second look, and every rule `render-emails.mjs`
// enforces about colour and contrast holds here for free. Re-run it after any
// change to the kit.
//
// **WHAT GOTRUE ADDS THAT NOTHING ELSE DOES: `{{ .ConfirmationURL }}`.** It is
// a Go template placeholder, substituted by the auth server at send time. It
// must survive `esc()` untouched, which is why it is placed by
// `buttonBlock`'s href rather than typed into prose.
//
// **AND ONE LIMIT WORTH SAYING OUT LOUD:** GoTrue sends HTML only. Every other
// email in this repo carries a plain-text alternative derived by `htmlToText`,
// and this one cannot — there is no field for it. It is the single exception
// to that rule and it is the auth server's, not ours.

import { mkdirSync, writeFileSync } from "node:fs";
import {
  buttonBlock, fineBlock, headlineBlock, labBlock, proseBlock, ruleBlock, shell,
} from "../supabase/functions/_shared/emailKit.ts";
import { platformBrand } from "../supabase/functions/_shared/platformBrand.ts";

const SITE = process.env.PLATFORM_URL || "https://detailingplatform.com";
const brand = platformBrand(SITE);
const URL_ = "{{ .ConfirmationURL }}";

// ── THE FOUR GOTRUE SENDS THAT CAN REACH A DETAILER ───────────────────────
// `recovery` is the one that matters and the only one the product actually
// uses today; the other three are rendered so that switching any of them on
// later cannot produce a bare white page nobody designed.
const TEMPLATES = {
  recovery: {
    subject: "Set a new password",
    preheader: "The link works once and lasts an hour.",
    blocks: [
      labBlock("Your account"),
      headlineBlock("Set a new password"),
      proseBlock("Somebody asked to reset the password on this account. Press the button and you can choose a new one."),
      buttonBlock(brand, "Choose a new password", URL_),
      ruleBlock(),
      fineBlock("The link works once and lasts about an hour. If it has expired, ask for another from the sign-in page — and if this was not you, nothing has changed and you can ignore this."),
    ],
  },
  magic_link: {
    subject: "Your sign-in link",
    preheader: "One press and you are in.",
    blocks: [
      labBlock("Your account"),
      headlineBlock("Here is your way in"),
      proseBlock("Press the button to sign in. No password needed."),
      buttonBlock(brand, "Sign me in", URL_),
      ruleBlock(),
      fineBlock("The link works once and lasts about an hour. If this was not you, you can ignore it."),
    ],
  },
  confirmation: {
    subject: "Confirm your email",
    preheader: "One press and your account is ready.",
    blocks: [
      labBlock("Your account"),
      headlineBlock("Confirm your email"),
      proseBlock("Press the button to confirm this address and finish setting up your account."),
      buttonBlock(brand, "Confirm my email", URL_),
      ruleBlock(),
      fineBlock("If you did not create an account, you can ignore this and nothing happens."),
    ],
  },
  email_change: {
    subject: "Confirm your new email",
    preheader: "One press and the change takes effect.",
    blocks: [
      labBlock("Your account"),
      headlineBlock("Confirm your new email"),
      proseBlock("Press the button to confirm this address. Until you do, your old one keeps working."),
      buttonBlock(brand, "Confirm the change", URL_),
      ruleBlock(),
      fineBlock("If you did not ask for this, ignore it — nothing changes without the button being pressed."),
    ],
  },
};

const rendered = Object.fromEntries(
  Object.entries(TEMPLATES).map(([k, t]) => [k, { subject: t.subject, html: shell(brand, t.blocks, t.preheader) }]),
);

// A PLACEHOLDER THAT DOES NOT SURVIVE IS AN EMAIL WITH A DEAD BUTTON, and it
// would look perfectly fine in the preview. `esc()` would turn the braces into
// entities, so this is the one thing worth asserting rather than eyeballing.
for (const [k, r] of Object.entries(rendered)) {
  if (!r.html.includes(URL_)) {
    console.error(`${k}: the {{ .ConfirmationURL }} placeholder did not survive rendering`);
    process.exit(1);
  }
}

const OUT = process.env.OUT || "email-preview-auth";
mkdirSync(OUT, { recursive: true });
for (const [k, r] of Object.entries(rendered)) {
  writeFileSync(`${OUT}/${k}.html`, r.html);
  console.log(`  ${k.padEnd(14)} ${r.subject}`);
}
console.log(`\n${Object.keys(rendered).length} auth emails → ${OUT}/`);

if (!process.argv.includes("--apply")) {
  console.log("\nNot installed. Re-run with --apply to put them on the auth server.");
  process.exit(0);
}

const REF = process.env.SUPABASE_PROJECT_REF, TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!REF || !TOKEN) { console.error("Missing SUPABASE_PROJECT_REF / SUPABASE_ACCESS_TOKEN"); process.exit(1); }
const body = {};
for (const [k, r] of Object.entries(rendered)) {
  body[`mailer_subjects_${k}`] = r.subject;
  body[`mailer_templates_${k}_content`] = r.html;
}
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.error(`Could not install: ${res.status} ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
console.log("\nInstalled on the auth server.");
