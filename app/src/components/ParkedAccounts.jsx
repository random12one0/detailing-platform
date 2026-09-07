// ROADMAP 8.18 — WHO ELSE IS SIGNED IN ON THIS BROWSER.
//
// One component, TWO screens, because there are exactly two places in this
// product where a person can be stuck with no gear to reach:
//
//   · the SIGN-IN screen, which is where *Add another account* lands you.
//     Without this block that press is a trap — the other session is parked,
//     the page says "Welcome back", and the only way back to the account you
//     were just using is to remember its password.
//   · the CREATE-A-BUSINESS screen, and **that one was found by driving the
//     feature rather than by designing it.** An account with no membership
//     lands there, it has no header and therefore no gear, and its only exit
//     is *Sign out* — which empties the park by design. So adding a second
//     account that turned out to have no business left you with no way back
//     to the first except its password. A dead end nothing would have
//     reported, because every check passed and the screen looked right.
//
// **IT SWITCHES THROUGH `useAccount` RATHER THAN DOING IT ITSELF.** The park,
// the outgoing session and this device's chosen business all have to move
// together, and a second copy of that is where the two start to differ — the
// first draft of this file had one, and it silently did not park the session
// it was leaving, so switching away from the create-a-business screen threw
// that account away. The gear's rows and these rows now run the same code.
//
// **AND IT IS NEVER DRAWN INSIDE A `<form>`.** Five browser scripts in this
// repo sign in through `form button.btn.primary`, a DESCENDANT selector, so a
// second primary button under a form does not fail a test with a useful
// message — it times out every browser run there is. Its own buttons are
// `type="button"` for the same family of reason: a bare `<button>` inside a
// form submits it. `tests/two-logins.test.mjs` § 4 pins all of it.

import { useState } from "react";
import { useBusiness } from "../context/BusinessContext.jsx";
import { listAccounts } from "../lib/accounts.js";

export default function ParkedAccounts({ label = "Already signed in here" }) {
  const { useAccount } = useBusiness();
  // Its own copy of the list, because a switch that FAILS drops that account
  // and has to redraw — and the provider does not re-render for a state
  // change inside this component.
  const [parked, setParked] = useState(() => listAccounts());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (parked.length === 0) return null;

  return (
    // THE GAP IS NOT DECORATION. This card stacks directly on the sign-in
    // card, and "two boxes stacked with no gap" is one of the four things
    // `sweep-widths.mjs` fails a run for — seen in the first screenshot of
    // this screen, where the two edges met.
    <div className="card tight" data-parked-accounts=""
      style={{ marginBottom: "var(--sp-2)" }}>
      <span className="label">{label}</span>
      {error && <div className="error-box" role="alert">{error}</div>}
      {parked.map((a) => (
        <button
          key={a.userId}
          type="button"
          className="btn"
          disabled={busy}
          style={{ width: "100%", marginTop: "var(--sp-1)" }}
          onClick={async () => {
            setBusy(true); setError("");
            const problem = await useAccount(a.userId);
            if (problem) {
              // A parked session can be dead for reasons nothing here can
              // see — the password was changed, or it was revoked from
              // another device. `useAccount` has already dropped it; redraw
              // without it, because a name that cannot be pressed reads as
              // the feature being broken.
              setParked(listAccounts());
              setError(problem);
              setBusy(false);
            }
            // On success the auth listener swaps the whole screen out, so
            // there is deliberately nothing to do here.
          }}
        >
          {a.email || "Another account"}
        </button>
      ))}
    </div>
  );
}
