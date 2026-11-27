import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

// Only a plain dashboard arrival participates. Billing, Website Studio, Back Office
// and explicitly requested setup screens keep their own entry points.
export function useOwnerDraftLanding(owner, business, enabled) {
  const [entry] = useState(() => {
    if (!/^\/app\/?$/.test(location.pathname)) return null;
    if (location.search === "?onboarding=dashboard") return "dashboard";
    return location.search === "" ? "default" : null;
  });
  const scope =
    enabled && entry && owner && business ? owner + "." + business : null;
  const [decision, setDecision] = useState(null);
  useEffect(() => {
    if (!scope) {
      setDecision(null);
      return;
    }
    let current = true;
    function settle(screen) {
      if (!current) return;
      current = false;
      clearTimeout(timer);
      setDecision({ scope, screen });
    }
    // An unavailable optional endpoint must not strand merchants at sign-in.
    const timer = setTimeout(() => settle("legacy"), 5000);
    api
      .ownerDraft(business, "access")
      .then((access) => {
        if (!current) return;
        if (access.owner !== owner || access.business !== business)
          return settle("legacy");
        const key = "dp.ownerSetup.v1." + scope + ".dashboard";
        let dashboard = entry === "dashboard";
        try {
          if (dashboard) localStorage.setItem(key, "1");
          else dashboard = localStorage.getItem(key) === "1";
        } catch {
          /* The return URL also works with browser storage unavailable. */
        }
        settle(dashboard ? "dashboard" : "draft");
      })
      .catch(() => settle("legacy"));
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [scope, owner, business, entry]);
  if (!scope) return "legacy";
  return decision?.scope === scope ? decision.screen : "checking";
}
