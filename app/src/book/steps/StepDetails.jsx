// Step 5 — who we're detailing for.

import Refusal from "../Refusal.jsx";
import { emailFault } from "../core.js";
import { phoneAsTyped } from "../../lib/format.js";
import { t } from "../../lib/i18n.js";
import { useLocale } from "../../hooks/useLocale.js";

export default function StepDetails({ form, setForm, blocks = [], tried = false }) {
  useLocale();
  // **WHY THIS FILE STILL CALLS `emailFault` WHEN THE SENTENCES LEFT.** It is
  // not for the wording — `Refusal.jsx` owns that now — it is for
  // `aria-invalid` on the box below, which is a property of the FIELD and
  // belongs where the field is. The sentences that used to live here, and the
  // reasoning behind them, moved with them:
  //   * say which way it is wrong, not just that it is (2026-09-12) —
  //     `andrew@gmail` and `andrew@@gmail.com` were both told to add an @
  //     that was already on the screen;
  //   * not while the box is empty — an error under a field nobody has
  //     reached yet is the form telling somebody off for not having done it;
  //   * the diagnosis is `core.js`'s, so a tenant's own form gets it too.
  // **2.7 IS STILL OPEN AND THIS DOES NOT CLOSE IT**: whether an email should
  // be required at all when no plan is attached is a rules question, and the
  // rules live in `core.js`.
  const badEmail = !!emailFault(form.customerEmail);
  return (
    <>
      <label className="bk-field">
        <span>{t("Your name")}</span>
        <input value={form.customerName} autoComplete="name"
          onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
      </label>
      <div className="bk-grid2">
        <div>
          <label className="bk-field">
            <span>{t("Phone")}</span>
            <input type="tel" inputMode="tel" autoComplete="tel" value={form.customerPhone}
              onChange={(e) => setForm((f) => ({ ...f, customerPhone: phoneAsTyped(e.target.value) }))} />
          </label>
          <div className="bk-sms-consent">
            <label>
              <input type="checkbox" name="sms_consent" checked={form.smsConsent === true}
                onChange={(e) => setForm((f) => ({ ...f, smsConsent: e.target.checked }))} />
              <span>{t("Text me about my appointment. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help.")}</span>
            </label>
            <div className="bk-sms-links">
              <a href="https://detailingplatform.com/privacy" target="_blank" rel="noreferrer">{t("Privacy")}</a>
              <a href="https://detailingplatform.com/terms" target="_blank" rel="noreferrer">{t("Terms")}</a>
            </div>
          </div>
        </div>
        <label className="bk-field">
          <span>{t("Email")}</span>
          <input type="email" inputMode="email" autoComplete="email" value={form.customerEmail}
            aria-invalid={badEmail || undefined}
            onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} />
        </label>
      </div>
      {/* **THIS STEP WAS THE ONLY ONE THAT ANSWERED A PRESS, and nothing
          about it moves.** Same line, same place under the fields, same
          top-down order — an empty field named before a mistyped one. What
          changed is where the sentences are kept: they were this file's, and
          four other steps had none, so they now live in `Refusal.jsx` and
          every step reads them from there. The wording, the placement and
          Andrew's no-scold-on-arrival rule are unchanged.
          **The reassurance is still this file's**, because it is not a
          refusal: it is what the line says when nothing is wrong. */}
      {blocks.length ? (
        <Refusal blocks={blocks} tried={tried} form={form} style={{ marginTop: -4, marginBottom: 14 }} />
      ) : (
        <p className="bk-muted" style={{ marginTop: -4, marginBottom: 14 }}>
          {t("We’ll send your confirmation here, with a link to change or cancel.")}
        </p>
      )}
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
