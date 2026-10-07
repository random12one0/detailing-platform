// ROADMAP 3.1, server half — THE BACK OFFICE'S "EMAIL WE SENT" LIST.
//
// The screen is `EmailList` in `app/src/admin/AdminPage.jsx`, and the contract
// is written above that component; this file is that contract and nothing else:
//
//   request   { action: "email_list", limit?: 1..200 (default 100), statuses?: [...] }
//   response  { rows: [{ id, subject, to_email, status, detail, sent_at,
//                        business_name, booking_id }] }   newest first
//
// WHY A SERVICE-ROLE ACTION AND NOT THE BROWSER: `email_sends` is scoped by
// `current_business_ids()` and the owner belongs to no detailer's business, so a
// browser query returns ZERO ROWS WITH NO ERROR. Every byte of the back office
// comes through `platform-admin` after its `platform_admins` gate — the action
// is wired in AFTER that gate, and tests/email-list.test.mjs holds it there.
//
// WHY THIS IS A `.js` MODULE THAT TAKES THE CLIENT: nothing in `supabase/` runs
// on this machine except what node can import, so the query, the ordering, the
// filter and the three failure sentences are exercised against an in-memory
// client rather than read as source. `platformNet.js` is the precedent.
//
// A FAILED READ IS NEVER AN EMPTY LIST. The screen treats anything without a
// `rows` array as failed and says so; every error path here returns `{error}`
// and never `{rows: []}`, because "no email has been sent yet" over a database
// that did not answer is the one wrong sentence this list can print.
//
// The error sentences are FRAGMENTS, not sentences: the screen prints
// "Could not read the email log: <error>." and supplies the full stop itself.

/** The table's own CHECK list (20260916010000_every_email_leaves_a_row.sql). */
export const EMAIL_STATUSES = ["sent", "delivered", "bounced", "complained", "failed", "refused", "skipped"];

export const EMAIL_LIST_DEFAULT = 100;
export const EMAIL_LIST_MAX = 200;

export const EMAIL_TABLE_MISSING = "the email log has not been set up in the database yet";
export const EMAIL_BOOKING_MISSING =
  "the database change that lets each email record its booking has not been applied yet";
export const EMAIL_READ_FAILED = "the database did not answer";

const COLUMNS = "id, subject, to_email, status, detail, sent_at, booking_id, businesses(name)";

/** Postgres 42P01 / PostgREST PGRST205: the table is not there. */
const tableMissing = (e) => ["42P01", "PGRST205"].includes(e?.code ?? "");
/** 42703 undefined_column, and the column in the message is the new one. */
const bookingColumnMissing = (e) => e?.code === "42703" && /booking_id/.test(e?.message ?? "");

/**
 * Check the request. Refusals are 400 with a sentence; nothing is coerced —
 * `"100"` and `12.5` are a screen bug, and fixing them quietly hides it.
 * @returns {{ok:true, limit:number, statuses:string[]|null} | {ok:false, error:string}}
 */
export function emailListRequest(body) {
  const b = body ?? {};
  let limit = EMAIL_LIST_DEFAULT;
  if (b.limit != null) {
    if (typeof b.limit !== "number" || !Number.isInteger(b.limit) || b.limit < 1) {
      return { ok: false, error: "The limit has to be a whole number of at least 1." };
    }
    limit = Math.min(b.limit, EMAIL_LIST_MAX);
  }
  let statuses = null;
  if (b.statuses != null) {
    if (!Array.isArray(b.statuses) || b.statuses.some((s) => !EMAIL_STATUSES.includes(s))) {
      return { ok: false, error: `statuses has to be a list drawn from: ${EMAIL_STATUSES.join(", ")}.` };
    }
    statuses = [...new Set(b.statuses)];
  }
  return { ok: true, limit, statuses };
}

/**
 * Run the read. `client` is the service-role Supabase client (or a fake).
 * @returns {Promise<{status:number, body:object}>}
 */
export async function emailList(client, body) {
  const req = emailListRequest(body);
  if (!req.ok) return { status: 400, body: { error: req.error } };
  // "Only these states" with no states is an empty answer, and it is true: no
  // query, because `in ()` is not worth a round trip to say nothing.
  if (req.statuses && req.statuses.length === 0) return { status: 200, body: { rows: [] } };

  let q = client.from("email_sends").select(COLUMNS);
  if (req.statuses) q = q.in("status", req.statuses);
  // `id` breaks ties so two sends in the same instant keep one order between
  // reads; without it a refresh could shuffle them.
  const { data, error } = await q
    .order("sent_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(req.limit);

  if (error) {
    return {
      status: 500,
      body: {
        error: tableMissing(error) ? EMAIL_TABLE_MISSING
          : bookingColumnMissing(error) ? EMAIL_BOOKING_MISSING
          : EMAIL_READ_FAILED,
      },
    };
  }
  if (!Array.isArray(data)) return { status: 500, body: { error: EMAIL_READ_FAILED } };

  return {
    status: 200,
    body: {
      rows: data.map((r) => ({
        id: r.id,
        subject: r.subject,
        to_email: r.to_email,
        status: r.status,
        detail: r.detail ?? null,
        sent_at: r.sent_at,
        // Platform mail (the dead man's switch and friends) has no business.
        business_name: r.businesses?.name ?? null,
        // NULL is correct for campaigns, invites and plan links.
        booking_id: r.booking_id ?? null,
      })),
    },
  };
}
