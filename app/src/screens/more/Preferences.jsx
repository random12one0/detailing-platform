// Which apps this device opens.
//
// Everything here is a choice about THIS phone, not about the business, so
// nothing is written to the database: a staff member's preference is their
// own, and the same owner can want Waze on the van's phone and Google Maps
// on a laptop. Defaults come from the device and can always be overridden.

import { useEffect, useState } from "react";
import { Group, Setting } from "../../components/controls.jsx";
import { Segmented } from "../../components/controls.jsx";
import {
  PLATFORMS, calendarUrlFor, defaultPrefs, detectPlatform, loadPrefs,
  savePrefs, saveContact,
} from "../../lib/platform.js";

const PLATFORM_NAME = {
  [PLATFORMS.IOS]: "iPhone or iPad",
  [PLATFORMS.ANDROID]: "Android",
  [PLATFORMS.OTHER]: "this computer",
};

export default function Preferences() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const platform = detectPlatform();

  useEffect(() => { savePrefs(prefs); }, [prefs]);
  const set = (k) => (v) => setPrefs((p) => ({ ...p, [k]: v }));

  return (
    <>
      <p className="quiet" style={{ marginBottom: "var(--sp-4)" }}>
        These apply to {PLATFORM_NAME[platform]} only. Sign in somewhere else
        and you can pick differently there.
      </p>

      <Group title="Getting there" blurb="Used by every Navigate button.">
        <Setting label="Maps" stacked>
          <Segmented
            value={prefs.maps}
            onChange={set("maps")}
            options={[["apple", "Apple"], ["google", "Google"], ["waze", "Waze"]]}
          />
        </Setting>
      </Group>

      <Group
        title="Adding a job to your calendar"
        blurb="Used by “Add to calendar” on a booking."
      >
        <Setting label="Calendar" stacked>
          <Segmented
            value={prefs.calendar}
            onChange={set("calendar")}
            options={[["ics", "Apple / file"], ["google", "Google"]]}
          />
        </Setting>
        <Setting
          label="Try it"
          help="Opens a sample so you can check it lands where you expect."
        >
          <button
            type="button"
            className="btn inline"
            onClick={() => {
              const now = new Date();
              const end = new Date(now.getTime() + 3600_000);
              const sample = {
                customer_name: "Sample job", service_name: "Full Detail",
                start_at: now.toISOString(), end_at: end.toISOString(),
                customer_address: "", customer_phone: "",
              };
              // The same builder the booking screens use.
              const href = calendarUrlFor(sample, "", prefs.calendar);
              if (href) window.open(href, "_blank", "noopener");
            }}
          >
            Test
          </button>
        </Setting>
      </Group>

      <Group
        title="Saving a customer to your phone"
        blurb="Used by “Add to contacts” on a job."
      >
        <Setting
          label="Contacts"
          help="A contact card file is the only way a website can reach your address book. iPhone opens it straight in Contacts; Android saves the file and Contacts imports it."
          stacked
        >
          <Segmented
            value={prefs.contacts}
            onChange={set("contacts")}
            options={[["vcf", "Contact card"], ["off", "Don’t show"]]}
          />
        </Setting>
        <Setting label="Try it" help="Saves a sample card. Delete it after.">
          <button
            type="button"
            className="btn inline"
            onClick={() => saveContact({
              name: "Sample Customer", phone: "555-0100",
              email: "sample@example.com", org: "Saved from your dashboard",
            })}
          >
            Test
          </button>
        </Setting>
      </Group>

      <button
        type="button"
        className="btn ghost"
        onClick={() => setPrefs(defaultPrefs(platform))}
      >
        Reset to what this device suggests
      </button>
    </>
  );
}
