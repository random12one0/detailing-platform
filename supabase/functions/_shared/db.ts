// **`npm:`, NOT esm.sh, SINCE 2026-09-07 — AND THE OLD LINE MADE EVERY
// FUNCTION IN THIS REPO UNDEPLOYABLE.** It read
// `https://esm.sh/@supabase/supabase-js@2.39.0`, and that release declares its
// own dependencies as RANGES (`@supabase/functions-js@^2.1.5`), which esm.sh
// resolves at DEPLOY time to whatever is newest. It resolved to `2.116.0`,
// which esm.sh answers 404 for, so the bundler reported "Module not found" for
// all thirty functions at once — including every one whose source had not
// changed in weeks.
//
// **PINNING OUR OWN VERSION DID NOT PIN ITS DEPENDENCIES.** That is the whole
// lesson: with a CDN in the deploy path, somebody else's publish can stop this
// product shipping backend changes, with no warning and no diff to look at.
// Supabase's edge runtime is Deno 2, so a `npm:` specifier resolves from the
// npm registry instead and esm.sh is out of the path entirely.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service-role client — bypasses RLS. Every query made with it MUST be
// scoped by business_id; the tenant helpers in tenant.ts are the only
// approved way to obtain that id.
export const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
