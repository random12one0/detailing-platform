// Owner-only: invite people, revoke pending invites, remove members, and —
// since roadmap 2.13 — NAME the role and tick what it can do. The database
// enforces all of this too: the last owner cannot be removed or demoted
// (`protect_last_owner()`, a trigger, so it binds the service role as well),
// and a membership without a permission simply reads no rows from the tables
// behind it.
//
// THE OWNER'S ASK, 2026-08-31: "invite someone, and you could give them a
// name, like a customizable name, and you could also check… options on what
// permissions they should have and what they shouldn't."
//
// `owner` SURVIVED, AND THAT IS THE DESIGN RATHER THAN AN OMISSION. It means
// everything, always. The alternative — dissolving it into a permission set —
// takes the last-owner trigger's subject away from it, and "a business nobody
// can administer" has to stay unreachable.
//
// THE TICK LIST IS NOT ON THIS SCREEN. It is `lib/permissions.js`, because the
// same four names are printed here AND used to decide what the dashboard
// offers, and a second copy is how the two drift.

import { useCallback, useEffect, useState } from "react";
import { Copy, X } from "lucide-react";
import { Segmented, Setting, Switch } from "../../components/controls.jsx";
import { supabase } from "../../lib/supabase.js";
import { api } from "../../lib/api.js";
import { PERMISSIONS, permissionSummary, roleName } from "../../lib/permissions.js";
import { useBusiness } from "../../context/BusinessContext.jsx";

// The name and the ticks, in one shape — used on a member and on the invite
// form, which are the same question asked before and after somebody exists.
function RoleFields({ label, permissions, onLabel, onToggle }) {
  return (
    <>
      {/* STACKED. `.setting` puts the words left and the control right, which
          is right for a switch and wrong for a field with a five-word label:
          at 392 "What you call this role" broke to five lines and its sentence
          to seven, against an input with room to spare. The 320 floor already
          stacks every non-switch setting; this one needed it 32px earlier. */}
      <Setting stacked label="What you call this role"
        help="Their own title in your business. Shown to them and in their invite.">
        <input value={label} placeholder="Staff" maxLength={40}
          onChange={(e) => onLabel(e.target.value)} />
      </Setting>
      {PERMISSIONS.map((p) => (
        <Switch key={p.key} label={p.name} help={p.help}
          checked={permissions.includes(p.key)}
          onChange={(on) => onToggle(p.key, on)} />
      ))}
    </>
  );
}

export default function Team() {
  const { business, session } = useBusiness();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  // WHICH MEMBER IS OPEN — one at a time. Four switches and a name field per
  // person is the whole card's height again, and a team of four would be a
  // page nobody can see the end of.
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ email: "", role: "staff", label: "", permissions: ["requests"] });
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
      const r = await api.inviteUser(business.id, form.email.trim(), form.role, form.label.trim(), form.permissions);
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
    setEditing(null);
    load();
  };

  // One write for every field on a membership. The role change kept its own
  // message because the database refuses it for a reason a person needs told.
  const patch = async (m, fields) => {
    setMsg(null);
    // Optimistic: a switch that waits for a round trip before moving reads as
    // a switch that did not work.
    setMembers((list) => list.map((x) => (x.user_id === m.user_id ? { ...x, ...fields } : x)));
    const { error } = await supabase
      .from("business_users")
      .update(fields)
      .eq("business_id", business.id)
      .eq("user_id", m.user_id);
    if (error) {
      setMsg({ ok: false, text: error.message.includes("last owner") ? "You can't demote the last owner." : error.message });
      load();
    }
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

  const toggleForm = (key, on) => setForm((f) => ({
    ...f,
    permissions: on ? [...f.permissions, key] : f.permissions.filter((k) => k !== key),
  }));

  return (
    // A container, not a card — the member rows inside are the objects.
    <div>
      <div className="section-title" style={{ marginTop: 0 }}>Your name</div>
      <p className="muted" style={{ marginBottom: 8 }}>Used to greet you on the Today screen.</p>
      <div className="row" style={{ gap: 8 }}>
        <input placeholder={me?.first_name || "First name"} value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)} />
        <button className="btn inline" onClick={saveMyName}>Save</button>
      </div>

      <div className="section-title">Team</div>
      <div className="tight">
      {members.map((m) => {
        const open = editing === m.user_id;
        const lastOwner = m.role === "owner" && ownerCount === 1;
        const perms = m.permissions ?? [];
        return (
          // A SWAP, NOT A THING THAT OPENS — the card stays exactly where it
          // is and its contents are replaced, which is the owner's own third
          // kind of motion ("the GUI kind of doesn't really change, but the
          // actual text inside of it changes"). It costs no new keyframe, no
          // exit hook and no delayed unmount: `.swap` is a marker plus a React
          // key, and the parts arrive on their own 20ms beats. The card is the
          // wrapper that keeps it off `.col-1`, where a keyed block re-runs the
          // screen's own 420ms arrival instead (composition 8e-iii/iv).
          <div className="card" key={m.user_id}>
            <div className="swap" key={open ? "edit" : "view"}>
              <div className="row between">
                <div style={{ minWidth: 0 }}>
                  <strong className="member-id">{m.email || (m.user_id === session?.user?.id ? session.user.email : "Team member")}</strong>
                  <div className="muted">
                    {/* THEIR BUSINESS'S OWN WORD FOR THE ROLE, then what it
                        actually opens. "Staff. Bookings and calendar only."
                        stopped being true the moment the list became the
                        detailer's to set. */}
                    {roleName(m.role, m.label)}. {permissionSummary(m.role, perms)}
                    {m.user_id === session?.user?.id ? " This is you." : ""}
                  </div>
                </div>
                {/* NO DOOR WHEN THE ROOM IS EMPTY. The last owner has nothing
                    changeable — the database refuses to demote or remove them
                    (`protect_last_owner()`), and an owner has no ticks by
                    definition — so a Change button on them opens a card of
                    two disabled controls. That is the "a row that opens
                    nothing" defect stage 6 spent a pass removing, and on
                    every business in the product today it is the FIRST card
                    on this screen. The sentence beside it already says
                    everything there is to say. */}
                {!lastOwner && (
                  <button className="btn sm inline ghost" onClick={() => setEditing(open ? null : m.user_id)}>
                    {open ? "Done" : "Change"}
                  </button>
                )}
              </div>

              {open && m.role !== "owner" && (
                <RoleFields
                  label={m.label ?? ""}
                  permissions={perms}
                  onLabel={(v) => patch(m, { label: v.trim() || null })}
                  onToggle={(key, on) => patch(m, {
                    permissions: on ? [...perms, key] : perms.filter((k) => k !== key),
                  })}
                />
              )}

              {open && (
                <Setting label={m.role === "owner" ? "Owner" : "Make them an owner"}
                  help={m.role === "owner"
                    ? "Owners can do everything, including invite people and set what everyone else can do."
                    : "Gives them everything, permanently, including this screen."}>
                  <Switch bare label="Owner" checked={m.role === "owner"} disabled={lastOwner}
                    onChange={(on) => patch(m, on
                      ? { role: "owner", label: null, permissions: [] }
                      : { role: "staff" })} />
                </Setting>
              )}

              {open && (
                <button className="btn ghost" disabled={lastOwner} onClick={() => removeMember(m)}>
                  <X size={18} strokeWidth={2} /> Remove from the team
                </button>
              )}
            </div>
          </div>
        );
      })}
      </div>

      <div className="section-title">Invite someone</div>
      <div className="grid2">
        <label className="field"><span>Email</span>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="field"><span>Access</span>
          <Segmented value={form.role} label="Access"
            onChange={(v) => setForm({ ...form, role: v })}
            options={[["staff", "Custom role"], ["owner", "Owner"]]} /></label>
      </div>
      {form.role !== "owner" && (
        <div className="card">
          <RoleFields label={form.label} permissions={form.permissions}
            onLabel={(v) => setForm((f) => ({ ...f, label: v }))}
            onToggle={toggleForm} />
        </div>
      )}
      <button className="btn primary" style={{ marginTop: 10 }}
        disabled={busy || !form.email.trim()} onClick={invite}>
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
          <div style={{ minWidth: 0 }}>
            <strong className="member-id">{inv.email}</strong>
            <div className="muted">
              {roleName(inv.role, inv.label)} · expires {String(inv.expires_at).slice(0, 10)}
            </div>
          </div>
          <button className="btn ghost inline" onClick={() => revoke(inv)}>Revoke</button>
        </div>
      ))}

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
    </div>
  );
}
