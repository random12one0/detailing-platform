// WHERE A SCRIPT'S SCREENSHOTS AND PREVIEWS GO — ROADMAP 97.63.
//
// Every default output folder used to be a new folder in the repo root
// (`shots/`, `shots-admin/`, `email-preview/`, `snapshots/` …), and an ad-hoc
// `OUT=shots-xyz` made one more each time: 51 `shots-*` folders by 2026-10-15.
// Now a RELATIVE name lands inside `artifacts/` (gitignored, where the graded
// checks already write), so the root stops growing. An absolute path, or one
// that already starts with `artifacts/`, is used as given.
import path from "node:path";

export const outDir = (name) =>
  path.isAbsolute(name) || /^artifacts[\/]/.test(name) ? name : path.posix.join("artifacts", name);
