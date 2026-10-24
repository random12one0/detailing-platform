// ROADMAP 97.53 - the one testable rule behind the calendar-link save.
//
// `resetFeed` writes the token with an upsert and must only report success
// when a row actually changed: a caller whose permission was pulled mid-press
// gets NO error from PostgREST on an update (it answers 200 with zero rows),
// so checking `error` alone would print "New link ready" over a feed that
// still holds the old key. Dependency-free on purpose, so node can run it.
export const feedTokenSaved = (data, error) => {
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  const token = row?.calendar_feed_token;
  return typeof token === "string" && token ? token : null;
};
