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
// `tests/backup-retention.test.mjs` and `scripts/backup-retention.mjs` share
// it, so both execute the same workflow bytes through the same fixture.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const norm = (t) => t.replace(/\r\n/g, "\n");

// The step's shell, exactly as GitHub would run it: the `run: |` block under
// "Prune old backups", dedented. Missing or duplicated step: throw, so the
// caller judges nothing on the wrong bytes (docs/gotchas.md 102 - a sabotage
// that silently fails to apply must never read as a pass).
export function pruneStep(text) {
  const src = norm(text);
  const lines = src.split("\n");
  const at = lines.reduce((acc, l, i) => (/^\s+- name: Prune old backups\s*$/.test(l) ? [...acc, i] : acc), []);
  if (at.length === 0) throw new Error("no 'Prune old backups' step found - refusing to judge");
  if (at.length > 1) throw new Error(`${at.length} 'Prune old backups' steps found - refusing to judge`);
  const run = lines.findIndex((l, i) => i > at[0] && /^\s+run: \|\s*$/.test(l));
  if (run < 0 || !lines[run + 1]?.trim()) throw new Error("Prune step has no run block - refusing to judge");
  const indent = lines[run + 1].match(/^ */)[0].length;
  const body = [];
  for (const l of lines.slice(run + 1)) {
    if (l.trim() && l.match(/^ */)[0].length < indent) break;
    body.push(l.slice(indent));
  }
  const shell = body.join("\n");
  if (!/gh release delete/.test(shell)) throw new Error("Prune step never calls gh release delete - refusing to judge");
  return shell;
}

// Exactly the deletion the step must perform, so a print-instead-of-delete
// mutation cannot satisfy an "it deleted" assertion.
export const DELETE_LINE = 'gh release delete "$TAG" --yes --cleanup-tag';

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

// The four sabotage mutations M3 requires, each applied to the ACTUAL step
// bytes in memory. landed() throws when the edit did not change the bytes,
// so a check can never go green on an unapplied sabotage (gotchas 102).
export const MUTATIONS = {
  // THE ORIGINAL DEFECT: the 1st of each month skipped unconditionally.
  forever: (s) => s.replace(
    /case "\$DAY" in \*-01\) if \[\[ "\$DAY" > "\$MONTHLY_CUTOFF" \]\]; then continue; fi ;; esac/,
    'case "$DAY" in *-01) continue ;; esac'),
  // THE TWELVE-MONTH MUTATION: the monthly exemption stretched to a year.
  twelve: (s) => s.replace("MONTH_START -2 months -1 day", "MONTH_START -11 months -1 day"),
  // DELETION REPLACED BY A PRINT: the step announces pruning but never deletes.
  noprint: (s) => s.replace(DELETE_LINE, 'echo "would prune $TAG"'),
  // A LISTING FAILURE THAT EXITS SUCCESSFULLY: the job reports success
  // having deleted nothing.
  exitzero: (s) => s.replace("exit 1", "exit 0"),
};

export function mutate(label, step) {
  const fn = MUTATIONS[label];
  if (!fn) throw new Error(`unknown mutation ${label}`);
  const next = fn(step);
  if (next === step) throw new Error(`mutation ${label} did not land - refusing to judge`);
  return next;
}

// The workflow's own numbers, read out of the step: nightly cutoff in days,
// and the monthly cutoff phrased as "first of this month, back N months, back
// a day" - the last day of the month N+1 back. Throws when either is absent,
// so deleting the guard or rewriting the period breaks extraction loudly.
export function workflowNumbers(step) {
  const days = Number(step.match(/CUTOFF=\$\(date -u -d "\$TODAY -(\d+) days"/)?.[1]);
  const back = Number(step.match(/MONTH_START -(\d+) months -1 day/)?.[1]);
  if (!Number.isInteger(days) || days <= 0) throw new Error("workflow states no nightly cutoff in days - refusing to judge");
  if (!Number.isInteger(back) || back < 0) throw new Error("workflow states no monthly cutoff - refusing to judge");
  return { days, months: back + 1 };
}
