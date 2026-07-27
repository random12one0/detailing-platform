// Shared pricing helpers.

// Round a number to the nearest multiple of 5, e.g. 12 -> 10, 13 -> 15.
export const roundToNearest5 = (n) => Math.round(n / 5) * 5;
