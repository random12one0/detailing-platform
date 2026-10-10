// ROADMAP 99.1 — the detailer's link to their Google Business profile.
//
// Pure decisions only, no I/O, so `tests/google-business.test.mjs` imports this
// file itself. `google-business/index.ts` is the I/O.
//
// THIS DEPLOYMENT CAN NOT TALK TO GOOGLE, AND THAT IS ON PURPOSE. Writing to a
// listing needs the `business.manage` scope, which is behind two Google gates
// (ROADMAP 0.15). Until that opens the only mode is `stub`: the link is a row
// in our own table and nothing leaves the building. A real mode is a second
// branch in `index.ts` plus a token column, and `syncing` below flips with it.

export type LinkState = "none" | "connected" | "refused" | "broken";
const STORED = ["connected", "refused", "broken"] as const;

/** `GOOGLE_BUSINESS_MODE`. Anything but the word `stub` is OFF, including a typo. */
export const stubMode = (mode: string | undefined | null): boolean => mode === "stub";

/** What a stub press should pretend Google answered. Unknown words mean success. */
export function stubOutcome(x: unknown): "connected" | "refused" | "broken" {
  return x === "refused" || x === "broken" ? x : "connected";
}

/**
 * The one object the settings screen draws. The screen does not work any of it
 * out, for the same reason `connect.ts` `cardStatus` exists: a second
 * implementation disagrees the first time the first one changes.
 *
 * `syncing` is false and nothing here can make it true: no hours, services or
 * photos are sent to Google by anything in this repo. The screen says so while
 * it is false, so a connected link never reads as a listing that is in step.
 */
export function describeLink(
  row: { state?: string | null; account_label?: string | null; connected_at?: string | null } | null,
  available: boolean,
) {
  const state: LinkState = (STORED as readonly string[]).includes(row?.state ?? "")
    ? (row!.state as LinkState)
    : "none";
  return {
    available,
    state,
    connected: state === "connected",
    account: state === "connected" ? (row?.account_label ?? null) : null,
    connectedAt: state === "connected" ? (row?.connected_at ?? null) : null,
    syncing: false,
  };
}
