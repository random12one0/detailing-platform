// ===========================================================================
// STUDIO — the Control Room's Studio place: server side (STUDIO-SPEC.md §3, §7 row S3).
// ===========================================================================
//
// Andrew, 2026-11-04: the Website Studio is a separate product with its own tab, GUI and settings. Like Audit,
// dashboard.mjs hands every /api/studio/* and /studio/* request here (one line in its router, behind its lock and
// page key), so this file owns the place end to end.
//
// S3 IS READ-ONLY AND LOCAL. No database: sites, revisions and checks are JSON files under data/studio/
// (BELT_STUDIO_DATA overrides; gitignored). The planned tables are docs/improve/studio/S3-planned-migration.sql,
// not applied. A REVISION IS NEVER CHANGED: it is written once with the "wx" flag, so a second write to the same
// number is refused by the file system itself (studio.test.mjs). Every Studio write lands in that folder and
// nowhere else; it never acts on the belt, jobs or the real database.
//
// It drives a platform copy (Studio settings → "Platform copy"): the renderer's spec validator, the offline example
// engine + Vite dev server for the phone preview, and scripts/studio/studio-check.mjs, the connection check.
// THE PLATFORM COPY NEVER RUNS INSIDE THIS SERVER (review S3-1): only a folder on the Studio's own allow-list, compared
// by real path, and never the real repo; its code runs only in child processes, every one hidden and stopped by its
// process tree.

import { REPO_ROOT } from "./paths.mjs";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, renameSync, realpathSync } from "node:fs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { factRoute, loadPack, buildPrompt, readReply, runAI } from "./studio-ai.mjs";
import { LETTERS, TRIOS, lookSchema, buildLookPrompt, readLook, assembleLook, bindingSet, distinctness, gateRows, gatesPass, gateFixes, criticSummary, CRITIC_NOTE, runCodex, codexJs, heroOf, pairingOf } from "./studio-looks.mjs";
import { runCritics } from "./site-critic.mjs";
import { cloudConfig, rest, wanted, readSite, AUTOFILL_SCHEMA, AUTOFILL_SYSTEM, autofillPrompt, checkAutofill } from "./studio-cloud.mjs";
import { clearExpiredSwaps, looksExhausted, usageWords, resetFromText } from "./lib.mjs";
import path from "node:path";
import net from "node:net";
import http from "node:http";

// The real product repo. The Studio refuses it by real path, however it is spelled.
export const REAL_REPO = process.env.STUDIO_REAL_REPO || REPO_ROOT;

// Every tunable lives here and on the Studio's own Settings screen, never in code (NIGHT-RULES).
export const STUDIO_SETTINGS = [
  { key: "allowed", kind: "folders", default: "C:/studio-work/s1", label: "Platform copies the Studio may use",
    why: "One folder per line. Only these copies of the detailing-platform repo can be picked below. The real repo is never allowed." },
  { key: "platform", kind: "folder", default: "C:/studio-work/s1", label: "Platform copy",
    why: "The copy with the site renderer and the connection check. It must be on the list above." },
  { key: "previewPort", kind: "port", default: 54396, label: "Phone preview port", why: "Where the phone preview's web server would like to listen on this laptop (127.0.0.1). If another program is using it, the preview takes a free port instead." },
  { key: "enginePort", kind: "port", default: 54395, label: "Test data port", why: "Where the preview's offline copy of the example dashboard would like to listen. If another program is using it, a free port is used instead. It never talks to the real database." },
  { key: "checkMinutes", kind: "int", min: 1, max: 15, default: 4, label: "Connection check time limit (minutes)", why: "A check still running after this is stopped and shown as failed." },
  { key: "startWaitSec", kind: "int", min: 5, max: 120, default: 40, label: "Phone preview start and stop wait (seconds)", why: "How long turning the phone preview on or off waits for both servers before it says they did not answer." },
  { key: "quickWidth", kind: "int", min: 320, max: 1440, default: 390, label: "Quick check screen width (pixels)", why: "Every change you apply is drawn at this width first and checked: it fits the dashboard, nothing spills sideways, no errors. Phones are about 390." },
  { key: "quickSeconds", kind: "int", min: 10, max: 300, default: 60, label: "Quick check time limit (seconds)", why: "A quick check still running after this is stopped, and the change is not applied." },
  { key: "aiEngine", kind: "choice", default: "auto", label: "Which AI app runs the Studio's AI", choices: [["auto", "Automatic: Claude, or ChatGPT (Codex) when Claude is not available"], ["claude", "Claude Code only"], ["codex", "ChatGPT (Codex) only"]],
    why: "Chat, “change this”, the looks and website reading all use this. ChatGPT (Codex) uses the ChatGPT model chosen below and your ChatGPT plan; the Claude model choices are then ignored." },
  // S5: the AI that turns what you say into change cards. Your own Claude plan, through the Claude Code CLI.
  { key: "aiModel", kind: "choice", default: "sonnet", label: "AI for chat and “change this”", choices: [["sonnet", "Claude Sonnet: quick to answer"], ["opus", "Claude Opus: the strongest, slower"], ["haiku", "Claude Haiku: the quickest, for simple changes"]],
    why: "Turns what you type or say into change cards. It only proposes cards; nothing on the site changes until you apply one. It uses your own Claude plan." },
  { key: "aiEffort", kind: "choice", default: "medium", label: "How hard the AI thinks", choices: [["low", "Low: quickest, but it misses more often"], ["medium", "Medium: about ten seconds an answer"], ["high", "High: slowest"]],
    why: "More thinking can give better wording but takes longer and uses more of your plan." },
  { key: "aiSeconds", kind: "int", min: 20, max: 600, default: 120, label: "AI answer time limit (seconds)", why: "An answer still not back after this is stopped, and the chat says so. Nothing is made from it." },
  { key: "aiRestartTries", kind: "int", min: 1, max: 10, default: 3, label: "Ask again after a restart, at most (times)", why: "If the Control Room keeps restarting while the AI answers one request, that request is stopped after this many tries, so it can never cause a loop. You can ask again." },
  { key: "aiKeepDays", kind: "int", min: 7, max: 3650, default: 90, label: "Keep the chat for (days)", why: "Finished requests older than this are cleared from the chat. Cards and revisions are never cleared." },
  { key: "aiWaitMinutes", kind: "int", min: 5, max: 300, default: 30, label: "When Claude is out of usage, ask again after (minutes)", why: "Used when Claude does not say when its usage comes back. The request waits and is asked again by itself; it is never dropped." },
  // S6: three looks and the critic. Claude builds, ChatGPT judges (the spec's "two-model craft").
  { key: "lookFamilies", kind: "choice", default: TRIOS[0][0], label: "Three looks from", choices: TRIOS,
    why: "The three style families a new set of looks is made from. Each look can still be swapped to the fourth family on its own." },
  { key: "lookMaker", kind: "choice", default: "claude", label: "Who makes the looks", choices: [["claude", "Claude makes all three"], ["mixed", "Claude makes look A, ChatGPT makes B and C"], ["chatgpt", "ChatGPT makes all three (when Claude is not available)"]],
    why: "The AI that writes each look's words and section order. Both use your own plans (Claude Code and ChatGPT's codex), no API key." },
  { key: "lookModel", kind: "choice", default: "opus", label: "Claude model for the looks", choices: [["opus", "Claude Opus: the strongest, slower"], ["sonnet", "Claude Sonnet: quicker"]],
    why: "Used when Claude makes a look. Opus writes better words; Sonnet answers sooner." },
  { key: "chatgptModel", kind: "choice", default: "gpt-6.1-sol", label: "ChatGPT model", choices: [["gpt-6.1-sol", "ChatGPT Sol: the strongest"], ["gpt-5.6-terra", "ChatGPT Terra: quicker"]],
    why: "Used for the critic, and for looks B and C when ChatGPT makes them." },
  { key: "critic", kind: "choice", default: "chatgpt", label: "Who critiques the looks", choices: [["chatgpt", "ChatGPT: a second model, not the one that made them"], ["claude", "Claude"]],
    why: "The critic sees only the screenshots and answers the rubric's questions. A different model from the maker catches more." },
  { key: "lookRounds", kind: "int", min: 1, max: 3, default: 2, label: "Rounds per look, at most", why: "A look that fails a gate or scores under the critic's pass mark is remade by itself with the problems listed, up to this many versions. The best version is the one shown." },
  { key: "lookSeconds", kind: "int", min: 60, max: 900, default: 300, label: "Look maker time limit (seconds)", why: "A maker still not back after this is stopped, and the look says so." },
  { key: "gradeSeconds", kind: "int", min: 60, max: 600, default: 240, label: "Gate check time limit (seconds)", why: "How long drawing a look at three widths and running the gates may take before it is stopped." },
  { key: "criticSeconds", kind: "int", min: 60, max: 900, default: 300, label: "Critic time limit (seconds)", why: "A critic still not back after this is stopped. It is asked once more, then the look is shown without a critique." },
  // S7: the detailer in the loop. Links the detailer opens on their phone; emails drafted for your yes.
  { key: "askBeforeEmail", kind: "choice", default: "yes", label: "Ask me before every email", choices: [["yes", "Yes: every email waits for your Send"], ["no", "No: emails are approved as they are drafted"]],
    why: "Every email to a detailer is drafted first and shown under Detailer. In this version nothing is really sent: Send only marks the draft as approved. Once sending is built, No means emails go out the moment they are drafted, with no look from you." },
  { key: "emailSignOff", kind: "text", max: 120, default: "Andrew\nDetailing Platform", label: "How emails to detailers are signed", why: "The last lines of every email to a detailer. One or two lines." },
  { key: "linkDays", kind: "int", min: 1, max: 60, default: 14, label: "Detailer links last (days)", why: "A link to look at a site, or to pick one of three looks, stops working after this. You can also cancel one at any time." },
  // S8: publish and the nightly check of live sites
  { key: "parityHour", kind: "int", min: 0, max: 23, default: 3, label: "Nightly check of live sites, at (hour, 0 to 23)", why: "Once a night at this hour, every live site is opened on its own address and every price, hour, photo and review on it is compared with the detailer's dashboard. A difference is an alarm here and for the watcher." },
  { key: "paritySeconds", kind: "int", min: 60, max: 900, default: 240, label: "Live-site check time limit (seconds)", why: "A nightly check still running after this is stopped and counts as an alarm." },
  { key: "linkPort", kind: "port", default: 54397, label: "Detailer link port", why: "Where the Studio answers the detailer's preview page on this laptop (127.0.0.1). If another program is using it, a free port is used instead." },
  // 2026-11-13: links that open on any phone, and the website forms detailers send in (studio-cloud.mjs)
  { key: "cloud", kind: "choice", default: "off", label: "Detailer links and website forms", choices: [["off", "Off: links open on this laptop only, and no forms are read"], ["live", "detailingplatform.com: links open on any phone, and sent forms are read"], ["staging", "The staging copy of the platform (for testing)"]],
    why: "With detailingplatform.com, each link's page is copied to the platform when its email is approved, so the detailer can open it anywhere, and their comments and picks come back here. Sent website forms are read (never changed) so the Studio can read the detailer's current website for them." },
  { key: "previewSite", kind: "text", max: 120, default: "https://detailingplatform.com", label: "Where detailers open their links", why: "The address in front of /p/ in every link, when links open on any phone." },
  { key: "syncSeconds", kind: "int", min: 15, max: 3600, default: 60, label: "Look for detailers' comments every (seconds)", why: "How often the Studio fetches what detailers did on their links (comments, votes, picks)." },
  { key: "readPages", kind: "int", min: 1, max: 20, default: 8, label: "Pages read from a detailer's website, at most", why: "When the Studio reads a detailer's current website to fill in their form: the home page first, then their likeliest pages (services, prices, about, contact)." },
  { key: "readSeconds", kind: "int", min: 60, max: 900, default: 300, label: "Website reading time limit (seconds)", why: "The AI reading a detailer's website is stopped after this, and nothing is kept." },
];
const DEFAULTS = Object.fromEntries(STUDIO_SETTINGS.map((s) => [s.key, s.default]));
const SITE_ID = /^[a-z][a-z0-9-]{1,40}$/;
const JOBS_READ = 300;
const SPEC_REL = "app/src/site/specs/brightline.json";

// ---------------------------------------------------------------- the store (plain files)
export class Refused extends Error {}
export function openStore(dir) {
  const P = (...a) => path.join(dir, ...a);
  mkdirSync(P("sites"), { recursive: true });
  const read = (f, d = null) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
  // A whole file or nothing: written beside, then renamed over (only for files that MAY change: settings, a site's card).
  const swap = (f, v) => { mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f + ".tmp", JSON.stringify(v, null, 2) + "\n"); renameSync(f + ".tmp", f); };
  const nums = (d) => { try { return readdirSync(d).map((f) => /^(\d+)\.json$/.exec(f)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b); } catch { return []; } };
  const store = {
    dir,
    settings: () => ({ ...DEFAULTS, ...read(P("settings.json"), {}) }),
    saveSettings: (v) => swap(P("settings.json"), v),
    sites: () => { try { return readdirSync(P("sites")).filter((d) => SITE_ID.test(d)).map((d) => read(P("sites", d, "site.json"))).filter(Boolean); } catch { return []; } },
    site: (id) => (SITE_ID.test(String(id)) ? read(P("sites", id, "site.json")) : null),
    addSite(site) {
      if (!SITE_ID.test(site.id)) throw new Refused("A site id is lower-case letters, digits and dashes.");
      if (existsSync(P("sites", site.id, "site.json"))) throw new Refused(`There is already a site called ${site.id}.`);
      swap(P("sites", site.id, "site.json"), site);
      return site;
    },
    revisionNumbers: (id) => nums(P("sites", id, "revisions")),
    revision: (id, n) => (Number.isInteger(n) && n > 0 && SITE_ID.test(String(id)) ? read(P("sites", id, "revisions", `${n}.json`)) : null),
    // IMMUTABLE. "wx" fails if the file exists, so no code path can overwrite a revision; a change is a new number.
    addRevision(id, rev) {
      if (!store.site(id)) throw new Refused("There is no such site.");
      const n = rev.n;
      if (!Number.isInteger(n) || n < 1) throw new Refused("A revision number is a whole number from 1.");
      mkdirSync(P("sites", id, "revisions"), { recursive: true });
      try { writeFileSync(P("sites", id, "revisions", `${n}.json`), JSON.stringify(rev, null, 2) + "\n", { flag: "wx" }); }
      catch (e) { if (e.code === "EEXIST") throw new Refused(`Revision ${n} already exists and cannot be changed. Save a new revision instead.`); throw e; }
      return rev;
    },
    checks: (id) => { try { return readdirSync(P("sites", id, "checks")).filter((f) => /^c\d+\.json$/.test(f)).map((f) => read(P("sites", id, "checks", f))).filter(Boolean).sort((a, b) => b.started_at.localeCompare(a.started_at)); } catch { return []; } },
    check: (id, cid) => (/^c\d+$/.test(String(cid)) && SITE_ID.test(String(id)) ? read(P("sites", id, "checks", `${cid}.json`)) : null),
    // A finished check is a record of what happened: written once, like a revision.
    addCheck(id, c) { mkdirSync(P("sites", id, "checks"), { recursive: true }); writeFileSync(P("sites", id, "checks", `${c.id}.json`), JSON.stringify(c, null, 2) + "\n", { flag: "wx" }); return c; },
    shotPath: (id, cid) => P("sites", id, "checks", `${cid}.png`),
    tmp: (name) => { mkdirSync(P("tmp"), { recursive: true }); return P("tmp", name); },
    runningCheck: () => read(P("check-running.json"), null),
    saveRunningCheck: (v) => (v ? swap(P("check-running.json"), v) : rmSync(P("check-running.json"), { force: true })),
    previewPids: () => read(P("preview.json"), null),
    savePreviewPids: (v) => (v ? swap(P("preview.json"), v) : rmSync(P("preview.json"), { force: true })),
    // CHANGE CARDS are requests, not history: a card moves proposed → applied / binned / stale / conflict, so it is
    // rewritten whole (swap). What a card did is kept in the revision it made, which is never changed.
    cardNumbers: (id) => nums(P("sites", id, "cards")),
    card: (id, k) => (Number.isInteger(k) && k > 0 && SITE_ID.test(String(id)) ? read(P("sites", id, "cards", `${k}.json`)) : null),
    cards: (id) => (SITE_ID.test(String(id)) ? store.cardNumbers(id).map((k) => store.card(id, k)).filter(Boolean).reverse() : []),
    // AI JOBS (S5): one file each, rewritten whole as it moves queued → running → done / failed / waiting / cancelled,
    // so a job outlives a page reload, a phone that drops off the tunnel, and a Control Room restart.
    job: (k) => (/^j[0-9a-z]{6,40}$/.test(String(k)) ? read(P("jobs", `${k}.json`)) : null),
    // ponytail: only the newest JOBS_READ files are read on every poll (job ids sort by time); old finished ones are
    // cleared at start (Studio settings → Keep the chat for). An index file, if hundreds a day ever happen.
    jobs: () => { try { return readdirSync(P("jobs")).filter((f) => /^j[0-9a-z]+\.json$/.test(f)).sort().slice(-JOBS_READ).map((f) => read(P("jobs", f))).filter(Boolean).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)); } catch { return []; } },
    dropJob: (k) => { if (/^j[0-9a-z]{6,40}$/.test(String(k))) rmSync(P("jobs", `${k}.json`), { force: true }); },
    jobFiles: () => { try { return readdirSync(P("jobs")).filter((f) => /^j[0-9a-z]+\.json$/.test(f)).sort(); } catch { return []; } },
    writeOnce: (file, text) => { if (!existsSync(file)) { writeFileSync(file + ".tmp", text); renameSync(file + ".tmp", file); } },
    saveJob: (j) => { if (!/^j[0-9a-z]{6,40}$/.test(String(j.id))) throw new Refused("That is not a job."); swap(P("jobs", `${j.id}.json`), j); return j; },
    // S6 LOOKS: one file per set of three (rewritten whole as its looks are made, checked and critiqued); the newest is
    // the site's current set. Each version's screenshots and critic logs sit in a folder beside it.
    lookSetIds: (id) => { try { return readdirSync(P("sites", id, "looks")).map((f) => /^(l[0-9a-z]+)\.json$/.exec(f)?.[1]).filter(Boolean).sort(); } catch { return []; } },
    lookSet: (id, k) => (SITE_ID.test(String(id)) && /^l[0-9a-z]{4,40}$/.test(String(k)) ? read(P("sites", id, "looks", `${k}.json`)) : null),
    saveLookSet: (id, set) => { if (!/^l[0-9a-z]{4,40}$/.test(String(set.id))) throw new Refused("That is not a set of looks."); swap(P("sites", id, "looks", `${set.id}.json`), set); return set; },
    lookDir: (id, k, letter, v) => { const d = P("sites", id, "looks", k, `${letter}${v}`); mkdirSync(d, { recursive: true }); return d; },
    // THE TASTE LOG: every Love it / No, one line each, never rewritten (what he pressed last is what holds).
    addTaste: (id, row) => { mkdirSync(P("sites", id), { recursive: true }); writeFileSync(P("sites", id, "taste.jsonl"), JSON.stringify(row) + "\n", { flag: "a" }); return row; },
    taste: (id) => { try { return readFileSync(P("sites", id, "taste.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } },
    // S7 THE DETAILER: links, their comments, and email drafts. A link file is named by its own id; it holds only a
    // FINGERPRINT (SHA-256) of its secret, and only once the secret exists: a secret is made when its email is approved
    // (review S7 F3), so no secret is ever written to disk, in a link or in a draft.
    links: (id) => { if (!SITE_ID.test(String(id))) return []; try { return readdirSync(P("sites", id, "links")).filter((f) => /^k[0-9a-z]{6,40}\.json$/.test(f)).map((f) => read(P("sites", id, "links", f))).filter(Boolean).sort((a, b) => b.created_at.localeCompare(a.created_at)); } catch { return []; } },
    // ponytail: every site's links are read to find a fingerprint; an index file when there are thousands of links
    linkByHash: (h) => { if (!/^[0-9a-f]{64}$/.test(String(h))) return null; for (const st of store.sites()) for (const l of store.links(st.id)) if (l.hash === h) return l; return null; },
    saveLink: (l) => { if (!/^k[0-9a-z]{6,40}$/.test(String(l.id)) || !store.site(l.site)) throw new Refused("That is not a link."); swap(P("sites", l.site, "links", `${l.id}.json`), l); return l; },
    comments: (id) => (SITE_ID.test(String(id)) ? nums(P("sites", id, "comments")).map((k) => read(P("sites", id, "comments", `${k}.json`))).filter(Boolean) : []),
    addComment(id, c) { mkdirSync(P("sites", id, "comments"), { recursive: true }); const k = (nums(P("sites", id, "comments")).at(-1) || 0) + 1;
      writeFileSync(P("sites", id, "comments", `${k}.json`), JSON.stringify({ ...c, id: k }, null, 2) + "\n", { flag: "wx" }); return { ...c, id: k }; },
    // S8 PUBLISH: a site's record changes (its live release); releases are written once (only "rolled back at" changes
    // later); gate runs and parity checks are records, written once; published.json is what is live, by address.
    saveSite: (v) => { if (!store.site(v.id)) throw new Refused("There is no such site."); swap(P("sites", v.id, "site.json"), v); return v; },
    releases: (id) => (SITE_ID.test(String(id)) ? nums(P("sites", id, "releases")).map((k) => read(P("sites", id, "releases", `${k}.json`))).filter(Boolean).reverse() : []),
    addRelease(id, r) { mkdirSync(P("sites", id, "releases"), { recursive: true }); const k = (nums(P("sites", id, "releases")).at(-1) || 0) + 1;
      writeFileSync(P("sites", id, "releases", `${k}.json`), JSON.stringify({ ...r, n: k }, null, 2) + "\n", { flag: "wx" }); return { ...r, n: k }; },
    saveRelease: (id, r) => { if (!Number.isInteger(r.n) || !existsSync(P("sites", id, "releases", `${r.n}.json`))) throw new Refused("There is no such release."); swap(P("sites", id, "releases", `${r.n}.json`), r); return r; },
    gates: (id) => (SITE_ID.test(String(id)) ? nums(P("sites", id, "gates")).map((k) => read(P("sites", id, "gates", `${k}.json`))).filter(Boolean).reverse() : []),
    addGates(id, g) { mkdirSync(P("sites", id, "gates"), { recursive: true }); const k = (nums(P("sites", id, "gates")).at(-1) || 0) + 1;
      writeFileSync(P("sites", id, "gates", `${k}.json`), JSON.stringify({ ...g, n: k }, null, 2) + "\n", { flag: "wx" }); return { ...g, n: k }; },
    parities: (id) => (SITE_ID.test(String(id)) ? nums(P("sites", id, "parity")).map((k) => read(P("sites", id, "parity", `${k}.json`))).filter(Boolean).reverse() : []),
    addParity(id, x) { mkdirSync(P("sites", id, "parity"), { recursive: true }); const k = (nums(P("sites", id, "parity")).at(-1) || 0) + 1;
      writeFileSync(P("sites", id, "parity", `${k}.json`), JSON.stringify({ ...x, n: k }, null, 2) + "\n", { flag: "wx" }); return { ...x, n: k }; },
    publishedFile: () => P("published.json"),
    savePublished: (v) => swap(P("published.json"), v),
    emails: (id) => (SITE_ID.test(String(id)) ? nums(P("sites", id, "emails")).map((k) => read(P("sites", id, "emails", `${k}.json`))).filter(Boolean).reverse() : []),
    email: (id, k) => (SITE_ID.test(String(id)) && Number.isInteger(k) ? read(P("sites", id, "emails", `${k}.json`)) : null),
    // WEBSITE AUTOFILL (studio-cloud.mjs): what was read from a business's current website, by the business's slug
    form: (slug) => (/^[a-z0-9_][a-z0-9_-]{1,62}$/.test(String(slug)) ? read(P("forms", `${slug}.json`)) : null),
    saveForm: (slug, v) => { if (!/^[a-z0-9_][a-z0-9_-]{1,62}$/.test(String(slug))) throw new Refused("That is not a business."); swap(P("forms", `${slug}.json`), v); return v; },
    saveEmail: (id, e) => { const k = e.id || (nums(P("sites", id, "emails")).at(-1) || 0) + 1; swap(P("sites", id, "emails", `${k}.json`), { ...e, id: k }); return { ...e, id: k }; },
    saveCard(id, c) {
      if (!store.site(id)) throw new Refused("There is no such site.");
      if (!Number.isInteger(c.id) || c.id < 1) throw new Refused("A card number is a whole number from 1.");
      swap(P("sites", id, "cards", `${c.id}.json`), c);
      return c;
    },
  };
  return store;
}

// ---------------------------------------------------------------- change cards (pure: tested in studio.test.mjs)
// S4 cards are typed by hand: a new wording for one copy field, or "go back to revision k". A card names the revision
// it was made on (`base`); it can only be applied while that is still the latest. Otherwise it comes back STALE (the
// part it touches is the same in the latest, so it can be redone there) or a CONFLICT (that part has changed since:
// redoing it would overwrite the newer wording, and the card shows both so you choose).
const sectionOf = (spec, sid) => (spec?.pages?.[0]?.sections || []).find((s) => s?.id === sid) || null;
export const copyOf = (spec, sid, field) => { const c = sectionOf(spec, sid)?.copy; return c && Object.hasOwn(c, field) ? c[field] : undefined; };
// The spec with these cards' patches made, never touching the one passed in. `specOf(n)` reads revision n.
export function applyCards(spec, cards, specOf = () => null) {
  let out = structuredClone(spec);
  for (const c of cards) {
    const p = c.patch || {};
    if (p.op === "revert") { const old = specOf(p.to); if (!old) throw new Refused(`There is no revision ${p.to} to go back to.`); out = structuredClone(old); continue; }
    if (p.op === "comment") throw new Refused("A detailer's comment is a request, not a change. Ask the AI to make it, or change the words yourself.");
    if (p.op === "look") { if (!p.spec?.pages) throw new Refused("This look has no site to use."); out = structuredClone(p.spec); continue; }
    if (p.op !== "copy") throw new Refused("This card has nothing the Studio can make yet.");
    const sec = sectionOf(out, p.section);
    if (!sec) throw new Refused(`The part "${p.section}" is no longer on the site.`);
    sec.copy = { ...(sec.copy || {}) };
    if (p.to === "") delete sec.copy[p.field]; else sec.copy[p.field] = p.to;
  }
  return out;
}
// Where a card stands against the latest revision: "proposed" (made on it), "stale" or "conflict".
export function judgeCard(card, latestN, latestSpec) {
  if (card.base === latestN || card.patch?.op === "comment") return "proposed";
  if (card.patch?.op !== "copy") return "stale";
  return (copyOf(latestSpec, card.patch.section, card.patch.field) ?? "") === (card.patch.from ?? "") ? "stale" : "conflict";
}
const OPEN = new Set(["proposed", "stale", "conflict"]);

// ---------------------------------------------------------------- which folders may be the platform copy
const real = (f) => { try { return realpathSync.native(f).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase(); } catch { return null; } };
const inside = (child, parent) => !!child && !!parent && (child === parent || child.startsWith(parent + "/"));
const listOf = (v) => String(v ?? "").split(/[\r\n;]+/).map((x) => x.trim().replace(/\\/g, "/").replace(/\/+$/, "")).filter(Boolean);
// Null when `folder` may be used as the platform copy with this allow-list, else why not (in plain words).
export function platformProblem(folder, allowed) {
  const r = real(folder);
  if (!r) return "That folder does not exist.";
  const repo = real(REAL_REPO);
  if (inside(r, repo)) return "That is the real repo. The Studio only works on a copy.";
  if (!listOf(allowed).some((a) => real(a) === r)) return "That folder is not on the Studio's list of platform copies.";
  if (!existsSync(path.join(folder, "app/src/site/spec.js")) || !existsSync(path.join(folder, "scripts/studio/studio-check.mjs")))
    return "That folder has no site renderer and connection check. Pick the platform copy.";
  return null;
}

// Settings from the page: only known keys, each checked. Returns { ok, values } or { ok:false, said, key }.
export function cleanSettings(input, current) {
  const out = { ...current };
  for (const s of STUDIO_SETTINGS) {
    if (!Object.hasOwn(input || {}, s.key)) continue;
    const v = input[s.key];
    if (s.kind === "folders") {
      const list = listOf(v);
      if (!list.length) return { ok: false, key: s.key, said: "Give at least one platform copy folder." };
      const repo = real(REAL_REPO);
      const bad = list.find((f) => !real(f) || inside(real(f), repo));
      if (bad) return { ok: false, key: s.key, said: !real(bad) ? `${bad} does not exist.` : `${bad} is the real repo. The Studio only works on a copy.` };
      out[s.key] = list.join("\n");
    } else if (s.kind === "folder") {
      const f = String(v || "").trim().replace(/\\/g, "/").replace(/\/+$/, "");
      if (!f) return { ok: false, key: s.key, said: "Give the folder of the platform copy." };
      out[s.key] = f;
    } else if (s.kind === "text") {
      const t = String(v ?? "").replace(/\r\n/g, "\n").trim();
      if (!t || t.length > (s.max || 200)) return { ok: false, key: s.key, said: `${s.label}: some words, up to ${s.max || 200} letters.` };
      out[s.key] = t;
    } else if (s.kind === "choice") {
      if (!s.choices.some(([k]) => k === v)) return { ok: false, key: s.key, said: `${s.label}: pick one of the choices.` };
      out[s.key] = v;
    } else {
      const n = Number(v), min = s.kind === "port" ? 1024 : s.min, max = s.kind === "port" ? 65535 : s.max;
      if (!Number.isInteger(n) || n < min || n > max) return { ok: false, key: s.key, said: `${s.label}: a whole number from ${min} to ${max}.` };
      out[s.key] = n;
    }
  }
  const why = platformProblem(out.platform, out.allowed);
  if (why) return { ok: false, key: "platform", said: why };
  if (out.previewPort === out.enginePort) return { ok: false, key: "enginePort", said: "The preview and the test data need two different ports." };
  if (!/^(https:\/\/[a-z0-9.-]+\.[a-z]{2,}|http:\/\/(127\.0\.0\.1|localhost))(:\d+)?$/i.test(String(out.previewSite || ""))) return { ok: false, key: "previewSite", said: "Where detailers open their links: an address like https://detailingplatform.com, with nothing after it." };
  return { ok: true, values: out };
}

const hash = (spec) => createHash("sha256").update(JSON.stringify(spec)).digest("hex").slice(0, 12);
// Resolves once taskkill has finished (or could not start).
const killTree = (pid) => new Promise((done) => {
  if (!pid) return done();
  try { const k = spawn("taskkill", ["/T", "/F", "/PID", String(pid)], { windowsHide: true, stdio: "ignore" }); k.on("exit", done); k.on("error", done); } catch { done(); }
});
const killTreeSync = (pid) => { if (pid) try { spawnSync("taskkill", ["/T", "/F", "/PID", String(pid)], { windowsHide: true, stdio: "ignore", timeout: 10000 }); } catch {} };
// Is this pid still a connection check? (A pid saved by an earlier Control Room may belong to another program by now.)
const cmdLineOf = (pid) => { if (!Number(pid)) return ""; try { return spawnSync("powershell.exe", ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}").CommandLine`], { windowsHide: true, encoding: "utf8", timeout: 15000 }).stdout || ""; } catch { return ""; } };
const isCheckPid = (pid) => /studio-check\.mjs/.test(cmdLineOf(pid));
// a pid saved by an earlier Control Room is ours only while its command line still holds what we gave it (a pid is reused)
// REVIEW-S5 F1: every process (but this lookup itself) whose command line holds one of these session ids. A session id
// is a UUID, so nothing in it can change the query. Its tree is killed: the CLI and anything it started.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function pidsHolding(ids) {
  const ok = [...new Set(ids)].filter((x) => UUID.test(String(x)));
  if (!ok.length) return [];
  const q = `Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine -match '${ok.join("|")}' } | ForEach-Object { $_.ProcessId }`;
  try { return (spawnSync("powershell.exe", ["-NoProfile", "-Command", q], { windowsHide: true, encoding: "utf8", timeout: 20000 }).stdout || "").split(/\s+/).map(Number).filter((n) => n > 0); } catch { return []; }
}
// REVIEW-S5 F5: "about 22 hours (at 3:50 am Sat)": how long, then the clock time, with the day when it is not today.
// The page words it the same way from the job's wait_until (studio-ui.js waitPhrase), so it never goes stale.
export function waitPhrase(at, now = Date.now()) {
  const min = Math.max(1, Math.round((at - now) / 60000)), d = new Date(at);
  const long = min < 60 ? `about ${min} minute${min === 1 ? "" : "s"}` : `about ${Math.round(min / 60)} hour${Math.round(min / 60) === 1 ? "" : "s"}`;
  const clock = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?([AP])M$/i, (m, a) => ` ${a.toLowerCase()}m`);
  return `${long} (at ${clock}${d.toDateString() === new Date(now).toDateString() ? "" : ` ${d.toLocaleDateString("en-US", { weekday: "short" })}`})`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Can this Control Room listen on the port right now? (Something that only accepts and never answers counts as taken.)
const portFree = (p) => new Promise((r) => { const s = net.createServer().once("error", () => r(false)).listen(p, "127.0.0.1", () => s.close(() => r(true))); });
const anyFreePort = () => new Promise((r, j) => { const s = net.createServer().once("error", j).listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
// What is on a port: "ours" (the thing we expect), "other" (something else answers), or "none".
const probe = async (fn) => { try { return (await fn()) ? "ours" : "other"; } catch (e) { return e?.name === "TimeoutError" || e?.cause?.code === "ECONNREFUSED" || /fetch failed/i.test(e?.message) ? "none" : "other"; } };
// the preview's site server answers with the random id the Studio started it with (vite.config.js previewId)
const isSite = (port, id) => probe(async () => { const r = await fetch(`http://127.0.0.1:${port}/__studio/preview-id`, { signal: AbortSignal.timeout(1500) }); return !!id && r.ok && (await r.text()) === id; });
// the preview's test data: an offline engine that holds the example business (the live belt's own demo engine does not)
const isData = (port) => probe(async () => {
  const r = await fetch(`http://127.0.0.1:${port}/rest/v1/rpc/get_public_business_profile`, { method: "POST", headers: { "content-type": "application/json" }, body: '{"p_slug":"example_brightline"}', signal: AbortSignal.timeout(1500) });
  return r.ok && !!(await r.json())?.business;
});

// Runs a small module inside the platform copy, in a child process: JSON in on stdin, JSON out on stdout.
const IN_PLATFORM = `
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
const input = JSON.parse(readFileSync(0, "utf8"));
const out = {};
const specJs = await import(pathToFileURL(path.resolve("app/src/site/spec.js")).href);
if (input.spec) out.valid = specJs.validateSpec(input.spec);
out.types = Object.fromEntries(Object.entries(specJs.SECTION_TYPES).map(([k, t]) => [k, { copy: Object.keys(t.copy), required: Object.keys(t.copy).filter((f) => t.copy[f]), slots: Object.keys(t.slots), variants: t.variants }]));
try { out.families = (await import(pathToFileURL(path.resolve("app/src/site/families.js")).href)).FAMILIES; } catch { out.families = null; }
if (input.data) {
  // S6 live data: the example dashboard's public profile, read from a private copy that is thrown away at once
  const [{ startExampleEngine }, core, F] = await Promise.all([import(pathToFileURL(path.resolve("scripts/studio/example-engine.mjs")).href), import(pathToFileURL(path.resolve("app/src/book/core.js")).href), import(pathToFileURL(path.resolve("app/src/lib/format.js")).href)]);
  const e = await startExampleEngine({ port: 0 });
  try {
    const p = core.normalizeProfile(await core.createBookingTransport({ supabaseUrl: e.url, anonKey: "demo-anon" }).profile(input.data));
    const r = (b) => specJs.resolve(b, p), days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const sale = r("sale"), area = r("area");
    out.data = {
      services: p.services.map((s) => [s.name, (s.price_is_from ? "from " : "") + F.money(s.price), F.duration(s.duration_minutes)].join(" · ")),
      add_ons: (r("add_ons") || []).map((a) => a.name + " · +" + F.money(a.price)),
      plans: (r("plans") || []).map((x) => x.name),
      sale: sale ? [sale.percent + "% off every booking" + (sale.label ? " · " + sale.label : "")] : [],
      gallery: p.gallery.map((g) => (g.kind === "before_after" ? "Before and after" : "Photo") + (g.caption ? " · " + g.caption : "")),
      reviews: p.testimonials.map((t) => t.author + (t.source ? " · " + t.source : "")),
      hours: [1, 2, 3, 4, 5, 6, 0].map((d) => { const h = p.hours.find((x) => x.weekday === d); return days[d] + " " + (h?.open_time && h?.close_time ? F.time12(h.open_time) + " to " + F.time12(h.close_time) : "closed"); }),
      area: area ? [area.text, ...area.zones.map((z) => z.name)].filter(Boolean) : [],
      phone: p.business?.phone ? [F.phone(p.business.phone)] : [],
      email: p.business?.email || p.business?.contact_email || "",
      faq: (r("faq") || []).map((f) => f.q),
      pay: (r("pay") || []).map((m) => m.label || m.handle).filter(Boolean),
      mode: area ? [area.zones.length ? "goes to the customer (mobile)" : null, area.dropoff ? "or takes drop-offs at its workshop" : null].filter(Boolean) : [],
    };
  } finally { await e.close().catch(() => {}); }
}
if (input.profile) {
  const [{ startExampleEngine }, core] = await Promise.all([import(pathToFileURL(path.resolve("scripts/studio/example-engine.mjs")).href), import(pathToFileURL(path.resolve("app/src/book/core.js")).href)]);
  const e = await startExampleEngine({ port: 0 });
  try { out.profile = await core.createBookingTransport({ supabaseUrl: e.url, anonKey: "demo-anon" }).profile(input.profile); } finally { await e.close().catch(() => {}); }
}
if (input.questions) out.questions = (await import(pathToFileURL(path.resolve("app/src/lib/siteIntake.js")).href)).ALL.filter((q) => q.question).map(({ id, question, type }) => ({ id, question, type }));
const seedT = (await import(pathToFileURL(path.resolve("scripts/studio/example-engine.mjs")).href)).exampleSeed().tables;
out.businesses = seedT.businesses
  .map((b, i, all) => { const T = seedT; return { slug: b.slug, name: b.name, area: b.service_area || "", email: b.contact_email || "", status: b.status,
    paying: (T.platform_subscriptions || []).some((x) => x.business_id === b.id && x.plan === "website" && x.status === "active"),
    domains: (T.business_domains || []).filter((d) => d.business_id === b.id && d.verified_at).map((d) => d.domain.toLowerCase()) }; });
process.stdout.write(JSON.stringify(out));
`;
function inPlatform(folder, input, ms = 20000, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", IN_PLATFORM], { cwd: folder, windowsHide: true, stdio: ["pipe", "pipe", "pipe"], env });
    let out = "", err = "";
    const t = setTimeout(() => { killTree(child.pid); reject(new Error("the platform copy did not answer in time")); }, ms);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err = (err + d).slice(-1000); });
    child.on("error", (e) => { clearTimeout(t); reject(e); });
    child.on("exit", (code) => { clearTimeout(t); try { resolve(JSON.parse(out)); } catch { reject(new Error(err.trim().split("\n").pop() || `the platform copy answered with code ${code}`)); } });
    child.stdin.end(JSON.stringify(input));
  });
}

const STATIC = { "/studio/ui.js": ["studio-ui.js", "text/javascript; charset=utf-8"], "/studio/ui.css": ["studio-ui.css", "text/css; charset=utf-8"] };

export function createStudio({ HERE, json, body, log = () => {}, onExit = true, port = null }) {
  const childEnv = (extra = {}) => ({ ...process.env, STUDIO_BELT: HERE, ...(store ? { STUDIO_PUBLISHED: store.publishedFile() } : {}), ...extra });
  // An unwritable data folder must not stop the Control Room from starting: the Studio then says so and does nothing.
  let store, broken = null;
  try { store = openStore(process.env.BELT_STUDIO_DATA || path.join(HERE, "data", "studio")); }
  catch (e) { broken = `The Studio cannot write its folder: ${e.message}`; log(`studio: ${broken}`); }
  const S = () => store.settings();
  const specFile = (st = S()) => path.join(st.platform, SPEC_REL);
  const platformWhy = (st = S()) => platformProblem(st.platform, st.allowed);

  // ---------------------------------------------------------------- the phone preview's two servers
  let starting = false, stopping = false, startError = null;
  const mine = new Set();   // pids this Control Room started, so shutting down stops exactly those
  // NO FIXED PORTS (live install 2026-11-05): the settings name the ports the phone preview would like. When another
  // program (another Studio's preview, a dev server) holds one, the Studio does not stop or complain: turning the
  // preview on takes a free port instead, and the ports it really used are kept with its pids. "Taken" is a plain
  // note, never an error, and never stops the Studio from drawing.
  async function previewStatus() {
    const st = S(), pids = store.previewPids();
    const pp = pids?.previewPort ?? st.previewPort, ep = pids?.enginePort ?? st.enginePort;
    const [siteIs, dataIs] = await Promise.all([isSite(pp, pids?.id), pids?.engine ? isData(ep) : Promise.resolve("none")]);
    // (asked of the port itself, not of whatever answers on it: a slow or silent program holds a port too)
    const busy = !pids && !(await portFree(st.previewPort)) ? [`Port ${st.previewPort} is in use by another program, so the phone preview will use a free port.`] : [];
    return { running: siteIs === "ours" && dataIs === "ours", site: siteIs === "ours", data: dataIs === "ours", taken: busy, url: `http://127.0.0.1:${pp}/site/preview`, starting, stopping,
      error: startError, note: busy[0] || null, ours: !!pids, platformOk: !platformWhy(st), platformWhy: platformWhy(st), port: pp, enginePort: ep };
  }
  async function startPreview() {
    if (starting || stopping) return { ok: false, said: "The phone preview is already being turned on or off." };
    const st = S(), why = platformWhy(st);
    if (why) return { ok: false, said: `${why} Change it in Studio settings.` };
    const now = await previewStatus();
    if (now.running) return { ok: true, said: "The phone preview is on." };
    starting = true; startError = null;
    const pids = { ...(store.previewPids() || {}) };
    try {
      // the wanted port, or a free one when something else holds it
      const pick = async (want) => ((await portFree(want)) ? want : anyFreePort());
      let ep = now.enginePort, pp = now.port;
      if (!now.data) {
        ep = await pick(pids.engine ? ep : st.enginePort);
        const e = spawn(process.execPath, ["scripts/studio/example-engine.mjs", "--port", String(ep)], { cwd: st.platform, windowsHide: true, stdio: "ignore", env: childEnv() });
        e.on("error", () => {}); pids.engine = e.pid; mine.add(e.pid);
        // a site server still pointing at the old test data is started again against the new one
        if (now.site) { await killTree(pids.site); now.site = false; }
      }
      // the detailer's preview page asks the Studio's link server (S7), so that answers first
      const L = await startLinks();
      if (!now.site) {
        pp = await pick(st.previewPort);
        pids.id = randomBytes(12).toString("hex");
        const v = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(pp), "--strictPort", "--host", "127.0.0.1"],
          { cwd: path.join(st.platform, "app"), windowsHide: true, stdio: "ignore",
            env: childEnv({ VITE_SUPABASE_URL: `http://127.0.0.1:${ep}`, VITE_SUPABASE_ANON_KEY: "demo-anon", STUDIO_PREVIEW_ID: pids.id, VITE_STUDIO_LINKS: L.url, STUDIO_TEST_HOSTS: ".test",
              // the preview (and its picker) listens to this Control Room's page and no other page on the laptop
              ...(port ? { VITE_STUDIO_ORIGINS: `http://127.0.0.1:${port},http://localhost:${port}` } : {}) }) });
        v.on("error", () => {}); pids.site = v.pid; mine.add(v.pid);
      }
      store.savePreviewPids({ ...pids, at: new Date().toISOString(), previewPort: pp, enginePort: ep });
      const t = Date.now();
      while (Date.now() - t < st.startWaitSec * 1000) {
        if ((await previewStatus()).running) { starting = false; return { ok: true, said: "The phone preview is on." }; }
        await sleep(500);
      }
      throw new Error(`The phone preview did not answer within ${st.startWaitSec} seconds.`);
    } catch (e) { startError = e.message; return { ok: false, said: e.message }; }
    finally { starting = false; }
  }
  // Stops only what the Studio started, and answers only once both servers have gone (review S3-6). The site server is
  // ours only while it answers with the id we gave it, so a pid Windows has since reused is never killed.
  async function stopPreview() {
    const pids = store.previewPids(), st = S();
    if (!pids) return { ok: false, said: "The Studio did not turn on this preview, so it leaves it alone." };
    if (starting || stopping) return { ok: false, said: "The phone preview is already being turned on or off." };
    stopping = true;
    try {
      const pp = pids.previewPort ?? st.previewPort, ep = pids.enginePort ?? st.enginePort;
      const [siteIs, dataIs] = await Promise.all([isSite(pp, pids.id), isData(ep)]);
      await Promise.all([siteIs === "ours" && killTree(pids.site), dataIs === "ours" && killTree(pids.engine)]);
      const t = Date.now();
      while (Date.now() - t < st.startWaitSec * 1000) {
        const [a, b] = await Promise.all([isSite(pp, pids.id), isData(ep)]);
        if (a !== "ours" && (b !== "ours" || dataIs !== "ours")) break;
        await sleep(300);
      }
      store.savePreviewPids(null); startError = null;
      return { ok: true, said: siteIs === "ours" || dataIs === "ours" ? "The phone preview is off." : "The phone preview was not on." };
    } finally { stopping = false; }
  }

  // ---------------------------------------------------------------- the connection check (one at a time)
  let running = null;   // { id, site, rev, started_at, lines: [], child }
  let plan = null;      // the check's own list of ticks (studio-check.mjs --plan), read once per platform copy
  function readPlan(st = S()) {
    if (plan?.platform === st.platform || platformWhy(st)) return;
    plan = { platform: st.platform, lines: null };
    const c = spawn(process.execPath, ["scripts/studio/studio-check.mjs", "--plan"], { cwd: st.platform, windowsHide: true, stdio: ["ignore", "pipe", "ignore"], env: childEnv() });
    let out = ""; c.stdout.on("data", (d) => { out += d; }); c.on("error", () => {});
    c.on("exit", () => { try { plan.lines = JSON.parse(out); } catch {} });
  }
  function startCheck(siteId, n) {
    if (running) return { ok: false, said: `A check is already running (${running.site}, revision ${running.rev}).` };
    const site = store.site(siteId), rev = store.revision(siteId, n);
    if (!site || !rev) return { ok: false, said: "There is no such revision." };
    const st = S(), why = platformWhy(st);
    if (why) return { ok: false, said: `${why} Change it in Studio settings.` };
    const id = "c" + Date.now();
    const specPath = store.tmp(`${id}-spec.json`), outPath = store.tmp(`${id}-out.json`);
    writeFileSync(specPath, JSON.stringify(rev.spec, null, 2));
    const child = spawn(process.execPath, ["scripts/studio/studio-check.mjs", "--spec", specPath, "--out", outPath, "--jsonl", "--revision", `${siteId}/${n}`, "--shot", store.shotPath(siteId, id)],
      { cwd: st.platform, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env: childEnv() });
    running = { id, site: siteId, rev: n, started_at: new Date().toISOString(), lines: [], child };
    store.saveRunningCheck({ pid: child.pid, id, site: siteId, rev: n, started_at: running.started_at, spec_hash: hash(rev.spec) });
    const me = running;
    let buf = "", errText = "";
    child.stdout.on("data", (d) => {
      buf += d; let i;
      while ((i = buf.indexOf("\n")) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); try { const m = JSON.parse(l); if (m.line) me.lines.push(m.line); } catch {} }
    });
    child.stderr.on("data", (d) => { errText = (errText + d).slice(-2000); });
    const timer = setTimeout(() => { me.timedOut = true; killTree(child.pid); }, st.checkMinutes * 60000);
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      clearTimeout(timer); store.saveRunningCheck(null);
      let out = null; try { out = JSON.parse(readFileSync(outPath, "utf8")); } catch {}
      const lines = out?.lines || me.lines;
      const error = me.stopped ? "The Control Room was closed while this check ran, so it was stopped." : me.timedOut ? `The check took longer than ${st.checkMinutes} minutes and was stopped.` : !out ? `The check stopped before it finished${errText ? `: ${errText.trim().split("\n").pop().slice(0, 200)}` : "."}` : null;
      const rec = { id, site: siteId, rev: n, spec_hash: hash(rev.spec), started_at: me.started_at, finished_at: new Date().toISOString(),
        ok: !error && !!out?.ok, passed: lines.filter((l) => l.pass).length, failed: lines.filter((l) => !l.pass && !l.skipped).length, skipped: lines.filter((l) => l.skipped).length, ms: out?.ms ?? null, error, lines,
        shot: existsSync(store.shotPath(siteId, id)) };
      try { store.addCheck(siteId, rec); } catch (e) { log(`studio: could not save check ${id}: ${e.message}`); }
      for (const f of [specPath, outPath]) rmSync(f, { force: true });
      if (running === me) running = null;
    };
    child.on("error", (e) => { errText = e.message; finish(); });
    child.on("exit", finish);
    me.finish = finish;
    return { ok: true, id, said: "Checking…" };
  }

  // ---------------------------------------------------------------- what the page reads
  const lastCheckOf = (id, n) => store.checks(id).find((c) => n == null || c.rev === n) || null;
  const brief = (c) => c && { id: c.id, rev: c.rev, ok: c.ok, passed: c.passed, failed: c.failed, skipped: c.skipped || 0, error: c.error, started_at: c.started_at, finished_at: c.finished_at, shot: c.shot };
  function siteCard(s) {
    const revs = store.revisionNumbers(s.id), latest = revs.at(-1) ?? null;
    const last = lastCheckOf(s.id, null), onLatest = latest ? lastCheckOf(s.id, latest) : null;
    const shotOf = store.checks(s.id).find((c) => c.shot && c.ok);   // a picture of the site, never of a refused revision
    return { ...s, emailsWaiting: store.emails(s.id).filter((e) => e.status === "draft").length, revisions: revs.length, latest, lastCheck: brief(last), latestCheck: brief(onLatest), shot: shotOf ? shotOf.id : null };
  }
  async function overview() {
    const st = S();
    readPlan(st);
    return { settings: st, fields: STUDIO_SETTINGS, sites: store.sites().map(siteCard), preview: await previewStatus(),
      example: { exists: !platformWhy(st) && existsSync(specFile(st)) }, plan: plan?.lines || null,
      forms: broken ? null : formsNow(), alarms: broken ? [] : alarms(), check: running && { id: running.id, site: running.site, rev: running.rev, started_at: running.started_at, lines: running.lines }, ai: broken ? null : aiState() };
  }
  function siteDetail(id) {
    const s = store.site(id); if (!s) return null;
    const checks = store.checks(id);
    const revisions = store.revisionNumbers(id).map((n) => { const r = store.revision(id, n); const c = checks.find((x) => x.rev === n);
      return { n, created_at: r?.created_at, note: r?.note, source: r?.source, spec_hash: r?.spec_hash, sections: (r?.spec?.pages?.[0]?.sections || []).length, check: brief(c),
        parent: r?.parent ?? null, cards: r?.cards || [], quick: r?.quick ? { ok: r.quick.ok, ms: r.quick.ms } : null }; }).reverse();
    const latestSpec = revisions[0] ? store.revision(id, revisions[0].n)?.spec : null;
    const cards = store.cards(id).slice(0, 60).map((c) => (OPEN.has(c.status) && c.patch?.op === "copy" ? { ...c, now: copyOf(latestSpec, c.patch.section, c.patch.field) ?? "" } : c));
    return { site: siteCard(s), revisions, latest: revisions[0]?.n ?? null, checks: checks.slice(0, 20).map(brief), cards, applying, ai: aiState(id), looks: looksView(id), detailer: detailerView(id), publish: publishView(id),
      applied: store.cards(id).some((c) => c.status === "applied") };
  }

  // A spec from the platform copy, checked there (in a child): its structure, and that it names a business the
  // example engine really has (review S3-1). Returns { spec, biz } or { said }.
  async function readSpec(st, wantSlug = null) {
    const why = platformWhy(st);
    if (why) return { said: `${why} Change it in Studio settings.` };
    let spec;
    try { spec = JSON.parse(readFileSync(specFile(st), "utf8")); } catch { return { said: `Could not read ${SPEC_REL} in the platform copy.` }; }
    let r;
    try { r = await inPlatform(st.platform, { spec }); } catch (e) { return { said: `The platform copy could not check the spec: ${e.message}` }; }
    if (!r.valid?.ok) return { said: `The spec file is refused: ${r.valid?.errors?.[0]?.message || "it is not a valid spec"}` };
    const biz = (r.businesses || []).find((b) => b.slug === spec.slug);
    if (!biz) return { said: `The spec names the business "${spec.slug}", which the example dashboard does not have.` };
    if (wantSlug && spec.slug !== wantSlug) return { said: `The spec file is for "${spec.slug}", not this site's business "${wantSlug}".` };
    return { spec, biz };
  }
  async function addExample() {
    if (store.site("brightline")) return { ok: false, said: "The Brightline example is already in the Studio." };
    const st = S(), r = await readSpec(st);
    if (r.said) return { ok: false, said: r.said };
    const now = new Date().toISOString();
    store.addSite({ id: "brightline", name: r.biz.name, town: r.biz.area, business: r.spec.slug, kind: "example", status: "drafting", created_at: now });
    store.addRevision("brightline", { n: 1, site: "brightline", created_at: now, author: "you", note: "From the example spec file", source: `${st.platform}/${SPEC_REL}`, spec_hash: hash(r.spec), spec: r.spec });
    return { ok: true, said: "Added the Brightline example as revision 1." };
  }
  // Loading the example file again (review S4 F2): under the same one-at-a-time lock as Apply, and never once a card
  // has been applied, because the file does not hold those changes and loading it would quietly undo them while the
  // cards still said "Applied". Open cards are judged against the revision it makes.
  async function newRevision(id) {
    const s = store.site(id); if (!s) return { ok: false, said: "There is no such site." };
    const done = store.cards(id).filter((c) => c.status === "applied").map((c) => c.id).reverse();
    if (done.length) return { ok: false, said: `The example file does not have your applied changes (card${done.length > 1 ? "s" : ""} ${done.join(", ")}), so loading it would undo them. To start again from the example, go back to revision 1.` };
    if (applying) return { ok: false, said: `A change is already being applied (${applying}). One at a time.` };
    applying = `${s.name}, the example file`;
    try {
      const st = S(), r = await readSpec(st, s.business);
      if (r.said) return { ok: false, said: r.said };
      const revs = store.revisionNumbers(id), last = store.revision(id, revs.at(-1));
      if (last && last.spec_hash === hash(r.spec)) return { ok: false, said: `The example file is the same as revision ${last.n}. Nothing to load.` };
      const n = (revs.at(-1) || 0) + 1, at = new Date().toISOString();
      store.addRevision(id, { n, site: id, parent: revs.at(-1) || null, created_at: at, author: "you", note: "From the example file", source: `${st.platform}/${SPEC_REL}`, spec_hash: hash(r.spec), spec: r.spec });
      rejudge(id, n, r.spec, at);
      return { ok: true, n, said: `Loaded the example file as revision ${n}.` };
    } finally { applying = null; }
  }

  // ---------------------------------------------------------------- change cards (S4: typed by hand, no AI)
  const latestOf = (id) => store.revisionNumbers(id).at(-1) ?? null;
  const specOf = (id) => (n) => store.revision(id, n)?.spec || null;
  const cardRefusal = (errors, sid, field) => (errors.find((e) => e.path?.endsWith(`.copy.${field}`)) || errors[0])?.message || "it is not a valid spec";
  // The spec checked in the platform copy (a child process): shape and typed facts. The dashboard is not asked here;
  // the quick check does that when the card is applied.
  async function validate(spec) {
    const st = S(), why = platformWhy(st);
    if (why) return { ok: false, said: `${why} Change it in Studio settings.` };
    try { const r = await inPlatform(st.platform, { spec }); return r.valid?.ok ? { ok: true } : { ok: false, errors: r.valid?.errors || [] }; }
    catch (e) { return { ok: false, said: `The platform copy could not check it: ${e.message}` }; }
  }
  // A new wording for one copy field of the latest revision. Saving runs the validator: a typed price is refused
  // here, before any card exists, with the validator's own plain reason.
  // `extra` (S5): what an AI card carries besides: its source (chat / tap), how it was asked (typed / voice), its job,
  // the AI's reason. The wording goes through exactly the same checks as a typed card.
  async function newCard(siteId, b, extra = {}) {
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    const latest = latestOf(siteId), base = Number(b.base);
    if (!latest) return { ok: false, said: "This site has no revision to change." };
    const baseSpec = store.revision(siteId, base)?.spec;
    if (!baseSpec) return { ok: false, said: "There is no such revision." };
    const section = String(b.section || ""), field = String(b.field || "");
    const to = String(b.text ?? "").replace(/\s+/g, " ").trim();
    if (!/^[a-z][a-z-]{0,40}$/.test(section) || !/^[a-z_]{1,20}$/.test(field)) return { ok: false, said: "That is not a part of the site." };
    const from = copyOf(baseSpec, section, field);
    if (from === undefined) return { ok: false, said: "That wording is not part of this revision." };
    if (to === from) return { ok: false, said: "That is what it says already." };
    if (to.length > 400) return { ok: false, said: "That is longer than 400 letters. Make it shorter." };
    const patch = { op: "copy", section, field, from, to };
    const v = await validate(applyCards(baseSpec, [{ patch }]));
    if (!v.ok) return { ok: false, field, said: v.said || `Not saved. ${cardRefusal(v.errors, section, field)}` };
    // From here to the save nothing waits, so an Apply cannot slip in between (review S4 F4): the latest is read now.
    const now = latestOf(siteId), nowSpec = store.revision(siteId, now).spec;
    const same = store.cards(siteId).find((c) => c.status === "proposed" && c.base === base && c.patch?.op === "copy" && c.patch.section === section && c.patch.field === field && c.patch.to === to);
    if (same) return { ok: false, said: `Card ${same.id} already makes this change. Apply that one.` };
    if (now !== base && copyOf(nowSpec, section, field) === to) return { ok: false, said: `Revision ${now} already says this.` };
    const id = (store.cardNumbers(siteId).at(-1) || 0) + 1;
    const card = { id, site: siteId, base, source: extra.source || "direct", target: { section, field, scope: "this" }, patch, status: "proposed", created_at: new Date().toISOString(),
      ...(extra.job ? { job: extra.job, via: extra.via, why: extra.why || "", request: extra.request } : {}) };
    card.status = judgeCard(card, now, nowSpec);
    store.saveCard(siteId, card);
    return { ok: true, card: id, said: card.status === "proposed" ? `Card ${id} made. Apply it to make revision ${now + 1}.` : `Card ${id} was made on revision ${base}, and the site is at revision ${now} now.` };
  }
  // The quick check (studio-check.mjs --quick) on a spec that is not a revision yet. Resolves { ok, ms, lines, said }.
  function runQuick(spec, label) {
    const st = S(), k = "q" + Date.now() + randomBytes(3).toString("hex");
    const specPath = store.tmp(`${k}-spec.json`), outPath = store.tmp(`${k}-out.json`);
    writeFileSync(specPath, JSON.stringify(spec, null, 2));
    return new Promise((resolve) => {
      const child = spawn(process.execPath, ["scripts/studio/studio-check.mjs", "--quick", "--width", String(st.quickWidth), "--spec", specPath, "--out", outPath, "--revision", label],
        { cwd: st.platform, windowsHide: true, stdio: ["ignore", "ignore", "pipe"], env: childEnv() });
      let err = "", late = false;
      child.stderr.on("data", (d) => { err = (err + d).slice(-1000); });
      const timer = setTimeout(() => { late = true; killTree(child.pid); }, st.quickSeconds * 1000);
      const done = () => {
        clearTimeout(timer);
        let out = null; try { out = JSON.parse(readFileSync(outPath, "utf8")); } catch {}
        for (const f of [specPath, outPath]) rmSync(f, { force: true });
        const lines = (out?.lines || []).map(({ id, says, pass, detail, skipped }) => ({ id, says, pass, detail, ...(skipped ? { skipped } : {}) }));
        const red = lines.find((l) => !l.pass && !l.skipped);
        resolve({ ok: !late && !!out?.ok, ms: out?.ms ?? null, lines,
          said: late ? `The quick check took longer than ${st.quickSeconds} seconds and was stopped.` : !out ? `The quick check stopped before it finished${err ? `: ${err.trim().split("\n").pop().slice(0, 200)}` : "."}`
            : red ? `${red.says}: no.${red.detail ? ` ${red.detail}` : ""}` : null });
      };
      child.on("error", (e) => { err = e.message; done(); });
      child.on("exit", done);
    });
  }
  // Apply cards: all made on the latest revision, each touching a different part. The quick check runs on the result
  // first; only if it passes is the NEW revision written (never an old one changed) and the cards marked applied.
  // Every other open card is then judged against the new latest: stale or conflict.
  let applying = null;
  async function applyNow(siteId, ids, note = null) {
    if (applying) return { ok: false, said: `A change is already being applied (${applying}). One at a time.` };
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    const latest = latestOf(siteId), latestSpec = store.revision(siteId, latest)?.spec;
    const cards = ids.map((k) => store.card(siteId, Number(k)));
    if (!cards.length || cards.some((c) => !c)) return { ok: false, said: "There is no such card." };
    for (const c of cards) {
      if (!OPEN.has(c.status)) return { ok: false, said: `Card ${c.id} is ${c.status} already.` };
      const now = judgeCard(c, latest, latestSpec);
      if (now !== "proposed") {
        store.saveCard(siteId, { ...c, status: now, judged_at: new Date().toISOString() });
        return { ok: false, card: c.id, status: now, said: now === "stale"
          ? `Card ${c.id} was made on revision ${c.base}, and the site is at revision ${latest} now. Nothing was applied. Redo it on revision ${latest}.`
          : `Card ${c.id} was made on revision ${c.base}, and that wording has changed since. Nothing was applied. Look at both and choose.` };
      }
    }
    const keys = cards.filter((c) => c.patch.op === "copy").map((c) => `${c.patch.section}.${c.patch.field}`);
    if (new Set(keys).size !== keys.length) return { ok: false, said: "Two of these cards change the same words. Apply one, then the other comes back to redo." };
    const why = platformWhy(S());
    if (why) return { ok: false, said: `${why} Change it in Studio settings.` };
    applying = `${s.name}, revision ${latest + 1}`;
    try {
      let spec;
      try { spec = applyCards(latestSpec, cards, specOf(siteId)); } catch (e) { return { ok: false, said: e.message }; }
      const q = await runQuick(spec, `${siteId}/${latest + 1}`);
      const at = new Date().toISOString(), quick = { ok: q.ok, ms: q.ms, at, lines: q.lines, said: q.said };
      if (!q.ok) {
        for (const c of cards) if (c.patch.op === "copy") store.saveCard(siteId, { ...store.card(siteId, c.id), quick });
        return { ok: false, quick, said: `Not applied. The quick check found a problem: ${q.said}` };
      }
      const n = latest + 1;
      try {
        store.addRevision(siteId, { n, site: siteId, parent: latest, created_at: at, author: "you",
          note: note || cards.map((c) => `Card ${c.id}`).join(", "), cards: cards.map((c) => c.id), source: "change cards", spec_hash: hash(spec), quick, spec });
      } catch (e) {
        if (!(e instanceof Refused)) throw e;
        const L = latestOf(siteId); rejudge(siteId, L, store.revision(siteId, L).spec);
        return { ok: false, said: `The site moved on to revision ${L} while this was being checked. Nothing was applied. Look at the card again.` };
      }
      for (const c of cards) store.saveCard(siteId, { ...store.card(siteId, c.id), status: "applied", result: n, applied_at: at, quick });
      rejudge(siteId, n, spec, at);
      return { ok: true, n, quick, said: `Revision ${n} made. Quick check passed${q.ms ? ` in ${Math.max(1, Math.round(q.ms / 1000))} s` : ""}.` };
    } finally { applying = null; }
  }
  // Every open card against the new latest revision n (review S4 F2, F5): proposed, stale and conflict alike. A card
  // whose words the site already says has nothing left to do: it is binned with that reason.
  function rejudge(siteId, n, spec, at = new Date().toISOString()) {
    for (const c of store.cards(siteId)) {
      if (!OPEN.has(c.status)) continue;
      if (c.patch?.op === "copy" && (copyOf(spec, c.patch.section, c.patch.field) ?? "") === (c.patch.to ?? "")) {
        store.saveCard(siteId, { ...c, status: "binned", binned_at: at, why: `Revision ${n} already says this.` });
        continue;
      }
      const now = judgeCard(c, n, spec);
      if (now !== c.status) store.saveCard(siteId, { ...c, status: now, judged_at: at });
    }
  }
  // Undo is "go back to revision k": a card that copies k's spec, applied at once as a NEW revision. k stays as it was.
  async function goBack(siteId, k, base) {
    const latest = latestOf(siteId);
    if (!store.revision(siteId, k)) return { ok: false, said: "There is no such revision." };
    if (Number(base) !== latest) return { ok: false, said: `The site is at revision ${latest} now. Look again, then go back.` };
    if (k === latest) return { ok: false, said: `Revision ${k} is the one the site is on.` };
    const id = (store.cardNumbers(siteId).at(-1) || 0) + 1;
    store.saveCard(siteId, { id, site: siteId, base: latest, source: "undo", target: { scope: "site" }, patch: { op: "revert", to: k }, status: "proposed", created_at: new Date().toISOString() });
    const r = await applyNow(siteId, [id], `Back to revision ${k}`);
    if (!r.ok) store.saveCard(siteId, { ...store.card(siteId, id), status: "binned", binned_at: new Date().toISOString(), why: r.said });
    return r.ok ? { ...r, said: `Went back to revision ${k}, as revision ${r.n}. Revision ${k} is unchanged. ${r.said.replace(/^Revision \d+ made\. /, "")}` } : r;
  }
  function binCard(siteId, k) {
    const c = store.card(siteId, Number(k));
    if (!c) return { ok: false, said: "There is no such card." };
    if (!OPEN.has(c.status)) return { ok: false, said: `Card ${c.id} is ${c.status} already.` };
    store.saveCard(siteId, { ...c, status: "binned", binned_at: new Date().toISOString() });
    return { ok: true, said: `Card ${c.id} binned. Nothing changed on the site.` };
  }
  // A stale or conflicting card, made again on the latest revision with the same new wording. The old card stays.
  async function redoCard(siteId, k) {
    const c = store.card(siteId, Number(k)), latest = latestOf(siteId);
    if (!c || c.patch?.op !== "copy") return { ok: false, said: "There is no such card." };
    if (c.status !== "stale" && c.status !== "conflict") return { ok: false, said: `Card ${c.id} is ${c.status}, not out of date.` };
    const r = await newCard(siteId, { base: latest, section: c.patch.section, field: c.patch.field, text: c.patch.to });
    if (r.ok) store.saveCard(siteId, { ...store.card(siteId, c.id), status: "binned", redone_as: r.card, binned_at: new Date().toISOString() });
    return r.ok ? { ...r, said: `Card ${r.card} made on revision ${latest}, from card ${c.id}. Apply it to make revision ${latest + 1}.` } : r;
  }

  // ---------------------------------------------------------------- S5: talk to it (the AI jobs queue)
  // A request becomes a JOB (a file), so it outlives a page reload, a phone that drops off the tunnel and a Control
  // Room restart. One AI call at a time; the rest wait their turn, and the chat says so. The AI only PROPOSES: its
  // answer is read strictly (studio-ai.mjs readReply) and each wording is made a card by newCard, through the same
  // platform validator as a typed card. Nothing is applied. A request about a fact never reaches the AI.
  const PACK_DIR = path.join(HERE, "studio", "knowledge");
  const claudeCmd = process.env.STUDIO_CLAUDE_CMD || "claude";
  // every AI call goes through the engine setting (Claude, Codex, or auto); see runAI in studio-ai.mjs
  const runClaude = (o) => runAI({ ...o, engine: S().aiEngine, codexModel: S().chatgptModel });
  // TWO LANES (S6): the chat's requests and the looks' jobs (makers, gate checks, critics) each run one at a time, side
  // by side, so a set of looks taking ten minutes never makes a chat request wait. { id, pid, cancel } while one runs.
  const lanes = { chat: null, looks: null };
  const laneOf = (j) => (j.kind === "look" || j.kind === "critic" ? "looks" : "chat");
  let wake = null;        // the timer for the next waiting job
  let closed = false;     // after close() nothing more is written: a job cut off by the close is asked again at the next start
  const jobId = () => "j" + Date.now().toString(36) + randomBytes(4).toString("hex");
  const sayRoutes = (biz, routes) => `${routes.map((r) => r.what).join(" and ").replace(/^The /, "the ").replace(/^./, (c) => c.toUpperCase())} ${routes.length > 1 || /s$/.test(routes[0].what) ? "are" : "is"} kept in ${biz}'s dashboard, so the site never has its own copy. Change ${routes.length > 1 || /s$/.test(routes[0].what) ? "them" : "it"} there, and the site shows the change the next time it is opened.`;
  function ask(siteId, b) {
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    const base = latestOf(siteId); if (!base) return { ok: false, said: "This site has no revision to change." };
    const request = String(b.text ?? "").replace(/\s+/g, " ").trim();
    if (!request) return { ok: false, said: "Say or type what you want changed." };
    if (request.length > 1000) return { ok: false, said: "That is longer than 1000 letters. Say it in fewer words." };
    const spec = store.revision(siteId, base).spec;
    let target = null;
    if (b.target && typeof b.target === "object") {
      const sec = String(b.target.section || ""), field = b.target.field == null ? null : String(b.target.field);
      if (!(spec?.pages?.[0]?.sections || []).some((x) => x.id === sec) || (field && copyOf(spec, sec, field) === undefined)) return { ok: false, said: "That part is no longer on the site. Tap it again." };
      target = { section: sec, field };
    }
    const now = new Date().toISOString(), via = b.via === "voice" ? "voice" : b.via === "detailer" ? "detailer" : "typed";
    const job = { id: jobId(), site: siteId, base, request, via, from: target ? "tap" : "chat", target, created_at: now, cards: [], dashboard: [], refused: [] };
    const routes = factRoute(request);
    if (routes.length) {
      store.saveJob({ ...job, kind: "route", status: "done", dashboard: routes, said: sayRoutes(s.name, routes), finished_at: now });
      return { ok: true, job: job.id, said: "Change it in the dashboard. The chat says where." };
    }
    const all = store.jobs().filter((j) => laneOf(j) === "chat"), ahead = all.filter((j) => j.status === "queued" || j.status === "running").length, held = usageHold(all);
    store.saveJob({ ...job, kind: "interpret", status: "queued" });
    setImmediate(pump);
    if (held) return { ok: true, job: job.id, said: `Claude is out of its usage limit. Yours waits in line and is asked by itself in ${waitPhrase(held)}.` };
    return { ok: true, job: job.id, said: ahead ? `Asked. The AI is answering ${ahead === 1 ? "another request" : `${ahead} other requests`} first; yours is next${ahead > 1 ? " after those" : ""}.` : "Asked. The answer comes as change cards you apply or bin." };
  }
  // Is Claude marked out of its limit by the belt itself (state.json)? Then the job waits without spending a call.
  function beltSaysOut() {
    try { const sw = clearExpiredSwaps(JSON.parse(readFileSync(process.env.STUDIO_BELT_STATE || path.join(HERE, "state.json"), "utf8")).swaps || {}); return sw.claude ? Date.parse(sw.claude.until || "") || null : null; } catch { return null; }
  }
  // the time a waiting request will be asked again, while Claude is out of usage (null when nothing waits)
  const usageHold = (all, t = Date.now()) => all.filter((j) => j.status === "waiting").map((j) => Date.parse(j.wait_until)).filter((x) => x > t).sort((a, b) => a - b)[0] || null;
  function pump() {
    if (broken || closed) return;
    clearTimeout(wake); wake = null;
    const t = Date.now(), all = store.jobs();
    const later = all.filter((j) => j.status === "waiting").map((j) => Date.parse(j.wait_until)).filter((x) => x > t).sort((a, b) => a - b)[0];
    if (later) { wake = setTimeout(pump, Math.min(later - t + 500, 2 ** 31 - 1)); wake.unref?.(); }
    for (const lane of ["chat", "looks"]) {
      if (lanes[lane]) continue;
      const mine = all.filter((j) => laneOf(j) === lane);
      // a request whose wait is over goes first; while another still waits on the usage, nothing new is sent (it would
      // only be refused): the queue stays in line behind it
      const next = mine.find((j) => j.status === "waiting" && Date.parse(j.wait_until) <= t) || (usageHold(mine, t) ? null : mine.find((j) => j.status === "queued"));
      if (!next) continue;
      const me = lanes[lane] = { id: next.id, pid: null, cancel: false };
      (lane === "chat" ? runJob : runLookJob)(next, me).catch((e) => { log(`studio: AI job ${next.id}: ${e.message}`); try { const j = store.job(next.id); if (j && j.status === "running") store.saveJob({ ...j, status: "failed", said: `Something went wrong: ${e.message}`, finished_at: new Date().toISOString(), pid: null }); } catch {} })
        .finally(() => { if (lanes[lane] === me) lanes[lane] = null; setImmediate(pump); });
    }
  }
  const waitWords = (at) => `Claude is out of its usage limit. This waits and asks again by itself in ${waitPhrase(at)}.`;
  async function runJob(job, ai) {
    const st = S(), session = randomUUID();
    const out = beltSaysOut();
    if (out && out > Date.now()) { store.saveJob({ ...job, status: "waiting", wait_until: new Date(out).toISOString(), said: waitWords(out) }); return; }
    const save = (patch) => store.saveJob({ ...store.job(job.id), ...patch });
    save({ status: "running", started_at: new Date().toISOString(), session, model: st.aiModel, effort: st.aiEffort, tries: (job.tries || 0) + 1, said: null, wait_until: null });
    const fail = (said, extra = {}) => save({ status: "failed", said, finished_at: new Date().toISOString(), pid: null, ...extra });
    const why = platformWhy(st);
    if (why) return fail(`${why} Change it in Studio settings.`);
    const spec = store.revision(job.site, job.base)?.spec;
    if (!spec) return fail("The revision this was asked on is gone.");
    let types, pack;
    try { types = (await inPlatform(st.platform, {})).types; } catch (e) { return fail(`The platform copy could not be asked which parts are wording: ${e.message}`); }
    try { pack = loadPack(PACK_DIR); } catch (e) { return fail(`The Studio's knowledge pack could not be read: ${e.message}`); }
    const systemFile = store.tmp(`pack-${pack.hash}.md`);
    store.writeOnce(systemFile, pack.text);
    const recent = store.jobs().filter((j) => j.site === job.site && j.id !== job.id && j.status === "done" && j.created_at <= job.created_at).slice(-3);
    const prompt = buildPrompt({ business: store.site(job.site)?.name, spec, types, target: job.target, request: job.request, recent, quoted: job.via === "detailer" });
    if (ai.cancel) return save({ status: "cancelled", finished_at: new Date().toISOString() });
    const r = await runClaude({ cmd: claudeCmd, model: st.aiModel, effort: st.aiEffort, systemFile, session, prompt, ms: st.aiSeconds * 1000, kill: (pid) => killTree(pid),
      onStart: (pid) => { ai.pid = pid; save({ pid, pack: pack.hash }); } });
    if (closed) return;
    if (ai.cancel) return save({ status: "cancelled", finished_at: new Date().toISOString(), pid: null });
    if (r.limited) {
      const at = r.resetAt && r.resetAt > Date.now() ? r.resetAt : Date.now() + st.aiWaitMinutes * 60000;
      return save({ status: "waiting", wait_until: new Date(at).toISOString(), said: waitWords(at), pid: null });
    }
    if (!r.ok) return fail(r.said, { ms: r.ms });
    const read = readReply(r.text, spec, types);
    if (!read.ok) return fail(read.said, { ms: r.ms, usd: r.usd, rejected: read.why, raw: String(r.text).slice(0, 2000) });
    // each proposed wording becomes a card the same way a typed one does: a typed price is refused here, by the validator
    const made = [], refused = [...read.dropped];
    for (const c of read.cards) {
      const m = await newCard(job.site, { base: job.base, section: c.section, field: c.field, text: c.to }, { source: job.via === "detailer" ? "detailer-ai" : job.from, via: job.via, job: job.id, why: c.why, request: job.request });
      if (m.ok) made.push(m.card);
      else refused.push({ section: c.section, field: c.field, to: c.to, said: m.said === "That is what it says already." ? "The AI gave back the words this part already has, so there was nothing to change." : String(m.said).replace(/^Not saved\. /, "") });
    }
    save({ status: "done", finished_at: new Date().toISOString(), pid: null, ms: r.ms, usd: r.usd, said: read.say, cards: made, dashboard: read.dashboard, refused });
  }
  function cancelJob(id) {
    const j = store.job(id); if (!j) return { ok: false, said: "There is no such request." };
    if (j.status === "queued" || j.status === "waiting") { store.saveJob({ ...j, status: "cancelled", finished_at: new Date().toISOString() }); setImmediate(pump); return { ok: true, said: "Stopped. Nothing was made from it." }; }
    const ai = Object.values(lanes).find((x) => x?.id === id);
    if (j.status === "running" && ai) { ai.cancel = true; if (ai.pid) killTree(ai.pid); return { ok: true, said: "Stopping it. Nothing is made from it." }; }
    return { ok: false, said: `That request is ${j.status} already.` };
  }
  // Ask the same thing again, on the latest revision (a failed, stopped or finished request).
  function againJob(id) {
    const j = store.job(id); if (!j) return { ok: false, said: "There is no such request." };
    if (!["failed", "cancelled", "done"].includes(j.status)) return { ok: false, said: "That request is still being answered." };
    // the part it was about, if the latest revision still has it; else the request goes to the whole site
    const spec = store.revision(j.site, latestOf(j.site))?.spec, t = j.target;
    const still = t && (spec?.pages?.[0]?.sections || []).some((x) => x.id === t.section) && (!t.field || copyOf(spec, t.section, t.field) !== undefined);
    return ask(j.site, { text: j.request, via: j.via, target: still ? t : null });
  }
  // ---------------------------------------------------------------- S6: three looks and the critic
  // A SET is three looks (A, B, C) made from the site's latest revision, each in its own style family. Every look is
  // made, checked and critiqued by jobs in the looks lane:
  //   look    the maker (Claude, or ChatGPT for B and C when "mixed") writes the words and the order; the Studio builds
  //           the spec from the revision (bindings copied, never written), runs the platform's validator, the
  //           distinctness check against the set, then the referee's gates at three widths (studio-grade.mjs);
  //   critic  ChatGPT reads only the screenshots and answers the rubric (site-critic.mjs, read strictly).
  // A look that fails a gate, is too close to another, or scores under the critic's pass mark is remade by itself with
  // the problems listed, up to "Rounds per look". A look is SHOWN only through a version that passed every hard gate;
  // the shown version is the best-scoring one. Nothing here touches a binding or the site's revisions: only "Use this
  // look" makes a revision, through the same quick check as any change card.
  const LOOK_PACK = ["looks/maker.md", "looks/families.md", "copy.md", "conversion.md"];
  function lookPack() {
    const text = LOOK_PACK.map((f) => readFileSync(path.join(PACK_DIR, f), "utf8").trim()).join("\n\n---\n\n") + "\n";
    return { text, hash: createHash("sha256").update(text).digest("hex").slice(0, 12) };
  }
  const setId = () => "l" + Date.now().toString(36) + randomBytes(2).toString("hex");
  const currentSet = (siteId) => { const ids = store.lookSetIds(siteId); return ids.length ? store.lookSet(siteId, ids.at(-1)) : null; };
  const lookJobs = (siteId) => store.jobs().filter((j) => laneOf(j) === "looks" && j.site === siteId);
  const liveJob = (j) => j.status === "queued" || j.status === "running" || j.status === "waiting";
  // THE VISIBLE SET (review F2: distinctness is a property of what is SHOWN, not only of a version when it is made).
  // Letter by letter, each look shows its best version that passed every gate (the best critic score; a critique not
  // back yet counts below any score; ties go to the newer) AND is distinct from the looks already chosen. So a score
  // arriving later can never put two looks with the same order (or layout, or type) on screen together; a look whose
  // every passing version is too close to an earlier letter shows nothing and says so.
  const candidatesOf = (entry) => (entry?.versions || []).filter((v) => v.status === "shown").sort((a, b) => ((b.critic?.summary?.score ?? -1) - (a.critic?.summary?.score ?? -1)) || b.v - a.v);
  function visibleSet(set) {
    const out = {}, chosen = [];
    for (const L of LETTERS) {
      const pick = candidatesOf(set?.letters?.[L]).find((v) => !distinctness([...chosen, { letter: L, spec: v.spec }]).some((c) => c.letter === L)) || null;
      out[L] = pick; if (pick) chosen.push({ letter: L, spec: pick.spec });
    }
    return out;
  }
  function queueLook(siteId, set, letter, { family, round, fixes = [], by = "auto" }) {
    const now = new Date().toISOString();
    store.saveJob({ id: jobId(), kind: "look", site: siteId, set: set.id, letter, family, round, fixes, by, status: "queued", created_at: now, request: `Look ${letter}` });
  }
  async function makeLooks(siteId) {
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    const base = latestOf(siteId); if (!base) return { ok: false, said: "This site has no revision to make looks from." };
    if (lookJobs(siteId).some(liveJob)) return { ok: false, said: "Looks are already being made for this site. Wait for them, or stop them first." };
    const st = S(), why = platformWhy(st);
    if (why) return { ok: false, said: `${why} Change it in Studio settings.` };
    let fam;
    try { fam = (await inPlatform(st.platform, {}, 20000, childEnv())).families; } catch (e) { return { ok: false, said: `The platform copy could not be asked for its style families: ${e.message}` }; }
    if (!fam) return { ok: false, said: "The platform copy has no style families yet. Point Studio settings at a copy with the S6 renderer." };
    const keys = String(st.lookFamilies).split(",").filter((k) => fam[k]);
    if (keys.length !== 3) return { ok: false, said: "Studio settings name a style family the platform copy does not have." };
    const set = { id: setId(), site: siteId, base, made_at: new Date().toISOString(), families: Object.fromEntries(Object.entries(fam).map(([k, f]) => [k, f.name])), letters: Object.fromEntries(LETTERS.map((L, i) => [L, { family: keys[i], versions: [] }])) };
    store.saveLookSet(siteId, set);
    LETTERS.forEach((L, i) => queueLook(siteId, set, L, { family: keys[i], round: 1 }));
    setImmediate(pump);
    return { ok: true, set: set.id, said: `Making three looks from revision ${base}: ${keys.map((k) => fam[k].name).join(", ")}. Each one is checked by the gates and the critic before it shows.` };
  }
  // A new version of one look: the same family with the critic's fixes, or another family (the one the set lacks).
  async function remakeLook(siteId, b) {
    const set = store.lookSet(siteId, String(b.set || "")), L = String(b.letter || "");
    if (!set || !set.letters[L]) return { ok: false, said: "There is no such look." };
    if (lookJobs(siteId).some((j) => liveJob(j) && j.set === set.id && j.letter === L)) return { ok: false, said: `Look ${L} is already being made or checked.` };
    const entry = set.letters[L];
    let family = entry.family, fixes = [], fam = null;
    if (b.family) {
      try { fam = (await inPlatform(S().platform, {}, 20000, childEnv())).families; } catch (e) { return { ok: false, said: `The platform copy could not be asked for its style families: ${e.message}` }; }
      family = String(b.family);
      if (!fam?.[family]) return { ok: false, said: "There is no such style family." };
      if (Object.entries(set.letters).some(([k, e]) => k !== L && e.family === family)) return { ok: false, said: "Another look of this set already uses that family." };
      store.saveLookSet(siteId, { ...set, letters: { ...set.letters, [L]: { ...entry, family } } });
    } else {
      const last = visibleSet(set)[L] || entry.versions.at(-1);
      fixes = last?.critic?.summary?.fixes?.map((f) => `${f.what}: ${f.evidence}`) || last?.fixes_next || [];
    }
    queueLook(siteId, set, L, { family, round: (entry.versions.at(-1)?.round || 0) + 1, fixes, by: "you" });
    setImmediate(pump);
    return { ok: true, said: b.family ? `Making look ${L} again, as ${fam[family].name}.` : `Making look ${L} again${fixes.length ? " with the critic's fixes" : ""}.` };
  }
  function stopLooks(siteId) {
    let n = 0;
    for (const j of lookJobs(siteId).filter(liveJob)) { const r = cancelJob(j.id); if (r.ok) n++; }
    return n ? { ok: true, said: `Stopped ${n === 1 ? "one job" : `${n} jobs`}. Looks already made stay.` } : { ok: false, said: "Nothing is being made." };
  }
  // A child that runs the gates on one spec (studio-grade.mjs); killed on Stop, on its time limit, or at close.
  function runGrade(spec, dir, me, ms, session) {
    const st = S(), specPath = path.join(dir, "spec.json");
    writeFileSync(specPath, JSON.stringify(spec, null, 2));
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(HERE, "studio-grade.mjs"), "--platform", st.platform, "--spec", specPath, "--out", dir, "--job", session],
        { cwd: st.platform, windowsHide: true, stdio: ["ignore", "ignore", "pipe"], env: childEnv({ SITE_ACCEPTANCE_PLATFORM: st.platform }) });
      me.pid = child.pid;
      let err = "", late = false;
      child.stderr.on("data", (d) => { err = (err + d).slice(-1000); });
      const timer = setTimeout(() => { late = true; killTree(child.pid); }, ms);
      const done = () => {
        clearTimeout(timer); me.pid = null;
        let out = null; try { out = JSON.parse(readFileSync(path.join(dir, "gates.json"), "utf8")); } catch {}
        resolve(late ? { ok: false, error: `the gates took longer than ${Math.round(ms / 1000)} seconds` } : out || { ok: false, error: err.trim().split("\n").pop()?.slice(0, 200) || "the gate check stopped before it finished" });
      };
      child.on("error", (e) => { err = e.message; done(); });
      child.on("exit", done);
    });
  }
  // the critic's runner for site-critic.mjs: hidden, no shell, its pid kept so Stop and close can end it, a time limit
  const criticRunner = (me, ms) => (command, args, options = {}) => new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    me.pid = child.pid;
    let stdout = "", stderr = "";
    child.stdout.on("data", (b) => { stdout += b; }); child.stderr.on("data", (b) => { stderr = (stderr + b).slice(-6000); });
    const timer = setTimeout(() => { killTree(child.pid); reject(new Error(`The critic took longer than ${Math.round(ms / 1000)} seconds and was stopped.`)); }, ms);
    child.once("error", (e) => { clearTimeout(timer); reject(e); });
    child.once("close", (code) => { clearTimeout(timer); me.pid = null; code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${stdout.slice(-2000)}\n${stderr}`.trim() || `code ${code}`)); });
  });
  async function runLookJob(job, me) {
    const st = S(), session = randomUUID();
    const save = (patch) => store.saveJob({ ...store.job(job.id), ...patch });
    const end = (status, said, extra = {}) => save({ status, said, finished_at: new Date().toISOString(), pid: null, ...extra });
    const set0 = store.lookSet(job.site, job.set);
    if (!set0) return end("failed", "That set of looks is gone.");
    const usesClaude = job.kind === "look" ? !(st.lookMaker === "chatgpt" || (st.lookMaker === "mixed" && job.letter !== "A")) : st.critic === "claude";
    const out = usesClaude ? beltSaysOut() : null;
    if (out && out > Date.now()) return save({ status: "waiting", wait_until: new Date(out).toISOString(), said: waitWords(out) });
    save({ status: "running", started_at: new Date().toISOString(), session, tries: (job.tries || 0) + 1, said: null, wait_until: null });
    // every change to the set is read fresh and written whole (the page's taste presses do not touch it)
    const patchSet = (fn) => { const set = store.lookSet(job.site, job.set); fn(set); store.saveLookSet(job.site, set); return set; };
    const patchVersion = (v, fields) => patchSet((set) => { const e = set.letters[job.letter]; e.versions = e.versions.map((x) => (x.v === v ? { ...x, ...fields } : x)); });
    const why = platformWhy(st);
    if (why) return end("failed", `${why} Change it in Studio settings.`);
    const limited = (r, who) => { const at = r.resetAt && r.resetAt > Date.now() ? r.resetAt : Date.now() + st.aiWaitMinutes * 60000; save({ status: "waiting", wait_until: new Date(at).toISOString(), pid: null, said: `${who} is out of its usage limit. This waits and asks again by itself in ${waitPhrase(at)}.` }); };
    const again = (fixes, round) => { if (round < st.lookRounds) { const set = store.lookSet(job.site, job.set); queueLook(job.site, set, job.letter, { family: set.letters[job.letter].family, round: round + 1, fixes }); return true; } return false; };

    if (job.kind === "critic") {
      const ver = set0.letters[job.letter]?.versions.find((x) => x.v === job.v);
      if (!ver?.shots?.length) return end("failed", "That look has no screenshots to critique.");
      const model = st.critic === "claude" ? "claude" : "codex";
      const dir = store.lookDir(job.site, job.set, job.letter, job.v);
      let result;
      try {
        result = (await runCritics({ out: dir, screenshots: ver.views?.length ? ver.views : ver.shots, tag: session, runner: criticRunner(me, st.criticSeconds * 1000), models: [model], note: CRITIC_NOTE, codexModel: st.chatgptModel, codexJs: process.env.STUDIO_CODEX_CMD || null }))[0];
      } catch (e) {
        if (me.cancel) return end("cancelled", null);
        if (usageWords(e.message) || looksExhausted(e.message)) return limited({ resetAt: resetFromText(e.message) }, model === "codex" ? "ChatGPT" : "Claude");
        patchVersion(job.v, { critic: { model: model === "codex" ? st.chatgptModel : "claude", error: "The critic did not give an answer the Studio could read, so this look is shown without a critique." } });
        return end("failed", "The critic did not give an answer the Studio could read (asked twice).");
      }
      let summary;
      try { summary = criticSummary(result); } catch (e) {
        patchVersion(job.v, { critic: { model: model === "codex" ? st.chatgptModel : "claude", error: `The critic's answer was refused: ${e.message}.` } });
        return end("failed", `The critic's answer was refused: ${e.message}.`);
      }
      patchVersion(job.v, { critic: { model: model === "codex" ? st.chatgptModel : "claude", summary, answer: result, at: new Date().toISOString() } });
      // under the pass mark: remade with the three fixes, and the better of the two stays shown
      const fixes = summary.fixes.map((f) => `${f.what}: ${f.evidence}`);
      const more = !summary.pass && ver.by !== "you" && again(fixes, ver.round);
      return end("done", `${model === "codex" ? "ChatGPT" : "Claude"} scored look ${job.letter} ${summary.score} (pass mark ${summary.scoreMinimum}), ${summary.passes} of 12 questions.${more ? " It is being remade with the three fixes." : ""}`);
    }

    const base = store.revision(job.site, set0.base)?.spec;
    if (!base) return end("failed", `Revision ${set0.base}, which these looks are made from, is gone.`);
    let plat;
    try { plat = await inPlatform(st.platform, { data: store.site(job.site)?.business }, 30000, childEnv()); } catch (e) { return end("failed", `The platform copy could not be asked for its families: ${e.message}`); }
    const family = plat.families?.[job.family];
    if (!family) return end("failed", `The platform copy has no style family "${job.family}".`);
    family.key = job.family;
    // ---- the maker
    const mixed = st.lookMaker === "chatgpt" || (st.lookMaker === "mixed" && job.letter !== "A");
    // every order another look could show (any version that passed or is being checked), so the new one differs from all
    const others = LETTERS.filter((L) => L !== job.letter).flatMap((L) => (set0.letters[L].versions || []).filter((x) => x.spec && ["shown", "checking"].includes(x.status)).map((v) => ({ letter: L, name: v.family_name, order: (v.spec.pages[0].sections || []).map((x) => x.type) })))
      .filter((o, i, a) => a.findIndex((y) => y.letter === o.letter && y.order.join() === o.order.join()) === i);
    const s = store.site(job.site);
    const D = plat.data || {}, name = (x) => String(x).split(" · ")[0];
    const facts = plat.data ? { "how it works": D.mode, services: (D.services || []).map(name), "add-ons": (D.add_ons || []).map(name), "monthly plans": D.plans, photos: (D.gallery || []).map(name), reviews: D.reviews?.length ? [`${D.reviews.length} on the dashboard`] : [] } : null;
    const prompt = buildLookPrompt({ business: s?.name, area: s?.town, example: s?.kind === "example", letter: job.letter, family, baseSpec: base, types: plat.types, others, fixes: job.fixes || [], round: job.round, facts });
    const schema = lookSchema(base, plat.types);
    let pack;
    try { pack = lookPack(); } catch (e) { return end("failed", `The look maker's knowledge pack could not be read: ${e.message}`); }
    if (me.cancel) return end("cancelled", null);
    let r;
    if (mixed) r = await runCodex({ tag: session, model: st.chatgptModel, effort: st.aiEffort, prompt: `${pack.text}\n\n---\n\n${prompt}`, schema, ms: st.lookSeconds * 1000, kill: (pid) => killTree(pid), onStart: (pid) => { me.pid = pid; save({ pid }); } });
    else {
      const systemFile = store.tmp(`looks-${pack.hash}.md`);
      store.writeOnce(systemFile, pack.text);
      r = await runClaude({ cmd: claudeCmd, model: st.lookModel, effort: st.aiEffort, systemFile, session, prompt, schema, ms: st.lookSeconds * 1000, kill: (pid) => killTree(pid), onStart: (pid) => { me.pid = pid; save({ pid, pack: pack.hash }); } });
    }
    me.pid = null;
    if (closed) return;
    if (me.cancel) return end("cancelled", null);
    if (r.limited) return limited(r, mixed ? "ChatGPT" : "Claude");
    if (!r.ok) return end("failed", r.said, { ms: r.ms });
    const maker = mixed ? `chatgpt:${st.chatgptModel}` : `claude:${st.lookModel}`;
    const v = (store.lookSet(job.site, job.set).letters[job.letter].versions.at(-1)?.v || 0) + 1;
    const ver = { v, round: job.round, by: job.by, family: job.family, family_name: family.name, maker, made_at: new Date().toISOString(), ms: r.ms, usd: r.usd || 0, fixes: job.fixes || [], raw: String(r.text).slice(0, 6000) };
    const refuse = (said, extra = {}) => {
      const fixesNext = [said];
      patchSet((set) => { set.letters[job.letter].versions.push({ ...ver, ...extra, status: "refused", said, fixes_next: fixesNext }); });
      const more = job.by !== "you" && again(fixesNext, job.round);
      return end("done", `Look ${job.letter} was not made: ${said}${more ? " It is being remade." : ""}`);
    };
    const read = readLook(r.text, base, plat.types);
    if (!read.ok) return refuse(read.said);
    const spec = assembleLook(base, family, read);
    // belt and braces: a look holds exactly its revision's bindings (assembleLook cannot write one; this proves it)
    if (bindingSet(spec).join("|") !== bindingSet(base).join("|")) return refuse("Its dashboard links differ from the revision's.");
    const valid = await validate(spec);
    if (!valid.ok) return refuse(valid.said || `The platform's validator refused it: ${(valid.errors || []).map((e) => e.message).slice(0, 2).join(" ")}`, { spec, why: read.why });
    const set1 = store.lookSet(job.site, job.set);
    // against EVERY version of the other looks that is shown or being checked (review F2): a later score can then never
    // bring two clashing versions on screen; visibleSet() enforces it again at display time
    const clash = LETTERS.filter((L) => L !== job.letter).flatMap((L) => (set1.letters[L].versions || []).filter((y) => y.spec && ["shown", "checking"].includes(y.status)).map((y) => ({ letter: L, spec: y.spec })))
      .flatMap((o) => distinctness([o, { letter: job.letter, spec }]).filter((c) => c.letter === job.letter))
      .filter((c, i, a) => a.findIndex((y) => y.with === c.with && y.what.join() === c.what.join()) === i);
    if (clash.length) {
      const said = clash.map((c) => `It has ${c.what.join(" and ")} as look ${c.with}.`).join(" ");
      patchSet((set) => { set.letters[job.letter].versions.push({ ...ver, spec, why: read.why, status: "too_close", said, fixes_next: [`Use a section order different from look ${clash[0].with}'s.`] }); });
      const more = job.by !== "you" && again([`Use a section order different from look ${clash[0].with}'s.`], job.round);
      return end("done", `Look ${job.letter} is not shown: ${said}${more ? " It is being remade." : ""}`);
    }
    patchSet((set) => { set.letters[job.letter].versions.push({ ...ver, spec, spec_hash: hash(spec), why: read.why, hero: heroOf(spec), pairing: pairingOf(spec), order: read.order, status: "checking" }); });
    save({ said: `Checking look ${job.letter} against the gates at three widths…` });
    const dir = store.lookDir(job.site, job.set, job.letter, v);
    const g = await runGrade(spec, dir, me, st.gradeSeconds * 1000, session);
    if (me.cancel) { patchVersion(v, { status: "stopped", said: "Stopped while the gates ran." }); return end("cancelled", null); }
    const rows = gateRows(g), shots = g.ok ? (g.shots || []) : [], views = g.ok ? (g.gates?.G1?.measures?.views || []) : [];
    if (!g.ok || !gatesPass(rows)) {
      const red = rows.filter((x) => x.pass === false);
      const said = g.ok ? `It failed ${red.map((x) => `${x.key} ${x.name}`).join(", ")}.` : `The gates could not run: ${g.error}.`;
      const fixesNext = g.ok ? gateFixes(rows) : [];
      patchVersion(v, { status: "hidden", said, gates: rows, gate_ms: g.ms, shots, views, fixes_next: fixesNext });
      const more = g.ok && job.by !== "you" && again(fixesNext, job.round);
      return end("done", `Look ${job.letter} is hidden: ${said}${more ? " It is being remade with those problems listed." : ""}`);
    }
    patchVersion(v, { status: "shown", gates: rows, gate_ms: g.ms, shots, views });
    store.saveJob({ id: jobId(), kind: "critic", site: job.site, set: job.set, letter: job.letter, v, status: "queued", created_at: new Date().toISOString(), request: `Critique look ${job.letter}` });
    return end("done", `Look ${job.letter} passed every gate. The critic is next.`);
  }
  // "Use this look": a card that holds the look's whole spec, applied at once through the quick check, as a new
  // revision. Every older revision stays, so going back is one press.
  async function useLook(siteId, b) {
    const set = store.lookSet(siteId, String(b.set || "")), L = String(b.letter || "");
    const ver = set?.letters[L] && visibleSet(set)[L];
    if (!ver) return { ok: false, said: "That look is not ready to use." };
    const latest = latestOf(siteId), id = (store.cardNumbers(siteId).at(-1) || 0) + 1;
    store.saveCard(siteId, { id, site: siteId, base: latest, source: "look", target: { scope: "site" }, patch: { op: "look", set: set.id, letter: L, v: ver.v, family: ver.family_name, spec: ver.spec }, status: "proposed", created_at: new Date().toISOString() });
    const r = await applyNow(siteId, [id], `Look ${L} · ${ver.family_name}`);
    if (!r.ok) store.saveCard(siteId, { ...store.card(siteId, id), status: "binned", binned_at: new Date().toISOString(), why: r.said });
    return r.ok ? { ...r, said: `Look ${L} (${ver.family_name}) is now revision ${r.n}. ${r.said.replace(/^Revision \d+ made\. /, "")}` } : r;
  }
  // LOVE IT / NO: one line per press in the site's taste log; the last press for a look is what holds ("" clears).
  function tasteLook(siteId, b) {
    const set = store.lookSet(siteId, String(b.set || "")), L = String(b.letter || ""), verdict = b.verdict === "love" || b.verdict === "no" ? b.verdict : null;
    const ver = set?.letters[L] && visibleSet(set)[L];
    if (!ver) return { ok: false, said: "That look is not shown, so it cannot be judged yet." };
    store.addTaste(siteId, { at: new Date().toISOString(), set: set.id, letter: L, v: ver.v, family: ver.family, verdict, spec_hash: ver.spec_hash, hero: ver.hero, pairing: ver.pairing, order: ver.order,
      score: ver.critic?.summary?.score ?? null, shot: ver.shots?.find((x) => /390x844/.test(x)) || null });
    return { ok: true, said: verdict === "love" ? `Noted: you love look ${L}.` : verdict === "no" ? `Noted: look ${L} is a no.` : `Cleared your verdict on look ${L}.` };
  }
  const tasteOf = (siteId, setKey) => { const t = {}; for (const r of store.taste(siteId)) if (r.set === setKey) t[r.letter] = r.verdict; return t; };
  // What the page reads about the current set (no raw answers, no file paths but the screenshot names).
  function looksView(siteId) {
    const set = currentSet(siteId); if (!set) return null;
    const jobs = lookJobs(siteId).filter((j) => j.set === set.id), taste = tasteOf(siteId, set.id);
    const vis = visibleSet(set);
    const letters = LETTERS.map((L) => {
      const e = set.letters[L], shown = vis[L], last = e.versions.at(-1) || null, job = [...jobs].reverse().find((j) => j.letter === L && liveJob(j));
      const vv = (x) => x && { v: x.v, round: x.round, by: x.by, maker: x.maker, family: x.family, family_name: x.family_name, status: x.status, said: x.said || null, why: x.why || [], order: x.order || null, hero: x.hero, pairing: x.pairing,
        gates: x.gates || null, critic: x.critic ? { model: x.critic.model, summary: x.critic.summary || null, error: x.critic.error || null, at: x.critic.at || null } : null, shots: x.status === "shown" ? (x.shots || []).map((p) => path.basename(p)) : [], views: x.status === "shown" ? (x.views || []).map((p) => path.basename(p)) : [], made_at: x.made_at, fixes: x.fixes || [] };
      return { letter: L, family: e.family, shown: vv(shown), blocked: !shown && candidatesOf(e).length > 0, last: vv(last), versions: e.versions.length, job: job && { id: job.id, kind: job.kind, status: job.status, said: job.said || null, wait_until: job.wait_until || null, started_at: job.started_at || null },
        taste: taste[L] ?? null };
    });
    return { id: set.id, base: set.base, made_at: set.made_at, families: set.families || {}, letters, working: jobs.some(liveJob), failed: jobs.filter((j) => j.status === "failed").slice(-3).map((j) => ({ letter: j.letter, kind: j.kind, said: j.said })) };
  }
  // ---- S6 live data (screen 5): what the dashboard holds, and which part of the site shows each thing
  let dataCache = null;
  const DATA_ROWS = [
    ["services", "Services and prices", "Services & add-ons", ["service_group", "service"], "Add your services and prices."],
    ["add_ons", "Add-ons", "Services & add-ons", ["add_ons"], null],
    ["plans", "Monthly plans", "Monthly plans", ["plans"], null],
    ["sale", "The sale", "Promo codes & sale", ["sale"], null],
    ["gallery", "Photos", "Photo gallery", ["gallery", "gallery.best"], "Add photos of your work, before and after where you have them."],
    ["reviews", "Reviews", "Reviews", ["reviews.top"], "Add reviews from your customers, with where they came from."],
    ["hours", "Hours", "Hours & days off", ["hours.week"], "Set your opening hours."],
    ["area", "Area served", "Business info", ["area"], "Say which towns you serve."],
    ["phone", "Phone", "Business info", ["contact.phone"], "Add a phone number customers can call or text."],
    ["faq", "Questions and answers", "FAQ", ["faq"], null],
    ["pay", "How to pay", "How you get paid", ["pay"], "Say how customers can pay."],
  ];
  async function liveData(siteId) {
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    const n = latestOf(siteId), spec = n && store.revision(siteId, n)?.spec;
    if (!spec) return { ok: false, said: "This site has no revision yet." };
    const st = S(), why = platformWhy(st);
    if (why) return { ok: false, said: `${why} Change it in Studio settings.` };
    if (!dataCache || dataCache.platform !== st.platform || dataCache.business !== s.business || Date.now() - dataCache.at > 60000) {
      let r;
      try { r = await inPlatform(st.platform, { data: s.business }, 30000, childEnv()); } catch (e) { return { ok: false, said: `The test dashboard could not be read: ${e.message}` }; }
      if (!r.data) return { ok: false, said: "The test dashboard gave no data." };
      dataCache = { platform: st.platform, business: s.business, at: Date.now(), data: r.data };
    }
    const secs = spec.pages?.[0]?.sections || [], NAMES = { hero: "First screen", catalog: "Prices", proof: "Photos and reviews", visit: "Hours and contact", booking: "Booking" };
    const kindOf = (b) => /^[a-z_]+(?:\.[a-z]+)?/.exec(String(b).replace(/:.*/, ""))?.[0];
    const rows = DATA_ROWS.map(([key, what, place, kinds, todo]) => {
      const items = dataCache.data[key] || [];
      const where = [...new Set(secs.filter((x) => Object.values(x).some((v) => v?.bind && kinds.includes(kindOf(v.bind)))).map((x) => NAMES[x.type] || x.id))];
      const status = !items.length ? (todo ? "missing" : "none") : where.length ? "connected" : "unused";
      return { key, what, place, items, where, status, todo: status === "missing" ? todo : null };
    });
    return { ok: true, rev: n, at: new Date(dataCache.at).toISOString(), example: s.kind === "example", rows };
  }

  // ---------------------------------------------------------------- S7: the detailer in the loop
  // STUDIO-SPEC §1d, §5a, §5b. A LINK is how a detailer sees their site. It names ONE site and either ONE revision
  // ("review": use it, comment on it, say "I'm happy with it") or ONE set of looks ("choose": pick one). Its secret (32
  // random bytes) is made only when its email is APPROVED, and only its SHA-256 fingerprint is kept (review S7 F3): the
  // draft holds a placeholder, the approved email is shown to Andrew once, and nothing on disk can open the link. It
  // expires (Studio settings: "Detailer links last"; an unreadable date counts as expired) and can be cancelled.
  // Everything the detailer's page reads or writes goes through the LINK SERVER below, which answers only for the link
  // the secret names and never takes a site, revision or set from the request: one detailer's link can never show
  // another's site or comments.
  // A COMMENT is untrusted text. It becomes a change card "From <the business>" for Andrew and nothing else: it never
  // starts AI work. "Ask the AI to make this" is Andrew's own press, and the AI is told the words are quoted from the
  // detailer. An EMAIL is a draft Andrew can edit; Send only marks it approved ("would send"): nothing is sent yet.
  const sha = (t) => createHash("sha256").update(String(t)).digest("hex");
  const LINK_MARK = "{{link}}";   // where an email's link goes; it is filled only when the email is approved
  const linkState = (l, t = Date.now()) => (l.revoked_at ? "cancelled" : !l.hash ? "waiting" : !(Date.parse(l.expires_at) > t) ? "expired" : "active");
  let links = null;   // { server, port, url } while the link server runs
  const previewOrigin = () => { const p = store.previewPids(); return p?.previewPort ? `http://127.0.0.1:${p.previewPort}` : null; };
  const linkUrl = (token) => { if (cloud()) return `${S().previewSite.replace(/\/+$/, "")}/p/${token}`; const p = store.previewPids(); return `http://127.0.0.1:${p?.previewPort ?? S().previewPort}/site/p/${token}`; };
  // the platform's database when links are hosted (Studio settings: "Detailer links and website forms"), else null
  const cloud = () => { const c = cloudConfig(S(), REAL_REPO); return c && !c.missing ? c : null; };
  const longDate = (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  async function detailerFacts(site) {
    // the owner's address is not in the public profile; the Studio reads it from the business record (here the example seed)
    try { const r = await inPlatform(S().platform, {}, 30000, childEnv()); return { email: (r.businesses || []).find((b) => b.slug === site.business)?.email || "" }; } catch { return {}; }
  }
  const greet = (s) => `Hi ${s?.name ? `${s.name} team` : "there"},`;
  const signOff = () => `\n\n${S().emailSignOff}`;
  // a link waits for its email's approval; its secret does not exist yet
  function newLink(siteId, purpose, what) {
    const link = { id: "k" + Date.now().toString(36) + randomBytes(4).toString("hex"), hash: null, site: siteId, purpose, ...what, created_at: new Date().toISOString(), expires_at: null, revoked_at: null, thumbs: {} };
    return store.saveLink(link);
  }
  // Approval: the link's secret is made now, its fingerprint kept, the email filled in and returned ONCE (to be sent).
  function approve(siteId, e, by) {
    let body = e.body, url = null;
    if (e.link) {
      const l = store.links(siteId).find((x) => x.id === e.link);
      if (!l || l.revoked_at) throw new Refused("That email's link was cancelled. Make a new one.");
      const token = randomBytes(32).toString("base64url"), now = Date.now();
      const saved = store.saveLink({ ...l, hash: sha(token), expires_at: new Date(now + S().linkDays * 86400000).toISOString(), opened_for_email: e.id });
      if (cloud()) pushLink(saved).catch((err) => hostedFailed(saved, err));   // a failure is retried by the next sync
      url = linkUrl(token);
      body = body.split(LINK_MARK).join(url).split("{{until}}").join(longDate(new Date(now + S().linkDays * 86400000).toISOString()));
    }
    store.saveEmail(siteId, { ...e, status: "approved", approved_at: new Date().toISOString(), approved_by: by });
    return { body, url };
  }
  function draftEmail(siteId, e) {
    const d = store.saveEmail(siteId, { ...e, created_at: new Date().toISOString(), status: "draft" });
    // "Ask me before every email: No" approves as it drafts (and, once sending is real, sends without a look)
    if (S().askBeforeEmail === "no") { const r = approve(siteId, d, "setting"); return { ...store.email(siteId, d.id), shown: r }; }
    return d;
  }
  const until = "{{until}}";
  // "Send for review": a link to the latest revision, once its connection check has passed, and the email draft.
  async function linkForReview(siteId, kind = "review") {
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    const n = latestOf(siteId); if (!n) return { ok: false, said: "This site has no revision yet." };
    const c = store.checks(siteId).find((x) => x.rev === n);
    if (!c?.ok) return { ok: false, said: `Revision ${n} has not passed the connection check. Run it under Data first; a detailer only sees a revision that is proved connected.` };
    const link = newLink(siteId, "review", { revision: n });
    const f = await detailerFacts(s);
    const e = draftEmail(siteId, { kind: "review", link: link.id, to: f.email || "", subject: "Your site is ready to look at",
      body: `${greet(s)}\n\nYour new website is ready for you to look at:\n${LINK_MARK}\n\n${exampleData(s.business) ? "It works like the real site. For now it shows example prices, times and photos, not yours: the site that goes live reads your own dashboard." : "It works like the real site, with your own prices and times from your dashboard."} Nothing you do on it books anything.\n\nTap Comment, then tap anything you want changed and say what should change. When you are happy with it, press "I'm happy with it" at the bottom.\n\nThe link works until ${until}. If it stops working, reply to this email and we will send a new one.${signOff()}` });
    return { ok: true, said: `Made a review link for revision ${n} and drafted the email (number ${e.id}). ${e.status === "draft" ? "It waits for your Send." : "It is approved."}`, email: e.id, shown: e.shown };
  }
  // "Email these to the detailer": a chooser link for the current set of three looks.
  async function linkForLooks(siteId) {
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    const set = currentSet(siteId), vis = set && visibleSet(set);
    if (!set || !LETTERS.every((L) => vis[L])) return { ok: false, said: "All three looks must be shown before they can be sent. Make them, or remake the hidden one, under Looks." };
    const link = newLink(siteId, "choose", { set: set.id, versions: Object.fromEntries(LETTERS.map((L) => [L, vis[L].v])) });
    const f = await detailerFacts(s);
    const e = draftEmail(siteId, { kind: "looks", link: link.id, to: f.email || "", subject: "Your three looks are ready",
      body: `${greet(s)}\n\nWe made three looks for your new website. ${exampleData(s.business) ? "For now they show example prices, photos and reviews, not yours; the site that goes live reads your own dashboard" : "Each one uses your real prices, photos and reviews from your dashboard"}:\n\n${LETTERS.map((L) => `${L}: ${vis[L].family_name}`).join("\n")}\n\nPick your look:\n${LINK_MARK}\n\nOpen each one, then press "Pick this one" on the look you want us to continue with.\n\nThe link works until ${until}. If it stops working, reply to this email and we will send a new one.${signOff()}` });
    return { ok: true, said: `Made a link to pick a look and drafted the email (number ${e.id}). ${e.status === "draft" ? "It waits for your Send." : "It is approved."}`, email: e.id, shown: e.shown };
  }
  // What became of one comment, from what actually happened (review S7 F2): applied in a revision, set in the dashboard
  // (the AI found it is a fact), kept as it is (with Andrew's reason), or not changed yet.
  function outcome(siteId, c) {
    const k = store.cards(siteId).find((x) => x.source === "detailer" && x.comment === c.id);
    if (!k) return "not changed yet";
    if (k.status === "binned") return `kept as it is${k.why ? `: ${k.why}` : ""}`;
    const job = k.asked_job && store.job(k.asked_job);
    if (job?.kind === "route") return `this is set in your dashboard: ${(job.dashboard || []).map((d) => `Business > ${d.place}`).join(", ") || "Business"}. You can change it there`;
    const made = job ? store.cards(siteId).filter((x) => x.job === job.id) : [];
    const applied = made.filter((x) => x.status === "applied");
    if (applied.length) return `done (in revision ${Math.max(...applied.map((x) => x.result))})`;
    return "not changed yet";
  }
  // "We made your changes": this round's comments only (since the last such email), each with what happened, and a NEW
  // review link for the latest revision. Why a new link and not one that follows the newest revision: a link that
  // follows would show every later revision, checked or not, the moment it is made; a new link shows exactly the
  // revision Andrew chose to send, after its connection check, and the old one keeps showing what was commented on.
  async function draftChanges(siteId) {
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    const last = store.emails(siteId).find((e) => e.kind === "changes");
    const cs = store.comments(siteId).filter((c) => c.text && (!last || c.created_at > last.created_at));
    if (!cs.length) return { ok: false, said: last ? "No new comments from the detailer since the last “We made your changes” email." : "There are no comments from the detailer yet." };
    const n = latestOf(siteId), c = store.checks(siteId).find((x) => x.rev === n);
    if (!c?.ok) return { ok: false, said: `Revision ${n}, the one this email would show, has not passed the connection check. Run it under Data first.` };
    const link = newLink(siteId, "review", { revision: n });
    const f = await detailerFacts(s);
    const e = draftEmail(siteId, { kind: "changes", link: link.id, to: f.email || "", subject: "We made your changes",
      body: `${greet(s)}\n\nThank you for your comments. Here is what happened with each one:\n\n${cs.map((x) => `- "${x.text}": ${outcome(siteId, x)}.`).join("\n")}\n\nThe newest version is here:\n${LINK_MARK}\n\nIt works until ${until}.${signOff()}` });
    return { ok: true, said: `Drafted the email (number ${e.id}) with a new review link for revision ${n}.`, email: e.id, shown: e.shown };
  }
  // Andrew edits a draft before Send. A draft with a link must keep its {{link}}.
  function editEmail(siteId, b) {
    const e = store.email(siteId, Number(b.id)); if (!e) return { ok: false, said: "There is no such email." };
    if (e.status !== "draft") return { ok: false, said: "That email is approved already; it cannot be changed." };
    const subject = String(b.subject ?? e.subject).replace(/\s+/g, " ").trim(), body = String(b.body ?? e.body).replace(/\r\n/g, "\n").trim();
    if (!subject || subject.length > 150) return { ok: false, said: "The subject is one line, up to 150 letters." };
    if (!body || body.length > 5000) return { ok: false, said: "The email is empty or longer than 5000 letters." };
    if (e.link && !body.includes(LINK_MARK)) return { ok: false, said: `Keep ${LINK_MARK} in the email: that is where the private link goes when you press Send.` };
    store.saveEmail(siteId, { ...e, subject, body: body + "\n", edited_at: new Date().toISOString() });
    return { ok: true, said: "Saved." };
  }
  function sendEmail(siteId, k) {
    const e = store.email(siteId, Number(k)); if (!e) return { ok: false, said: "There is no such email." };
    if (e.status === "approved") return { ok: false, said: "That email is approved already." };
    if (!e.to) return { ok: false, said: "There is no email address for this business. Add one to its dashboard (Business info), then draft the email again." };
    let r;
    try { r = approve(siteId, e, "you"); } catch (err) { return { ok: false, said: err.message }; }
    return { ok: true, said: "Approved. In this version the Studio does not send email: below is exactly what it would send, shown this once.", shown: r };
  }
  async function revokeLink(siteId, id) {
    const l = store.links(siteId).find((x) => x.id === String(id)); if (!l) return { ok: false, said: "There is no such link." };
    if (l.revoked_at) return { ok: false, said: "That link is cancelled already." };
    const done = store.saveLink({ ...l, revoked_at: new Date().toISOString() });
    if (done.hosted) {
      try { await revokeOnline(done); } catch (e) { hostedFailed(done, e); return { ok: true, said: `Cancelled here. The online copy could not be told yet (${e.message}); the Studio keeps trying every ${S().syncSeconds} seconds.` }; }
    }
    return { ok: true, said: "Cancelled. The link no longer opens anything." };
  }
  // "Keep it as it is": a comment card is binned with a reason, which its "We made your changes" line gives.
  function keepComment(siteId, b) {
    const c = store.card(siteId, Number(b.id));
    if (!c || c.patch?.op !== "comment") return { ok: false, said: "That is not a comment from the detailer." };
    if (c.status !== "proposed") return { ok: false, said: `Card ${c.id} is ${c.status} already.` };
    const why = String(b.why ?? "").replace(/\s+/g, " ").trim();
    if (!why) return { ok: false, said: "Say in a few words why it stays as it is. The detailer reads it." };
    if (why.length > 200) return { ok: false, said: "Up to 200 letters." };
    store.saveCard(siteId, { ...c, status: "binned", binned_at: new Date().toISOString(), why });
    return { ok: true, said: `Card ${c.id} kept as it is.` };
  }
  // Andrew's press on a comment card: the comment's words go to the chat interpreter about that part, MARKED as quoted
  // from the detailer (the AI is told they are a request, not instructions). The only way a comment reaches the AI.
  function askFromComment(siteId, k) {
    const c = store.card(siteId, Number(k));
    if (!c || c.patch?.op !== "comment") return { ok: false, said: "That is not a comment from the detailer." };
    if (c.status !== "proposed") return { ok: false, said: `Card ${c.id} is ${c.status} already.` };
    if (c.asked_job) return { ok: false, said: "You asked the AI about this comment already." };
    const r = ask(siteId, { text: c.patch.text, via: "detailer", target: { section: c.target.section, field: null } });
    if (r.ok) store.saveCard(siteId, { ...c, asked_job: r.job, asked_at: new Date().toISOString() });
    return r.ok ? { ...r, said: `Asked the AI to make it. Its cards come under Cards. ${r.said}` } : r;
  }
  // What the detailer's page may see: this link's site, and only that. A spec, never a file path or another site.
  function linkView(link) {
    const s = store.site(link.site), base = { ok: true, purpose: link.purpose, business: s?.name || "", expires_at: link.expires_at };
    const mine = store.comments(link.site).filter((c) => c.link === link.id && c.text).map(({ id, section, part, at, text, created_at }) => ({ id, section, part, at, text, created_at }));
    if (link.purpose === "review") {
      const rev = store.revision(link.site, link.revision);
      if (!rev) return { ok: false, code: 410, said: "This version of the site is no longer available. Reply to our email and we will send a new link." };
      return { ...base, revision: link.revision, spec: rev.spec, comments: mine, thumbs: link.thumbs || {}, approved_at: link.approved_at || null, from_website: fromWebsite(s) };
    }
    return { ...base, looks: pickable(link).map((x) => ({ letter: x.letter, name: x.name, spec: x.spec })), picked: link.picked || null };
  }
  // the looks a choose link may show and pick: its own versions, and only while each still passed every gate
  function pickable(link) {
    const set = store.lookSet(link.site, link.set); if (!set) return [];
    return LETTERS.map((L) => { const v = set.letters[L]?.versions?.find((x) => x.v === link.versions?.[L] && x.status === "shown"); return v && { letter: L, name: v.family_name, spec: v.spec }; }).filter(Boolean);
  }
  const WORDS = { expired: "This link has expired. Reply to our email and we will send a new one.", cancelled: "This link has been cancelled. Reply to our email and we will send a new one.",
    waiting: "There is nothing at this link. Check that you opened the whole link.", none: "There is nothing at this link. Check that you opened the whole link." };
  function linkFor(token) {
    const l = /^[A-Za-z0-9_-]{43}$/.test(String(token)) ? store.linkByHash(sha(token)) : null;
    if (!l) return { error: 404, said: WORDS.none };
    const state = linkState(l);
    return state === "active" ? { link: l } : { error: state === "waiting" ? 404 : 410, said: WORDS[state] };
  }
  // POST bodies from the detailer: small JSON only. Too long: 413, in words, before the connection closes (review Low).
  const MAX_BODY = 8000;
  const readJson = (req) => new Promise((resolve) => {
    let b = "", over = false;
    req.on("data", (d) => { if (over) return; b += d; if (b.length > MAX_BODY) { over = true; resolve({ tooLong: true }); } });
    req.on("end", () => { if (over) return; try { resolve({ value: JSON.parse(b || "{}") }); } catch { resolve({ value: null }); } });
    req.on("error", () => { if (!over) resolve({ value: null }); });
  });
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const COMMENTS_PER_LINK = 300;
  function linkAct(link, what, b) {
    const s = store.site(link.site), spec = link.purpose === "review" ? store.revision(link.site, link.revision)?.spec : null;
    // "website": a comment on what was taken from their current website ("Not right"), when the link shows that list
    const sectionOk = (id) => typeof id === "string" && ((spec?.pages?.[0]?.sections || []).some((x) => x.id === id) || (id === "website" && what === "comment" && fromWebsite(s).length > 0));
    if (!isObj(b)) return { ok: false, code: 400, said: "That could not be read." };
    if (what === "comment" || what === "thumbs") {
      if (link.purpose !== "review") return { ok: false, code: 400, said: "This link is for picking a look." };
      if (!sectionOk(b.section)) return { ok: false, code: 400, said: "That part is not on this site." };
      if (what === "thumbs") {
        // ONE vote per part, replaced, kept on the link: votes never use up the room for comments (review S7 F4)
        const thumbs = b.thumbs === "up" || b.thumbs === "down" ? b.thumbs : null;
        const next = { ...(link.thumbs || {}) }; if (thumbs) next[b.section] = thumbs; else delete next[b.section];
        store.saveLink({ ...link, thumbs: next });
        return { ok: true, said: thumbs ? "Thank you." : "Your vote is removed." };
      }
      if (typeof b.text !== "string") return { ok: false, code: 400, said: "Say what should change." };
      const text = b.text.replace(/\s+/g, " ").trim().slice(0, 1000);
      if (!text) return { ok: false, code: 400, said: "Say what should change." };
      if (store.comments(link.site).filter((c) => c.link === link.id && c.text).length >= COMMENTS_PER_LINK) return { ok: false, code: 429, said: "This link has taken as many comments as it can. Reply to our email and we will read the rest there." };
      const part = typeof b.part === "string" && /^[a-z0-9_]{1,30}$/.test(b.part) ? b.part : null;
      const at = isObj(b.at) && Number.isFinite(+b.at.x) && Number.isFinite(+b.at.y) ? { x: Math.max(0, Math.min(1000, Math.round(+b.at.x))), y: Math.max(0, Math.min(100000, Math.round(+b.at.y))) } : null;
      const c = store.addComment(link.site, { site: link.site, link: link.id, revision: link.revision, section: b.section, part, at, text, created_at: new Date().toISOString() });
      // the comment becomes a card for Andrew. NOT an AI job: nothing here calls ask().
      const id = (store.cardNumbers(link.site).at(-1) || 0) + 1;
      store.saveCard(link.site, { id, site: link.site, base: latestOf(link.site), source: "detailer", from: s?.name || "the detailer", comment: c.id,
        target: { section: b.section, part, scope: "this" }, patch: { op: "comment", text, revision: link.revision }, status: "proposed", created_at: c.created_at });
      return { ok: true, id: c.id, card: id, said: "Thank you. Your comment is with us." };
    }
    if (what === "happy") {
      if (link.purpose !== "review") return { ok: false, code: 400, said: "This link is for picking a look." };
      store.saveLink({ ...link, approved_at: new Date().toISOString() });
      return { ok: true, said: "Thank you. We will be in touch before anything goes live." };
    }
    if (what === "pick") {
      if (link.purpose !== "choose") return { ok: false, code: 400, said: "This link is for looking at one site." };
      if (!pickable(link).some((x) => x.letter === b.letter)) return { ok: false, code: 400, said: "That is not one of the looks." };
      store.saveLink({ ...link, picked: b.letter, picked_at: new Date().toISOString() });
      return { ok: true, said: "Thank you. We will continue with that look." };
    }
    return { ok: false, code: 404, said: "Nothing here." };
  }
  // THE LINK SERVER: 127.0.0.1 only, its own port, five routes, only its own Host, writes only from the preview page.
  // Every request is answered inside one try: a malformed address is a 400, never a thrown error (review S7 F1).
  const LINK_PATH = /^\/p\/([A-Za-z0-9_-]{1,100})(?:\/(comment|thumbs|happy|pick))?$/;
  function linkHandler(req, res) {
    const origin = previewOrigin(), from = req.headers.origin;
    const send = (code, o) => { if (res.headersSent) return; res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-robots-tag": "noindex, nofollow",
      ...(origin && from === origin ? { "access-control-allow-origin": origin, "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET, POST", vary: "origin" } : {}) }); res.end(JSON.stringify(o)); };
    try {
      // only this server's own name (a page that rebinds another name to 127.0.0.1 gets nothing)
      const host = String(req.headers.host || "").toLowerCase();
      if (!links || (host !== `127.0.0.1:${links.port}` && host !== `localhost:${links.port}`)) return send(421, { ok: false, said: "Wrong address." });
      const m = LINK_PATH.exec(String(req.url || "").split("?")[0]);
      if (req.method === "OPTIONS") return send(204, {});
      if (!m) return send(String(req.url || "").startsWith("/p/") ? 404 : 400, { ok: false, said: WORDS.none });
      // a write must come from the preview page itself (its origin), never from another site the detailer has open
      if (req.method === "POST" && (!origin || from !== origin)) return send(403, { ok: false, said: "That did not come from the preview page." });
      const f = linkFor(m[1]);
      if (f.error) return send(f.error, { ok: false, said: f.said });
      if (req.method === "GET" && !m[2]) { const v = linkView(f.link); return send(v.ok ? 200 : v.code, v); }
      if (req.method !== "POST" || !m[2]) return send(405, { ok: false });
      readJson(req).then((b) => {
        try {
          if (b.tooLong) { send(413, { ok: false, said: "That is too long. Keep a comment to a few sentences." }); req.destroy(); return; }
          if (!isObj(b.value)) return send(400, { ok: false, said: "That could not be read." });
          const fresh = linkFor(m[1]);   // read again: it may have been cancelled meanwhile
          if (fresh.error) return send(fresh.error, { ok: false, said: fresh.said });
          const r = linkAct(fresh.link, m[2], b.value); send(r.ok ? 200 : r.code || 400, r);
        } catch (e) { send(500, { ok: false, said: "Something went wrong. Try again in a moment." }); log(`studio: link ${m[2]}: ${e.message}`); }
      });
    } catch (e) { send(400, { ok: false, said: "That address could not be read." }); }
  }
  async function startLinks() {
    if (links) return links;
    const st = S(), want = st.linkPort, p = (await portFree(want)) ? want : await anyFreePort();
    const server = http.createServer(linkHandler);
    server.on("clientError", (err, socket) => { try { socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"); } catch {} });
    await new Promise((ok, no) => { server.once("error", no); server.listen(p, "127.0.0.1", ok); });
    links = { server, port: p, url: `http://127.0.0.1:${p}` };
    return links;
  }
  const stopLinks = () => { try { links?.server.close(); links?.server.closeAllConnections?.(); } catch {} links = null; };
  function detailerView(siteId) {
    const t = Date.now(), cards = store.cards(siteId);
    return {
      links: store.links(siteId).map((l) => ({ id: l.id, purpose: l.purpose, revision: l.revision ?? null, set: l.set ?? null, created_at: l.created_at, expires_at: l.expires_at,
        state: linkState(l, t), approved_at: l.approved_at || null, picked: l.picked || null, picked_at: l.picked_at || null,
        comments: store.comments(siteId).filter((c) => c.link === l.id && c.text).length, thumbs: l.thumbs || {}, hosted: l.hosted || null, hosted_error: l.hosted_error || null })),
      hosted: cloud() ? { which: cloud().which, site: S().previewSite, said: cloudSaid, synced_at: syncedAt } : null,
      emails: store.emails(siteId).slice(0, 30),
      comments: cards.filter((c) => c.source === "detailer").length,
      server: links ? links.url : null,
    };
  }

  // ---------------------------------------------------------------- HOSTED LINKS (2026-11-13; studio-cloud.mjs)
  // What a hosted link's page shows: the same view the laptop's link server gives (linkView), and for a site still drawn
  // from EXAMPLE data, that example's profile (the platform has no example business). Sent when the link's email is
  // approved and after every pull; cancelled online at once. The detailer's actions come back as events and are applied
  // HERE with linkAct, the same rules as on the laptop, once each (the event ids are kept on the link).
  const profiles = new Map();
  async function exampleProfile(slug) {
    if (!exampleData(slug)) return null;
    if (!profiles.has(slug)) profiles.set(slug, (await inPlatform(S().platform, { profile: slug }, 30000, childEnv())).profile || null);
    return profiles.get(slug);
  }
  async function hostedView(link) {
    const v = linkView(link); if (!v.ok) return null;
    const { ok, ...view } = v, prof = await exampleProfile(store.site(link.site)?.business);
    return prof ? { ...view, profile: prof } : view;
  }
  const fresh = (l) => store.links(l.site).find((x) => x.id === l.id) || l;
  const hostedFailed = (l, e) => { try { store.saveLink({ ...fresh(l), hosted_error: String(e?.message || e).slice(0, 300) }); } catch {} log(`studio: hosted link ${l.id}: ${e?.message || e}`); };
  async function revokeOnline(l, c = cloud()) {
    if (!c) return;
    await rest(c, "PATCH", `preview_links?token_hash=eq.${l.hash}`, { revoked_at: l.revoked_at || new Date().toISOString(), updated_at: new Date().toISOString() }, "return=minimal");
    store.saveLink({ ...fresh(l), hosted_revoked: true, hosted_error: null });
  }
  async function pushLink(l, c = cloud()) {
    if (!c || !l.hash) return;
    const view = await hostedView(l);
    if (!view) return revokeOnline({ ...l, revoked_at: new Date().toISOString() }, c);   // what it showed is gone
    await rest(c, "POST", "preview_links?on_conflict=token_hash", { token_hash: l.hash, purpose: l.purpose, view, expires_at: l.expires_at, revoked_at: l.revoked_at || null, updated_at: new Date().toISOString() }, "resolution=merge-duplicates,return=minimal");
    store.saveLink({ ...fresh(l), hosted: c.which, hosted_at: new Date().toISOString(), hosted_error: null });
  }
  let syncing = false, syncTimer = null, cloudSaid = null, syncedAt = null;
  async function syncLinks() {
    const c = cloud(); if (!c || syncing || closed || broken) return;
    syncing = true;
    try {
      for (const s of store.sites()) for (const l0 of store.links(s.id)) {
        if (!l0.hash) continue;
        if (l0.revoked_at) { if (l0.hosted && !l0.hosted_revoked) await revokeOnline(l0, c); continue; }
        if (!l0.hosted || l0.hosted_error) await pushLink(l0, c);   // not there yet (or it failed): send it, then pull
        if (!(Date.parse(l0.expires_at) > Date.now() - 86400000)) continue;   // long expired: nothing more can come
        const evs = await rest(c, "GET", `preview_events?token_hash=eq.${l0.hash}&pulled_at=is.null&order=id&limit=200&select=id,kind,body`);
        if (!evs?.length) continue;
        for (const ev of evs) {
          const l = fresh(l0), done = l.pulled || [];
          if (done.includes(ev.id)) continue;
          const r = linkAct(l, ev.kind, ev.body && typeof ev.body === "object" ? ev.body : {});
          if (!r.ok) log(`studio: a hosted ${ev.kind} on link ${l.id} was not applied: ${r.said}`);
          store.saveLink({ ...fresh(l0), pulled: [...done, ev.id].slice(-1000) });
        }
        await rest(c, "PATCH", `preview_events?id=in.(${evs.map((e) => Number(e.id)).join(",")})`, { pulled_at: new Date().toISOString() }, "return=minimal");
        await pushLink(fresh(l0), c);
      }
      cloudSaid = null; syncedAt = new Date().toISOString();
    } catch (e) { cloudSaid = `The platform could not be reached: ${e.message}. Trying again in ${S().syncSeconds} seconds.`; log(`studio: hosted links: ${e.message}`); }
    finally { syncing = false; }
  }
  function startSync() {
    clearTimeout(syncTimer);
    if (closed || broken) return;
    syncTimer = setTimeout(async () => { await syncLinks(); startSync(); }, S().syncSeconds * 1000);
    syncTimer.unref?.();
  }

  // ---------------------------------------------------------------- WEBSITE AUTOFILL (2026-11-13; studio-cloud.mjs)
  // The sent website forms (read only), and for one of them: read the detailer's current website on this laptop, ask
  // Claude (no tools; it sees only the page text) for the answers to the questions they ticked "It is on my website" or
  // left empty, and keep only answers whose quote is really on the page the Studio fetched. Never written to the form.
  let formsCache = null, formsBusy = false;
  const reading = new Set();
  const UUIDISH = /^[0-9a-f-]{36}$/i;
  async function forms(force = false) {
    const c0 = cloudConfig(S(), REAL_REPO);
    if (!c0) return { on: false, rows: [] };
    if (c0.missing) return { on: true, said: c0.missing, rows: [] };
    if (!force && formsCache && Date.now() - formsCache.at < 60000) return formsCache.v;
    const rows = (await rest(c0, "GET", "site_intake?select=business_id,answers,submitted_at&submitted_at=not.is.null&order=submitted_at.desc&limit=50")).filter((r) => UUIDISH.test(r.business_id));
    const biz = rows.length ? await rest(c0, "GET", `businesses?select=id,slug,name&id=in.(${rows.map((r) => r.business_id).join(",")})`) : [];
    const v = { on: true, which: c0.which, rows: rows.map((r) => {
      const b = biz.find((x) => x.id === r.business_id); if (!b) return null;
      const a = r.answers || {}, res = store.form(b.slug);
      return { business: b.slug, id: b.id, name: b.name, sent_at: r.submitted_at, website: String(a.oldsite || "").trim() || null,
        ticked: Object.keys(a).filter((k) => /::web$/.test(k) && a[k] === true).map((k) => k.slice(0, -5)), read: res ? { ...res, running: reading.has(b.slug) } : null };
    }).filter(Boolean) };
    formsCache = { at: Date.now(), v };
    return v;
  }
  // for the polled home page: the last answer at once, a fresh one fetched in the background when it is old
  function formsNow() {
    const st = S(); if (st.cloud === "off") return { on: false, rows: [] };
    if ((!formsCache || Date.now() - formsCache.at > 60000) && !formsBusy) { formsBusy = true; forms(true).catch((e) => { formsCache = { at: Date.now(), v: { on: true, said: `The sent forms could not be read: ${e.message}`, rows: [] } }; }).finally(() => { formsBusy = false; }); }
    const v = formsCache?.v || { on: true, rows: [], loading: true };
    return { ...v, rows: v.rows.map((r) => { const res = store.form(r.business); return { ...r, read: res ? { ...res, running: reading.has(r.business) } : null }; }) };
  }
  async function readWebsite(slug) {
    const c = cloud(); if (!c) return { ok: false, said: "Turn on “Detailer links and website forms” in Studio settings first." };
    let f;
    try { f = (await forms(true)).rows.find((r) => r.business === slug); } catch (e) { return { ok: false, said: `The sent forms could not be read: ${e.message}` }; }
    if (!f) return { ok: false, said: "There is no sent form for that business." };
    if (!f.website) return { ok: false, said: `${f.name} did not give a current website on the form.` };
    if (reading.has(slug)) return { ok: false, said: `Already reading ${f.name}'s website.` };
    reading.add(slug);
    const started_at = new Date().toISOString();
    store.saveForm(slug, { ...(store.form(slug) || {}), status: "reading", website: f.website, started_at, said: null });
    (async () => {
      const st = S(), fail = (said) => store.saveForm(slug, { ...(store.form(slug) || {}), status: "failed", said, finished_at: new Date().toISOString() });
      try {
        const row = (await rest(c, "GET", `site_intake?business_id=eq.${f.id}&select=answers`))[0];
        const qs = wanted(row?.answers || {}, (await inPlatform(st.platform, { questions: true }, 30000, childEnv())).questions || []);
        if (!qs.length) return store.saveForm(slug, { status: "done", website: f.website, started_at, finished_at: new Date().toISOString(), questions: [], answers: {}, prices: [], dropped: [], pages: [], said: "Every question it could answer is already answered on the form." });
        const site = await readSite(f.website, { pages: st.readPages });
        if (!site.ok) return fail(site.said);
        const systemFile = store.tmp("autofill-system.md"); writeFileSync(systemFile, AUTOFILL_SYSTEM);
        const r = await runClaude({ cmd: claudeCmd, model: st.aiModel, effort: "low", systemFile, session: randomUUID(), schema: AUTOFILL_SCHEMA, prompt: autofillPrompt(qs, site.pages), ms: st.readSeconds * 1000, kill: (pid) => killTree(pid) });
        if (!r.ok) return fail(r.said);
        let reply; try { reply = JSON.parse(r.text); } catch { return fail("The AI's answer could not be read. Try again."); }
        const k = checkAutofill(reply, qs, site.pages);
        store.saveForm(slug, { status: "done", website: f.website, started_at, finished_at: new Date().toISOString(), pages: site.pages.map((p) => p.url),
          questions: qs.map(({ id, question, ticked }) => ({ id, question, ticked })), answers: k.answers, prices: k.prices, dropped: k.dropped,
          missing: qs.filter((q) => !k.answers[q.id]).map((q) => q.id), said: null });
      } catch (e) { fail(`Reading the website stopped: ${e.message}`); }
      finally { reading.delete(slug); }
    })();
    return { ok: true, said: `Reading ${f.name}'s website. It takes a minute or two.` };
  }
  // what the detailer's link shows from their current website: each answer, its question and its page
  function fromWebsite(site) {
    const f = site?.business && store.form(site.business);
    if (!f || f.status !== "done") return [];
    return Object.entries(f.answers || {}).map(([id, a]) => ({ id, question: f.questions?.find((q) => q.id === id)?.question || id, value: a.value, url: a.url }));
  }

  // ---------------------------------------------------------------- S8: publish, roll back, nightly parity
  // STUDIO-SPEC §1e, §2c layer 4, §6b releases, §6d. A RELEASE says which revision went live, with which renderer,
  // which connection check and which gate run, on which address, on whose yes. Releases are records: written once;
  // the only later change is "rolled back at". PUBLISH needs every one of: the detailer's "I'm happy with it" on this
  // exact revision (or Andrew's reason for going without it), a passed connection check and a passed gate run on this
  // exact revision (same spec), a paying business (an active website subscription), and a verified address. It is
  // Andrew's press, pressed twice ("Press again to publish …"): a detailer's site is customer-facing, so it is never
  // published by itself. ROLLBACK is one press back to the previous release; prices and bookings live in the
  // dashboard and are never touched. What is live is written to published.json, the table the platform app's
  // get_published_site_by_host reads (offline: the test data engine reads it; S8-planned-migration.sql is the real one).
  // NIGHTLY PARITY opens each live site on its own address and compares every bound value with the dashboard, then
  // asks the booking system for a quote (never a booking). A mismatch is an ALARM: on the Studio and for the watcher.
  const facts = new Map();   // site id → { at, biz } : what the dashboard says about the business (paying, address)
  async function bizFacts(site, fresh = false) {
    const c = facts.get(site.id);
    if (!fresh && c && Date.now() - c.at < 60000) return c.biz;
    let biz = null;
    try { biz = (await inPlatform(S().platform, {}, 30000, childEnv())).businesses?.find((b) => b.slug === site.business) || null; } catch {}
    facts.set(site.id, { at: Date.now(), biz });
    return biz;
  }
  // for the page (polled): the last answer, and a fresh one asked for in the background when it is old
  const factsNow = (site) => { const c = facts.get(site.id); if (!c || Date.now() - c.at > 60000) bizFacts(site).catch(() => {}); return c ? c.biz : undefined; };
  const exampleData = (slug) => /^example_/.test(String(slug || ""));
  const rendererVersion = () => { try { return String(spawnSync("git", ["-C", S().platform, "rev-parse", "--short", "HEAD"], { windowsHide: true, encoding: "utf8", timeout: 10000 }).stdout || "").trim() || "unknown"; } catch { return "unknown"; } };
  const liveOf = (siteId) => { const s = store.site(siteId); return s?.live_release ? store.releases(siteId).find((r) => r.n === s.live_release) || null : null; };
  let gating = null, parityRunning = null;   // { site, rev } while the gates run; { site } while a parity check runs
  // What stands between the latest revision and going live, row by row; `biz` undefined means "still reading".
  function publishRows(siteId, biz) {
    const s = store.site(siteId), n = latestOf(siteId), rev = n && store.revision(siteId, n), h = rev?.spec_hash;
    const link = store.links(siteId).find((l) => l.purpose === "review" && l.revision === n && l.approved_at);
    const over = s?.publish_override?.rev === n ? s.publish_override : null;
    const c = store.checks(siteId).find((x) => x.rev === n), g = store.gates(siteId).find((x) => x.rev === n);
    const live = liveOf(siteId), host = biz?.domains?.[0] || null;
    const rows = [
      { key: "approved", ok: !!(link || over), says: link ? `${s.name} said “I'm happy with it” on revision ${n} (${longDate(link.approved_at)})` : over ? `You publish revision ${n} without their yes: ${over.why}` : `Waiting for ${s?.name || "the detailer"}'s “I'm happy with it” on revision ${n}` },
      { key: "connection", ok: !!(c?.ok && c.spec_hash === h), says: c?.ok && c.spec_hash === h ? `Connection check passed on revision ${n}` : c && !c.ok ? `The connection check failed on revision ${n}. Fix it, then run it again under Data` : `Revision ${n} needs a passed connection check (under Data)` },
      { key: "gates", ok: !!(g?.ok && g.spec_hash === h), running: gating?.site === siteId, says: gating?.site === siteId ? `The gates are checking revision ${gating.rev}…` : g?.ok && g.spec_hash === h ? `Every gate passed on revision ${n}, at three widths` : g && !g.ok ? `Revision ${n} failed the gates: ${g.said}` : `Revision ${n} needs the gates run (layout, contrast, motion, at three widths)` },
      { key: "paying", ok: !!biz?.paying, says: biz === undefined ? "Reading the dashboard…" : biz?.paying ? `${s.name} pays for a website` : `${s?.name || "This business"} is not a paying website customer yet. Publishing waits until they are` },
      { key: "address", ok: !!host, says: biz === undefined ? "Reading the dashboard…" : host ? `Its address is verified: ${host}` : "It has no verified address yet (the dashboard's Business > Web address)" },
    ];
    const same = live && live.revision === n;
    return { rev: n, rows, host, ready: !!n && rows.every((r) => r.ok) && !same, same, example: exampleData(s?.business) };
  }
  function publishView(siteId) {
    const s = store.site(siteId), live = liveOf(siteId), all = store.releases(siteId), last = store.parities(siteId)[0] || null;
    return { ...publishRows(siteId, factsNow(s)), live: live && { ...live, url: live.hosts?.[0] ? `https://${live.hosts[0]}` : null },
      releases: all.slice(0, 20), override: s.publish_override || null,
      parity: last && { n: last.n, ok: last.ok, at: last.at, release: last.release, lines: last.lines, mismatches: last.mismatches || [], error: last.error || null },
      parityRunning: parityRunning?.site === siteId, alarm: alarmOf(siteId),
      canRollback: !!live && all.some((r) => r.n < live.n && !r.rolled_back_at), testUrl: testUrl(siteId) };
  }
  // where Andrew can open the live site in this preview: the address itself cannot resolve on his laptop, so the
  // preview's dev server answers it as that host (/site/live?as-host=, dev only; the tests use a real host mapping instead)
  const testUrl = (siteId) => { const live = liveOf(siteId), p = store.previewPids(); return live?.hosts?.[0] && p?.previewPort ? `http://127.0.0.1:${p.previewPort}/site/live?as-host=${encodeURIComponent(live.hosts[0])}` : null; };
  async function runGates(siteId) {
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    if (gating) return { ok: false, said: `The gates are already checking ${gating.site === siteId ? `revision ${gating.rev}` : "another site"}.` };
    const st = S(), why = platformWhy(st); if (why) return { ok: false, said: `${why} Change it in Studio settings.` };
    const n = latestOf(siteId), rev = n && store.revision(siteId, n); if (!rev) return { ok: false, said: "This site has no revision yet." };
    const me = { site: siteId, rev: n, pid: null };
    gating = me;
    const dir = store.tmp(`gates-${siteId}-${n}-${Date.now()}`); mkdirSync(dir, { recursive: true });
    (async () => {
      const t = Date.now(), g = await runGrade(rev.spec, dir, me, st.gradeSeconds * 1000, "publish-" + siteId);
      const rows = g.ok ? gateRows(g) : [], ok = !!g.ok && gatesPass(rows), red = rows.filter((x) => !x.pass);
      try { store.addGates(siteId, { rev: n, spec_hash: rev.spec_hash, ok, rows, ms: Date.now() - t, at: new Date().toISOString(),
        said: ok ? "every gate passed" : g.ok ? `it failed ${red.map((x) => `${x.key} ${x.name}`).join(", ")}` : `the gates could not run: ${g.error}` }); } catch (e) { log(`studio: gates for ${siteId}: ${e.message}`); }
      rmSync(dir, { recursive: true, force: true });
    })().finally(() => { if (gating === me) gating = null; });
    return { ok: true, said: `Running the gates on revision ${n} at three widths. It takes a minute or two.` };
  }
  // Andrew goes without the detailer's yes, for this revision only, with his reason (it is kept on the release).
  function overrideApproval(siteId, b) {
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    const n = latestOf(siteId), why = String(b.why ?? "").replace(/\s+/g, " ").trim();
    if (!why) return { ok: false, said: "Say in a few words why it goes live without their yes." };
    if (why.length > 200) return { ok: false, said: "Up to 200 letters." };
    store.saveSite({ ...s, publish_override: { rev: n, why, at: new Date().toISOString() } });
    return { ok: true, said: `Revision ${n} can go live without their yes. Your reason is kept with the release.` };
  }
  // published.json: every live release, by address. Rewritten whole after each publish or rollback.
  function writePublished() {
    const out = {};
    for (const s of store.sites()) {
      const r = liveOf(s.id); if (!r) continue;
      const rev = store.revision(s.id, r.revision);
      if (!rev || rev.spec_hash !== r.spec_hash) { log(`studio: ${s.id} release ${r.n} no longer matches revision ${r.revision}; not served`); continue; }
      for (const h of r.hosts || []) out[h] = { slug: s.business, site: s.id, release: r.n, revision: r.revision, spec: rev.spec };
    }
    store.savePublished(out);
    return out;
  }
  async function publish(siteId, b) {
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    if (b?.confirm !== true) return { ok: false, said: `Press again to publish ${s.name}.` };
    const biz = await bizFacts(s, true), p = publishRows(siteId, biz);
    if (p.same) return { ok: false, said: `Revision ${p.rev} is already live.` };
    if (!p.ready) return { ok: false, said: `Not published: ${p.rows.filter((r) => !r.ok).map((r) => r.says.replace(/\.$/, "")).join("; ")}.`, rows: p.rows };
    const n = p.rev, rev = store.revision(siteId, n), was = liveOf(siteId);
    const link = store.links(siteId).find((l) => l.purpose === "review" && l.revision === n && l.approved_at);
    const c = store.checks(siteId).find((x) => x.rev === n), g = store.gates(siteId).find((x) => x.rev === n);
    const r = store.addRelease(siteId, { site: siteId, revision: n, spec_hash: rev.spec_hash, renderer_version: rendererVersion(), check: c.id, gates: g.n,
      approval: link ? { by: "detailer", link: link.id, at: link.approved_at } : { by: "you", why: s.publish_override.why, at: s.publish_override.at },
      hosts: [p.host], published_at: new Date().toISOString(), published_by: "you", previous: was?.n ?? null, rolled_back_at: null });
    store.saveSite({ ...store.site(siteId), live_release: r.n, status: "live", live_at: r.published_at });
    writePublished();
    let mail = "";
    if (!store.emails(siteId).some((e) => e.kind === "live")) {
      const e = draftEmail(siteId, { kind: "live", to: biz?.email || "", subject: "Your site is live",
        body: `${greet(s)}\n\nYour new website is live:\nhttps://${p.host}\n\nIt reads your prices, hours, photos and reviews from your dashboard each time a customer opens it, so a change you make there shows on the site straight away. Bookings made on it come into your dashboard like any other.\n\nIf anything looks wrong, reply to this email.${signOff()}` });
      mail = ` “Your site is live” is drafted (email ${e.id}) and waits for your Send.`;
    }
    return { ok: true, said: `${s.name} is live at ${p.host}: release ${r.n}, revision ${n}.${mail}`, release: r.n };
  }
  async function rollback(siteId, b) {
    const s = store.site(siteId); if (!s) return { ok: false, said: "There is no such site." };
    const cur = liveOf(siteId); if (!cur) return { ok: false, said: "Nothing is live." };
    const prev = store.releases(siteId).filter((r) => r.n < cur.n && !r.rolled_back_at)[0];
    if (!prev) return { ok: false, said: "This is the first release; there is no earlier one to go back to." };
    if (b?.confirm !== true) return { ok: false, said: `Press again to go back to release ${prev.n} (revision ${prev.revision}).` };
    const rev = store.revision(siteId, prev.revision);
    if (!rev || rev.spec_hash !== prev.spec_hash) return { ok: false, said: `Release ${prev.n}'s revision no longer matches what went live, so it is not put back.` };
    store.saveRelease(siteId, { ...cur, rolled_back_at: new Date().toISOString() });
    store.saveSite({ ...store.site(siteId), live_release: prev.n, live_at: new Date().toISOString() });
    writePublished();
    return { ok: true, said: `Back to release ${prev.n} (revision ${prev.revision}). Prices, hours and bookings were not touched: they live in the dashboard.` };
  }
  // NIGHTLY PARITY: studio-parity.mjs in the platform copy (a child, hidden, with a time limit). One at a time.
  function runParity(siteId) {
    const s = store.site(siteId), live = liveOf(siteId);
    if (!s) return Promise.resolve({ ok: false, said: "There is no such site." });
    if (!live) return Promise.resolve({ ok: false, said: "Nothing is live, so there is nothing to compare." });
    if (parityRunning) return Promise.resolve({ ok: false, said: "A live-site check is already running." });
    const st = S(), out = store.tmp(`parity-${siteId}-${Date.now()}.json`), me = { site: siteId };
    parityRunning = me;
    const t = Date.now();
    const args = ["scripts/studio/studio-parity.mjs", "--host", live.hosts[0], "--out", out, ...(process.env.STUDIO_PARITY_BREAK ? [`--break=${process.env.STUDIO_PARITY_BREAK}`] : [])];
    return new Promise((resolve) => {
      const child = spawn(process.execPath, args, { cwd: st.platform, windowsHide: true, stdio: ["ignore", "ignore", "pipe"], env: childEnv({ STUDIO_PUBLISHED: store.publishedFile() }) });
      me.pid = child.pid;
      let err = "", late = false;
      child.stderr.on("data", (d) => { err = (err + d).slice(-1000); });
      const timer = setTimeout(() => { late = true; killTree(child.pid); }, st.paritySeconds * 1000);
      const done = () => {
        clearTimeout(timer);
        let r = null; try { r = JSON.parse(readFileSync(out, "utf8")); } catch {}
        rmSync(out, { force: true });
        const rec = store.addParity(siteId, { release: live.n, revision: live.revision, host: live.hosts[0], at: new Date().toISOString(), ms: Date.now() - t,
          ok: !!r?.ok && !late, lines: r?.lines || [], mismatches: r?.mismatches || [],
          error: late ? `it took longer than ${st.paritySeconds} seconds` : r ? null : err.trim().split("\n").pop()?.slice(0, 200) || "it stopped before it finished" });
        if (parityRunning === me) parityRunning = null;
        if (!rec.ok) log(`studio: ALARM ${alarmOf(siteId)?.what}`);
        resolve({ ok: true, said: rec.ok ? `${s.name}'s live site matches its dashboard.` : `Alarm: ${alarmOf(siteId)?.what}`, parity: rec.n, match: rec.ok });
      };
      child.on("error", (e) => { err = e.message; done(); });
      child.on("exit", done);
    });
  }
  // The alarm is the newest parity result while it is red. The next green check clears it.
  function alarmOf(siteId) {
    const s = store.site(siteId), p = store.parities(siteId)[0], live = liveOf(siteId);
    if (!s || !live || !p || p.ok) return null;
    const m = p.mismatches?.[0], bad = p.lines?.find((l) => !l.pass && !l.skipped);
    const what = m ? `${s.name}'s live site does not match its dashboard. ${m.label || m.from} on the site: ${m.why}` : `${s.name}'s live site could not be checked against its dashboard: ${bad ? `${bad.says}: ${bad.detail}` : p.error || "the check did not finish"}`;
    return { key: `parity:${siteId}:${p.n}`, site: siteId, at: p.at, what, mismatches: (p.mismatches || []).length };
  }
  const alarms = () => (broken ? [] : store.sites().map((s) => alarmOf(s.id)).filter(Boolean));
  // for the watcher (dashboard.mjs fixerProblems): it tells Andrew; a live customer site is never "fixed" by a job
  const watcherProblems = () => alarms().map((a) => ({ key: a.key, kind: "site-parity", source: "studio", act: "tell", what: a.what }));
  // Once a night, at "Nightly check of live sites, at", every live site is checked (not in a preview Control Room).
  let nightly = null;
  function startNightly() {
    if (nightly || broken) return;
    const tick = async () => {
      const st = S();
      if (new Date().getHours() !== st.parityHour) return;
      for (const s of store.sites()) {
        const last = store.parities(s.id)[0];
        if (liveOf(s.id) && (!last || Date.now() - Date.parse(last.at) > 20 * 3600000)) await runParity(s.id).catch((e) => log(`studio: parity ${s.id}: ${e.message}`));
      }
    };
    nightly = setInterval(() => { tick().catch(() => {}); }, 10 * 60000);
    nightly.unref?.();
  }

  const jobView = (j) => { const { raw, session, pid, ...v } = j; return v; };
  function aiState(siteId = null) {
    const all = store.jobs().filter((j) => laneOf(j) === "chat"), live = all.filter((j) => j.status === "queued" || j.status === "running" || j.status === "waiting");
    return { running: lanes.chat?.id || null, queued: live.filter((j) => j.status === "queued").length, waiting: live.filter((j) => j.status === "waiting").map((j) => j.wait_until).sort()[0] || null,
      jobs: siteId ? all.filter((j) => j.site === siteId).slice(-40).map(jobView) : undefined };
  }

  function sendFile(res, abs, type) {
    try { const buf = readFileSync(abs); res.writeHead(200, { "content-type": type, "cache-control": "no-store" }); res.end(buf); }
    catch { json(res, 404, { ok: false }); }
  }
  const reply = (res, p) => Promise.resolve(p).then((r) => json(res, 200, r), (e) => json(res, 200, { ok: false, said: e instanceof Refused ? e.message : "Something went wrong: " + e.message }));

  function handle(req, res, url) {
    const p = url.pathname, q = url.searchParams;
    if (STATIC[p]) return sendFile(res, path.join(HERE, STATIC[p][0]), STATIC[p][1]), true;
    if (broken) return json(res, p === "/api/studio/overview" ? 200 : 503, { ok: false, broken, said: broken }), true;
    if (req.method === "GET") {
      if (p === "/api/studio/overview") return reply(res, overview()), true;
      if (p === "/api/studio/site") { const d = siteDetail(q.get("id")); return json(res, d ? 200 : 404, d || { ok: false, said: "There is no such site." }), true; }
      if (p === "/api/studio/revision") { const r = store.revision(q.get("site"), Number(q.get("n"))); return json(res, r ? 200 : 404, r || { ok: false, said: "There is no such revision." }), true; }
      if (p === "/api/studio/check") {
        const c = store.check(q.get("site"), q.get("id"));
        if (c) return json(res, 200, c), true;
        if (running && running.id === q.get("id")) return json(res, 200, { id: running.id, site: running.site, rev: running.rev, started_at: running.started_at, lines: running.lines, running: true }), true;
        return json(res, 404, { ok: false, said: "There is no such check." }), true;
      }
      if (p === "/api/studio/card/spec") {   // what a card would make, for Preview (nothing is saved)
        const c = store.card(q.get("site"), Number(q.get("id"))), base = c && store.revision(c.site, c.base);
        if (!base) return json(res, 404, { ok: false, said: "There is no such card." }), true;
        try { return json(res, 200, { spec: applyCards(base.spec, [c], specOf(c.site)), base: c.base }), true; }
        catch (e) { return json(res, 200, { ok: false, said: e.message }), true; }
      }
      if (p === "/api/studio/data") return reply(res, liveData(q.get("site"))), true;
      if (p === "/api/studio/forms") return reply(res, forms(true).catch((e) => ({ ok: false, said: `The sent forms could not be read: ${e.message}` }))), true;
      if (p === "/api/studio/looks/shot") {
        const set = store.lookSet(q.get("site"), q.get("set")), L = q.get("letter"), v = Number(q.get("v")), w = { 390: "390x844", 768: "768x1024", 1440: "1440x900" }[q.get("w")];
        // review F6: only a version that passed every gate; a hidden one's pictures are never served
        const ver = set?.letters?.[L]?.versions?.find((x) => x.v === v && x.status === "shown");
        const view = /^(top|second|reviews|booking)$/.test(q.get("view") || "") ? `-${q.get("view")}` : "", name = `${w}${view}.png`;
        if (!ver || !w || ![...(ver.shots || []), ...(ver.views || [])].some((f) => path.basename(f) === name)) return json(res, 404, { ok: false }), true;
        return sendFile(res, path.join(store.lookDir(set.site, set.id, L, v), name), "image/png"), true;
      }
      if (p === "/api/studio/shot") {
        const c = store.check(q.get("site"), q.get("id"));
        if (!c?.shot) return json(res, 404, { ok: false }), true;
        return sendFile(res, store.shotPath(c.site, c.id), "image/png"), true;
      }
      return json(res, 404, { ok: false }), true;
    }
    if (req.method === "POST") {
      const post = (fn) => body(req, res, 20000, (b) => reply(res, fn(b || {})));
      if (p === "/api/studio/example") return post(() => addExample()), true;
      if (p === "/api/studio/revision") return post((b) => newRevision(String(b.site || ""))), true;
      if (p === "/api/studio/check") return post((b) => startCheck(String(b.site || ""), Number(b.rev))), true;
      if (p === "/api/studio/card") return post((b) => newCard(String(b.site || ""), b)), true;
      if (p === "/api/studio/card/apply") return post((b) => applyNow(String(b.site || ""), (Array.isArray(b.ids) ? b.ids : [b.id]).map(Number).slice(0, 20))), true;
      if (p === "/api/studio/card/bin") return post((b) => binCard(String(b.site || ""), b.id)), true;
      if (p === "/api/studio/card/redo") return post((b) => redoCard(String(b.site || ""), b.id)), true;
      if (p === "/api/studio/undo") return post((b) => goBack(String(b.site || ""), Number(b.to), b.base)), true;
      if (p === "/api/studio/ask") return post((b) => ask(String(b.site || ""), b)), true;
      if (p === "/api/studio/ask/cancel") return post((b) => cancelJob(String(b.id || ""))), true;
      if (p === "/api/studio/ask/again") return post((b) => againJob(String(b.id || ""))), true;
      if (p === "/api/studio/links/review") return post((b) => linkForReview(String(b.site || ""))), true;
      if (p === "/api/studio/links/looks") return post((b) => linkForLooks(String(b.site || ""))), true;
      if (p === "/api/studio/links/revoke") return post((b) => revokeLink(String(b.site || ""), b.id)), true;
      if (p === "/api/studio/forms/read") return post((b) => readWebsite(String(b.business || ""))), true;
      if (p === "/api/studio/links/sync") return post(async () => { await syncLinks(); return cloudSaid ? { ok: false, said: cloudSaid } : { ok: true, said: cloud() ? "Up to date with the platform." : "Links are on this laptop only." }; }), true;
      if (p === "/api/studio/emails/send") return post((b) => sendEmail(String(b.site || ""), b.id)), true;
      if (p === "/api/studio/emails/changes") return post((b) => draftChanges(String(b.site || ""))), true;
      if (p === "/api/studio/emails/edit") return post((b) => editEmail(String(b.site || ""), b)), true;
      if (p === "/api/studio/card/keep") return post((b) => keepComment(String(b.site || ""), b)), true;
      if (p === "/api/studio/card/ask") return post((b) => askFromComment(String(b.site || ""), b.id)), true;
      if (p === "/api/studio/publish/gates") return post((b) => runGates(String(b.site || ""))), true;
      if (p === "/api/studio/publish/override") return post((b) => overrideApproval(String(b.site || ""), b)), true;
      if (p === "/api/studio/publish") return post((b) => publish(String(b.site || ""), b)), true;
      if (p === "/api/studio/publish/rollback") return post((b) => rollback(String(b.site || ""), b)), true;
      if (p === "/api/studio/publish/parity") return post((b) => runParity(String(b.site || ""))), true;
      if (p === "/api/studio/looks/make") return post((b) => makeLooks(String(b.site || ""))), true;
      if (p === "/api/studio/looks/remake") return post((b) => remakeLook(String(b.site || ""), b)), true;
      if (p === "/api/studio/looks/use") return post((b) => useLook(String(b.site || ""), b)), true;
      if (p === "/api/studio/looks/taste") return post((b) => tasteLook(String(b.site || ""), b)), true;
      if (p === "/api/studio/looks/stop") return post((b) => stopLooks(String(b.site || ""))), true;
      if (p === "/api/studio/preview/start") return post(() => startPreview()), true;
      if (p === "/api/studio/preview/stop") return post(() => stopPreview()), true;
      if (p === "/api/studio/settings") return post((b) => {
        const r = cleanSettings(b.values, S());
        if (!r.ok) return r;
        store.saveSettings(Object.fromEntries(STUDIO_SETTINGS.map((s) => [s.key, r.values[s.key]])));
        return { ok: true, said: "Saved.", settings: S() };
      }), true;
      return json(res, 404, { ok: false }), true;
    }
    return json(res, 405, { ok: false }), true;
  }

  // ---------------------------------------------------------------- closing, and what an earlier Control Room left
  // When this Control Room closes (Ctrl+C, the window closed, a restart for an update), a running check and the
  // phone preview it started are stopped with it, and the check is written down as stopped. Synchronous: the
  // process's "exit" event allows nothing else.
  function closeNow() {
    if (broken) return;
    if (running) { running.stopped = true; killTreeSync(running.child?.pid); running.finish?.(); }
    // a running AI call stops with the Control Room; its job still says "running", so the next start asks it again
    closed = true;
    for (const ai of Object.values(lanes)) if (ai?.pid) killTreeSync(ai.pid);
    stopLinks();
    clearTimeout(syncTimer);
    clearTimeout(wake);
    clearInterval(nightly); killTreeSync(gating?.pid); killTreeSync(parityRunning?.pid);
    const pids = store.previewPids();
    if (pids && (mine.has(pids.site) || mine.has(pids.engine))) { killTreeSync(pids.site); killTreeSync(pids.engine); store.savePreviewPids(null); }
  }
  // A Control Room that was killed outright (Task Manager, the watchdog's hard stop) could not run closeNow. At the
  // next start: the phone preview it left is stopped only if it still answers with the id it was given, and a check
  // only if its pid is still a studio-check process; that check is written down as stopped.
  async function sweep() {
    if (broken) return;
    const left = store.runningCheck();
    if (left) {
      if (isCheckPid(left.pid)) killTreeSync(left.pid);
      try { store.addCheck(left.site, { id: left.id, site: left.site, rev: left.rev, spec_hash: left.spec_hash, started_at: left.started_at, finished_at: new Date().toISOString(),
        ok: false, passed: 0, failed: 0, skipped: 0, ms: null, error: "The Control Room was closed while this check ran, so it was stopped.", lines: [], shot: false }); } catch {}
      store.saveRunningCheck(null);
    }
    // AI jobs a closed Control Room left running: its own Claude call (known by the job's session id) is stopped, and
    // the job goes back in the queue, so a request is never lost to a restart.
    const leftJobs = store.jobs().filter((x) => x.status === "running" && !Object.values(lanes).some((l) => l?.id === x.id)), st = S();
    for (const pid of pidsHolding(leftJobs.map((j) => j.session))) killTreeSync(pid);
    for (const j of leftJobs) {
      if ((j.tries || 0) >= st.aiRestartTries) store.saveJob({ ...j, status: "failed", pid: null, finished_at: new Date().toISOString(),
        said: `The Control Room restarted ${j.tries} times while the AI was answering this, so it was stopped. Nothing was made. Ask again if you still want it.` });
      else store.saveJob({ ...j, status: "queued", pid: null, note: "The Control Room restarted while the AI was working on this, so it was asked again." });
    }
    // finished requests older than "Keep the chat for" are cleared (cards and revisions never are)
    const old = Date.now() - st.aiKeepDays * 86400000;
    for (const k of store.jobFiles().map((x) => x.slice(0, -5))) { const j = store.job(k); if (j && ["done", "failed", "cancelled"].includes(j.status) && Date.parse(j.finished_at || j.created_at) < old) store.dropJob(k); }
    setImmediate(pump);
    const pids = store.previewPids();
    if (pids && !starting && !mine.has(pids.site)) {
      const [a, b] = await Promise.all([isSite(pids.previewPort ?? S().previewPort, pids.id), isData(pids.enginePort ?? S().enginePort)]);
      await Promise.all([a === "ours" && killTree(pids.site), b === "ours" && killTree(pids.engine)]);
      store.savePreviewPids(null);
    }
  }
  const swept = sweep().catch((e) => log(`studio: start-up sweep: ${e.message}`));
  startSync();
  if (onExit) process.once("exit", closeNow);

  return { handle, store, swept, close: closeNow, startLinks, stopLinks, alarms, watcherProblems, startNightly, runParity, syncLinks, readWebsite, forms };
}
