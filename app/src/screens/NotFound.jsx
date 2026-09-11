// THE PAGE THAT SAYS A PAGE IS NOT THERE — roadmap item P, built 2026-09-10.
//
// **UNTIL TODAY AN UNKNOWN ADDRESS SHOWED A SIGN-IN FORM**, because the
// router's last rule sent everything it did not recognise to the dashboard,
// and the dashboard's first question is who you are. Not an error, not an
// explanation: a login box.
//
// **THAT IS WORSE THAN A PLAIN ERROR, AND FOR TWO DIFFERENT PEOPLE:**
//
//   · **A customer** who mistypes a booking link, or follows one that was
//     shortened badly in a text message, is asked to sign in to see their own
//     appointment. They conclude the business wants an account from them and
//     they leave. That is a lost booking and the detailer never hears why.
//   · **A detailer** who follows a stale link concludes they have been signed
//     out at random, and tries their password against a form that was never
//     asking for it. That is the shape of every "it keeps logging me out"
//     support call nobody can reproduce.
//
// **SO IT ANSWERS BOTH WITHOUT KNOWING WHICH IT IS TALKING TO.** Home is
// offered always; the dashboard is offered only if there is a session, which
// is also the honest signal — if the dashboard link is there, you are still
// signed in, and the thing you were worried about is not what happened.
//
// **`/` IS THE RIGHT "HOME" ON EITHER HOST.** On our own domain it is the
// marketing page; on a detailer's own address it is their booking page
// (roadmap 3.3, and `lib/host.js` is the allowlist that decides). A hard-coded
// link to the marketing site would send a lost customer to a SaaS pitch.
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

export default function NotFound() {
  useAppLocale();
  // `null` until we know. The dashboard link is not drawn while the answer is
  // unknown, because offering it and taking it away is worse than a beat of
  // patience — and a signed-out person must never see it flash.
  const [signedIn, setSignedIn] = useState(null);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (live) setSignedIn(!!data?.session);
    }).catch(() => { if (live) setSignedIn(false); });
    return () => { live = false; };
  }, []);

  return (
    <main className="nf">
      <div className="nf-in">
        <p className="nf-code" aria-hidden="true">404</p>
        <h1>{t("That page does not exist.")}</h1>
        {/* WHAT TO CHECK, not an apology. The two real causes are a typo and
            an old link, and naming them is what lets somebody fix it
            themselves rather than give up. */}
        <p className="quiet">
          {t("The address may have a typo in it, or the link you followed is out of date.")}
        </p>
        <div className="nf-go">
          <a className="btn primary" href="/">{t("Go to the home page")}</a>
          {signedIn && <a className="btn" href="/app">{t("Your dashboard")}</a>}
        </div>
      </div>
    </main>
  );
}
