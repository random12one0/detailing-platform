// WHY THE PRESS WAS REFUSED — one component, every step.
//
// **THE MECHANISM ALREADY EXISTED AND ONLY ONE STEP EVER GOT IT.** ROADMAP
// 2.6 made Continue `aria-disabled` rather than `disabled`, so a press with
// something missing reaches the page instead of being swallowed, and it set a
// `tried` flag "for every step". The flag was then handed to `StepDetails`
// and to nothing else. So four steps kept refusing in silence, and the code
// read as though they did not — the comment beside the flag says *each step
// already names its own missing pieces*, which was true of one of them.
//
// Walked and measured at 392 before any of this was written, pressing
// Continue with the step incomplete:
//
//   step 1, no service        nothing at all — no text, no colour, no sound
//   step 4, no address        nothing — the grey hint was already there and
//                             did not change (Andrew found this one himself)
//   step 5, no day            nothing — same
//   step 5, no time           nothing — same
//   step 6, name/phone/email  the line turns red. The only step that answered
//
// Steps 2 and 3 are not on that list and cannot be: add-ons have no blocker
// at all, and the vehicle step's only blockers are "the price is still being
// worked out", which clears itself. Neither can refuse a press in practice.
//
// **WHAT IS SHARED IS THE SENTENCE AND THE BEHAVIOUR, NOT THE PLACE.** The
// sentence still sits next to the missing field, which was a deliberate call
// on 2026-09-12 — *a tooltip would be no use on a phone, which is where this
// flow is used* — so each step renders this where its own hint already was.
// What no longer varies is which words a blocker gets, whether it goes red,
// whether a screen reader hears it, and whether anything happens at all.
//
// **NO BLOCKER CAN BE SILENT, INCLUDING ONE NOBODY HAS WRITTEN A SENTENCE
// FOR.** `reasonFor` ends in a fallback rather than returning null, because
// the failure this whole item is about is a refusal with nothing said. A
// blocker added to `core.js` next year by somebody who never opens this file
// still produces an answer, and a vague answer is recoverable in a way that
// silence is not.

import { emailFault } from "./core.js";
import { t } from "../lib/i18n.js";
import { useLocale } from "../hooks/useLocale.js";

// **WRITTEN OUT AS LITERAL `t("…")` CALLS, NOT LOOKED UP IN A MAP.** Moved
// here from `StepDetails.jsx`, which carries the reason: the first version of
// that line held its four sentences in an object and `tests/spanish` § 1c
// caught it within the minute — a string in a data table is invisible to
// every extractor in this repo. Same rule here, at five times the size.
//
// ONE SENTENCE, NOT A LIST, and the order is the order of the form. A step
// with three empty fields names the first one; fill it and the line moves on.
// That is how `StepDetails` has always behaved and it is the behaviour Andrew
// reviewed — the alternative is seven strings for the combinations of three.
export function reasonFor(blocks, form) {
  if (blocks.includes("no-service")) return t("Choose a service to continue.");
  // Not a refusal so much as a wait: the press landed while the price was
  // still being worked out, and the button will free itself.
  if (blocks.includes("pricing")) return t("Working out your price…");
  if (blocks.includes("no-quote")) {
    return t("We need a price before this can continue. Go back and pick your services again.");
  }
  if (blocks.includes("no-address")) return t("Add the address to continue.");
  // **THESE TWO ARE NOT SILENT, AND THE FIRST DRAFT OF THIS COMMENT SAID
  // THEY WERE.** A required faucet or outlet already prints *"Without it we
  // can't do this job at your address."* under its own switch, and
  // `StepLocation.jsx` says so. That sentence is a CONSEQUENCE stated before
  // the customer answers; it is not an answer to a press, it never changes,
  // and it does not say which of the two is the one holding the button. So
  // they belong here for the same reason the address does.
  if (blocks.includes("no-water")) return t("Confirm you can provide an outdoor faucet to continue.");
  if (blocks.includes("no-power")) return t("Confirm you can provide a power outlet to continue.");
  if (blocks.includes("no-date")) return t("Pick a day to continue.");
  if (blocks.includes("no-time")) return t("Pick a time to continue.");
  if (blocks.includes("no-extra-slot")) return t("Every vehicle needs its own day and time.");
  const needName = blocks.includes("no-name");
  const needPhone = blocks.includes("no-phone");
  if (needName && needPhone) return t("Add your name and phone number to continue.");
  if (needName) return t("Add your name to continue.");
  if (needPhone) return t("Add your phone number to continue.");
  // ROADMAP 99.8 — the number is there but digits are missing, so the
  // detailer would get a number nobody can call or text. Said beside the
  // box like every other blocker, never only as a silent refusal.
  if (blocks.includes("bad-phone")) return t("That phone number looks incomplete. Check it and try again.");
  if (blocks.includes("no-email")) return t("Add your email to continue. Your confirmation goes there.");
  if (blocks.includes("bad-email")) {
    // The DIAGNOSIS is `core.js`'s, so a tenant's own form gets it too; only
    // the wording is ours. Correct refusal, wrong reason, is worse than no
    // reason — it is actionable in the wrong direction.
    const fault = emailFault(form?.customerEmail);
    if (fault === "missing-at") return t("That address is missing an @. We cannot send your confirmation to it.");
    if (fault === "missing-dot") return t("That address needs something after the dot, like .com.");
    if (fault === "two-ats") return t("That address has two @ symbols.");
    return t("That address will not work. Check it over.");
  }
  return t("Something on this step still needs an answer.");
}

// `tried` is the customer's turn, not the page's opinion. Nothing is red
// until they have pressed — Andrew, 2026-09-14 — but the sentence itself is
// visible the whole time, because guidance before the press is what stops the
// press being needed.
export default function Refusal({ blocks = [], tried = false, form, style }) {
  useLocale();
  if (!blocks.length) return null;
  return (
    <p
      // **RE-KEYED ON THE PRESS SO IT IS ANNOUNCED.** The sentence is often
      // already on screen in grey, so turning it red changes no text and a
      // screen reader would say nothing at all — the silence this item is
      // about, moved rather than fixed. A fresh node carrying `role="alert"`
      // is announced when it appears.
      key={tried ? "answered" : "calm"}
      className={`bk-refusal ${tried ? "bk-error" : "bk-muted"}`}
      role={tried ? "alert" : undefined}
      style={style ?? { marginTop: 10 }}
    >
      {reasonFor(blocks, form)}
    </p>
  );
}
