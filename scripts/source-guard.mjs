// DID SOMEBODY EDIT THE APP WHILE THIS CHECK WAS RUNNING?
//
// WHY THIS EXISTS, 2026-09-05. The dev server watches `app/src`, and
// `main.jsx` has a non-component export — so a cascading HMR update there
// fails Fast Refresh and Vite falls back to a **full page reload**. Any of
// this repo's four browser scripts is then driving a page that navigated out
// from under it, and what it reports is nonsense about whatever screen it
// happened to be on.
//
// THE COST IS NOT THE RELOAD, IT IS THE DIAGNOSIS. CLAUDE.md has warned about
// this since 2026-09-04 and it happened again the next day, which is the
// evidence that a paragraph in a 1,200-line file is not the fix. **And the
// failure does not look like a harness problem from the outside.**
// `sweep-widths.mjs` at least prints "Execution context was destroyed";
// `e2e-booking.mjs` prints a null receipt link and then five failures —
// *the booking is in the database — no id*, *stored as confirmed*, *charged
// what the price bar printed — row undefined* — **while the same run's email
// leg passes with the right subject and the right total.** That reads as a
// schema bug. It cost eight minutes and a control run to prove innocent.
//
// SO THE SCRIPT SAYS IT ITSELF. Ten seconds of walking a directory against a
// timestamp turns an eight-minute bisect into one line of output.
//
// IT IS A DIAGNOSIS, NOT A GATE. It never changes an exit code and never
// refuses to run: a source edit during a run is a mistake, not a defect, and a
// check that started failing for procedural reasons would be worse than the
// problem. It only ever adds a sentence explaining a failure somebody is
// already looking at.
//
// PORTABLE ON PURPOSE — plain Node, no hook, no assistant-side mechanism.
// CLAUDE.md requires that nothing load-bearing live in a tool-specific place,
// because the owner expects to move to a different coding agent.

import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ONLY `app/src`. That is what Vite watches and therefore the only tree whose
// mid-run edit can move the page. An edge function or a migration changing
// while a browser walk runs is harmless to the browser — it is a different
// mistake with a different symptom, and claiming it here would be noise.
const SRC = fileURLToPath(new URL("../app/src/", import.meta.url));

/**
 * Call ONCE, before the browser opens. Returns the check to call afterwards.
 *
 * A start TIMESTAMP rather than a snapshot of every file's mtime: the walk
 * then costs nothing until something has already gone wrong, and the only case
 * it cannot see — a file saved in the same millisecond the run began — is not
 * a case anybody needs.
 */
export function watchSource() {
  const startedAt = Date.now();
  return async function changedSince() {
    const hits = [];
    let names;
    try {
      names = await readdir(SRC, { recursive: true });
    } catch {
      return hits; // no app/src (a different checkout shape) — say nothing
    }
    for (const name of names) {
      const p = path.join(SRC, name);
      try {
        const s = await stat(p);
        if (s.isFile() && s.mtimeMs > startedAt) hits.push(name.replace(/\\/g, "/"));
      } catch { /* raced with a delete; not our problem to report */ }
    }
    return hits;
  };
}

/**
 * Print the diagnosis if there is one. Returns true if it printed.
 *
 * `clean` says whether the run otherwise passed, and it only changes the
 * WORDING — this is called unconditionally either way.
 *
 * **IT MUST RUN ON A PASS TOO, AND THAT WAS LEARNED BY BASELINING THIS FILE
 * RATHER THAN BY DESIGNING IT.** The first version fired only on failure, on
 * the reasoning that "a clean run needs no excuse". Baselining it — editing a
 * source file 25 seconds into a real run — killed that in one go: **the page
 * reloaded and the run still finished with zero geometry problems and printed
 * `clean`**, so the guard said nothing at all on a run whose result nobody
 * should trust.
 *
 * That is the whole argument, and it needs no stronger claim than that. **A
 * mid-run reload does not reliably FAIL a run** — the geometry checks ask
 * whether anything is off its edge, and a screen that never opened has no
 * edges to be off. So the damage is not a red run; it is a green one that
 * measured less than it says.
 *
 * *(An earlier draft of this comment claimed the baseline run visibly lost two
 * states to the reload. It did not — the two lines cited (`job record ·
 * tomorrow`, "no tomorrow to open") appear in an unedited run at the same hour
 * and are the demo's trading day, not the reload. Corrected rather than
 * deleted, because reading damage into an ordinary line is the exact mistake
 * this file exists to stop somebody making.)*
 *
 * **A clean run is when this matters MOST**, because a failure at least makes
 * somebody look. A false `clean` is this repo's oldest and most expensive
 * failure mode wearing a green tick.
 */
export async function reportSourceMoved(changedSince, clean = false) {
  const hits = await changedSince();
  if (!hits.length) return false;
  const shown = hits.slice(0, 6).join(", ");
  console.error(
    `\n  ⚠ A SOURCE FILE CHANGED WHILE THIS RUN WAS IN FLIGHT.\n`
    + (clean
      ? `    THIS RUN'S RESULT IS NOT TRUSTWORTHY, INCLUDING THE CLEAN ONE.\n`
        + `    Re-run it. A reload mid-walk makes states quietly fail to open, and\n`
        + `    a state that never opened has no geometry to be wrong — so it reads\n`
        + `    as a pass. Do not sign anything off on this run.\n`
      : `    Read this before debugging anything above: the failures are very\n`
        + `    likely this rather than a defect.\n`)
    + `    Vite reloads the page on any edit under app/src (main.jsx has a\n`
    + `    non-component export, so Fast Refresh falls back to a full reload),\n`
    + `    and this script was then driving a page that navigated out from\n`
    + `    under it.\n`
    + `      changed: ${shown}${hits.length > 6 ? ` (+${hits.length - 6} more)` : ""}\n`
    + `      confirm: look for "page reload src/main.jsx" in the Vite log\n`
    + `      fix:     re-run with nothing else editing the tree. Background the\n`
    + `               check and write PROSE while it runs, never source.`,
  );
  return true;
}
