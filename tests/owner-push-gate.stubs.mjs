// Tests/owner-push-gate stand-ins — ROADMAP 97.33.
//
// The three boundaries the real code cannot cross under Node: the push
// network (`npm:web-push`, a default import), the database (the supabase
// client built in `_shared/db.ts`), and the email relay (reached by the real
// `sendTenantEmail` through `fetch`). Everything else the handler and the
// sender import — settings, templates, brand, fanout, timezone, config —
// loads for real (see the hooks file for the redirect list).
//
// `world` is the test's handle on the fake: set before each run, read after.
// The test imports this same file, so the code under test and the assertions
// share one instance — nothing is copied.

export const world = {
  tables: {
    businesses: [],
    business_settings: [],
    business_users: [],
    bookings: [],
    booking_vehicles: [],
    owner_push_subscriptions: [],
    support_sessions: [],
    business_branding: [],
  },
  pushes: [],
  emails: [],
};

function runQuery(table, filters, mode, patch) {
  const rows = world.tables[table] ?? [];
  if (!Object.hasOwn(world.tables, table)) throw new Error(`unexpected table ${table}`);
  const hit = rows.filter((r) =>
    filters.every(([c, v, op]) => {
      if (op === "in") return v.includes(r[c]);
      if (op === "neq") return r[c] !== v;
      if (op === "not-eq" || op === "not-is") return r[c] !== v;
      if (op === "not-in") return !v.includes(r[c]);
      return r[c] === v;
    }));
  if (mode === "update") {
    for (const r of hit) Object.assign(r, patch);
    return hit;
  }
  if (mode === "delete") {
    world.tables[table] = rows.filter((r) => !hit.includes(r));
    return hit;
  }
  return hit.map((r) => ({ ...r }));
}

function from(table) {
  const filters = [];
  let mode = "select";
  let patch = null;
  const b = {
    select() { return b; },
    eq(c, v) { filters.push([c, v]); return b; },
    neq(c, v) { filters.push([c, v, "neq"]); return b; },
    is(c, v) { filters.push([c, v]); return b; },
    in(c, vs) { filters.push([c, vs, "in"]); return b; },
    not(c, op, v) { filters.push([c, v, `not-${op}`]); return b; },
    order() { return b; },
    limit() { return b; },
    update(p) { mode = "update"; patch = p; return b; },
    delete() { mode = "delete"; return b; },
    async maybeSingle() {
      const rows = runQuery(table, filters, mode, patch);
      return { data: rows[0] ?? null, error: null };
    },
    then(res, rej) {
      try {
        return Promise.resolve({ data: runQuery(table, filters, mode, patch), error: null }).then(res, rej);
      } catch (e) {
        return Promise.reject(e).catch(rej);
      }
    },
  };
  return b;
}

export const supabase = {
  from,
  rpc: async (name) => {
    // business_canonical_host feeds siteFor (null = platform default);
    // recipient_lang feeds recipientLang (null = English). Both best-effort.
    if (name === "business_canonical_host" || name === "recipient_lang") return { data: null, error: null };
    throw new Error(`unexpected rpc ${name}`);
  },
  auth: {
    getUser: async (token) => (
      token === "member-token"
        ? { data: { user: { id: "user-1" } }, error: null }
        : { data: { user: null }, error: { message: "invalid token" } }
    ),
    admin: { signOut: async () => ({}) },
  },
};

export const SUPABASE_URL = "";
export const SERVICE_ROLE_KEY = "test-service-key";

// The real retry helper, re-exported the way db.ts itself re-exports it.
export { retryRead } from "../supabase/functions/_shared/retryRead.ts";

const webpush = {
  setVapidDetails() {},
  async sendNotification(sub) {
    if (String(sub.endpoint).endsWith("/stale")) {
      const e = new Error("gone");
      e.statusCode = 410;
      throw e;
    }
    world.pushes.push(sub.endpoint);
  },
};

export default webpush;
