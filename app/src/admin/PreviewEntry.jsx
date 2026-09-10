// THE DOOR INTO A PREVIEW TAB — and the only job it has is to be a separate
// TAB, because that is what stops the back office being signed out.
//
// The back office opens this blank (synchronously, on the click, or the
// browser treats it as a pop-up and blocks it), then hands it the one-time
// token from `platform-admin`'s impersonate action through the URL's hash —
// a hash is never sent to a server and never lands in a log. Reaching this
// path is also what marks the tab as a preview: `lib/preview.js` reads the
// path at module load, before the Supabase client is built, so the session
// this page creates lands in THIS TAB'S drawer and not in the shared one.
//
// The token is exchanged here rather than by following the magic link,
// because the link's own redirect goes to the edge function's PLATFORM_URL —
// the live site — which would send a preview opened on this machine to
// production. Exchanging it in place works on whatever origin we are on.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { setPreviewMode } from "../lib/preview.js";

export default function PreviewEntry() {
  const [error, setError] = useState("");
  const nav = useNavigate();
  // StrictMode mounts twice in development and the token is one-time — the
  // second exchange would fail and paint an error over a working session.
  const used = useRef(false);

  // THE TOKEN ARRIVES AFTER THE PAGE DOES, AND THAT IS NOT A RACE TO LOSE.
  // The back office opens this tab empty on the click (or the browser blocks
  // it as a pop-up), and only fills in the hash once the server has answered.
  // A hash change is not a navigation, so nothing here remounts: the first
  // version read the hash once, found it empty and printed "opened without a
  // token" over a tab that was about to be handed one. So it waits.
  useEffect(() => {
    const go = () => {
      if (used.current) return;
      const q = new URLSearchParams(window.location.hash.slice(1));
      const token = q.get("token");
      if (!token) return;
      used.current = true;
      try { sessionStorage.setItem("dp.preview.who", q.get("who") || ""); } catch { /* private mode */ }
      setPreviewMode("look");   // every preview starts unable to change anything
      supabase.auth.verifyOtp({ token_hash: token, type: "magiclink" }).then(({ error: e }) => {
        if (e) { setError(e.message); return; }
        // replace, not push: the token is spent, so Back must not return here.
        nav("/app", { replace: true });
      });
    };
    go();
    window.addEventListener("hashchange", go);
    const giveUp = setTimeout(() => {
      if (!used.current) setError("Nothing arrived. Open this from the back office rather than by typing the address.");
    }, 25_000);
    return () => { window.removeEventListener("hashchange", go); clearTimeout(giveUp); };
  }, [nav]);

  return (
    <div style={{
      minHeight: "100vh", display: "grid", placeItems: "center", padding: 24,
      background: "var(--ink-0, #0B0D0E)", color: "var(--paper, #F4F5F3)",
      font: "500 15px/1.5 system-ui, sans-serif", textAlign: "center",
    }}>
      <p style={{ maxWidth: 420, margin: 0 }}>
        {error || "Opening their dashboard…"}
      </p>
    </div>
  );
}
