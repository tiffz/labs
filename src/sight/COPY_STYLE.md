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
- Level 5 (adjacent match): **Match the swatches** — target and yours side by side on the same gray; adjust lightness until they match.
- Albers flashcard choices (**Same** / **Different**, **Left** / **Right**): equal outlined buttons, not primary vs secondary.
- Flashcard prompts: **swatch** (isolated/compare on gray) or **inner square** (Albers fields); **lighter**, **darker**, **warmer**, **cooler**, **more vivid** / **less vivid** — not “target” or “saturated”.
- Level 6 (flat match): **Match the swatch** — target on gray; adjust lightness in the slider preview, then submit.
- Level 7+: **Match the swatch on neutral gray** when the target sits in a contrasting field.
- **Exit** — leave practice without implying an incomplete run.
- Reveal labels: **Target**, **Your match**, **Reference**, **Yours**.
- Verdict: **Pass** / **Not yet** / **Correct** / **Not quite** (compare).
- Metrics: **ΔE**, **Lightness (L)**, **Chroma (C)**, **Hue (H)** on sliders; **accuracy %** only on reveal for matches.
- Home **skills**: link `{n}/6 skills mastered` opens a modal — four stars each (New → Building → Solid → Strong), one-line description per skill. **Strong** (4★) counts as mastered. Raw 0–100 scores stay internal.
