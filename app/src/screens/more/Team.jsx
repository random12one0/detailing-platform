// Owner-only: invite people, revoke pending invites, remove members,
// change roles. The database enforces all of this too — the last owner
// cannot be removed or demoted, and staff sessions simply can't read the
// owner-only tables.

import { useCallback, useEffect, useState } from "react";
import { Copy, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { api } from "../../lib/api.js";
import { useBusiness } from "../../context/BusinessContext.jsx";

export default function Team() {
  const { business, session } = useBusiness();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [form, setForm] = useState({ email: "", role: "staff" });
  const [nameDraft, setNameDraft] = useState("");
  const [lastLink, setLastLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const [m, i] = await Promise.all([
      supabase.from("business_users").select("*").eq("business_id", business.id),
      supabase
        .from("business_invites")
        .select("*")
        .eq("business_id", business.id)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
    ]);
    setMembers(m.data ?? []);
    setInvites((i.data ?? []).filter((x) => new Date(x.expires_at) > new Date()));
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const invite = async () => {
    setBusy(true);
    setMsg(null);
    setLastLink(null);
    try {
      const r = await api.inviteUser(business.id, form.email.trim(), form.role);
      setLastLink(r.invite.link);
      setMsg({
        ok: true,
        text: r.emailed
          ? `Invite sent to ${r.invite.email}. It expires in 7 days.`
          : `Invite created for ${r.invite.email}. Email is not configured yet, so send them the link below.`,
      });
      setForm({ ...form, email: "" });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
    setBusy(false);
  };

  const revoke = async (inv) => {
    await supabase
      .from("business_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", inv.id)
      .eq("business_id", business.id);
    load();
  };

  const removeMember = async (m) => {
    if (!confirm("Remove this person? They lose access to the dashboard immediately.")) return;
    setMsg(null);
    const { error } = await supabase
      .from("business_users")
      .delete()
      .eq("business_id", business.id)
      .eq("user_id", m.user_id);
    if (error) setMsg({ ok: false, text: error.message.includes("last owner") ? "You can't remove the last owner." : error.message });
    load();
  };

  const changeRole = async (m, role) => {
    setMsg(null);
    const { error } = await supabase
      .from("business_users")
      .update({ role })
      .eq("business_id", business.id)
      .eq("user_id", m.user_id);
    if (error) setMsg({ ok: false, text: error.message.includes("last owner") ? "You can't demote the last owner." : error.message });
    load();
  };

  const ownerCount = members.filter((m) => m.role === "owner").length;
  const me = members.find((m) => m.user_id === session?.user?.id);

  const saveMyName = async () => {
    await supabase
      .from("business_users")
      .update({ first_name: nameDraft.trim() || null })
      .eq("business_id", business.id)
      .eq("user_id", session.user.id);
    setMsg({ ok: true, text: "Name saved." });
    load();
  };

  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>Your name</div>
      <p className="muted" style={{ marginBottom: 8 }}>Used to greet you on the Today screen.</p>
      <div className="row" style={{ gap: 8 }}>
        <input placeholder={me?.first_name || "First name"} value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)} />
        <button className="btn inline" onClick={saveMyName}>Save</button>
      </div>

      <div className="section-title">Team</div>
      {members.map((m) => (
        <div className="card row between" key={m.user_id}>
          <div>
            <strong>{m.email || (m.user_id === session?.user?.id ? session.user.email : "Team member")}</strong>
            <div className="muted">
              {m.role === "owner" ? "Owner. Full access." : "Staff. Bookings and calendar only."}
              {m.user_id === session?.user?.id ? " This is you." : ""}
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <select
              value={m.role}
              onChange={(e) => changeRole(m, e.target.value)}
              disabled={m.role === "owner" && ownerCount === 1}
              style={{ minHeight: 40, width: "auto" }}
            >
              <option value="owner">Owner</option>
              <option value="staff">Staff</option>
            </select>
            <button
              className="btn ghost inline"
              aria-label="Remove"
              disabled={m.role === "owner" && ownerCount === 1}
              onClick={() => removeMember(m)}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      ))}

      <div className="section-title">Invite someone</div>
      <div className="grid2">
        <label className="field"><span>Email</span>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="field"><span>Role</span>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="staff">Staff</option>
            <option value="owner">Owner</option>
          </select></label>
      </div>
      <p className="muted" style={{ marginBottom: 10 }}>
        Staff can see bookings, the calendar and customer contact details.
        They cannot see money, settings, branding, promo codes or this team page.
      </p>
      <button className="btn primary" disabled={busy || !form.email.trim()} onClick={invite}>
        {busy ? "Sending" : "Send invite"}
      </button>

      {lastLink && (
        <div className="card row between" style={{ marginTop: 12 }}>
          <span className="muted" style={{ wordBreak: "break-all" }}>{lastLink}</span>
          <button className="btn ghost inline" aria-label="Copy link"
            onClick={() => navigator.clipboard?.writeText(lastLink)}>
            <Copy size={18} strokeWidth={2} />
          </button>
        </div>
      )}

      {invites.length > 0 && <div className="section-title">Pending invites</div>}
      {invites.map((inv) => (
        <div className="card row between" key={inv.id}>
          <div>
            <strong>{inv.email}</strong>
            <div className="muted">
              {inv.role === "owner" ? "Owner" : "Staff"} · expires {String(inv.expires_at).slice(0, 10)}
            </div>
          </div>
          <button className="btn ghost inline" onClick={() => revoke(inv)}>Revoke</button>
        </div>
      ))}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
    </div>
  );
}
