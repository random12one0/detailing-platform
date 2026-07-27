// Single source of truth for reading a booking's "extras" — tips and upsell
// revenue — across BOTH data models the business has used over time:
//
//   1. NEW structured rows in the `booking_line_items` table
//      ({ booking_id, category, label, amount, quantity }), written by the
//      current PaymentFinalizationModal. Categories: 'tip' + the UPSELL_KEYS.
//
//   2. LEGACY free-text items in `bookings.line_items` (jsonb, occasionally a
//      JSON-encoded string), written by the old finalization flow. Each item is
//      { description, amount, type } where type ∈ base | size | multiplier |
//      addon | plan | monthlyplan | additional. Manual money added at payment
//      time (tips + upsells) lives under type 'additional'; tips are the
//      'additional' items whose description/category reads like "tip".
//
// The revenue page used to read only model #1, so every historical tip and
// upsell (hundreds of dollars in the old jsonb) silently dropped to zero. This
// module merges the two: for a given booking, prefer its structured rows if it
// has any; otherwise decode its legacy jsonb. That per-booking preference means
// a booking finalized under the new flow is never double-counted.

export const UPSELL_CATS = [
  { key: 'upgrade', label: 'Upgrades', color: '#3987e5' },      // blue
  { key: 'add_on', label: 'Add-ons', color: '#10b981' },        // emerald
  { key: 'custom', label: 'Custom', color: '#9085e9' },         // violet
  { key: 'travel_fee', label: 'Travel fee', color: '#d95926' }, // orange
];
export const UPSELL_KEYS = UPSELL_CATS.map((c) => c.key);

const emptyByCat = () => UPSELL_KEYS.reduce((o, k) => ((o[k] = 0), o), {});

const isTipText = (s) => /\btip/i.test(String(s || ''));

// amount * quantity for a structured line item (quantity defaults to 1).
export const lineItemTotal = (li) => {
  const a = parseFloat(li?.amount);
  if (isNaN(a)) return 0;
  const q = parseInt(li?.quantity, 10);
  return a * (q > 0 ? q : 1);
};

// Map a legacy free-text upsell description onto one of the structured buckets,
// so the old data shows up in the same category breakdown as new data. Falls
// back to 'custom' when nothing matches — always attributed somewhere.
export function classifyLegacyUpsell(description) {
  const d = String(description || '').toLowerCase();
  if (/upgrade|upcharge|upsell|premium|deluxe|ultimate/.test(d)) return 'upgrade';
  if (/drive|travel|trip|mileage|gas|distance|far|mile/.test(d)) return 'travel_fee';
  if (/pet|hair|clay|ceramic|wax|seal|coat|shampoo|engine|headlight|ozone|odor|smell|stain|leather|carpet|steam|polish|buff|scratch/.test(d)) return 'add_on';
  return 'custom';
}

// Parse legacy bookings.line_items, tolerating jsonb arrays OR a JSON string.
export function parseLegacyLineItems(raw) {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { return []; }
  }
  return Array.isArray(arr) ? arr : [];
}

// Derive { tip, upsell, upsellByCat, source } for a SINGLE booking.
// structuredRows: the booking_line_items rows for this booking (may be empty).
export function deriveBookingExtras(booking, structuredRows) {
  const upsellByCat = emptyByCat();
  let tip = 0;
  let upsell = 0;

  if (structuredRows && structuredRows.length) {
    for (const li of structuredRows) {
      const amt = lineItemTotal(li);
      if (li?.category === 'tip') {
        tip += amt;
      } else if (UPSELL_KEYS.includes(li?.category)) {
        upsell += amt;
        upsellByCat[li.category] += amt;
      }
    }
    return { tip, upsell, upsellByCat, source: 'structured' };
  }

  // Legacy fallback: only manually-added ('additional') items are tips/upsell.
  for (const it of parseLegacyLineItems(booking?.line_items)) {
    const amt = parseFloat(it?.amount);
    if (isNaN(amt)) continue;
    const type = String(it?.type || '').toLowerCase();
    const cat = String(it?.category || '').toLowerCase();
    const looksLikeTip = cat === 'tip' || type === 'tip' || isTipText(it?.description);
    if (looksLikeTip) {
      tip += amt;
      continue;
    }
    if (type === 'additional') {
      upsell += amt;
      upsellByCat[classifyLegacyUpsell(it?.description)] += amt;
    }
  }
  return { tip, upsell, upsellByCat, source: 'legacy' };
}

// Group structured line-item rows by booking_id for O(1) lookup.
export function groupLineItemsByBooking(lineItems) {
  const map = new Map();
  for (const li of lineItems || []) {
    const id = li?.booking_id;
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(li);
  }
  return map;
}
