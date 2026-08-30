VISUAL REDESIGN — DIRECTION CHOSEN AND WRITTEN UP (2026-08-30).

The restart the owner called for on 2026-08-28 is done as far as the LOOK is
concerned. `docs/design-system.md` is now **"The Thread"** and is law again.

- **The system is `docs/design-system.md`.** Read it before touching anything
  a person looks at. The reference rendering is
  `docs/design-directions/5-the-thread.html` — the page the owner approved —
  and where the document and that page disagree, the page is right.
- **The skill-collision rule is back on.** Auditors and appliers only
  (`impeccable`, `animate`, `ship-check`). No direction-generating skill runs
  against this product again unless the owner reopens the direction.
- **"Raking Light" is finished as an identity.** The old file is gone; what
  survived it is listed in the new one under "§11 — what survived from
  'Raking Light'": the accessibility floors, the `lib/theme.js` colour rule,
  define-tokens-once, the composition rule, and the content and copy facts in
  `app/src/landing/LandingPage.jsx`.
- **Backend behaviour, content, copy facts, accessibility floors and the
  booking engine are KEPT**, exactly as before. Only the visual world changed.
- **The tests enforce the new rules**, not the old ones:
  `tests/composition.test.mjs` and `tests/design-contrast.test.mjs`, both
  credential-free.

What is still open is named at the end of the system file under "What this
file does NOT settle" — the light theme being the first question of Phase 2.
