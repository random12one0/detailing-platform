// ROADMAP 97.28 - the backup retention rule as runnable code, shared by the
// proof and the test. The GitHub job (`docs/ops/backup.live-copy.yml`, "Prune
// old backups") implements this in shell; this module states the same rule as
// pure functions so both the committed shell proof
// (`scripts/backup-retention.mjs`, which cross-checks real bash output against
// this oracle tag by tag) and the belt-run test
// (`tests/backup-retention.test.mjs`, which calls it with must-work and
// must-refuse values) run one definition, not two copies.
//
// Semantics mirror the shell exactly: dates are zero-padded YYYY-MM-DD so
// lexicographic `>` is chronological and both cutoffs are strict (`>` keeps,
// `==` deletes). The monthly cutoff is the last day of the month three months
// back, stepped back from the month's 1st so long months cannot overflow
// (`May 31 -3 months` is March 3 in GNU date and would delete the March 1
// copy two months early; month starts minus whole months never overflow).
export const RETENTION_DAYS = 30; // Andrew 2026-10-19 (was 12 months before that date)
export const RETENTION_MONTHS = 3;

// "2027-10-17" minus N days, as %F. Mirrors `date -u -d "$TODAY -$n days"`.
export function dayCutoff(todayF, days = RETENTION_DAYS) {
  const [y, m, d] = todayF.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
}

// Last day of the month N months back from the run month, as %F. Mirrors the
// shell: first of this month, back N-1 months to a 1st (never overflows),
// then back one day. "2027-10-17" -> "2027-07-31"; "2027-05-31" -> "2027-02-28".
export function monthCutoff(todayF, months = RETENTION_MONTHS) {
  const [y, m] = todayF.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - months, 1));
  return new Date(first.getTime() - 86400000).toISOString().slice(0, 10);
}

// Which release tags the prune step deletes on `today`: every backup at or
// past the day cutoff goes, except the 1st-of-month copy while it is strictly
// newer than the monthly cutoff. Anything that is not a backup tag is kept.
export function pruneTags({ today, tags, days = RETENTION_DAYS, months = RETENTION_MONTHS }) {
  const cutoff = dayCutoff(today, days);
  const monthly = monthCutoff(today, months);
  const kept = [], deleted = [];
  for (const tag of tags) {
    const m = tag.match(/^backup-(\d{4}-\d{2}-\d{2})$/);
    if (!m) { kept.push(tag); continue; }
    const day = m[1];
    if (day > cutoff) { kept.push(tag); continue; }
    if (/-01$/.test(day) && day > monthly) { kept.push(tag); continue; }
    deleted.push(tag);
  }
  return { kept, deleted };
}

// The step's shell, exactly as GitHub would run it: the `run: |` block under
// "Prune old backups", dedented. Missing or duplicated step: throw, so the
// caller judges nothing on the wrong bytes (docs/gotchas.md 102 - a sabotage
// that silently fails to apply must never read as a pass).
export function pruneStep(text) {
  const src = text.replace(/\r\n/g, "\n");
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

// The sabotage mutations, each applied to the ACTUAL step bytes in memory.
// mutate() throws when the edit did not change the bytes, so a check can
// never go green on an unapplied sabotage (gotchas 102).
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

