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
//
// A relative path that climbs out of its folder is refused with a throw, never
// quietly rewritten: `../shots` used to become `shots` and `artifacts/../shots`
// passed through, both landing in the repo root (review of 97.63).
const KEPT = /^(artifacts|\.manager-shots)\//;
export const outDir = (name) => {
  if (!name || path.isAbsolute(name)) return name;
  const clean = path.posix.normalize(name.replace(/\\/g, "/"));
  if (clean === ".." || clean.startsWith("../")) throw new Error(`outDir: "${name}" climbs out of the output folder`);
  if (/^(\.\/)?(artifacts|\.manager-shots)[\/\\]/.test(name)) {
    if (!KEPT.test(clean)) throw new Error(`outDir: "${name}" climbs out of its folder`);
    return name;
  }
  return path.posix.join("artifacts", clean);
};
