import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service-role client — bypasses RLS. Every query made with it MUST be
// scoped by business_id; the tenant helpers in tenant.ts are the only
// approved way to obtain that id.
export const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
