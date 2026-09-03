// The plumbing, behind the gear in the header. Roadmap 2.11 step 6, stage 6.
//
// It is the other half of Business's admission test, and it only exists
// because that test has a second answer:
//
//   > A row belongs on Business only if it changes what a CUSTOMER meets.
//   > IF IT CHANGES HOW THE APP BEHAVES FOR THE DETAILER, IT GOES HERE.
//
// Four settings screens fit that: Notifications (who gets emailed), Message
// templates (what you send from a job), Team (who else can get in), This
// device (which maps app opens). Plus one destination that is not a settings
// screen at all — Switch business — and the account block.
//
// IT IS A DESTINATION, NOT AN OVERLAY, and that was the smaller of the two
// designs rather than the fancier one. The alternative was a sheet from the
// header holding a menu, with its screens opening inside it: that is a second
// container mechanism for the same twelve screens, and the screens would then
// be sheets at a desk — the exact thing this stage exists to end. Rendering
// the gear where a tab renders means `SettingsHost` decides page-or-column
// once, for both doors, and pressing the gear again puts you back on the tab
// you left.
//
// STAFF REACH THIS AND NOT BUSINESS. Their whole Business screen would have
// been two rows, one of which the database refuses to let them save
// (architecture audit §2c items 2 and 3), so the tab is gone for them and
// what a staff session can actually use is here: Message templates, This
// device, and the account block. The list below is filtered, not duplicated —
// one array, one owner check.

import { useCallback, useEffect, useState } from "react";
import {
  Bell, Building2, ChevronRight, Compass, LogOut, MessageSquare, Smartphone, Users, X,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useBusiness } from "../context/BusinessContext.jsx";
import SettingsHost from "./SettingsHost.jsx";
import { detectPlatform, loadPrefs, PLATFORMS } from "../lib/platform.js";

// The device row answers itself like every other row: what it will open.
const MAPS_NAME = { apple: "Apple Maps", google: "Google Maps", waze: "Waze" };
const CAL_NAME = { ics: "calendar file", google: "Google Calendar" };
function describeDevice() {
  const p = loadPrefs();
  const where = detectPlatform() === PLATFORMS.IOS ? "iPhone"
    : detectPlatform() === PLATFORMS.ANDROID ? "Android" : "this computer";
  return `${where} · ${MAPS_NAME[p.maps] ?? "Maps"} · ${CAL_NAME[p.calendar] ?? "Calendar"}`;
}

export default function GearMenu({ onClose, onTour }) {
  const { business, settings, role, memberships, signOut } = useBusiness();
  const owner = role === "owner";
  const [open, setOpen] = useState(null);
  const [team, setTeam] = useState(null);

  const load = useCallback(async () => {
    // business_users is keyed (business_id, user_id) and has NO id column, so
    // select("id") 400s — and a failed count renders as a confident "0
    // people", which is worse than showing nothing. Null keeps the dash.
    const { count } = await supabase.from("business_users")
      .select("user_id", { count: "exact", head: true }).eq("business_id", business.id);
    setTeam(count ?? null);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const emailsOn = settings
    ? ["email_customer_confirmation", "email_customer_reminder", "email_customer_followup",
       "email_owner_new_booking", "email_owner_reminder"].filter((k) => settings[k] !== false).length
    : null;

  const ROWS = [
    ["notifications", "Notifications", Bell,
      emailsOn === null ? "…" : `${emailsOn} of 5 emails on`, true],
    ["templates", "Message templates", MessageSquare, "Texts you send from a job", false],
    ["team", "Team", Users, team === null ? "—" : `${team} ${team === 1 ? "person" : "people"}`, true],
    ["preferences", "This device", Smartphone, describeDevice(), false],
    // A PICKER WITH ONE CHOICE ON IT IS A CONTROL THAT CANNOT CHANGE
    // ANYTHING. It is absent at one membership, which is every account in the
    // product today — the row appears the day somebody runs two businesses.
    // THE TOUR'S SECOND DOOR, and its only one after the first morning — the
    // walkthrough leaves whenever you want and never comes back on its own
    // (screen designs §13b), so something has to be able to ask for it. It
    // belongs behind the gear by this screen's own admission test: it changes
    // how the app behaves for the DETAILER and nothing a customer meets.
    // Staff keep it; they are the ones most likely to be new.
    ["tour", "Show me around", Compass, "The guided tour of this dashboard", false],
    ...(memberships.length > 1
      ? [["switch", "Switch business", Building2, `${memberships.length} businesses`, false]]
      : []),
  ].filter(([, , , , ownerOnly]) => owner || !ownerOnly);

  const account = (
    <div className="tight">
      <span className="label">Account</span>
      <div className="card">
        <div className="thoughts">
          <div className="body">Signed in as {owner ? "an owner" : "staff"}.</div>
          <button className="btn" onClick={signOut}>
            <LogOut strokeWidth={2} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );

  const index = (
    <>
      <div className="row between" style={{ alignItems: "flex-start", gap: "var(--sp-3)" }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="display">Settings</h1>
          {/* The tab bar cannot say where you are — this is not a tab — so
              the way back is a control rather than a lit button. */}
          <p className="quiet" style={{ marginTop: 2 }}>{business.name}</p>
        </div>
        <button className="x" aria-label="Close settings" onClick={onClose}>
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="card setting-card">
        {ROWS.map(([key, name, Icon, now]) => (
          <button className="nav-row" key={key} data-settings-key={key}
            aria-current={open === key ? "true" : undefined}
            onClick={() => (key === "tour" ? onTour?.() : setOpen(key))}>
            <span className="ico"><Icon size={19} strokeWidth={2} /></span>
            <span className="txt">
              <span className="name">{name}</span>
              <span className="now">{now}</span>
            </span>
            <span className="chev"><ChevronRight size={18} strokeWidth={2} /></span>
          </button>
        ))}
      </div>

      {/* On a phone the account block is the end of this page. At a desk it is
          the second column's resting content, so it is not drawn twice. */}
      <div className="gear-account">{account}</div>
    </>
  );

  return (
    <SettingsHost splitClass="gear" open={open}
      onClose={() => { setOpen(null); load(); }}
      empty={account}>
      {index}
    </SettingsHost>
  );
}
