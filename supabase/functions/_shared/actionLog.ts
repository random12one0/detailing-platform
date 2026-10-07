// ROADMAP 4.1 — THE AUDIT HISTORY: WHO CHANGED A JOB, WHAT IT WAS, AND WHEN.
//
// 4.1's done-when asks that each of seven consequential actions leave a row saying
// who did it, what it was before, and when, read off the row and never off the
// screen. Three of the seven are not this file's: suspend and restore already write
// `platform_admin_events` (`platform-admin`, with `{ from, to }`), and an owner
// invite is itself a row in `business_invites` that names `invited_by` and carries
// its `created_at`, with no earlier state to record. The other four are one function,
// `update-booking`: completing, cancelling and no-showing a job (a `status` change),
// waiving payment (a `payment_status` change) and deleting a job (`soft_delete`).
//
// IMPORT-FREE ON PURPOSE, like `photoDoor.ts`: Node 24 strips the types and runs it,
// so `tests/action-log.test.mjs` exercises the real code in memory with no Deno.
//
// **WHAT IS STORED IS THE CHANGED FIELD AND NOTHING ELSE.** `before` and `after` hold
// `{ status: "confirmed" }` and `{ status: "completed" }`, never the booking row. A
// booking carries a customer's name, phone and address, and an append-only table that
// copied them would be a copy `delete-customer` could never erase.
//
// **BEST-EFFORT, AND SAID SO.** A failed insert is logged and reported (`false`), and
// the job change it describes is not undone: refusing to complete a job in a driveway
// because a log row would not write is the wrong trade, and the write has already
// happened by the time this runs. The cost is a change with no row, which is why the
// caller surfaces `false` rather than swallowing it.

export interface Member { userId: string; businessId: string; role: string }

export interface ActionRow {
  business_id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  subject_table: "bookings";
  subject_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

/** The action a status change is, named for what the detailer did. */
export function statusAction(to: unknown): string {
  switch (String(to)) {
    case "completed": return "job.complete";
    case "cancelled": return "job.cancel";
    case "no_show": return "job.no_show";
    // Back to an ordinary state from completed, cancelled or no-show is an undo, and an
    // undo is the second half of the question this table exists to answer.
    case "confirmed": return "job.reopen";
    default: return "job.status";
  }
}

const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

/**
 * The rows one update-booking write owes: one per watched field whose value moved.
 * `current` is the row as read before the write and `after` the row the write returned.
 */
export function rowsFor(member: Member, bookingId: string, current: Record<string, unknown>, after: Record<string, unknown>): ActionRow[] {
  const base = {
    business_id: member.businessId,
    actor_id: member.userId,
    actor_role: member.role,
    subject_table: "bookings" as const,
    subject_id: bookingId,
  };
  const out: ActionRow[] = [];
  if (!same(current.status, after.status)) {
    out.push({ ...base, action: statusAction(after.status), before: { status: current.status ?? null }, after: { status: after.status ?? null } });
  }
  if (!same(current.payment_status, after.payment_status)) {
    out.push({
      ...base,
      action: String(after.payment_status) === "waived" ? "payment.waive" : "payment.set",
      before: { payment_status: current.payment_status ?? null },
      after: { payment_status: after.payment_status ?? null },
    });
  }
  if (!same(current.deleted_at, after.deleted_at)) {
    out.push({ ...base, action: after.deleted_at ? "job.delete" : "job.restore", before: { deleted_at: current.deleted_at ?? null }, after: { deleted_at: after.deleted_at ?? null } });
  }
  return out;
}

// deno-lint-ignore no-explicit-any
type Db = { from: (t: string) => { insert: (rows: unknown) => PromiseLike<{ error: any }> } };

/** Writes the rows. Returns true when every row that was owed is stored, false when any is not. */
export async function recordActions(db: Db, member: Member, bookingId: string, current: Record<string, unknown>, after: Record<string, unknown>): Promise<boolean> {
  const rows = rowsFor(member, bookingId, current, after);
  if (rows.length === 0) return true;
  try {
    const { error } = await db.from("action_log").insert(rows);
    if (error) { console.error("action_log insert failed:", error); return false; }
    return true;
  } catch (e) {
    console.error("action_log insert threw:", e);
    return false;
  }
}
