# Turning ROADMAP.md into task contracts — a proposal, not a change

**For Andrew to rule on. Nothing in this document has been done.**

Written 2026-09-20. This is the second half of step 7 of the operating-system
report's adoption sequence. **The first half — pruning `docs/archive/` — was
done on 2026-09-20 and is finished.** This half was deliberately not done, for
a reason given below that has nothing to do with whether it is a good idea.

---

## What is being proposed

`ROADMAP.md` is currently **one file of about 3,500 lines** holding the whole
fix queue: 79 open items across 14 waves, each written as prose — a symptom, a
fix, a *done when*, and often several paragraphs of what was measured and what
was found on the way.

The report proposes converting each item into a **task contract**: a short,
fixed shape that every item shares.

    id            4.4
    title         Prove multi-tenant isolation properly
    state         open
    done when     every edge function replayed with another tenant's ids
    evidence      receipts/edge-tenant-replay.json
    blocked by    deploy freeze (partially)
    owner         session
    notes         → docs/notes/4.4.md

The prose does not disappear; it moves to a per-item note. The queue becomes a
list of contracts you can read in one screen.

---

## What it buys

1. **You could see the queue.** Right now nobody can read 3,500 lines to find
   out what is open. Every session that opens this file reads the index and
   guesses. A contract list fits on a page.
2. **"Done when" becomes checkable by a machine.** Several items already name
   a receipt; if every item did, `receipt.mjs` could answer *which items are
   actually proved* rather than a person re-reading prose.
3. **Blocked items would stop looking like open ones.** Tonight, four items
   were marked *blocked by the deploy freeze* by hand. In a contract that is a
   field, and the count of "blocked" versus "open" becomes a number rather
   than a reading.
4. **It would stop the file growing by accretion.** Every session tonight
   added paragraphs to items. That is how it reached 3,500 lines, and nothing
   in the current shape resists it.

---

## What it costs

- **A full pass over 79 items**, each of which needs its prose read and split
  into contract fields plus a note. Realistically several hours, and it cannot
  be done half way: a file that is half contracts and half prose is worse than
  either.
- **Every cross-reference breaks.** Items refer to each other by number
  throughout, and other documents refer into the roadmap by section
  (`CLAUDE.md`, `FOR-ANDREW.md`, `docs/VERIFIED.md`, `FOUND.md`).
- **The history in the prose is load-bearing and easy to lose.** Several items
  carry a reversal — a finding that was published and then withdrawn, with the
  reasoning kept because *"the reversal is usually the load-bearing part"*.
  A mechanical conversion would flatten those into a one-line state field.

---

## What would break, and this is the reason it was not done

**`ROADMAP.md` is the one document both sessions write to.** It was edited by
both of them repeatedly on 2026-09-20 — items ticked, findings appended,
blocked markers added — sometimes minutes apart.

**Rewriting it while another session is live means two sessions disagreeing
about what a half-rewritten file means.** One appends a paragraph to an item
that no longer has paragraphs; the other ticks a box that has moved.

**And no tag protects against that.** The docs prune was safe *because*
`pre-doc-prune-2026-09-16` exists and was verified before anything was
deleted — every pruned file was confirmed byte-identical to the tag and two
were recovered in full as a rehearsal. **A tag cannot protect a file from
being concurrently rewritten**; it can only bring back a version, and the
thing being lost in a concurrent rewrite is nobody's version.

---

## The condition it should be done under

- **One session running**, not two.
- **A quiet tree** — no uncommitted work in `ROADMAP.md` from anybody.
- **A fresh tag first**, the same way the docs prune had one, and **verified
  the same way** rather than assumed.
- **In one pass**, not incrementally.

---

## What Andrew is being asked

**Not "should the roadmap be tidier" — everyone agrees it should.** The
question is whether the conversion is worth several hours and a period during
which the queue is unreadable, against leaving a long file that works but
cannot be seen at a glance.

**Recommendation: yes, but not soon.** The file is long and hard to read, and
it is also *accurate and actively used* — which is a better position than most
of this repo. It should be converted on a quiet day with one session, and it
should not interrupt the fix queue to do it. Nothing else is blocked by it.

*Step 7's first half is done. This half stays held until he says otherwise.*
