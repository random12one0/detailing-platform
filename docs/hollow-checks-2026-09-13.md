# SIX CHECKS THAT COULD NOT TELL WORKING FROM BROKEN — lane C, 2026-09-13

**Andrew's question, and it paid for itself four more times:** *"what else here
reports success in a way that cannot distinguish working from broken."*

Every one below was GREEN before it was touched. Every one is baselined by
breaking it on purpose. Commits `91face9`..`9d88fa2`.

---

## THE SIX

| # | check | it was green over | proof |
|---|---|---|---|
| 1 | `platform-admin` 13b-ii, 13d, 13d-ii, 13d-iii, 13h, 13h-ii, 13h-iii | a note-writing mechanism **nothing calls** | one added call turned all seven skips into passes |
| 2 | `tenant-isolation` test 5, five tables incl. **customers** | **zero rows** — A owned 0 bookings, 0 customers, 0 expenses | narrowing every read to a dead UUID: before, five greens; after, five reds |
| 3 | `check-deployed` | an **edited `create-booking`** | `// PROBE` appended, nothing committed: `all 37 functions are current`, exit 0 |
| 4 | `adversary-probe` A3c, five leak checks | **62.9% of the payload**, incl. every `pay_*` field | `pay_venmo` goes red on the full read, green the instant the 4,000-char slice returns |
| 5 | `timezone-and-slots` ×2, `booking-engine` ×2 — **the double-booking guards** | a slot list that **did not exist** | same dead endpoint: old form 34/0 all green, new form 32/2 naming it |
| 6 | `translations` 4f-iii/iv/v — **the never-translate-a-name guards** | a value that was `undefined` | pointing them at absent fields: both go red naming what was missing |

## THE TWO SHAPES, AND THEY ACCOUNT FOR ALL SIX

**(1) A NEGATIVE ASSERTION OVER AN EMPTY OR ABSENT SUBJECT IS `true`.**
`![].includes(x)`, `!undefined?.includes(x)`, `[].every(f)`,
`JSON.stringify(undefined) === JSON.stringify(undefined)` — every one passes
when nothing was read. **Four of the six.** The fix is always the same and it is
one clause: require the subject to EXIST, in the same check, and print its
count in the check's own name.

**(2) A TRUNCATION ADDED FOR DISPLAY BECOMES A TRUNCATION OF THE EXAMINATION**
the moment somebody asserts on the variable. Found twice in one file thirty
lines apart. Keep the full body; slice only where it is printed.

## THE THREE RULES THAT CAME OUT OF IT

**A CHECK THAT GREPS A FILE PROVES THE FILE IS WRITTEN CORRECTLY AND SAYS
NOTHING ABOUT WHETHER ANYTHING RUNS IT.** Finding 1 is trap (k)'s most expensive
form: unlike a renamed spelling it produces no failure to investigate. **Where a
feature has ONE entry point, assert that something CALLS it** — one regex, and
it is the whole difference between "written" and "reachable".

**FIXING THE INSTANCE IS NOT FIXING THE PATTERN. GREP THE SHAPE.** The hollow
double-booking guard was found in `e2e-booking` in the morning and fixed there.
The same shape was still live in `timezone-and-slots` and twice in
`booking-engine`, all guarding the same thing. Three more instances, found by
one grep, after the first was called closed.

**A SKIP IS A DEBT, AND IT CAN BE PAID.** `13f-iii` skipped at 23:40 because
the screen had no resend control; lane B built the door in `cfe29b3` and the
assertion came back the same night with no edit to the reason it was parked.
A skip that names its condition re-arms itself.

## WHAT WAS LOOKED AT AND IS SOUND

Said out loud so nobody re-audits it: `staff-roles` test 1 pairs its negative
with an owner-side positive and says so in a comment; `forget-customer` guards
every `[].every()` with a subject count and records why; `booking-page-isolation`
anchors both its service and its slot blocks, dated 2026-09-13. The `.slice()`
calls across every other suite are all in the DETAIL argument, never the
assertion. `sharedFor` resolves transitively — proven two ways.
