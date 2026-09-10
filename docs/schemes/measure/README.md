# The instruments the tenant pages' figures were measured with

**These lived in `.tmp-site3/`, `.tmp-site4/` and `.tmp-site5/` until
2026-09-10, and TEN citations across seven tracked files pointed into those
folders.** They are named `.tmp-` — the one thing a folder can be called that
guarantees somebody eventually deletes it — and they held 445 MB of screenshots
alongside 290 KB of scripts, so the obvious cleanup would have taken the
instruments with the scratch. **One of the ten citations was already dead**
(`y-kinzie.html` cited `.tmp-site4/contrast-site4.mjs`, which no longer
existed), which is what a citation into a temp folder does on its own schedule.

**THE RULE THIS PRODUCES, and it is the transferable part: a document may only
cite a file that is in git.** If a figure is worth explaining, the thing that
computed it is worth keeping — 290 KB against the alternative, which is a
paragraph saying a number was measured by a script nobody can run.

## What each one is

| File | What it answers |
|---|---|
| `site3-contrast.mjs` | Every text/background pair on a built page, sampled off computed style rather than off the token table, so an inherited colour is measured as it renders. |
| `site3-probe-motion.mjs` | Whether a reveal actually left its hidden state — a page whose script failed looks like a blank page and is not one. |
| `site4-contrast.mjs` | The same sampler for site 4, with its own ground list. |
| `site4-contrast-sheet.mjs` | The design SHEET's own ratios, with the glyphs painted out so a specimen's letterforms cannot be sampled as background. |
| `site4-probe-arrive.mjs` | Counts the rules the browser actually applied and the animations actually running, via `getAnimations()` — the only instrument that can see a class that was added and removed inside one render. |
| `site5-contrast.mjs` | Site 5's sampler, and the one that had three real bugs fixed in it: a clamped sample row, and two more the playbook records at rule 1011. |

**Run them against a page served by `npm run dev --prefix app` at `/ex<N>`**,
not against `file://` — several read computed style, which needs the real
document. They take a URL; read the top of each one.

**They are per-site on purpose and are NOT a shared library.** Each was written
against one page's ground list and its own worst pairs, and merging them into
one sampler is how a site gets measured against another site's grounds. If a
seventh page needs one, copy the closest and edit it.
