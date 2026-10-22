// ROADMAP 97.28 - run the ACTUAL "Prune old backups" shell from
// `docs/ops/backup.live-copy.yml` for real, with `gh` stubbed at the command
// boundary. No network, no GitHub, nothing deleted anywhere real.
//
// The stub is a shell FUNCTION defined in front of the step, so no real `gh`
// can ever be reached whatever is on PATH. It serves a declared release-tag
// population from $FIXTURE_TAGS, records every invocation to $LEDGER, and can
// fail the listing or one deletion on request. Node asserts on the LEDGER
// (real delete calls with their exact flags), never on the step's own
// "pruning ..." echoes - printing an intention is not deleting.
//
// Side-effect free: importing this module writes nothing and runs nothing.
// `scripts/backup-retention.mjs` (the allowed proof runner) executes the
// real shell through this fixture. The pure rule, step parsing and
// mutations live in `./retentionRule.mjs`, which the belt-run test uses,
// so no test imports a subprocess-bearing module; this module re-exports
// them for compatibility.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
export { pruneStep, DELETE_LINE, MUTATIONS, mutate, workflowNumbers } from "./retentionRule.mjs";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const norm = (t) => t.replace(/\r\n/g, "\n");

// Where bash lives. Throws (never falls back to a non-shell) when none works.
export function findBash() {
  const probe = (cmd) => {
    try {
      const r = spawnSync(cmd, ["-c", "echo ok"], { encoding: "utf8" });
      return r.status === 0 && r.stdout.trim() === "ok" ? cmd : null;
    } catch { return null; }
  };
  return probe("bash")
    || (process.platform === "win32" && existsSync("C:\\Program Files\\Git\\bin\\bash.exe")
      ? "C:\\Program Files\\Git\\bin\\bash.exe" : null)
    || (() => { throw new Error("no bash on PATH (and no Git-for-Windows bash) - refusing to judge without the real shell"); })();
}

// Prove the shell's `date -u -d` arithmetic is GNU date, not BSD date: BSD
// `date -d` fails, and silently judging with it would test nothing.
export function checkGnuDate(bash) {
  const r = spawnSync(bash, ["-c", 'date -u -d "2000-01-05 -30 days" +%F'], { encoding: "utf8" });
  const got = (r.stdout || "").trim();
  if (r.status === 0 && got === "1999-12-06") return { ok: true, detail: got };
  return { ok: false, detail: `status ${r.status}: ${(r.stdout || "") + (r.stderr || "")}`.trim() || String(r.error || "no output") };
}

// Run one prune: today + the release population the step sees. listOk=false
// makes `gh release list` fail; failDeleteTag makes that deletion fail AFTER
// it is recorded, so the ledger shows the attempt and the exit is nonzero.
export function runPrune({ bash, step, today, tags, listOk = true, failDeleteTag = null }) {
  // PRUNE_TMPDIR overrides os.tmpdir() where the default temp root is not
  // writable (a locked-down shell); the belt's own run leaves it unset. The
  // scratch parent is created; each run gets its own directory under it. When
  // the system temp denies us, fall back to a git-ignored folder in the repo
  // rather than judging nothing (the fallback is still a real directory the
  // real shell runs in; nothing about the step changes).
  let base = process.env.PRUNE_TMPDIR || tmpdir();
  try {
    mkdirSync(base, { recursive: true });
  } catch {
    base = join(REPO_ROOT, ".tmp-97.28", "prune-tmp");
    mkdirSync(base, { recursive: true });
  }
  const dir = mkdtempSync(join(base, "prune-97-28-"));
  const slash = (p) => p.replace(/\\/g, "/");
  const ledger = join(dir, "ledger.txt");
  const fixtureFile = join(dir, "fixture-tags.txt");
  writeFileSync(ledger, "");
  writeFileSync(fixtureFile, tags.join("\n") + "\n");
  const stub = `gh() {
  if [ "$1 $2" = "release list" ]; then
    if [ "$FIXTURE_LIST_OK" = "1" ]; then
      echo "LIST ok" >> "$LEDGER"
      cat "$FIXTURE_FILE"
      return 0
    fi
    echo "LIST fail" >> "$LEDGER"
    echo "gh: API failed" >&2
    return 1
  fi
  if [ "$1 $2" = "release delete" ]; then
    echo "DELETE $3 $4 $5" >> "$LEDGER"
    if [ -n "$FAIL_DELETE_TAG" ] && [ "$3" = "$FAIL_DELETE_TAG" ]; then
      echo "gh: delete failed for $3" >&2
      return 1
    fi
    return 0
  fi
  echo "UNEXPECTED gh $*" >> "$LEDGER"
  echo "UNEXPECTED gh $*" >&2
  return 99
}
`;
  const script = join(dir, "step.sh");
  writeFileSync(script, stub + step + "\n", "utf8");
  const r = spawnSync(bash, [slash(script)], {
    encoding: "utf8",
    cwd: dir,
    env: {
      ...process.env,
      TODAY: today,
      FIXTURE_FILE: slash(fixtureFile),
      FIXTURE_LIST_OK: listOk ? "1" : "0",
      FAIL_DELETE_TAG: failDeleteTag || "",
      LEDGER: slash(ledger),
    },
  });
  const ledgerLines = norm(readFileSync(ledger, "utf8")).split("\n").filter(Boolean);
  return {
    status: r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
    error: r.error ? String(r.error) : "",
    ledger: ledgerLines,
    lists: ledgerLines.filter((l) => l.startsWith("LIST ")),
    deletes: ledgerLines.filter((l) => l.startsWith("DELETE ")),
    unexpected: ledgerLines.filter((l) => l.startsWith("UNEXPECTED ")),
  };
}

