// WHERE A SCRIPT'S SCREENSHOTS AND PREVIEWS GO — ROADMAP 97.63.
//
// Every default output folder used to be a new folder in the repo root
// (`shots/`, `shots-admin/`, `email-preview/`, `snapshots/` …), and an ad-hoc
// `OUT=shots-xyz` made one more each time: 51 `shots-*` folders by 2026-10-15.
// Now a RELATIVE name lands inside `artifacts/` (gitignored, where the graded
// checks already write), so the root stops growing. An absolute path, or one
// that already starts with `artifacts/`, is used as given.
import path from "node:path";

//
// Also passed through unchanged: an empty value (scripts use `if (SHOTS)` to mean
// "no pictures this run"), and `.manager-shots/…`, the reviewer hand-off folder
// docs/how-we-run.md names — ROADMAP 3.4's own instructions type that path.
export const outDir = (name) =>
  !name || path.isAbsolute(name) || /^(\.\/)?(artifacts|\.manager-shots)[\/]/.test(name)
    ? name
    : path.posix.join("artifacts", name);
