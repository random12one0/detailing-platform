import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Whether this build was given an API to talk to. Exported so a screen can
// say so plainly instead of failing in a way that looks like a bug.
export const configured = Boolean(url && anonKey);

if (!configured) {
  // Fail loudly during development — a silent empty client is a debugging pit.
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

// This module is imported by the router, so it is loaded on EVERY route.
// createClient() throws on an empty URL, and that throw used to take down
// the whole bundle — including the marketing page at /, which needs no API
// at all. A deployment with a missing environment variable would serve a
// blank white page to every visitor who had never heard of us.
//
// So: build against an unreachable placeholder instead of throwing. The
// marketing page renders, and anything that actually calls the API fails
// with a clear error at the point of use.
export const supabase = createClient(
  url || "https://unconfigured.invalid",
  anonKey || "unconfigured-anon-key",
);
