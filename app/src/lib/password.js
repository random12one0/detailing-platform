// HOW LONG A PASSWORD HAS TO BE, IN ONE PLACE.
//
// **THE FORMS SAID EIGHT AND THE SERVER REQUIRED TEN — measured 2026-09-10**,
// by typing a nine-character password into the change-password screen and
// watching it pass every check the browser makes, reach Supabase, and come
// back *"Password should be at least 10 characters."*
//
// That is the worst shape a validation bug takes: the form tells somebody a
// rule, they obey it, and the product refuses them anyway with a sentence
// nobody wrote. **And it was in five places** — sign-up, the invite screen,
// the reset screen and both boxes on the change screen — each with its own
// `minLength={8}` and its own English promise, which is exactly how five
// copies of one number come to disagree with a sixth that lives in a Supabase
// project setting nobody can see from here.
//
// So: one number, one sentence, imported by all five. **If the project's
// minimum ever changes, this file is the only edit** — and a mismatch becomes
// a one-line fix rather than a hunt.
//
// **IT IS A FLOOR, NOT THE RULE.** The server is still the authority and still
// refuses what it refuses; this only stops the browser promising something the
// server will not honour. A client that believed it was the rule would be the
// same defect pointing the other way.
export const MIN_PASSWORD = 10;

// The sentence every one of those screens prints. Written as a fact rather
// than an instruction, because it sits under a field that already says what
// to do.
export const PASSWORD_RULE = "Ten characters or more.";
