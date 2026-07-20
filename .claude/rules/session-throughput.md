<!-- AUTO-GENERATED from .cursor/rules/session-throughput.mdc — do not edit directly. Edit the source and run `npm run generate:claude-guidance`. -->

> Keep multi-bug agent sessions short — spike first, batch spot-checks, split PRs

# Session throughput

For **multi-bug / upgrade / spot-check** sessions, optimize for wall-clock and tokens:

1. **Spike before thrash** — one Playwright/CDP or unit repro that falsifies the hypothesis before editing a second subsystem. Prefer computed style / pixel pads over vision captions for clip/theme bugs.
2. **Check `cascade-layer-token-override` early** after Tailwind `@layer` or MUI shared-CSS work (unlayered shared CSS beats layered app tokens).
3. **Timebox upgrade spot-checks** — smoke a small app set, then stop and split remaining bugs into follow-ups (`labs-split-to-prs`).
4. **Scoped tests first** — touched-file Vitest/e2e, then one `presubmit`. Do not babysit unrelated dirty-tree failures.
5. **Codify on second occurrence** of the same root-cause class in-session (test/doc/rule) — see [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](../../docs/CONTINUOUS_PROCESS_IMPROVEMENT.md) § Session throughput.

Root cause class: `session-thrash` when the same bug class is rediscovered without a spike.
