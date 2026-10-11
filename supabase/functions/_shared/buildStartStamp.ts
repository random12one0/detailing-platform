// ROADMAP 0.4g — WRITE THE BUILD-START DATE ONLY IF NO DATE IS THERE YET.
//
// `build_start` reads the column, refuses if it is set, emails, then writes.
// Two presses that overlap (two tabs, a retry after a slow answer) both read
// null and both get past the read. A plain update then lets the LATER write
// replace the earlier one, so the day a build fee stops being refundable was
// whichever request landed last. The condition below makes Postgres decide:
// the second UPDATE waits on the first one's row lock, re-checks `is null`
// against the committed row, and matches nothing.
//
// It cannot un-send the loser's email — the send precedes the write on
// purpose (see the handler). It stops the recorded date from moving.
//
// Its own module, with no imports, so `scripts/build-start-race.mjs` races the
// production function against the real database rather than a copy of it.

// deno-lint-ignore no-explicit-any
type Db = any;

export async function stampBuildStart(
  db: Db, id: string, startedAt: string,
): Promise<{ won: boolean; recorded: string | null; error: string | null }> {
  const { data, error } = await db.from("businesses")
    .update({ site_build_started_at: startedAt }).eq("id", id)
    .is("site_build_started_at", null)
    .select("site_build_started_at");
  if (error) return { won: false, recorded: null, error: error.message };
  if (data?.length) return { won: true, recorded: data[0].site_build_started_at, error: null };
  // Nothing matched: another press already wrote it. Read back what it wrote.
  const { data: row, error: readErr } = await db.from("businesses")
    .select("site_build_started_at").eq("id", id).maybeSingle();
  return { won: false, recorded: row?.site_build_started_at ?? null, error: readErr?.message ?? null };
}
