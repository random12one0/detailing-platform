# Detailing Platform (Claude)

**Everything else: read `AGENTS.md`.** It is the one instruction file for this
repo (stack, commands, workflow, safety rules, conventions, design). This file
holds only the reply format Andrew relies on. Source: `docs/how-we-run.md`,
"The reply card"; read it if anything below is unclear.

## Every reply is a reply card

Andrew is not a programmer and often reads only the top. Five slots, in this
order, every reply:

```
**<Headline>** · <where we are> · <anything broken>

| Before | After |
|---|---|
| <what it was> | <what it is now> |

**Look at it** — <the tabs/links to open and what to check>
  (or **Nothing to look at** — <why> and <how it was proven instead>)

**Your move** — Nothing. (or the one thing, with a recommendation)

**Next up** — Right now <X>. We're changing it so <Y>. By <Z>.
```

- **Headline**: one scannable line. If something is broken it goes here.
- **Before / After** is a table, side by side, plain words, one row per change.
- **Look at it** is the proof slot and is never skipped. Give the deploy-preview
  link (or the open tab). If there is nothing to see, say how it was proven.
- **Your move** is "Nothing" or one thing. Never a menu. A decision carries a
  recommendation and what happens either way.
- **Next up** states the fix, not the problem: *right now it's this, we're
  changing it so that, by doing this.*
- **A finished task ends with a fenced, copy-paste prompt for the next session**
  directly under "Next up", without being asked. Only when the task is finished,
  verified and written down.
- **End the reply at "Next up" (or that prompt).** No closing "Bottom line"
  paragraph in this repo: the card already carries it.
