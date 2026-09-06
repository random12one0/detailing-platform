// Step 5 — who we're detailing for.

export default function StepDetails({ form, setForm }) {
  return (
    <>
      <label className="bk-field">
        <span>Your name</span>
        <input value={form.customerName} autoComplete="name"
          onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
      </label>
      <div className="bk-grid2">
        <label className="bk-field">
          <span>Phone</span>
          <input type="tel" inputMode="tel" autoComplete="tel" value={form.customerPhone}
            onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} />
        </label>
        <label className="bk-field">
          <span>Email</span>
          <input type="email" inputMode="email" autoComplete="email" value={form.customerEmail}
            onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} />
        </label>
      </div>
      <p className="bk-muted" style={{ marginTop: -4, marginBottom: 14 }}>
        We’ll send your confirmation here, with a link to change or cancel.
      </p>
      <label className="bk-field">
        <span>Anything we should know? (optional)</span>
        <textarea value={form.customerNotes} placeholder="Gate codes, pet hair, problem areas…"
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
          customer into a dropped booking. */}
      <input type="text" name="website" tabIndex={-1} aria-hidden="true" hidden
        autoComplete="off" value={form.website ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
    </>
  );
}
