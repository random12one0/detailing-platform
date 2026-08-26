// Campaign link tracking — a persistent client-side visitor id (so a booking
// made later, even after closing the browser, can be attributed back to the
// campaign/QR code that first brought the visitor in) plus the small helpers
// that read/write that state. Talks to the track-visit edge function.
import axios from "axios";
import { SUPABASE_FUNCTIONS_URL, supabase } from "@/lib/supabase";

const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const VISITOR_KEY = "andrews_visitor_id";
const CAMPAIGN_KEY = "andrews_campaign";
// Attribution window: a booking made within 30 days of the campaign click still
// counts as coming from that campaign (standard-ish marketing attribution window).
const CAMPAIGN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// A stable id for this browser, generated once and reused on every future visit.
export function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode, etc.) — fall back to a per-load id so the
    // rest of the flow still works, it just won't persist across visits.
    return crypto.randomUUID();
  }
}

// Remember which campaign this visitor landed via, so the booking widget can
// auto-apply its promo code even on a later visit.
export function storeCampaign(campaign) {
  if (!campaign) return;
  try {
    localStorage.setItem(
      CAMPAIGN_KEY,
      JSON.stringify({ ...campaign, ts: Date.now() })
    );
  } catch {
    /* storage blocked — attribution just won't persist, non-fatal */
  }
}

// Forget the stored campaign entirely — used when the owner dismisses their own
// preview banner, so their booking widget stops auto-applying the promo.
export function clearStoredCampaign() {
  try {
    localStorage.removeItem(CAMPAIGN_KEY);
  } catch {
    /* non-fatal */
  }
}

// The stored campaign, or null if there isn't one / it's past the attribution window.
export function getStoredCampaign() {
  try {
    const raw = localStorage.getItem(CAMPAIGN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > CAMPAIGN_TTL_MS) {
      localStorage.removeItem(CAMPAIGN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// Who is looking at the site? Resolves whether this browser is a signed-in,
// active admin — i.e. the owner checking their own site — and, if so, hands back
// their Supabase access token so the booking endpoint can VERIFY that claim
// server-side (a client boolean alone must never be trusted for bookings, or a
// real customer's booking could be silently dropped).
//
// It reads the Supabase session already stored when the owner logged into
// /admin, so there is NO login prompt and nothing flashes. For a normal
// signed-out visitor getSession() resolves to null instantly from local storage
// (no network), so real traffic is never slowed or blocked. On any error it
// reports "not the owner" so the site behaves exactly as it does for a customer.
async function getOwnerContext() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return { isOwner: false, accessToken: null };
    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", session.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) return { isOwner: false, accessToken: null };
    return { isOwner: true, accessToken: session.access_token || null };
  } catch {
    return { isOwner: false, accessToken: null };
  }
}

// The owner's verified access token, or null. The booking widget attaches this
// so create-booking can treat the submission as a no-persist preview.
export async function getOwnerAccessToken() {
  return (await getOwnerContext()).accessToken;
}

// Fire-and-forget visit logger. `slug` omitted = a plain organic site visit.
// Returns the resolved campaign (or null) so the caller can store/redirect.
export async function trackVisit({ slug, path } = {}) {
  try {
    const { isOwner } = await getOwnerContext();

    // The owner previewing their own site should never be counted. For a plain
    // organic visit there is nothing to show, so we skip the call entirely. For
    // a campaign link we STILL resolve the campaign (so the owner sees the exact
    // banner + auto-applied promo a customer would) but pass skip_log so the
    // server resolves without recording the visit.
    if (isOwner && !slug) {
      if (typeof console !== "undefined") {
        console.info("[andrews] signed-in owner — organic visit not tracked");
      }
      return null;
    }

    const res = await axios.post(
      `${SUPABASE_FUNCTIONS_URL}/track-visit`,
      {
        visitor_id: getVisitorId(),
        slug: slug || undefined,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
        path: path || (typeof window !== "undefined" ? window.location.pathname : undefined),
        // Owner previewing a campaign link: resolve the campaign but don't log it.
        skip_log: isOwner || undefined,
      },
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (isOwner && typeof console !== "undefined") {
      console.info("[andrews] signed-in owner — campaign previewed, visit not counted");
    }
    return res.data?.campaign || null;
  } catch {
    // Tracking must never block the visitor's experience.
    return null;
  }
}
