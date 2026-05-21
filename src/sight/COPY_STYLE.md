# Color Sight Trainer — copy

Defers to [docs/USER_COPY_STYLE.md](../../docs/USER_COPY_STYLE.md).

## Voice

- Professional practice tool: direct, calm, no hype.
- Focus on the skill being trained (value, bridge, gamut), not app mechanics.

## Labels

- **Practice** — primary CTA on home at your current level.
- **Practice level** — dropdown on home when level &gt; 1; earlier levels labeled “(review)”. Review hint: passes do not change level progress.
- Level navigation — low-key chevrons beside the level label (`aria-label` only: “Previous level (N)”, “Next level (N)”).
- After feedback, the next question loads automatically. **Continue** or tap the exercise to skip the wait. Compare drills use a single canvas (no side panel); do not add “tap below” or “next challenge” coaching copy.
- Level 5 (flat match): **Match the swatch** plus one short hint about same gray and lightness. Level 6+: **Match the swatch on neutral gray** when the target sits in a contrasting field.
- **Exit** — leave practice without implying an incomplete run.
- Reveal labels: **Target**, **Your match**, **Reference**, **Yours**.
- Verdict: **Pass** / **Not yet** / **Correct** / **Not quite** (compare).
- Metrics: **ΔE**, **Lightness (L)**, **Chroma (C)**, **Hue (H)** on sliders; **accuracy %** only on reveal for matches.
