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
