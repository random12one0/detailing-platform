import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { t } from "../lib/appI18n.js";
import { draftCopies, savedAnswers, saveAnswers } from "./storage.js";
import Form from "./Form.jsx";
import { ALL, EITHER, STEPS } from "../lib/siteIntake.js";
import SiteIntake from "../screens/SiteIntake.jsx";
import { websiteAnswers, websiteEdits } from "./website.js";
import "./strings.js";
import "./draft.css";
function websiteLabel(id) {
  const field = id.split("::")[0];
  if (field === "oldsite") return t("Your current website");
  return t(ALL.find(q => q.id === field)?.question || EITHER.find(([key]) => key === field)?.[1] ||
    STEPS.find(step => step.key === field)?.name || "Your answer");
}
function websiteValue(value) {
  if (value === true) return t("Yes");
  if (value === false) return t("No");
  if (!value && value !== 0) return t("Left blank");
  if (typeof value === "object") return Object.values(value).map(websiteValue).join(", ");
  return String(value);
}
export default function OwnerDraft({ owner, business, signOut }) {
  const [access, setAccess] = useState(null),
    [page, setPage] = useState("shop"),
    [website, setWebsite] = useState(null),
    [websiteError, setWebsiteError] = useState(false);
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
    } catch {
      setAccess(false);
      return;
    }
    setWebsiteError(false);
    if (p === "website") {
      try {
        const websiteKey = key + ".website";
        let snapshot = await draftCopies(websiteKey);
        const shop = await savedAnswers(key);
        function show(raw) {
          const edited = JSON.parse(raw ?? "{}");
          setWebsite({
            answers: websiteAnswers(shop, edited.edited),
            step: edited.step ?? 0,
            async save(next, step) {
              await authorize();
              const value = JSON.stringify({ edited: websiteEdits(next), step });
              snapshot = await saveAnswers(websiteKey, snapshot, value);
            },
          });
        }
        if (snapshot.current != null && snapshot.legacy != null && snapshot.current !== snapshot.legacy) {
          const versions = {};
          for (const source of ["current", "legacy"]) {
            const draft = JSON.parse(snapshot[source]);
            versions[source] = { edited: draft.edited ?? {}, open: () => show(snapshot[source]) };
          }
          setWebsite({ versions });
        } else show(snapshot.current ?? snapshot.legacy);
      } catch {
        setWebsiteError(true);
        return;
      }
    }
    setPage(p);
  }
  if (!access || access.owner !== owner || access.business !== business.id)
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
        <a className="btn inline ghost" href="/app?onboarding=dashboard">
          {t("Back to dashboard")}
        </a>
        <button className="btn inline ghost" onClick={signOut}>
          {t("Sign out")}
        </button>
      </header>
      <nav className="draft-tabs" aria-label={t("Setup sections")}>
        {[
          ["shop", "Shop setup"],
          ["website", "Website draft"],
        ].map(([k, label]) => (
          <button
            key={k}
            className="btn"
            aria-pressed={page === k}
            onClick={() => { if (page !== k) open(k); }}
          >
            {t(label)}
          </button>
        ))}
      </nav>
      {websiteError && <p role="alert">{t("Could not open the website draft on this device. Your shop answers are still here.")}</p>}
      <div hidden={page !== "shop"}>
        <Form
          key={key}
          owner={owner}
          business={business}
          call={call}
        />
      </div>
      {page === "website" && website?.versions && (
        <section className="sq-summary">
          <h2>{t("Choose a draft to continue")}</h2>
          <p>{t("Both versions stay saved until you save or continue in the website form.")}</p>
          {[["current", "This app's answers", "Use this app's answers"], ["legacy", "Previous app's answers", "Use previous app's answers"]].map(([source, title, action]) => (
            <div key={source}><details className="sq-manual"><summary>{t(title)}</summary>
              <dl>{Object.entries(website.versions[source].edited).map(([field, value]) => (
                <div key={field}><dt>{websiteLabel(field)}</dt><dd>{websiteValue(value)}</dd></div>
              ))}</dl>
            </details><button className="btn" onClick={website.versions[source].open}>{t(action)}</button></div>
          ))}
        </section>
      )}
      {page === "website" && website?.answers && (
        <SiteIntake
          preview
          draft={website}
          saveDraft={website.save}
          onClose={() => open("shop")}
        />
      )}
    </section>
  );
}
