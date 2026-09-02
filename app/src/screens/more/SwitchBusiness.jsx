// Switch business — the fourteenth destination behind the gear, and NOT one
// of the twelve settings screens: it is a picker, not a form, and it does not
// share the settings skeleton (component inventory §3f).
//
// The database has let one account belong to two businesses since the
// staff-roles migration. The front end could not: `BusinessContext` took
// `memberships?.[0]` with a comment saying switching came later. So this is a
// new door onto something that already worked underneath, which is the same
// sentence as Reviews one screen over.
//
// IT IS ONLY EVER RENDERED WHEN THERE IS SOMETHING TO SWITCH TO. `GearMenu`
// drops the row entirely at one membership — a picker with one choice on it
// is a control that cannot change anything, which §8's own sort rule already
// calls noise.

import { useState } from "react";
import { Check } from "lucide-react";
import { useBusiness } from "../../context/BusinessContext.jsx";

export default function SwitchBusiness() {
  const { business, memberships, switchBusiness } = useBusiness();
  const [busy, setBusy] = useState(null);

  const go = async (id) => {
    if (id === business.id) return;
    setBusy(id);
    await switchBusiness(id);
    // No setBusy(null): switching remounts the whole dashboard through the
    // provider's spinner, so this component is gone before it would run.
  };

  return (
    <div className="card setting-card">
      {memberships.map((m) => {
        const here = m.business_id === business.id;
        return (
          <button className="nav-row" key={m.business_id}
            onClick={() => go(m.business_id)} disabled={!!busy}>
            <span className="ico">{here && <Check size={19} strokeWidth={2} />}</span>
            <span className="txt">
              <span className="name">{m.businesses?.name ?? "This business"}</span>
              {/* The row answers itself, like every row on Business does: which
                  one you are in, and what you are in it AS. Owner and staff see
                  different screens, so which hat you wear here is the fact that
                  changes what happens next. */}
              <span className="now">
                {here ? "You are here" : busy === m.business_id ? "Switching…" : `Sign in as ${m.role === "owner" ? "the owner" : "staff"}`}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
