// ROADMAP 97.66 — A FLEET JOB PRESSED TWICE AT ONCE IS SAVED ONCE AND
// ANSWERS AS SAVED BOTH TIMES.
//
// The row carries an id made when the sheet opened, and the insert ignores an
// id it already has (6.4 c). But `bookings` has TWO unique keys covering that
// id: the primary key and `bookings_id_business_key (id, business_id)`, which
// exists only so `booking_vehicles` can point at the pair. "Ignore duplicates"
// names one of them, and Postgres only forgives a clash on the key it names —
// so when two presses land in the same instant, the second gets past the
// primary key before the first is saved and is then refused by the pair:
// 409, code 23505, over a row that IS saved. Measured one run in four by
// `tests/retry-safety.test.mjs` 3e.
//
// No imports, so the test runs this exact file against the real database.
// The client is passed in: the sheet passes the browser's, the test its own.
export async function saveBulkJob(client, row) {
  const { error } = await client.from("bookings").upsert(row, { onConflict: "id", ignoreDuplicates: true });
  // collision: begin
  // The duplicate it is: the job with OUR id is already there. Read back
  // rather than trusting the code, because RLS only shows this business's
  // rows and a 23505 from anything else must still be an error.
  if (error?.code === "23505") {
    const { data } = await client.from("bookings").select("id").eq("id", row.id).maybeSingle();
    if (data) return { error: null };
  }
  // collision: end
  return { error };
}
