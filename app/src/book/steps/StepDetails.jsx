// Step 5 — who we're detailing for.

import { emailFault } from "../core.js";
import { phoneAsTyped } from "../../lib/format.js";
import { t } from "../../lib/i18n.js";
import { useLocale } from "../../hooks/useLocale.js";

export default function StepDetails({ form, setForm }) {
  useLocale();
  // SAY WHICH FIELD IS WRONG, AND ONLY ONCE THEY HAVE TYPED SOMETHING. An
  // outside review, 2026-09-11: `notanemail` walked through this step, and the
  // confirmation page then promised to email it. The gate is in `core.js` so
  // every tenant site gets it; this is the sentence that tells a person why
  // Continue will not move.
  //
  // NOT WHILE THE BOX IS EMPTY. An error under a field nobody has reached yet
  // is the form telling somebody off for not having done it.
  // **WHICH WAY IT IS WRONG — 2026-09-12.** One sentence covered three faults,
  // so `andrew@gmail` and `andrew@@gmail.com` were both told to add an @ that
  // was already on the screen, on the last step before booking. Correct
  // refusal, wrong reason, and a wrong reason is worse than none because it is
  // actionable in the wrong direction. The DIAGNOSIS is `core.js`'s, so a
  // tenant's own form gets it too; only the wording is this page's.
  const fault = emailFault(form.customerEmail);
  const badEmail = !!fault;
  return (
    <>
      <label className="bk-field">
        <span>{t("Your name")}</span>
        <input value={form.customerName} autoComplete="name"
          onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
      </label>
      <div className="bk-grid2">
        <label className="bk-field">
          <span>{t("Phone")}</span>
          <input type="tel" inputMode="tel" autoComplete="tel" value={form.customerPhone}
            onChange={(e) => setForm((f) => ({ ...f, customerPhone: phoneAsTyped(e.target.value) }))} />
        </label>
        <label className="bk-field">
          <span>{t("Email")}</span>
          <input type="email" inputMode="email" autoComplete="email" value={form.customerEmail}
            aria-invalid={badEmail || undefined}
            onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} />
        </label>
      </div>
      <p className={badEmail ? "bk-error" : "bk-muted"} style={{ marginTop: -4, marginBottom: 14 }}>
        {/* **WRITTEN OUT RATHER THAN LOOKED UP IN A MAP, on purpose.** The
            first version held these four in an object and `tests/spanish`
            § 1c caught it within the minute: a string in a data table is
            invisible to every extractor in this repo, which is the exact
            blind spot that hid a "tap" in `lib/setup.js` and an em dash in a
            template. A literal `t("…")` is what the sweeps can see. */}
        {!badEmail
          ? t("We’ll send your confirmation here, with a link to change or cancel.")
          : fault === "missing-at"
            ? t("That address is missing an @. We cannot send your confirmation to it.")
            : fault === "missing-dot"
              ? t("That address needs something after the dot, like .com.")
              : fault === "two-ats"
                ? t("That address has two @ symbols.")
                : t("That address will not work. Check it over.")}
      </p>
      <label className="bk-field">
        <span>{t("Anything we should know? (optional)")}</span>
        <textarea value={form.customerNotes} placeholder={t("Gate codes, pet hair, problem areas…")}
          onChange={(e) => setForm((f) => ({ ...f, customerNotes: e.target.value }))} />
      </label>
      {/* ROADMAP 2.21 — THE HONEYPOT. A person never sees this and never
          fills it; a bot that completes every input it finds completes this
          one, and `create-booking` drops the booking without saying so.

          IT IS HIDDEN THE WAY A SCREEN READER ALSO UNDERSTANDS — `hidden`
          plus `aria-hidden` plus `tabIndex={-1}` — rather than with
          off-screen positioning, because a field parked at -9999px is one a
          screen-reader user CAN reach and be confused by, and refusing a
          real customer's booking for using assistive technology would be a
          far worse bug than the one this prevents.

          `autoComplete="off"` matters too: a browser that helpfully fills a
          field called "website" from a saved profile would turn a real
          customer into a dropped booking.

          **AND IT IS NOT TRANSLATED, WHICH IS THE POINT — roadmap 8.17.** The
          name `website` is what a form-filler recognises; a Spanish label
          would make it a field bots skip and people see. */}
      <input type="text" name="website" tabIndex={-1} aria-hidden="true" hidden
        autoComplete="off" value={form.website ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
    </>
  );
}
