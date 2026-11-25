// ROADMAP 97.40 - the customer CSV import. The mirror of the customer export:
// a detailer brings their existing list in.
//
// Actions (all POST, all require a signed-in member of the business):
//   preview { business_id, rows: [{name,phone,email,address,vehicle,notes}] }
//     -> { valid, duplicates, bad, total }. Nothing is saved. Checked against
//     EVERY existing customer, not only the ones the screen has loaded.
//   commit  { business_id, rows } -> re-validates server-side against the
//     database, inserts the valid ones flagged imported with one batch id,
//     -> { batch_id, created, duplicates, bad }.
//   undo    { business_id, batch_id } -> deletes exactly that batch's rows
//     (imported rows of this business carrying that batch id) and nothing
//     else. Test fixtures (`is_test`) are never touched: flag, don't delete.
//
// The whole request path - auth refusal, dispatch, rules - lives in
// `../_shared/importRules.ts` (no Deno-only imports), so the node suite runs
// the exact handler against a fake database and a stand-in membership check.
// This file only wires the real database, `requireMember` and the helpers in.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabase } from "../_shared/db.ts";
import { json, preflight } from "../_shared/http.ts";
import { requireMember } from "../_shared/tenant.ts";
import { handleImportRequest } from "../_shared/importRules.ts";

Deno.serve((req) =>
  handleImportRequest(req, { db: supabase, requireMember: (r, businessId) => requireMember(r, businessId), json, preflight })
);
