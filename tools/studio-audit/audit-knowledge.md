# What the audit knows about the AIs (edit me on the Audit tab → AI & limits)

Last checked: 2026-10-22. The audit's AI planner reads this before every run with AI checks.
Rules (Andrew's limits, allowed AIs, fixed choices) always win over what the planner suggests.

## Andrew's plans
- Claude: Max 5x until 2026-10-25 (use it freely until then), then Claude Pro (small allowance: keep it for Planning).
- ChatGPT: Plus, free student plan until 2027-01-03. Usage windows: 5-hour and weekly. Codex effort never above high.

## Who audits by default
- Until Claude Max ends: Claude finds, a different AI company checks.
- After that: ChatGPT finds, Claude checks (and the other way round when ChatGPT is near its limits).

## The models
- Claude Opus 5.5 (strong): best record here; money, security, data, anything that must not be wrong.
- Claude Sonnet 5.5 (middle): screens, wording, ordinary code; about half Opus's usage.
- Claude Haiku (light): one-line jobs only; stops early on long tasks. Not for audits.
- ChatGPT gpt-6.1-sol (strong and middle): good reviewer and second checker; high effort for hard checks.
- ChatGPT gpt-5.6-terra (light): about 40% cheaper than Sol for similar results on simple tasks.
- ChatGPT gpt-6-luna: failed a planner test here; do not use.

## Effort levels
- low = trivial, medium = routine, high = most real work, xhigh = genuinely hard (Claude only), max = never.
- xhigh and max are where the allowance goes. Past 70% of a window, hold at high.

## Depth of an audit
- Quick: middle-strength models, medium effort, top 4 problems per square. A cheap sweep.
- Medium: the normal audit. Strong models on money/security/data, high effort, up to 8 problems.
- Deep: strongest models, highest effort, up to 15 problems, follow every path. Before a launch.

## Lessons measured
- A different model (better: a different company) must do the second check.
- Every finding needs a real file:line; invented lines are thrown away automatically.
- Give every auditor the exact JSON shape to write; loose formats are ignored.
