// Shared pricing helpers — the frontend mirror of supabase/functions/_shared/pricing.ts.
// Anything here MUST match that file, or the price the customer is quoted will
// drift from the price the server charges. Keep the two in sync.

// Round a number to the nearest multiple of 5, e.g. 12 -> 10, 13 -> 15.
export const roundToNearest5 = (n) => Math.round(n / 5) * 5;

// Vehicle-size surcharge, in dollars, on top of the base package price.
// Single source of truth for the frontend — do not re-inline these numbers.
// ("med" is accepted because older booking rows store the abbreviated form.)
export const VEHICLE_SIZE_ADDS = {
  small: 0,
  medium: 15,
  med: 15,
  large: 30,
};

// Null-safe lookup. Unknown or missing sizes add nothing.
export const vehicleSizeAdd = (size) =>
  VEHICLE_SIZE_ADDS[String(size || "").toLowerCase()] ?? 0;
