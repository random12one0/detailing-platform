// ORDINALS, BECAUSE AN ERROR MESSAGE IS A SURFACE.
//
// `${n}th` is how three lines in this repo numbered things, and it gives you
// **1th, 2th, 3th, 21th, 22th, 23th and 31th**. The one that was caught in the
// wild read *"WIDTH ABORTED at 1920px MEASURING «…» — the 32th"*, in a sentence
// whose entire purpose is that a person reads it at 3am and understands it
// immediately. `surcharge-visible.mjs` had the same shape on a DAY OF THE
// MONTH, where the wrong cases are 1, 2, 3, 21, 22, 23 and 31 — seven days in
// every month.
//
// **THE 11/12/13 RULE IS THE WHOLE REASON THIS IS A FUNCTION AND NOT A TERNARY.**
// The obvious fix — look at the last digit — gets 11st, 12nd and 13rd, so it
// trades a sentence that is wrong on seven days for one that is wrong on three
// and looks more careful. The teens are checked first, against `n % 100`.
//
// Negative and non-integer input returns the number unchanged rather than
// inventing a suffix for it: nothing here counts backwards, and a `-1th` in a
// log would be a second bug wearing the first one's clothes.

/** `1 -> "1st"`, `11 -> "11th"`, `22 -> "22nd"`. */
export const ordinal = (n) => {
  if (!Number.isInteger(n) || n < 0) return String(n);
  const teens = n % 100;
  if (teens >= 11 && teens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
};

// ONE RUNNABLE CHECK, and it is the cases a naive version gets wrong:
//     node scripts/lib/ordinal.mjs
if (process.argv[1] && process.argv[1].endsWith("ordinal.mjs")) {
  const { strictEqual } = await import("node:assert");
  const cases = [
    [0, "0th"], [1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"],
    // the teens — where "look at the last digit" fails
    [11, "11th"], [12, "12th"], [13, "13th"], [14, "14th"],
    // and the twenties, where "always th" fails
    [21, "21st"], [22, "22nd"], [23, "23rd"], [24, "24th"],
    [31, "31st"], [32, "32nd"], [100, "100th"], [101, "101st"],
    [111, "111th"], [112, "112th"], [113, "113th"], [121, "121st"],
  ];
  for (const [n, want] of cases) strictEqual(ordinal(n), want, `ordinal(${n})`);
  strictEqual(ordinal(-1), "-1", "negatives are returned unchanged");
  strictEqual(ordinal(1.5), "1.5", "non-integers are returned unchanged");
  console.log(`ordinal: ${cases.length + 2} cases pass, including 11/12/13 and 111/112/113`);
}
