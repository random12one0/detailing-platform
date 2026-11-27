import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { t } from "../lib/appI18n.js";
import Form from "./Form.jsx";
import AISettings from "./AISettings.jsx";
import SiteIntake from "../screens/SiteIntake.jsx";
import { websiteAnswers } from "./website.js";
import "./strings.js";
import "./draft.css";
function readLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}
export default function OwnerDraft({ owner, business, signOut }) {
  const [access, setAccess] = useState(null),
    [page, setPage] = useState("shop"),
    [answers, setAnswers] = useState(null),
    [website, setWebsite] = useState(null);
  const key = "dp.ownerSetup.v1." + owner + "." + business.id;
  const call = useCallback(
    (action, body = {}) => api.ownerDraft(business.id, action, body),
    [business.id],
  );
  const authorize = useCallback(async () => {
    const a = await call("access");
    if (a.owner !== owner || a.business !== business.id) throw Error();
    return a;
  }, [owner, business.id, call]);
  useEffect(() => {
    let live = true;
    const refresh = async () => {
      try {
        const a = await authorize();
        if (live) setAccess(a);
      } catch {
        if (live) setAccess(false);
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      live = false;
      window.removeEventListener("focus", refresh);
    };
  }, [authorize]);
  async function open(p) {
    try {
      setAccess(await authorize());
      if (p === "website") {
        const edited = readLocal(key + ".website");
        setWebsite({
          answers: websiteAnswers(answers ?? readLocal(key), edited.edited),
          step: edited.step ?? 0,
        });
      }
      setPage(p);
    } catch {
      setAccess(false);
    }
  }
  async function saveWebsite(next, step) {
    await authorize();
    const base = websiteAnswers(answers ?? readLocal(key));
    const edited = Object.fromEntries(
      Object.entries(next).filter(
        ([k, v]) => JSON.stringify(v) !== JSON.stringify(base[k]),
      ),
    );
    localStorage.setItem(key + ".website", JSON.stringify({ edited, step }));
  }
  if (!access)
    return (
      <section className="group">
        <h1>
          {t(
            access === false
              ? "This setup link is unavailable."
              : "Opening shop setup.",
          )}
        </h1>
        <a className="btn" href="/app">
          {t("Back to dashboard")}
        </a>
      </section>
    );
  return (
    <section className="owner-draft">
      <header className="draft-account">
        <a className="btn inline ghost" href="/app">
          {t("Back to dashboard")}
        </a>
        <button className="btn inline ghost" onClick={signOut}>
          {t("Sign out")}
        </button>
      </header>
      <nav className="draft-tabs" aria-label={t("Setup sections")}>
        {[
          ["shop", "Shop setup"],
          ["ai", "AI Settings"],
          ["website", "Website draft"],
        ].map(([k, label]) => (
          <button
            key={k}
            className="btn"
            aria-pressed={page === k}
            onClick={() => open(k)}
          >
            {t(label)}
          </button>
        ))}
      </nav>
      <div hidden={page !== "shop"}>
        <Form
          owner={owner}
          business={business}
          call={call}
          mode={access.mode}
          onSaved={setAnswers}
        />
      </div>
      {page === "ai" && <AISettings call={call} mode={access.mode} />}
      {page === "website" && website && (
        <SiteIntake
          preview
          draft={website}
          saveDraft={saveWebsite}
          onClose={() => open("shop")}
        />
      )}
    </section>
  );
}
