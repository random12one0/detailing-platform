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
    </>
  );
}
