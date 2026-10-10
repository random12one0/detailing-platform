// SIGN UP A DETAILER, standing next to them (ROADMAP 9.12a step 6; was the old
// screen's NewBusiness). `create` makes the business and an owner INVITE, not a
// membership: the person may have no account yet. The invite link is shown as
// well as emailed, because he may be reading it to them or the email may be slow.
//
// It slides out the same way the detailer panel does, and leaves through
// `useLeaving`, the product's one exit.
import { useEffect, useRef, useState } from "react";
import { call } from "./api.js";
import { useLeaving } from "../../hooks/useLeaving.js";

const BLANK = { name: "", slug: "", owner_email: "", contact_phone: "", timezone: "America/Los_Angeles" };
// Same rule as the old screen and the tenant settings: the link follows the name
// until somebody types their own.
const slugify = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function SignUp({ ctx, onClose }) {
  const [leaving, close] = useLeaving(onClose);
  const [form, setForm] = useState(BLANK);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector("input")?.focus();
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); };
  }, [close]);

  const set = (k) => (e) => {
    const v = e.target.value;
    if (k === "name") setForm((f) => ({ ...f, name: v, slug: touched ? f.slug : slugify(v) }));
    else if (k === "slug") { setTouched(true); setForm((f) => ({ ...f, slug: slugify(v) })); }
    else setForm((f) => ({ ...f, [k]: v }));
  };
  const ready = form.name.trim() && form.slug && form.owner_email.includes("@") && form.timezone.trim();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(""); setMade(null);
    try {
      const out = await call({ action: "create", ...form });
      setMade(out);
      setForm((f) => ({ ...BLANK, timezone: f.timezone }));
      setTouched(false);
      ctx.reload();
    } catch (x) { setErr(x.message || "That did not work."); }
    setBusy(false);
  };

  return (
    <>
      <div className={`bo-scrim on${leaving ? " out" : ""}`} onClick={close} />
      <aside ref={ref} className={`bo-panel bo-signup on${leaving ? " out" : ""}`} role="dialog" aria-modal="true" aria-label="Sign up a detailer">
        <div className="bo-pglow" />
        <button type="button" className="bo-px" onClick={close} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="bo-pscroll">
          <div className="bo-pname">Sign up a detailer</div>
          <form className="bo-form" onSubmit={submit}>
            {/* 60, the same cap as every other door into a business name (ROADMAP 2.15a). */}
            <label><span>Business name</span><input name="name" maxLength={60} value={form.name} onChange={set("name")} /></label>
            <label><span>Booking link</span><input name="slug" value={form.slug} onChange={set("slug")} /></label>
            <label><span>Their email, for the invite</span><input name="owner_email" type="email" autoComplete="off" value={form.owner_email} onChange={set("owner_email")} /></label>
            <label><span>Their phone (optional)</span><input name="contact_phone" type="tel" value={form.contact_phone} onChange={set("contact_phone")} /></label>
            <label><span>Timezone</span><input name="timezone" value={form.timezone} onChange={set("timezone")} /></label>
            {err && <p className="bo-err" role="alert">{err}</p>}
            <div className="acts">
              <button type="submit" className="bo-btn go" disabled={!ready || busy}>{busy ? "Creating…" : "Create and invite"}</button>
            </div>
          </form>
          {made?.business && (
            <div className="bo-made" role="status">
              <b>{made.business.name} is set up</b>
              {made.invite
                ? (
                  <>
                    <p>{made.invite.emailed
                      ? `Invite emailed to ${made.invite.email}. If it does not arrive, read them this link:`
                      : "The invite email did not send. Read them this link instead:"}</p>
                    <input readOnly value={made.invite.link} aria-label="Invite link" onFocus={(e) => e.target.select()} />
                  </>
                )
                : <p>No invite was made. Send one from their panel.</p>}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
