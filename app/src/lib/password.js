import { supabase } from "./supabase.js";

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

// PROVING THE PERSON, NOT THE BROWSER — one copy, two callers.
//
// His note, 2026-09-10: *"There should be a place for you to input your
// existing password just to check, like most of them have."* The gear's
// change-password screen got it that day; `/reset` did not, and `/reset` is
// reachable while ORDINARILY signed in — which made it the same screen with
// the check missing, one route over. His review the next day found it.
//
// THE CHECK IS A SIGN-IN, because there is no other way to verify a password:
// it is hashed at the server and nothing in a browser can test it. A wrong one
// fails here and `updateUser` is never reached. Signing in as the SAME account
// replaces this session with an identical one, so nothing else has to be told.
//
// A WRONG PASSWORD AND A FAILED REQUEST ARE NOT THE SAME ANSWER. Lumping them
// together tells somebody their password is wrong when the network dropped or
// the server rate-limited them, and they then change a password that was never
// the problem.
//
// @returns null when the password was right, or a sentence to show when it
// was not.
export async function reauthenticate(email, current) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: current });
  if (!error) return null;
  // Not the raw text: Supabase says "Invalid login credentials", which on a
  // screen where the email is printed and cannot be edited reads as though the
  // account itself is broken.
  const bad = /invalid|credentials|password/i.test(error.message ?? "");
  return bad ? "That is not your current password." : error.message;
}
